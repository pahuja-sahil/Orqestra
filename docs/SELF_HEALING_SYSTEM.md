# ORQESTRA Self-Healing System Documentation

## Overview

The self-healing system automatically monitors integrations, detects issues (syntax errors, runtime errors, API docs drift), and repairs them by generating new code via LLM and creating GitHub PRs.

---

## Changes Made

### 1. Enhanced Health Check - Runtime Error Detection
**File:** `apps/api/workers/monitor.py`

**Problem:** Only syntax errors were detected. Errors like `ImportError`, `NameError`, `AttributeError` were not caught because `compile()` only validates syntax, not runtime execution.

**Solution:** Added actual code execution using `exec()` to catch runtime errors:

```python
# Added after syntax check
try:
    exec(compile(code, '<string>', 'exec'), {'__name__': f'{integration.api_name}_test'})
except NameError as e:
    return False, f"NameError: {str(e)}"
except ImportError as e:
    return False, f"ImportError: {str(e)}"
except AttributeError as e:
    return False, f"AttributeError: {str(e)}"
except Exception as e:
    return False, f"RuntimeError: {str(e)}"
```

### 2. Docs Drift Detection
**File:** `apps/api/workers/monitor.py`

**Problem:** No detection when API documentation changes.

**Solution:** Added docs hash comparison and endpoint extraction:

```python
async def check_docs_drift(integration: Integration) -> tuple[bool, str, str]:
    # Fetch API docs from GitHub raw URLs
    # Compare SHA256 hash of docs content
    # Extract and compare API endpoints
    # Mark integration unhealthy if docs changed
```

**API Docs Endpoints Tracked:**
- Stripe, GitHub, Twilio, OpenAI, Razorpay

### 3. Fixed Repair Retry Status Bug
**File:** `apps/api/workers/repair.py`

**Problem:** When repair failed but hadn't exceeded max attempts, status was set to "broken", which caused monitor to trigger ANOTHER repair, creating duplicate repair jobs.

**Solution:** Changed to keep status as "healing" during retries:

```python
# Before (line 197)
integration.status = "broken"

# After
integration.status = "healing"
```

### 4. Fixed Repair Docs Fetch
**File:** `apps/api/workers/repair.py`

**Problem:** `cached_docs_context` was storing hash info, not actual docs content.

**Solution:** Added logic to fetch fresh docs when needed:

```python
needs_fresh_docs = not docs_context or "||" not in docs_context or len(docs_context) < 100
if needs_fresh_docs:
    docs_context = await get_relevant_docs(integration.api_name, top_k=5)
```

### 5. Added Detailed Logging
**File:** `apps/api/workers/monitor.py`

Added logging at every step to debug issues:
- `checking_integration` - integration details
- `http_check_result` - HTTP health result
- `code_health_check_start`, `code_health_fetched`, `code_health_runtime_ok`, etc.
- `docs_drift_detected`, `docs_drift_marking_unhealthy`
- `integration_health_summary` - final health decision

---

## Test Results

### Successful Test Run

1. **Error Detection:**
   - Docs drift: `4f79c0ecc962338b|0 endpoints`
   - Runtime error: `ImportError: attempted relative import with no known parent package`

2. **Repair Triggered:** When `failure_count` reached 3

3. **Repair Executed:**
   - Status changed to "healing" (yellow badge shows in UI)
   - Fetched fresh Twilio API docs
   - Called LLM (hit rate limit on Gemini 3x, succeeded on Groq)
   - Generated fixed code (minimal scope)
   - Created PR #2 on GitHub

4. **Final State:**
   - Status: healthy
   - Failure count: 0
   - Repair attempts: 1

---

## Remaining Issues

### Issue 1: Worker Instability (CRON Not Running Consistently)

**Symptom:**
- Worker keeps shutting down after completing cron jobs
- Cron stops running after 1-2 runs
- Logs show: `shutdown on SIGTERM ◆ 1 jobs complete ◆ 0 failed ◆ 0 retries ◆ 0 ongoing to cancel`

**Affected:** `docker-compose.yml` worker container, `apps/api/workers/settings.py`

**Current Behavior:**
```
17:40:00  → cron:monitor_integrations()
17:40:05  ← cron:monitor_integrations ●
17:40:36  shutdown on SIGTERM
17:40:43  Starting worker
[next cron never runs or runs only once]
```

**What's Working:**
- Health checks DO run (failure_count increases)
- Repair triggers correctly when failure_count >= 3
- PR creation works

**What's Broken:**
- Cron doesn't run consistently at every 10-minute mark
- Worker keeps restarting which causes gaps in monitoring

**Root Cause:**
The arq worker with cron jobs has an issue where it shuts down after each job completes. This appears to be a configuration or version-specific issue with arq 0.28.0.

**Workaround:**
The system still works because:
1. Manual triggers work
2. Health check runs at least once after worker restart
3. If you wait ~10-20 minutes between restarts, health check runs

---

## Configuration

### Monitor Schedule
- **File:** `apps/api/workers/settings.py`
- **Schedule:** Every 10 minutes at minutes {0, 10, 20, 30, 40, 50}

### Repair Configuration
- **File:** `apps/api/workers/repair.py`
- **Max Attempts:** 4
- **Backoff:** 60s → 120s → 240s → 480s (exponential)

### Health Check Types
1. **HTTP Health:** Checks if API endpoint responds (200, 401, 403 considered healthy)
2. **Code Health:** Syntax + runtime execution
3. **Docs Drift:** Compares API docs hash

### Status Values
- `healthy` - All checks pass
- `broken` - Issues detected, repair not yet triggered
- `healing` - Repair in progress (shows yellow badge in UI)
- `failed` - Repair failed after max attempts

---

## Files Modified

| File | Changes |
|------|---------|
| `apps/api/workers/monitor.py` | Added runtime execution check, enhanced docs drift detection, detailed logging |
| `apps/api/workers/repair.py` | Fixed status on retry, fixed docs fetch logic |
| `apps/api/workers/settings.py` | Worker configuration |
| `apps/api/app/agents/repair_agent.py` | Single LLM call repair function |

---

## How to Test

1. **Create an integration** (e.g., Twilio) via Converse page
2. **Introduce an error** in the GitHub file (e.g., add syntax error, bad import)
3. **Wait for monitor** - runs every 10 minutes (or manually trigger)
4. **Verify detection** - failure_count increases
5. **Verify repair** - after 3 failures, status changes to "healing", repair runs, PR created

---

## Future Improvements

1. Fix cron consistency - investigate arq worker lifecycle
2. Add support for more API docs endpoints
3. Add rate limit handling for LLM calls
4. Add retry logic for failed health checks
5. Add monitoring dashboard for repair attempts