from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from app.services.vector_service import retrieve_relevant_chunks
from app.core.config import settings
from app.core.logger import logger

# ─── State ────────────────────────────────────────────
# This is the data that flows through all nodes
# Each node reads from state and writes back to state
class AgentState(TypedDict):
    user_input: str          # what user said/typed
    source: str              # "voice" or "text"
    retrieved_docs: list     # chunks from ChromaDB
    context: str             # formatted context for LLM
    response: str            # final response to user
    error: str | None        # error if something fails

# ─── LLM Setup ────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.3
)

# ─── Node 1: Retrieve ─────────────────────────────────
async def retrieve_node(state: AgentState) -> AgentState:
    """
    Searches ChromaDB for relevant documentation
    based on the user's question
    """
    logger.info("agent_retrieve", query=state["user_input"][:50])

    chunks = await retrieve_relevant_chunks(
        query=state["user_input"],
        n_results=5
    )

    state["retrieved_docs"] = chunks

    if chunks:
        state["context"] = "\n\n---\n\n".join(chunks)
        logger.info("context_built", chunks=len(chunks))
    else:
        state["context"] = ""
        logger.info("no_context_found")

    return state


# ─── Node 2: Generate ─────────────────────────────────
async def generate_node(state: AgentState) -> AgentState:
    """
    Sends user question + retrieved context to Gemini
    Gets back an intelligent response
    """
    logger.info("agent_generate")

    try:
        if state["context"]:
            prompt = f"""You are NEXUS, an intelligent API integration assistant.
Use the following documentation context to answer the user's question.
Be concise, practical, and developer-friendly.
If the context doesn't contain enough information, say so honestly.

DOCUMENTATION CONTEXT:
{state["context"]}

USER QUESTION: {state["user_input"]}

Provide a clear, actionable response:"""
        else:
            prompt = f"""You are NEXUS, an intelligent API integration assistant.
You help developers integrate APIs, write code, and solve technical problems.
Be concise, practical, and developer-friendly.
If you need specific API documentation to give a better answer, mention that.

USER QUESTION: {state["user_input"]}

Provide a clear, actionable response:"""

        response = await llm.ainvoke(prompt)
        state["response"] = response.content
        logger.info("response_generated", length=len(response.content))

    except Exception as e:
        logger.error("generation_failed", error=str(e))
        state["error"] = str(e)
        state["response"] = "I encountered an error processing your request. Please try again."

    return state


# ─── Node 3: Format ───────────────────────────────────
async def format_node(state: AgentState) -> AgentState:
    """
    Cleans and formats the final response
    Adds context about what was used
    """
    if state.get("error"):
        return state

    response = state["response"]

    if state["retrieved_docs"]:
        response = f"{response}\n\n_Based on {len(state['retrieved_docs'])} documentation chunks._"

    state["response"] = response
    return state


# ─── Build Graph ──────────────────────────────────────
def build_rag_agent():
    """
    Connects the nodes into a graph:
    retrieve → generate → format → END
    """
    graph = StateGraph(AgentState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.add_node("format", format_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "format")
    graph.add_edge("format", END)

    return graph.compile()


# Single instance reused across requests
rag_agent = build_rag_agent()


async def run_agent(user_input: str, source: str = "text") -> str:
    """
    Main entry point for the agent.
    Called from converse_service.py
    """
    logger.info("agent_invoked", source=source, input=user_input[:50])

    initial_state: AgentState = {
        "user_input": user_input,
        "source": source,
        "retrieved_docs": [],
        "context": "",
        "response": "",
        "error": None
    }

    final_state = await rag_agent.ainvoke(initial_state)
    return final_state["response"]