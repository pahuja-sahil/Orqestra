from app.agents.state import OrqestraState
from app.services.vector_service import retrieve_relevant_chunks
from app.core.logger import logger


async def researcher_node(state: OrqestraState) -> OrqestraState:
    """
    Searches ChromaDB for relevant documentation.
    Uses multiple targeted queries for better retrieval.
    Self-improves by trying fallback queries if primary search empty.
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