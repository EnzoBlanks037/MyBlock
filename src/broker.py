"""Thin wrapper around robin_stocks for market data, account info, and
options order placement."""

import datetime as dt
import logging

import pandas as pd
import pyotp
import robin_stocks.robinhood as rh

import config

log = logging.getLogger(__name__)


def login():
    """Authenticate with Robinhood using credentials/TOTP from config."""
    mfa_code = None
    if config.ROBINHOOD_TOTP_SECRET:
        mfa_code = pyotp.TOTP(config.ROBINHOOD_TOTP_SECRET).now()

    rh.login(
        username=config.ROBINHOOD_USERNAME,
        password=config.ROBINHOOD_PASSWORD,
        mfa_code=mfa_code,
        store_session=True,
    )
    log.info("Logged in to Robinhood")


def logout():
    rh.logout()


def get_intraday_bars(ticker: str, interval: str = config.BAR_INTERVAL,
                       span: str = config.BAR_SPAN) -> pd.DataFrame:
    """Fetch today's intraday OHLCV bars for `ticker` as a DataFrame."""
    raw = rh.get_stock_historicals(ticker, interval=interval, span=span,
                                    bounds="regular")
    if not raw:
        return pd.DataFrame()

    df = pd.DataFrame(raw)
    df["begins_at"] = pd.to_datetime(df["begins_at"])
    df = df.rename(columns={
        "open_price": "open",
        "high_price": "high",
        "low_price": "low",
        "close_price": "close",
    })
    df = df[["begins_at", "open", "high", "low", "close", "volume"]]
    df = df.set_index("begins_at")

    today = dt.datetime.now(dt.timezone.utc).date()
    df = df[df.index.date == today]
    return df


def get_account_equity() -> float:
    profile = rh.load_portfolio_profile()
    return float(profile["equity"])


def get_last_price(ticker: str) -> float:
    return float(rh.get_latest_price(ticker)[0])


def _nearest_weekly_expiration(ticker: str) -> str:
    """Return the nearest available options expiration date (YYYY-MM-DD)."""
    dates = rh.get_chains(ticker)["expiration_dates"]
    return sorted(dates)[0]


def find_atm_option(ticker: str, direction: str) -> dict:
    """Find the at-the-money option for the nearest expiration.

    `direction` is "call" or "put". Returns the option instrument data
    dict from Robinhood, including its current mark price under
    `adjusted_mark_price` (filled in by find_options_by_expiration).
    """
    expiration = _nearest_weekly_expiration(ticker)
    option_type = "call" if direction == "call" else "put"
    options = rh.find_options_by_expiration(ticker, expirationDate=expiration,
                                              optionType=option_type)
    if not options:
        raise RuntimeError(f"No {option_type} options found for {ticker} {expiration}")

    underlying_price = get_last_price(ticker)
    closest = min(options, key=lambda o: abs(float(o["strike_price"]) - underlying_price))
    return closest


def get_option_mark_price(option: dict) -> float:
    market_data = rh.get_option_market_data_by_id(option["id"])
    return float(market_data[0]["adjusted_mark_price"])


def place_option_buy(option: dict, quantity: int, limit_price: float):
    """Buy-to-open `quantity` contracts of `option` at `limit_price`."""
    return rh.order_buy_option_limit(
        positionEffect="open",
        creditOrDebit="debit",
        price=limit_price,
        symbol=option["chain_symbol"],
        quantity=quantity,
        expirationDate=option["expiration_date"],
        strike=float(option["strike_price"]),
        optionType=option["type"],
    )


def place_option_sell(option: dict, quantity: int, limit_price: float):
    """Sell-to-close `quantity` contracts of `option` at `limit_price`."""
    return rh.order_sell_option_limit(
        positionEffect="close",
        creditOrDebit="credit",
        price=limit_price,
        symbol=option["chain_symbol"],
        quantity=quantity,
        expirationDate=option["expiration_date"],
        strike=float(option["strike_price"]),
        optionType=option["type"],
    )
