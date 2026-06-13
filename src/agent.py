"""Main loop for the VWAP + EMA9/21 + ATR single-leg options agent.

Usage:
    python -m src.agent

Safety: orders are only sent to Robinhood if CONFIRM_LIVE_TRADING=YES is
set in the environment (see .env.example). Otherwise the agent runs in
dry-run mode: it logs every signal and the order it *would* place.
"""

import datetime as dt
import logging
import time

import pytz

import config
from src import broker, indicators, risk, state, strategy

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO,
                     format="%(asctime)s %(levelname)s %(message)s")

ET = pytz.timezone("America/New_York")


def _now_et() -> dt.datetime:
    return dt.datetime.now(ET)


def _time_in_range(now: dt.datetime, start: str, end: str) -> bool:
    start_t = dt.datetime.strptime(start, "%H:%M").time()
    end_t = dt.datetime.strptime(end, "%H:%M").time()
    return start_t <= now.time() <= end_t


def _in_entry_window(now: dt.datetime) -> bool:
    return _time_in_range(now, config.ENTRY_WINDOW_START, config.ENTRY_WINDOW_END)


def _market_open(now: dt.datetime) -> bool:
    return _time_in_range(now, config.ENTRY_WINDOW_START, config.MARKET_CLOSE)


def _enter_position(ticker: str, signal: strategy.Signal, equity: float,
                     positions: dict) -> None:
    stop_price, target_price = strategy.compute_stop_and_target(
        signal.direction, signal.price, signal.atr)

    option = broker.find_atm_option(ticker, signal.direction)
    option_price = broker.get_option_mark_price(option)

    quantity = risk.contracts_to_trade(equity, signal.price, stop_price, option_price)
    if quantity <= 0:
        log.info("%s %s signal at %.2f, but position size is 0 - skipping",
                 ticker, signal.direction, signal.price)
        return

    log.info("%s ENTRY %s | underlying=%.2f stop=%.2f target=%.2f | "
             "option=%s %s strike=%s exp=%s mark=%.2f qty=%d",
             ticker, signal.direction.upper(), signal.price, stop_price,
             target_price, option["chain_symbol"], option["type"],
             option["strike_price"], option["expiration_date"],
             option_price, quantity)

    if config.LIVE_TRADING:
        broker.place_option_buy(option, quantity, option_price)
    else:
        log.info("[DRY RUN] would buy-to-open %d contract(s)", quantity)

    positions[ticker] = {
        "direction": signal.direction,
        "entry_underlying_price": signal.price,
        "stop_price": stop_price,
        "target_price": target_price,
        "option": option,
        "quantity": quantity,
        "opened_at": _now_et().isoformat(),
    }


def _exit_position(ticker: str, reason: str, positions: dict) -> None:
    position = positions[ticker]
    option = position["option"]
    quantity = position["quantity"]

    log.info("%s EXIT %s | reason=%s qty=%d", ticker,
             position["direction"].upper(), reason, quantity)

    if config.LIVE_TRADING:
        exit_price = broker.get_option_mark_price(option)
        broker.place_option_sell(option, quantity, exit_price)
    else:
        log.info("[DRY RUN] would sell-to-close %d contract(s)", quantity)

    del positions[ticker]


def _flatten_all(positions: dict) -> None:
    for ticker in list(positions.keys()):
        _exit_position(ticker, "market_close", positions)


def run_once(positions: dict) -> None:
    now = _now_et()
    equity = broker.get_account_equity()

    for ticker in config.TICKERS:
        df = broker.get_intraday_bars(ticker)
        if df.empty:
            log.warning("No intraday data for %s", ticker)
            continue

        df = indicators.compute_indicators(
            df, config.EMA_FAST, config.EMA_SLOW,
            config.ATR_PERIOD, config.VOLUME_LOOKBACK)

        if ticker in positions:
            reason = strategy.check_exit(df, positions[ticker])
            if reason:
                _exit_position(ticker, reason, positions)
            continue

        if not _in_entry_window(now):
            continue

        signal = strategy.generate_entry_signal(df)
        if signal:
            _enter_position(ticker, signal, equity, positions)


def main() -> None:
    if not config.LIVE_TRADING:
        log.warning("Running in DRY-RUN mode. Set CONFIRM_LIVE_TRADING=YES "
                     "in .env to place real orders.")

    broker.login()
    positions = state.load_positions()

    try:
        while True:
            now = _now_et()
            if not _market_open(now):
                if now.time() > dt.datetime.strptime(config.MARKET_CLOSE, "%H:%M").time():
                    _flatten_all(positions)
                    state.save_positions(positions)
                log.info("Market closed, sleeping")
                time.sleep(config.POLL_SECONDS)
                continue

            run_once(positions)
            state.save_positions(positions)
            time.sleep(config.POLL_SECONDS)
    finally:
        broker.logout()


if __name__ == "__main__":
    main()
