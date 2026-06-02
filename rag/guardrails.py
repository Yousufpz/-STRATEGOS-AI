"""
Phase 8: Guardrails
-------------------
A lightweight safety layer that runs BEFORE any LLM call.
Checks for harmful intent using keyword matching + pattern detection.

In production you'd use an LLM-based classifier or a dedicated
safety model (like Llama Guard). For v1, keyword matching is fine
and fast (no API call needed).
"""

import re

# Keywords that indicate harmful use of power/manipulation tactics
HARMFUL_PATTERNS = [
    # Violence
    r"\b(kill|murder|assault|attack|hurt|harm|injure)\b",
    # Illegal activity  
    r"\b(hack|crack|breach|steal|fraud|scam|launder)\b",
    # Harassment
    r"\b(blackmail|extort|threaten|stalk|harass)\b",
    # Slurs (regex redacted for safety, add your own list)
]

# Topics completely out of scope
OUT_OF_SCOPE_PATTERNS = [
    r"\b(recipe|weather|sports|movie|song|celebrity)\b",
    r"\b(code|programming|debug|syntax|algorithm)\b",
]

HARMFUL_RESPONSE = """⚠️ **Query Outside Scope**

I can help you understand strategic principles from *The 48 Laws of Power*, 
but I cannot provide guidance on harmful, illegal, or unethical applications.

Try rephrasing your question around:
- Navigating workplace dynamics
- Building influence and reputation  
- Understanding human psychology
- Strategic decision-making
"""

OUT_OF_SCOPE_RESPONSE = """🏛️ **I'm Strategos AI**

I'm specialized in *The 48 Laws of Power* and strategic thinking.
Your question seems unrelated to strategy or power dynamics.

Ask me about: navigating office politics, building alliances, 
strategic positioning, or understanding the laws themselves.
"""


def check_query(query: str) -> dict:
    """
    Run the query through all guardrail checks.
    
    Returns:
    {
        "allowed": True/False,
        "reason": "harmful" | "out_of_scope" | None,
        "response": "message to show user" | None
    }
    """
    query_lower = query.lower().strip()
    
    # Too short to be meaningful
    if len(query_lower) < 5:
        return {
            "allowed": False,
            "reason": "too_short",
            "response": "Please ask a complete question about strategy or power dynamics."
        }
    
    # Check for harmful patterns
    for pattern in HARMFUL_PATTERNS:
        if re.search(pattern, query_lower):
            return {
                "allowed": False,
                "reason": "harmful",
                "response": HARMFUL_RESPONSE
            }
    
    # Note: Out-of-scope check is lenient — power dynamics appear in many contexts.
    # We skip the out_of_scope block for v1 to avoid false positives.
    
    return {
        "allowed": True,
        "reason": None,
        "response": None
    }
