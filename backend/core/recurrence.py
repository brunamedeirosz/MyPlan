from calendar import monthrange
from datetime import date, timedelta


def next_deadline(due, frequency, anchor, today):
    """Return one future occurrence, preserving weekday or the original month day."""
    if frequency == 'diaria':
        return max(due, today) + timedelta(days=1)
    if frequency == 'semanal':
        steps = max(1, (today - due).days // 7 + 1)
        return due + timedelta(days=7 * steps)
    base = max(due, today)
    months = base.year * 12 + base.month - 1
    year, month_index = divmod(months, 12)
    candidate = date(year, month_index + 1, min(anchor.day, monthrange(year, month_index + 1)[1]))
    if candidate <= base:
        year, month_index = divmod(months + 1, 12)
        candidate = date(year, month_index + 1, min(anchor.day, monthrange(year, month_index + 1)[1]))
    return candidate
