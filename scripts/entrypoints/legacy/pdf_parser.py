from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'maintenance' / 'pdf_parser.py', run_name='__main__')
