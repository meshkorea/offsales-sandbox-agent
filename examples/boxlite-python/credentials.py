"""Agent detection and credential helpers for sandbox-agent examples."""

import os
import sys


def detect_agent() -> str:
    """Pick an agent based on env vars. Exits if no credentials are found."""
    if os.environ.get("SANDBOX_AGENT"):
        return os.environ["SANDBOX_AGENT"]
    has_anthropic = bool(
        os.environ.get("ANTHROPIC_API_KEY")
        or os.environ.get("CLAUDE_API_KEY")
    )
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    if has_anthropic or has_openai:
        return "opencode"
    print("No API keys found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.")
    sys.exit(1)


def build_box_env() -> list[tuple[str, str]]:
    """Collect credential env vars to forward into the BoxLite sandbox."""
    env: list[tuple[str, str]] = []
    for key in ("ANTHROPIC_API_KEY", "CLAUDE_API_KEY", "OPENAI_API_KEY", "CODEX_API_KEY"):
        val = os.environ.get(key)
        if val:
            env.append((key, val))
    return env
