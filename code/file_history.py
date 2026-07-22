import json
from pathlib import Path

HISTORY_FILE = Path.home() / ".cli_assistant_history.json"

def load_history() -> list:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return []

def save_history(messages: list):
    HISTORY_FILE.write_text(json.dumps(messages, ensure_ascii=False, indent=2))
