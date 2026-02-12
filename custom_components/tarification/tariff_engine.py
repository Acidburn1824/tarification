from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any

def _parse_hhmm(s: str) -> time:
    # Accept "HH:MM"
    h, m = s.strip().split(":")
    return time(hour=int(h), minute=int(m))

def _today_at(dt: datetime, t: time) -> datetime:
    return dt.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)

def _ensure_tz(dt: datetime) -> datetime:
    # dt should already be tz-aware from HA; but keep safe.
    if dt.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    return dt

@dataclass(frozen=True)
class TariffSnapshot:
    now: datetime
    current_state: str
    next_state: str | None
    next_change: datetime | None
    remaining_s: int | None
    price_now: float | None
    period: str | None
    debug: dict[str, Any]

def compute_snapshot(
    *,
    now: datetime,
    plages: list[dict[str, str]],
    default_state: str,
    prices: dict[str, float] | None = None,
    tempo_today: str | None = None,
) -> TariffSnapshot:
    """Compute current tariff state and next change.
    plages: list of {start:"HH:MM", end:"HH:MM", state:"HC|HSC|HP"}.
    default_state applies outside any plage. Overlaps resolved by order (last wins).
    Cross-midnight supported (start > end means ends next day).
    """
    now = _ensure_tz(now)
    prices = prices or {}
    debug: dict[str, Any] = {
        "rules_count": len(plages),
        "matched": [],
        "tempo_today": tempo_today,
    }

    # Build active windows for yesterday/today to correctly catch cross-midnight.
    windows: list[tuple[datetime, datetime, str, int]] = []
    for idx, p in enumerate(plages):
        st = _parse_hhmm(p["start"])
        en = _parse_hhmm(p["end"])
        state = p.get("state", default_state)

        # Two anchors: today and yesterday (to capture cross-midnight spanning into today)
        for day_offset in (0, -1):
            anchor = (now + timedelta(days=day_offset)).date()
            start_dt = datetime.combine(anchor, st, tzinfo=now.tzinfo)
            end_dt = datetime.combine(anchor, en, tzinfo=now.tzinfo)
            if end_dt <= start_dt:
                end_dt = end_dt + timedelta(days=1)
            windows.append((start_dt, end_dt, state, idx))

    # Determine current by applying matches in order (last match wins)
    current = default_state
    active_window = None
    for start_dt, end_dt, state, idx in sorted(windows, key=lambda x: (x[0], x[3])):
        if start_dt <= now < end_dt:
            current = state
            active_window = (start_dt, end_dt, state, idx)
            debug["matched"].append({"idx": idx, "state": state, "start": start_dt.isoformat(), "end": end_dt.isoformat()})

    # Find next change by scanning upcoming boundaries within 48h
    boundaries: list[tuple[datetime, str]] = []
    horizon = now + timedelta(hours=48)
    # Candidate boundary times: each window start and end between now and horizon
    for start_dt, end_dt, state, idx in windows:
        for b_dt, kind in ((start_dt, "start"), (end_dt, "end")):
            if now < b_dt <= horizon:
                boundaries.append((b_dt, kind))

    # Add a fallback boundary at horizon (no change)
    boundaries.sort(key=lambda x: x[0])

    def state_at(t: datetime) -> str:
        s = default_state
        for start_dt, end_dt, stt, idx in sorted(windows, key=lambda x: (x[0], x[3])):
            if start_dt <= t < end_dt:
                s = stt
        return s

    next_change = None
    next_state = None
    for b_dt, kind in boundaries:
        s = state_at(b_dt + timedelta(seconds=1))  # after boundary
        if s != current:
            next_change = b_dt
            next_state = s
            break

    remaining_s = None
    if next_change is not None:
        remaining_s = max(0, int((next_change - now).total_seconds()))

    price_now = None
    if current in prices:
        try:
            price_now = float(prices[current])
        except Exception:
            price_now = None

    # Period is optional; you can extend later for seasonality
    period = None

    if active_window:
        debug["active"] = {"idx": active_window[3], "state": active_window[2], "start": active_window[0].isoformat(), "end": active_window[1].isoformat()}
    else:
        debug["active"] = None

    return TariffSnapshot(
        now=now,
        current_state=current,
        next_state=next_state,
        next_change=next_change,
        remaining_s=remaining_s,
        price_now=price_now,
        period=period,
        debug=debug,
    )
