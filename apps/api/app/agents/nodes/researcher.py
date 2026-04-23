from app.agents.state import NexusState
from app.services.vector_service import retrieve_relevant_chunks
from app.core.logger import logger


async def researcher_node(state: NexusState) -> NexusState:
    """
    Searches ChromaDB for relevant documentation.
    Uses multiple targeted queries for better retrieval.
    """
    logger.info("researcher_node_start", api=state["api_name"])

    queries = [
        state["user_input"],
        f"{state['api_name']} {state['integration_goal']}",
        f"{state['api_name']} authentication",
        f"{state['api_name']} error handling",
    ]

    all_chunks = []
    seen = set()

    for query in queries:
        chunks = await retrieve_relevant_chunks(
            query=query,
            n_results=3
        )
        for chunk in chunks:
            if chunk not in seen:
                seen.add(chunk)
                all_chunks.append(chunk)

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