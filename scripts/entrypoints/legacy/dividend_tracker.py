from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'fundamentals' / 'dividend_tracker.py', run_name='__main__')
