from typing import TypedDict, Optional


class NexusState(TypedDict):
    # ── Input ────────────────────────────────
    user_input: str
    source: str                  # "voice" or "text"

    # ── Planning ─────────────────────────────
    api_name: str                # detected API name
    integration_goal: str        # what user wants to achieve
    integration_steps: list      # step by step plan
    language: str                # python/javascript/etc

    # ── Research ─────────────────────────────
    retrieved_docs: list         # raw chunks from ChromaDB
    context: str                 # formatted context for LLM

    # ── Code Generation ───────────────────────
    generated_code: str          # actual code output
    code_explanation: str        # explanation of the code

    # ── Evaluation ───────────────────────────
    quality_score: int           # 1-10
    evaluation_notes: str        # feedback for retry
    retry_count: int             # current retry number

    # ── Output ───────────────────────────────
    final_response: str          # formatted response to user
    error: Optional[str]         # error message if failed