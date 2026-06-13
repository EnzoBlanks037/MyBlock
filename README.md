# MyBlock — VWAP + EMA + ATR Options Trading Agent

An automated single-leg options trading agent for Robinhood, implementing
the VWAP reclaim/rejection + EMA9/EMA21 crossover + ATR stop/target
checklist for buying calls and puts on liquid tickers (NVDA, SPY, QQQ,
AAPL, TSLA by default).

## ⚠️ Risk warning

This agent can place **real, live options orders with real money** when
`CONFIRM_LIVE_TRADING=YES` is set. Options trading is highly risky and you
can lose your entire position quickly. Using third-party/unofficial APIs
(robin_stocks) against Robinhood may also violate their Terms of Service.
Use at your own risk, start with a small amount of capital, and test
thoroughly in dry-run mode first.

## Strategy

**Entry (during the first hour after open):**
- **Call:** price reclaims VWAP, EMA9 crosses above EMA21, volume confirms.
- **Put:** price rejects VWAP, EMA9 crosses below EMA21, volume confirms.

**Exit:**
- Stop loss: 1x ATR against the position.
- Profit target: 2x ATR (2R) in favor of the position.
- Reversal: price crosses back through VWAP, or EMA9 crosses back through
  EMA21, against the position.
- All positions are flattened at market close.

**Risk management:** position size targets ~1% of account equity at risk
per trade, based on the ATR stop distance.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# edit .env with your Robinhood credentials and (optional) TOTP secret
```

Leave `CONFIRM_LIVE_TRADING=NO` to run in **dry-run mode** — the agent logs
every signal and the order it would place, without sending anything to
Robinhood.

Set `CONFIRM_LIVE_TRADING=YES` only when you're ready for the agent to
place real orders.

## Running

```bash
python -m src.agent
```

The agent logs in, then loops every `POLL_SECONDS` (default 60s) during
market hours, evaluating signals on 5-minute bars for each ticker in
`config.TICKERS`.

## Project layout

- `config.py` — strategy parameters, tickers, risk settings, credentials.
- `src/indicators.py` — VWAP, EMA9/21, ATR, volume average.
- `src/strategy.py` — entry/exit signal logic from the trading checklist.
- `src/risk.py` — position sizing based on account equity and ATR stop.
- `src/broker.py` — Robinhood login, market data, options chain, orders.
- `src/state.py` — persists open positions to `state/positions.json`.
- `src/agent.py` — main loop tying everything together.
