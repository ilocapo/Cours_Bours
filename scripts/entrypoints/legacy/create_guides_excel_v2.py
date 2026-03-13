from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'guides' / 'create_guides_excel_v2.py', run_name='__main__')
