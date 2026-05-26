from app.agents.state import OrqestraState
from app.core.logger import logger
from app.services.github_service import analyze_repo


async def repo_context_node(state: OrqestraState) -> OrqestraState:
    """
    Reads key files from user's repo.
    Passes repo context to CodeGen so it writes
    code that FITS existing patterns not generic code.
    Only runs if user provided a repo_url in state.
    """
    repo_url = state.get("repo_url", "")

    if not repo_url or not state.get("db") or not state.get("user_id"):
        logger.info("repo_context_skipped",
                    reason="no repo_url or db or user_id")
        state["repo_context"] = ""
        return state

    try:

        repo_data = await analyze_repo(
            repo_url=repo_url,
            user_id=state["user_id"],
            db=state["db"],
            api_name=state.get("api_name", "")
        )

        # Check if already integrated
        api_name_lower = state["api_name"].lower()
        already_integrated = api_name_lower in [
            x.lower() for x in repo_data["existing_integrations"]
        ]

        if already_integrated:
            logger.warning("api_already_integrated",
                           api=state["api_name"],
                           repo=repo_url)
            state["repo_context"] = f"NOTE: {state['api_name']} appears to already be integrated in this repo."
            state["target_file"] = repo_data["best_file"]
            return state

        existing_file_content = repo_data.get("existing_file_content", "")
        
        context_parts = [
            f"Repository: {repo_data['repo_name']}",
            f"Language: {repo_data['language']}",
            f"Target file: {repo_data['best_file']}",
            f"Existing integrations: {', '.join(repo_data['existing_integrations']) or 'none'}",
            "",
            "KEY FILES IN THIS REPO:",
        ]

        for file_path, content in repo_data["key_files_content"].items():
            context_parts.append(f"\n--- {file_path} ---")
            context_parts.append(content[:1000])

        state["repo_context"] = "\n".join(context_parts)
        state["target_file"] = repo_data["best_file"]
        state["language"] = repo_data["language"]
        state["default_branch"] = repo_data["default_branch"]
        state["repo_path"] = repo_data["repo_path"]
        state["existing_file_content"] = existing_file_content

        logger.info("repo_context_built",
                    repo=repo_url,
                    target_file=repo_data["best_file"],
                    language=repo_data["language"])

    except Exception as e:
        logger.error("repo_context_failed", error=str(e))
        state["repo_context"] = ""

    return state