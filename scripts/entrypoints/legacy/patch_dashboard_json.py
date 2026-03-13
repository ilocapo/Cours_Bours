from pathlib import Path
import runpy

runpy.run_path(Path(__file__).parent / 'scripts' / 'maintenance' / 'patch_dashboard_json.py', run_name='__main__')
