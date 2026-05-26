from langgraph.graph import StateGraph, END
from app.agents.state import OrqestraState
from app.agents.nodes.planner import planner_node
from app.agents.nodes.researcher import researcher_node
from app.agents.nodes.codegen import codegen_node
from app.agents.nodes.evaluator import evaluator_node, should_retry
from app.agents.nodes.repo_context import repo_context_node
from app.core.monitoring import track_agent_run
from app.core.logger import logger



async def format_node(state: OrqestraState) -> OrqestraState:
    response = state.get("generated_code", "")
    if not response:
        response = "I was unable to generate a response. Please try again."
    state["final_response"] = response
    logger.info("format_node_complete",
                score=state.get("quality_score", 0),
                retries=state.get("retry_count", 0))
    return state


def build_orqestra_agent():
    """
    Builds and compiles the multi-agent LangGraph.

    Flow:
    planner → repo_context → researcher → codegen → evaluator
                                                         ↓
                                                    [score < 7?]
                                                    /           \\
                                                retry           end
                                                  ↓               ↓
                                               codegen         format → END
    """
    graph = StateGraph(OrqestraState)

    graph.add_node("planner", planner_node)
    graph.add_node("repo_context", repo_context_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("codegen", codegen_node)
    graph.add_node("evaluator", evaluator_node)
    graph.add_node("format", format_node)

    def should_continue_after_planning(state: OrqestraState):
        if state.get("api_name") == "invalid":
            return "end"
        return "continue"

    graph.set_entry_point("planner")
    graph.add_conditional_edges(
        "planner",
        should_continue_after_planning,
        {
            "continue": "repo_context",
            "end": "format"
        }
    )
    graph.add_edge("repo_context", "researcher")
    graph.add_edge("researcher", "codegen")
    graph.add_edge("codegen", "evaluator")

    graph.add_conditional_edges(
        "evaluator",
        should_retry,
        {
            "retry": "codegen",
            "end": "format"
        }
    )

    graph.add_edge("format", END)
    return graph.compile()


orqestra_agent = build_orqestra_agent()


async def run_orqestra_agent(
    user_input: str,
    source: str = "text",
    repo_url: str = "",
    user_id: str = "",
    db=None,
    error_reason: str = None
) -> str:
    """
    Main entry point. Called from converse_service.py
    """
    logger.info("orqestra_agent_invoked",
                source=source,
                input=user_input[:50])

    input_text = user_input
    # If user says "done" or similar after providing a repo URL, 
    # we should look at the history or assume they want to proceed with the integration.
    if input_text.lower().strip() in ["done", "proceed", "go", "start"] and repo_url:
        # Inject a more descriptive intent for the planner
        input_text = f"Proceed with the integration in the repo {repo_url}"

    initial_state: OrqestraState = {
        "user_input": input_text,
        "source": source,
        "api_name": "",
        "integration_goal": "",
        "integration_steps": [],
        "language": "python",
        "retrieved_docs": [],
        "context": "",
        "repo_url": repo_url,
        "repo_context": "",
        "target_file": "",
        "default_branch": "main",
        "repo_path": "",
        "existing_file_content": "",
        "user_id": user_id,
        "db": db,
        "generated_code": "",
        "code_explanation": "",
        "quality_score": 0,
        "evaluation_notes": "",
        "retry_count": 0,
        "final_response": "",
        "error": None,
        "error_reason": error_reason
    }

    try:
        final_state = await orqestra_agent.ainvoke(initial_state)
        track_agent_run(
            user_input=user_input,
            api_name=final_state.get("api_name", ""),
            final_response=final_state["final_response"],
            quality_score=final_state.get("quality_score", 0),
            retry_count=final_state.get("retry_count", 0),
            source=source
        )
        return {
            "response": final_state["final_response"],
            "api_name": final_state.get("api_name", ""),
            "success": final_state.get("error") is None
        }
    except Exception as e:
        logger.error("orqestra_agent_failed", error=str(e))
        return {
            "response": "I encountered an issue with my agent pipeline. Please try again.",
            "api_name": "",
            "success": False
        }