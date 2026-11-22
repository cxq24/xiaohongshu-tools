"""Compatibility entry point; current coverage lives in campaign_browser_checks.py."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('campaign_browser_checks.py')), run_name='__main__')
