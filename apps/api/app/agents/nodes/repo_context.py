from app.agents.state import OrqestraState
from app.core.logger import logger
from app.services.github_service import analyze_repo


async def repo_context_node(state: OrqestraState) -> OrqestraState:
    """
    Analyzes the repo.

    If user specified a target_file, fetches its content (or marks as new file).
    If user did NOT specify a target_file, asks the user which file to use
    and pauses code generation.
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

        user_target_file = state.get("target_file", "").strip()

        # --- No target file specified → ask the user ---
        if not user_target_file:
            source_exts = {".py", ".js", ".ts", ".tsx", ".jsx"}
            all_files = repo_data.get("all_files", [])
            source_files = [f for f in all_files
                           if any(f.endswith(ext) for ext in source_exts)]
            if not source_files:
                source_files = all_files[:20]

            file_list = "\n".join(f"  - {f}" for f in source_files[:20])

            state["skip_codegen"] = True
            state["final_response"] = (
                f"I found the following source files in your repository. "
                f"Which file would you like me to add the "
                f"{state.get('api_name', 'API')} integration to?\n\n"
                f"Available files:\n{file_list}\n\n"
                f"Please specify the file path (e.g. `services/myfile.py`)."
            )
            logger.info("repo_context_ask_target_file",
                        files_found=len(source_files))
            return state

        # --- User specified a target file ---
        target_file = user_target_file
        existing_content = repo_data["key_files_content"].get(target_file, "")

        state["target_file"] = target_file
        state["existing_file_content"] = existing_content
        state["language"] = repo_data["language"]
        state["default_branch"] = repo_data["default_branch"]
        state["repo_path"] = repo_data["repo_path"]

        # Build repo context for codegen
        context_parts = [
            f"Repository: {repo_data['repo_name']}",
            f"Language: {repo_data['language']}",
            f"Target file: {target_file}",
            f"Existing integrations: {', '.join(repo_data['existing_integrations']) or 'none'}",
            "",
            "KEY FILES IN THIS REPO:",
        ]

        if existing_content:
            context_parts.append(
                f"NOTE: {target_file} already exists in this repo. "
                "New code will be appended.")

        for file_path, content in repo_data["key_files_content"].items():
            context_parts.append(f"\n--- {file_path} ---")
            context_parts.append(content[:1000])

        state["repo_context"] = "\n".join(context_parts)

        logger.info("repo_context_built",
                    repo=repo_url,
                    target_file=target_file,
                    language=repo_data["language"],
                    file_exists=bool(existing_content))

    except Exception as e:
        logger.error("repo_context_failed", error=str(e))
        state["repo_context"] = ""

    return state
