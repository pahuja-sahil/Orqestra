"""
API Discovery Service
Tries to find docs URL, OpenAPI spec, and health endpoint for ANY API name.
Caches results so subsequent lookups hit ChromaDB instead of making HTTP calls.
"""

import re
import httpx
from app.core.logger import logger
from app.services.vector_service import retrieve_relevant_chunks, ingest_document


COMMON_SPEC_PATTERNS = [
    "https://api.{slug}.com/openapi.json",
    "https://{slug}.com/api/openapi.json",
    "https://api.{slug}.io/openapi.json",
    "https://{slug}.com/openapi.json",
    "https://raw.githubusercontent.com/{slug}/api-spec/main/openapi.yaml",
    "https://raw.githubusercontent.com/{slug}/api-spec/master/openapi.json",
    "https://raw.githubusercontent.com/{slug}/openapi/main/openapi.yaml",
]

COMMON_HEALTH_PATTERNS = [
    "https://api.{slug}.com/v1/health",
    "https://api.{slug}.com/health",
    "https://{slug}.com/api/health",
]


def _make_slug(api_name: str) -> str:
    return api_name.lower().replace(" ", "").replace("_", "").replace("-", "")


async def try_url(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        resp = await client.get(url, timeout=8, follow_redirects=True)
        if resp.status_code == 200:
            return url
    except Exception:
        pass
    return None


async def discover_api(api_name: str) -> dict:
    """
    Discover API resources for any API name.
    Returns:
    {
        "docs_url": str or None,         # OpenAPI spec URL
        "health_url": str or None,        # Health check URL
        "has_docs": bool,                 # Whether we found documentation content
        "docs_content": str or None,      # Spec content if found, else None
    }
    """
    slug = _make_slug(api_name)
    logger.info("discovering_api", api=api_name, slug=slug)

    result = {
        "docs_url": None,
        "health_url": None,
        "has_docs": False,
        "docs_content": None,
    }

    # 1. Check ChromaDB cache first
    cached_chunks = await retrieve_relevant_chunks(
        query=f"{api_name} API documentation openapi spec",
        n_results=2
    )
    if cached_chunks:
        logger.info("discovery_cache_hit", api=api_name, chunks=len(cached_chunks))
        result["has_docs"] = True
        result["docs_content"] = "\n\n---\n\n".join(cached_chunks)
        return result

    # 2. Try common OpenAPI spec URL patterns
    async with httpx.AsyncClient(timeout=10) as client:
        for pattern in COMMON_SPEC_PATTERNS:
            url = pattern.format(slug=slug)
            logger.info("discovery_trying_spec_url", url=url)
            found = await try_url(client, url)
            if found:
                logger.info("discovery_spec_found", api=api_name, url=found)
                result["docs_url"] = found
                try:
                    resp = await client.get(found, timeout=15, follow_redirects=True)
                    if resp.status_code == 200:
                        content = resp.text[:100_000]
                        result["has_docs"] = True
                        result["docs_content"] = content
                        # Cache in ChromaDB for next time
                        try:
                            await ingest_document(
                                text=content[:20_000],
                                source=f"openapi_{api_name.lower()}"
                            )
                        except Exception:
                            pass
                except Exception:
                    pass
                break

    # 3. If no spec found, try web search via a simple lookup
    if not result["has_docs"]:
        for pattern in COMMON_HEALTH_PATTERNS:
            url = pattern.format(slug=slug)
            found = await try_url(httpx.AsyncClient(timeout=8), url)
            if found:
                result["health_url"] = found
                break

    logger.info("discovery_complete",
                api=api_name,
                docs_url=result["docs_url"],
                health_url=result["health_url"],
                has_docs=result["has_docs"])

    return result
