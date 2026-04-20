"""Match frontend `getRtwUiProfile` — British / Irish citizen RTW category (string labels)."""


def _normalise(category: str | None) -> str:
    return (category or "").lower().replace("  ", " ").strip()


def is_british_irish_rtw_category(category: str | None) -> bool:
    if not category or not str(category).strip():
        return False
    n = _normalise(category)
    if "pre-settled" in n or "pre settled" in n:
        return False
    if "british" in n:
        return True
    if "irish" in n and "citizen" in n:
        return True
    return False


def is_time_limited_rtw_category(category: str | None) -> bool:
    """Categories whose RTW must be re-verified before visa expiry.

    Pre-settled status, sponsored workers, and non-sponsored visa holders
    (graduate / dependant / etc.) all require follow-up RTW checks.
    """
    if not category or not str(category).strip():
        return False
    n = _normalise(category)
    if "pre-settled" in n or "pre settled" in n:
        return True
    if "non-sponsored" in n or "non sponsored" in n:
        return True
    if "sponsored" in n:
        return True
    return False
