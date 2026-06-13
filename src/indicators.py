"""Technical indicators used by the VWAP + EMA + ATR strategy."""

import numpy as np
import pandas as pd


def add_vwap(df: pd.DataFrame) -> pd.DataFrame:
    """Add a session-anchored VWAP column.

    Assumes df has a DatetimeIndex (or "begins_at" column) and
    open/high/low/close/volume columns, and that df contains bars from a
    single trading session (VWAP resets each session).
    """
    typical_price = (df["high"] + df["low"] + df["close"]) / 3
    cum_vol = df["volume"].cumsum()
    cum_vol_tp = (typical_price * df["volume"]).cumsum()
    df["vwap"] = cum_vol_tp / cum_vol
    return df


def add_emas(df: pd.DataFrame, fast: int, slow: int) -> pd.DataFrame:
    df[f"ema_{fast}"] = df["close"].ewm(span=fast, adjust=False).mean()
    df[f"ema_{slow}"] = df["close"].ewm(span=slow, adjust=False).mean()
    return df


def add_atr(df: pd.DataFrame, period: int) -> pd.DataFrame:
    prev_close = df["close"].shift(1)
    high_low = df["high"] - df["low"]
    high_close = (df["high"] - prev_close).abs()
    low_close = (df["low"] - prev_close).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df["atr"] = true_range.ewm(span=period, adjust=False).mean()
    return df


def add_volume_avg(df: pd.DataFrame, lookback: int) -> pd.DataFrame:
    df["volume_avg"] = df["volume"].rolling(window=lookback, min_periods=1).mean()
    return df


def compute_indicators(df: pd.DataFrame, ema_fast: int, ema_slow: int,
                        atr_period: int, volume_lookback: int) -> pd.DataFrame:
    """Run all indicator calculations and return the enriched dataframe."""
    df = df.copy()
    for col in ("open", "high", "low", "close", "volume"):
        df[col] = df[col].astype(float)

    df = add_vwap(df)
    df = add_emas(df, ema_fast, ema_slow)
    df = add_atr(df, atr_period)
    df = add_volume_avg(df, volume_lookback)
    return df
