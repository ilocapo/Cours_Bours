from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'automation' / 'run_daily_automation.py', run_name='__main__')
