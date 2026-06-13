"""Position sizing and risk checks."""

import math

import config


def contracts_to_trade(account_equity: float, entry_underlying_price: float,
                        stop_underlying_price: float, option_price: float,
                        risk_pct: float = config.RISK_PCT_PER_TRADE,
                        contract_multiplier: int = config.CONTRACT_MULTIPLIER) -> int:
    """Size a position so that hitting the underlying's ATR stop loses
    roughly `risk_pct` of account equity, approximating the option's
    delta-1 move with the underlying's price move.

    Falls back to 1 contract if the computed size is 0 but the account
    can afford at least one contract.
    """
    dollar_risk = account_equity * risk_pct
    underlying_move = abs(entry_underlying_price - stop_underlying_price)
    if underlying_move <= 0:
        return 0

    risk_per_contract = underlying_move * contract_multiplier
    if risk_per_contract <= 0:
        return 0

    size = math.floor(dollar_risk / risk_per_contract)

    contract_cost = option_price * contract_multiplier
    max_affordable = math.floor(account_equity / contract_cost) if contract_cost > 0 else 0

    if size <= 0:
        size = 1 if max_affordable >= 1 else 0

    return min(size, max_affordable)
