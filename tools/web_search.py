"""Web search utility."""

import urllib.parse


def web_search(query: str) -> str:
    """Returns a Google search URL for the given query (opens via browser tool)."""
    encoded = urllib.parse.quote_plus(query)
    return f"Search URL prepared: https://www.google.com/search?q={encoded}"
