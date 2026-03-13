from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'fundamentals' / 'fundamentals_core_alert.py', run_name='__main__')
