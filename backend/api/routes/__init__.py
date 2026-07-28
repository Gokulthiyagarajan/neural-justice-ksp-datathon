# Exports for FastAPI route registration
from backend.api.routes.copilot import router as copilot_router
from backend.api.routes.reports import router as reports_router
from backend.api.routes.stations import router as stations_router
from backend.api.routes.profiles import router as profiles_router
from backend.api.routes.cases import router as cases_router
from backend.api.routes.orders import router as orders_router
from backend.api.routes.activity import router as activity_router
from backend.api.routes.notifications import router as notifications_router
from backend.api.routes.situation_room import router as situation_room_router
from backend.api.routes.patrol import router as patrol_router
from backend.api.routes.crime_patterns import router as crime_patterns_router
from backend.api.routes.dashboard import router as dashboard_router
from backend.api.routes.cp import router as cp_router

__all__ = [
    'copilot_router',
    'reports_router',
    'stations_router',
    'profiles_router',
    'cases_router',
    'orders_router',
    'activity_router',
    'notifications_router',
    'situation_room_router',
    'patrol_router',
    'crime_patterns_router',
    'dashboard_router',
    'cp_router',
]
