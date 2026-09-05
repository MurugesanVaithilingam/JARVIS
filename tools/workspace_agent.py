"""Sandboxed file read/write tools for the developer workspace agent."""

import os

from dotenv import load_dotenv

load_dotenv()
WORKSPACE = os.getenv("WORKSPACE_DIR", os.path.join(os.getcwd(), "jarvis_workspace"))


def verify_and_get_path(relative_path: str) -> str:
    if not WORKSPACE:
        raise ValueError("WORKSPACE_DIR is not configured in your .env file.")

    full_path = os.path.abspath(os.path.join(WORKSPACE, relative_path))
    workspace_root = os.path.abspath(WORKSPACE)
    if not full_path.startswith(workspace_root):
        raise PermissionError("Access Denied: Cannot modify files outside the safe workspace folder.")
    return full_path


def list_workspace_files() -> str:
    try:
        if not os.path.exists(WORKSPACE):
            os.makedirs(WORKSPACE)

        tree = []
        for root, _, files in os.walk(WORKSPACE):
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), WORKSPACE)
                if not any(skip in rel_path for skip in ["node_modules", "__pycache__", ".git", "venv"]):
                    tree.append(rel_path)

        return "Workspace files:\n" + "\n".join(tree) if tree else "The workspace is currently empty."
    except Exception as e:
        return f"Failed to map workspace: {str(e)}"


def read_workspace_file(file_path: str) -> str:
    try:
        target = verify_and_get_path(file_path)
        if not os.path.exists(target):
            return f"Error: File '{file_path}' does not exist."

        with open(target, "r", encoding="utf-8") as f:
            return f"--- Contents of {file_path} ---\n{f.read()}"
    except Exception as e:
        return f"Error reading file: {str(e)}"


def write_workspace_file(file_path: str, code_content: str) -> str:
    try:
        target = verify_and_get_path(file_path)
        parent = os.path.dirname(target)
        if parent:
            os.makedirs(parent, exist_ok=True)

        with open(target, "w", encoding="utf-8") as f:
            f.write(code_content)

        return f"Success: Successfully wrote updates to '{file_path}'."
    except Exception as e:
        return f"Error writing file: {str(e)}"
