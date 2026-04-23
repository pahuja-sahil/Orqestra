from langgraph.graph import StateGraph, END
from app.agents.state import NexusState
from app.agents.nodes.planner import planner_node
from app.agents.nodes.researcher import researcher_node
from app.agents.nodes.codegen import codegen_node
from app.agents.nodes.evaluator import evaluator_node, should_retry
from app.core.logger import logger


async def format_node(state: NexusState) -> NexusState:
    """
    Final formatting before sending to user.
    Adds quality metadata if useful.
    """
    response = state.get("generated_code", "")

    if not response:
        response = "I was unable to generate a response. Please try again."

    state["final_response"] = response
    logger.info("format_node_complete",
                score=state.get("quality_score", 0),
                retries=state.get("retry_count", 0))
    return state


def build_nexus_agent():
    """
    Builds and compiles the multi-agent LangGraph.

    Flow:
    planner → researcher → codegen → evaluator
                                         ↓
                                    [score < 7?]
                                    /           \\
                                retry           end
                                  ↓               ↓
                               codegen         format → END
    """
    graph = StateGraph(NexusState)

    graph.add_node("planner", planner_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("codegen", codegen_node)
    graph.add_node("evaluator", evaluator_node)
    graph.add_node("format", format_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "researcher")
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


nexus_agent = build_nexus_agent()


async def run_nexus_agent(user_input: str, source: str = "text") -> str:
    """
    Main entry point. Called from converse_service.py
    """
    logger.info("nexus_agent_invoked",
                source=source,
                input=user_input[:50])

    initial_state: NexusState = {
        "user_input": user_input,
        "source": source,
        "api_name": "",
        "integration_goal": "",
        "integration_steps": [],
        "language": "python",
        "retrieved_docs": [],
        "context": "",
        "generated_code": "",
        "code_explanation": "",
        "quality_score": 0,
        "evaluation_notes": "",
        "retry_count": 0,
        "final_response": "",
        "error": None
    }

    try:
        final_state = await nexus_agent.ainvoke(initial_state)
        return final_state["final_response"]
    except Exception as e:
        logger.error("nexus_agent_failed", error=str(e))
        return "I encountered an issue with my agent pipeline. Please try again."