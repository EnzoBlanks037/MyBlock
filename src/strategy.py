"""Signal generation for the VWAP + EMA9/21 + ATR single-leg options strategy.

Entry rules (evaluated on the most recently closed bar):

  CALL (buy-to-open call):
    - price reclaims VWAP and holds above it (prev close <= vwap, current
      close > vwap)
    - EMA9 crosses above EMA21 (momentum confirmation)
    - volume on the bar is above its recent average

  PUT (buy-to-open put):
    - price rejects VWAP and trades below it (prev close >= vwap, current
      close < vwap)
    - EMA9 crosses below EMA21
    - volume on the bar is above its recent average

Exit rules (evaluated against an open position):
    - stop loss: 1 x ATR (at entry) against the position
    - profit target: 2 x ATR (at entry) in favor of the position
    - reversal: price closes back across VWAP against the position, or
      EMA9 crosses back through EMA21 against the position
"""

from dataclasses import dataclass
from typing import Optional

import config


@dataclass
class Signal:
    direction: str  # "call" or "put"
    price: float
    atr: float


def _ema_crossed_up(prev_row, row, fast_col: str, slow_col: str) -> bool:
    return prev_row[fast_col] <= prev_row[slow_col] and row[fast_col] > row[slow_col]


def _ema_crossed_down(prev_row, row, fast_col: str, slow_col: str) -> bool:
    return prev_row[fast_col] >= prev_row[slow_col] and row[fast_col] < row[slow_col]


def generate_entry_signal(df, ema_fast: int = config.EMA_FAST,
                           ema_slow: int = config.EMA_SLOW) -> Optional[Signal]:
    """Return an entry Signal for the latest completed bar, or None."""
    if len(df) < 2:
        return None

    fast_col, slow_col = f"ema_{ema_fast}", f"ema_{ema_slow}"
    prev_row, row = df.iloc[-2], df.iloc[-1]

    volume_confirmed = row["volume"] > row["volume_avg"]
    if not volume_confirmed:
        return None

    reclaimed_vwap = prev_row["close"] <= prev_row["vwap"] and row["close"] > row["vwap"]
    if reclaimed_vwap and _ema_crossed_up(prev_row, row, fast_col, slow_col):
        return Signal(direction="call", price=row["close"], atr=row["atr"])

    rejected_vwap = prev_row["close"] >= prev_row["vwap"] and row["close"] < row["vwap"]
    if rejected_vwap and _ema_crossed_down(prev_row, row, fast_col, slow_col):
        return Signal(direction="put", price=row["close"], atr=row["atr"])

    return None


def compute_stop_and_target(direction: str, entry_price: float, atr: float,
                             stop_mult: float = config.ATR_STOP_MULTIPLIER,
                             target_mult: float = config.ATR_TARGET_MULTIPLIER):
    """Return (stop_price, target_price) for the underlying given direction."""
    if direction == "call":
        stop_price = entry_price - stop_mult * atr
        target_price = entry_price + target_mult * atr
    else:  # put
        stop_price = entry_price + stop_mult * atr
        target_price = entry_price - target_mult * atr
    return stop_price, target_price


def check_exit(df, position: dict, ema_fast: int = config.EMA_FAST,
               ema_slow: int = config.EMA_SLOW) -> Optional[str]:
    """Return a reason string if the open position should be closed now."""
    if len(df) < 2:
        return None

    fast_col, slow_col = f"ema_{ema_fast}", f"ema_{ema_slow}"
    prev_row, row = df.iloc[-2], df.iloc[-1]
    direction = position["direction"]
    price = row["close"]

    if direction == "call":
        if price <= position["stop_price"]:
            return "stop_loss"
        if price >= position["target_price"]:
            return "profit_target"
        if prev_row["close"] >= prev_row["vwap"] and row["close"] < row["vwap"]:
            return "vwap_reversal"
        if _ema_crossed_down(prev_row, row, fast_col, slow_col):
            return "ema_reversal"
    else:  # put
        if price >= position["stop_price"]:
            return "stop_loss"
        if price <= position["target_price"]:
            return "profit_target"
        if prev_row["close"] <= prev_row["vwap"] and row["close"] > row["vwap"]:
            return "vwap_reversal"
        if _ema_crossed_up(prev_row, row, fast_col, slow_col):
            return "ema_reversal"

    return None
