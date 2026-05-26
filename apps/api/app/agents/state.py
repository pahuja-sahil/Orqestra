from typing import TypedDict, Optional, Literal

# Fix scope classification for self-healing
FixScope = Literal["minimal", "moderate", "complete"]


class OrqestraState(TypedDict):
    # Input
    user_input: str
    source: str

    # Planning
    api_name: str
    integration_goal: str
    integration_steps: list
    language: str

    # Research
    retrieved_docs: list
    context: str

    # Repo Context 
    repo_url: str
    repo_context: str
    target_file: str
    default_branch: str
    repo_path: str
    existing_file_content: str
    user_id: str
    db: Optional[object]

    # Code Generation
    generated_code: str
    code_explanation: str

    # Evaluation
    quality_score: int
    evaluation_notes: str
    retry_count: int

    # Output
    final_response: str
    error: Optional[str]
    error_reason: Optional[str]
    repair_intent: Optional[str]
    fix_scope: Optional[FixScope]