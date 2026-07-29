"""
Root conftest — adds the backend directory to sys.path so that
    from backend.pipeline.xxx  and  from backend.api.xxx
imports work when running pytest from the ./backend directory.
"""
import os
import sys

# Ensure the project root is on sys.path so 'backend' is resolvable
_project_root = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_project_root)
if _parent not in sys.path:
    sys.path.insert(0, _parent)
