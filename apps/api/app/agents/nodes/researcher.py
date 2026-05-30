from app.agents.state import OrqestraState
from app.services.vector_service import retrieve_relevant_chunks, ingest_document
from app.services.discovery_service import discover_api
from app.core.logger import logger


async def researcher_node(state: OrqestraState) -> OrqestraState:
    """
    Searches ChromaDB for relevant documentation.
    Falls back to web discovery if empty, caches results for next time.
    """
    logger.info("researcher_node_start", api=state["api_name"])

    primary_queries = [
        state["user_input"],
        f"{state['api_name']} {state['integration_goal']}",
        f"{state['api_name']} authentication",
        f"{state['api_name']} error handling",
    ]

    fallback_queries = [
        f"{state['api_name']} API",
        f"{state['api_name']} integration",
        f"{state['api_name']} getting started",
        f"how to use {state['api_name']}",
    ]

    all_chunks = []
    seen = set()

    async def run_queries(queries: list[str]):
        for query in queries:
            chunks = await retrieve_relevant_chunks(
                query=query,
                n_results=3
            )
            for chunk in chunks:
                if chunk not in seen:
                    seen.add(chunk)
                    all_chunks.append(chunk)

    await run_queries(primary_queries)

    if not all_chunks:
        logger.warning("primary_queries_empty_trying_fallback",
                       api=state["api_name"])
        await run_queries(fallback_queries)

    # Web discovery fallback if both RAG searches returned nothing
    if not all_chunks:
        logger.info("rag_empty_trying_web_discovery",
                    api=state["api_name"])
        discovered = await discover_api(state["api_name"])
        if discovered.get("docs_content"):
            chunk = discovered["docs_content"]
            all_chunks.append(chunk)
            seen.add(chunk)
            # Cache in ChromaDB for future requests
            try:
                await ingest_document(
                    text=discovered["docs_content"],
                    source=f"discovery_{state['api_name'].lower()}"
                )
                logger.info("discovery_docs_cached", api=state["api_name"])
            except Exception:
                pass
        if discovered.get("docs_url"):
            state["docs_url"] = discovered["docs_url"]

    state["retrieved_docs"] = all_chunks[:8]

    if all_chunks:
        state["context"] = "\n\n---\n\n".join(all_chunks[:8])
        logger.info("researcher_node_complete",
                    chunks=len(all_chunks),
                    unique=len(seen))
    else:
        state["context"] = ""
        logger.warning("researcher_node_empty",
                       api=state["api_name"])

    return state