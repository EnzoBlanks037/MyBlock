import os

from dotenv import load_dotenv

load_dotenv()

# --- Account / auth ---
ROBINHOOD_USERNAME = os.getenv("ROBINHOOD_USERNAME", "")
ROBINHOOD_PASSWORD = os.getenv("ROBINHOOD_PASSWORD", "")
ROBINHOOD_TOTP_SECRET = os.getenv("ROBINHOOD_TOTP_SECRET", "")

# Live orders are only placed if this is exactly "YES". Anything else
# runs the agent in dry-run mode: signals and intended orders are logged
# but nothing is sent to Robinhood.
LIVE_TRADING = os.getenv("CONFIRM_LIVE_TRADING", "NO").strip().upper() == "YES"

# --- Universe ---
TICKERS = ["NVDA", "SPY", "QQQ", "AAPL", "TSLA"]

# --- Indicators ---
EMA_FAST = 9
EMA_SLOW = 21
ATR_PERIOD = 14
VOLUME_LOOKBACK = 20  # bars used for the "rising volume" average

# --- Strategy timing ---
BAR_INTERVAL = "5minute"      # robin_stocks historicals interval
BAR_SPAN = "day"               # span of historicals to pull
ENTRY_WINDOW_START = "09:30"   # ET, start of allowed entry window
ENTRY_WINDOW_END = "10:30"     # ET, end of allowed entry window
MARKET_CLOSE = "16:00"         # ET, force-flatten time for day trades

# --- Risk management ---
RISK_PCT_PER_TRADE = 0.01   # risk 1% of account equity per trade
ATR_STOP_MULTIPLIER = 1.0   # stop = 1 x ATR from entry
ATR_TARGET_MULTIPLIER = 2.0  # target = 2 x ATR from entry (2R)
CONTRACT_MULTIPLIER = 100    # shares per option contract

# --- Option selection ---
# "ATM" = at-the-money. Day trades use the current week's expiration.
OPTION_MONEYNESS = "ATM"

# --- Loop ---
POLL_SECONDS = 60  # how often to re-evaluate signals/positions

# --- State ---
STATE_FILE = "state/positions.json"
