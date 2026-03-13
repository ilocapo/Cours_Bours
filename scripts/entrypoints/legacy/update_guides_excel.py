from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'guides' / 'update_guides_excel.py', run_name='__main__')
