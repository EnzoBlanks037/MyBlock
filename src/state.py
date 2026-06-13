"""Simple JSON-file persistence for open positions, so the agent can
restart mid-session without forgetting what it holds."""

import json
import os

import config


def load_positions() -> dict:
    if not os.path.exists(config.STATE_FILE):
        return {}
    with open(config.STATE_FILE, "r") as f:
        return json.load(f)


def save_positions(positions: dict) -> None:
    os.makedirs(os.path.dirname(config.STATE_FILE), exist_ok=True)
    with open(config.STATE_FILE, "w") as f:
        json.dump(positions, f, indent=2, default=str)
