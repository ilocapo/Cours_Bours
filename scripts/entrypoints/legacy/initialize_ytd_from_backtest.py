from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'maintenance' / 'initialize_ytd_from_backtest.py', run_name='__main__')
