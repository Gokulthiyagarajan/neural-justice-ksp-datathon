"""
Seed FULL Neural Justice backend database from the 310K-row synthetic dataset.

Reads backend/dev-test.db (10,000 fir_cases, 308 police_stations, 20,005 accused,
15,017 victims, 2,008 officers) and rebuilds the Catalyst serverless function's
schema (functions/neural-justice-backend/neural_justice.db) so the submitted
serverless URL serves the full synthetic dataset.

Output schema matches scripts/seed_catalyst_db.py (the function's source of
truth) with two safe additions:
  * cases.case_number   — fixes the /api/cases/{id} lookup (uses case_number=?)
  * districts table     — fixes district-scope SQL (SELECT name FROM districts WHERE id=?)
"""
import json
import os
import random
import sqlite3
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DB = os.path.join(ROOT, "backend", "dev-test.db")
OUT_DB = os.path.join(ROOT, "functions", "neural-justice-backend", "neural_justice.db")

random.seed(42)

# ── Status vocabulary the function understands ─────────────────────────────
STATUS_MAP = {
    "registered": "registered",
    "under_investigation": "under_investigation",
    "chargesheeted": "charge_sheeted",
    "closed": "closed_-_undetected",
    "convicted": "convicted",
    "transferred": "transferred_to_other_ps",
}

GENDERS = {"M": "Male", "F": "Female"}

# ── District codes ─────────────────────────────────────────────────────────
# The frontend (useFIRData.ts, jurisdiction.ts) uses UPPER_SNAKE district
# codes ("BENGALURU_URBAN", "MYSURU", ...) for filters and jurisdiction scope.
# dev-test.db only has short codes ("BLR-URB") and display names, so we
# normalize every district value written into the output DB to the
# frontend-style code. Unknown names fall back to UPPER_SNAKE(name).
DISTRICT_CODE = {
    "Bengaluru Urban": "BENGALURU_URBAN",
    "Bengaluru Rural": "BENGALURU_RURAL",
    "Ramanagara": "RAMANAGARA",
    "Chikkaballapura": "CHIKKABALLAPURA",
    "Kolar": "KOLAR",
    "Tumakuru": "TUMKUR",
    "Davanagere": "DAVANAGERE",
    "Chitradurga": "CHITRADURGA",
    "Belagavi": "BELAGAVI",
    "Dharwad": "DHARWAD",
    "Uttara Kannada": "UTTARA_KANNADA",
    "Vijayapura": "VIJAYAPURA",
    "Bagalkote": "BAGALKOTE",
    "Haveri": "HAVERI",
    "Gadag": "GADAG",
    "Kalaburagi": "KALABURAGI",
    "Bidar": "BIDAR",
    "Raichur": "RAICHUR",
    "Koppal": "KOPPAL",
    "Ballari": "BELLARY",
    "Vijayanagara": "VIJAYANAGARA",
    "Yadgir": "YADGIR",
    "Mysuru": "MYSURU",
    "Chamarajanagara": "CHAMARAJANAGAR",
    "Mandya": "MANDYA",
    "Hassan": "HASSAN",
    "Dakshina Kannada": "DAKSHINA_KANNADA",
    "Udupi": "UDUPI",
    "Chikkamagaluru": "CHIKKAMAGALURU",
    "Shivamogga": "SHIMOGA",
    "Kodagu": "KODAGU",
}


def code_of(district_name):
    """Map a dev-test.db district name to the frontend-style district code."""
    name = (district_name or "").strip()
    if not name:
        return ""
    if name in DISTRICT_CODE:
        return DISTRICT_CODE[name]
    # Fallback for any district name not in the map (e.g. renamed district).
    import re
    return re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")


def main():
    print(f"Reading source: {SRC_DB}")
    src = sqlite3.connect(SRC_DB)
    src.row_factory = sqlite3.Row

    def fetch_all(q, *p):
        return [dict(r) for r in src.execute(q, p).fetchall()]

    fir_cases = fetch_all("SELECT * FROM fir_cases")
    stations_src = fetch_all("SELECT * FROM police_stations")
    districts_src = fetch_all("SELECT * FROM districts")
    accused_src = fetch_all("SELECT * FROM accused")
    victims_src = fetch_all("SELECT * FROM victims")
    officers_src = fetch_all("SELECT * FROM police_officers")
    crime_heads_src = fetch_all("SELECT * FROM crime_heads")
    try:
        divisions_src = fetch_all("SELECT * FROM divisions")
    except Exception:
        divisions_src = []
    print(f"  fir_cases={len(fir_cases)} stations={len(stations_src)} "
          f"districts={len(districts_src)} accused={len(accused_src)} "
          f"victims={len(victims_src)} officers={len(officers_src)}")

    # ── Lookups ─────────────────────────────────────────────────────────────
    dist_by_id = {d["id"]: d for d in districts_src}
    station_by_id = {s["id"]: s for s in stations_src}
    div_by_id = {d["id"]: d for d in divisions_src}
    head_by_id = {h["id"]: h for h in crime_heads_src}
    officers_by_station = {}
    for o in officers_src:
        officers_by_station.setdefault(o["station_id"], []).append(o)
    accused_by_crime = {}
    for a in accused_src:
        accused_by_crime.setdefault(a["crime_no"], []).append(a)
    victims_by_crime = {}
    for v in victims_src:
        victims_by_crime.setdefault(v["crime_no"], []).append(v)

    # ── districts ───────────────────────────────────────────────────────────
    districts = []
    for d in districts_src:
        div = div_by_id.get(d.get("division_id"), {})
        districts.append({
            "id": d["id"], "name": d["name"] or "Unknown",
            "code": d.get("code") or "", "division": div.get("name") or "Bengaluru Division",
        })

    # ── stations ────────────────────────────────────────────────────────────
    stations = []
    for s in stations_src:
        d = dist_by_id.get(s.get("district_id"), {})
        dname = (d.get("name") or "Unknown") if d else "Unknown"
        sname = s["name"] or f"Station {s['id']}"
        case_list = [c for c in fir_cases if c["station_id"] == s["id"]]
        total = len(case_list)
        solved = sum(1 for c in case_list if STATUS_MAP.get(c.get("status"), "under_investigation") in ("closed_-_undetected", "convicted"))
        active = total - solved
        officers = officers_by_station.get(s["id"], [])
        officer_count = len(officers) or 1
        incharge = officers[0]["name"] if officers else f"Inspector {chr(65 + s['id'] % 26)}"
        lat = s.get("lat")
        lng = s.get("lng")
        if lat is None:
            lat = round(12.97 + random.uniform(-0.5, 0.5), 4)
        if lng is None:
            lng = round(77.59 + random.uniform(-0.5, 0.5), 4)
        stations.append({
            "id": s["id"], "name": sname, "code": s.get("code") or f"PS{s['id']:03d}",
            "district": code_of(dname),
            "division": districts[s["district_id"] - 1]["division"] if 1 <= s["district_id"] <= len(districts) else "Bengaluru Division",
            "type": "urban", "officer_count": officer_count, "active_cases": active,
            "solved_rate": round(solved / max(total, 1) * 100, 1) if total else 0.0,
            "lat": lat, "lng": lng, "phone": f"080-{22000000 + s['id']}",
            "incharge": incharge, "status": "active" if total else "inactive",
            "created_at": s.get("created_at") or datetime.now().isoformat(),
        })
    station_name_by_id = {s["id"]: s["name"] for s in stations}

    # ── cases ───────────────────────────────────────────────────────────────
    cases = []
    for c in fir_cases:
        head = head_by_id.get(c.get("crime_head_id"), {})
        crime_type = head.get("name") or c.get("fir_type") or "Other"
        status = STATUS_MAP.get(c.get("status"), "under_investigation")
        st = station_by_id.get(c.get("station_id"), {})
        d = dist_by_id.get(st.get("district_id"), {})
        accused_list = [a["name"] for a in accused_by_crime.get(c["crime_no"], []) if a.get("name")]
        victims_list = [v["name"] for v in victims_by_crime.get(c["crime_no"], []) if v.get("name")]
        occ = c.get("occurrence_date") or (c.get("created_at") or "")[:10]
        created = c.get("created_at") or datetime.now().isoformat()
        cases.append({
            "crime_no": c["crime_no"],
            "case_number": c["crime_no"],
            "crime_type": crime_type,
            "crime_head": head.get("name") or crime_type,
            "status": status,
            "station": station_name_by_id.get(c.get("station_id"), st.get("name") or "Unknown"),
            "district": (code_of(d.get("name") or "Unknown")) if d else "Unknown",
            "occurrence_date": occ,
            "filing_date": created[:10],
            "brief_facts": c.get("brief_facts") or f"Case registered at {st.get('name') or 'station'}",
            "latitude": c.get("lat"),
            "longitude": c.get("lng"),
            "accused_names": json.dumps(accused_list[:3]),
            "complainant_name": victims_list[0] if victims_list else "",
            "victim_name": victims_list[0] if victims_list else "",
            "num_accused": len(accused_list),
            "is_solved": 1 if status in ("closed_-_undetected", "convicted") else 0,
            "created_at": created,
        })
    print(f"  cases built: {len(cases)}")

    # ── criminal_profiles (top 2500 repeat offenders) ───────────────────────
    seen = {}
    for a in accused_src:
        name = (a.get("name") or "").strip()
        if not name:
            continue
        key = name.lower()
        if key not in seen:
            seen[key] = {"name": name, "age": a.get("age") or 30,
                         "gender": GENDERS.get(a.get("gender"), "Male"), "cases": []}
        seen[key]["cases"].append(a["crime_no"])
    profiles = []
    for p in sorted(seen.values(), key=lambda x: -len(x["cases"]))[:2500]:
        case_rows = [c for c in cases if c["crime_no"] in p["cases"]]
        dists = sorted({c["district"] for c in case_rows if c["district"]})
        types = sorted({c["crime_type"] for c in case_rows if c["crime_type"]})
        last = max((c["occurrence_date"] for c in case_rows if c["occurrence_date"]), default=None)
        profiles.append({
            "name": p["name"], "age": p["age"], "gender": p["gender"],
            "case_count": len(p["cases"]), "status": "active",
            "risk_score": round(min(0.95, 0.35 + len(p["cases"]) * 0.05), 2),
            "last_active": last, "modus_operandi": f"Repeat offender involved in {len(p['cases'])} case(s)",
            "aliases": "[]", "phone": "", "address": "",
            "photo_url": "", "district": dists[0] if dists else "",
            "crime_types": json.dumps(types[:5]), "created_at": datetime.now().isoformat(),
        })
    print(f"  profiles built: {len(profiles)}")

    # ── Derived tables ──────────────────────────────────────────────────────
    order_types = ["Investigation Order", "Transfer Order", "Surveillance Order", "Arrest Warrant", "Search Warrant"]
    orders = []
    for i, c in enumerate(cases[:2000]):
        ot = order_types[i % len(order_types)]
        orders.append((f"ORD-2024-{i+1:04d}", f"{ot} - {c['crime_no']}",
                       f"{ot} issued for case {c['crime_no']} at {c['station']}",
                       "SP Bengaluru", c["station"],
                       "medium" if i % 3 else "high",
                       "active" if c["status"] not in ("closed_-_undetected", "convicted") else "completed",
                       c["created_at"]))

    actions = ["case_registered", "case_updated", "arrest_made", "chargesheet_filed", "evidence_collected", "witness_interviewed"]
    activity = []
    for i, c in enumerate(cases[:5000]):
        act = actions[i % len(actions)]
        ts = c["created_at"]
        activity.append((act, "case", c["crime_no"],
                         f"{act.replace('_', ' ').title()} for {c['crime_no']}",
                         "Officer", c["station"], c["district"], ts))

    notif_types = [("warning", "critical"), ("info", "info"), ("alert", "high"), ("update", "info")]
    notifications = []
    for i, c in enumerate(cases[:3000]):
        nt, sev = notif_types[i % len(notif_types)]
        notifications.append((f"{nt.title()} - {c['crime_no']}",
                              f"{nt.title()}: Case {c['crime_no']} status is {c['status']} at {c['station']}",
                              nt, sev, "unread", "SUPER_ADMIN", c["station"], c["district"], c["created_at"]))

    zones = ["A", "B", "C", "D"]
    patrol = []
    for i, s in enumerate(stations):
        zone = zones[i % len(zones)]
        patrol.append((f"Patrol {s['code']}-{zone}", s["name"], s["district"], f"Zone {zone}",
                       "active", max(2, s["officer_count"] // 4), f"{s['name']} Area",
                       datetime.now().isoformat(), datetime.now().isoformat()))

    threat_levels = ["low", "medium", "high", "critical"]
    situation = []
    for i, d in enumerate(districts):
        if not d["name"]:
            continue
        tl = threat_levels[i % len(threat_levels)]
        dcode = code_of(d["name"])
        n_active = sum(1 for c in cases if c["district"] == dcode and c["status"] not in ("closed_-_undetected", "convicted"))
        situation.append((f"Situation Report - {d['name']}",
                          f"District {d['name']}: {max(n_active, random.randint(5, 50))} active cases, threat level {tl}",
                          tl, "active", dcode, datetime.now().isoformat(), datetime.now().isoformat()))

    pattern_types = ["seasonal", "emerging", "cluster", "hotspot", "trend"]
    crime_types_list = ["Theft", "Robbery", "Assault", "Burglary", "Cybercrime", "Vehicle Theft", "Chain Snatching"]
    patterns = []
    for i, s in enumerate(stations):
        pt = pattern_types[i % len(pattern_types)]
        ct = crime_types_list[i % len(crime_types_list)]
        patterns.append((pt, ct, s["name"], s["district"],
                         f"{pt.replace('_', ' ').title()} pattern detected: {ct} in {s['name']} area",
                         round(random.uniform(0.6, 0.98), 2),
                         datetime.now().isoformat(), "active", datetime.now().isoformat()))

    # ── Build output DB ─────────────────────────────────────────────────────
    print(f"Writing output: {OUT_DB}")
    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)
    out = sqlite3.connect(OUT_DB)
    out.execute("PRAGMA journal_mode=WAL")
    out.execute("PRAGMA busy_timeout=5000")
    out.executescript("""
    CREATE TABLE user_auth (
        username TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        name TEXT NOT NULL, roles TEXT NOT NULL DEFAULT '[]', district_id INTEGER, station_id INTEGER,
        totp_secret TEXT, totp_enrolled INTEGER NOT NULL DEFAULT 0, mfa_exempt INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT, crime_no TEXT UNIQUE NOT NULL, case_number TEXT,
        crime_type TEXT, crime_head TEXT, status TEXT DEFAULT 'under_investigation', station TEXT,
        district TEXT, occurrence_date TEXT, filing_date TEXT, brief_facts TEXT, latitude REAL,
        longitude REAL, accused_names TEXT DEFAULT '[]', complainant_name TEXT DEFAULT '',
        victim_name TEXT DEFAULT '', num_accused INTEGER DEFAULT 0, is_solved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT, district TEXT,
        division TEXT, type TEXT DEFAULT 'urban', officer_count INTEGER DEFAULT 0,
        active_cases INTEGER DEFAULT 0, solved_rate REAL DEFAULT 0.0, lat REAL, lng REAL,
        phone TEXT, incharge TEXT, status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE criminal_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER, gender TEXT,
        case_count INTEGER DEFAULT 0, status TEXT DEFAULT 'active', risk_score REAL DEFAULT 0.0,
        last_active TEXT, modus_operandi TEXT, aliases TEXT DEFAULT '[]', phone TEXT DEFAULT '',
        address TEXT DEFAULT '', photo_url TEXT DEFAULT '', district TEXT DEFAULT '',
        crime_types TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT, title TEXT, description TEXT,
        issued_by TEXT, issued_to TEXT, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, entity_type TEXT, entity_id TEXT,
        description TEXT, user_name TEXT, station TEXT, district TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT, type TEXT DEFAULT 'info',
        severity TEXT DEFAULT 'info', read_status TEXT DEFAULT 'unread', user_role TEXT DEFAULT '',
        station TEXT, district TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE patrol_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT, unit_name TEXT, station TEXT, district TEXT,
        zone TEXT, status TEXT DEFAULT 'active', officer_count INTEGER DEFAULT 0,
        current_area TEXT, last_report TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE ai_situation_room (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, summary TEXT, threat_level TEXT DEFAULT 'low',
        status TEXT DEFAULT 'active', station TEXT, district TEXT, created_at TEXT,
        last_updated TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE crime_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT, pattern_type TEXT, crime_type TEXT, station TEXT,
        district TEXT, description TEXT, confidence REAL DEFAULT 0.0, analysis_date TEXT,
        status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE districts (
        id INTEGER PRIMARY KEY, name TEXT, code TEXT, division TEXT
    );
    CREATE INDEX idx_cases_crime_no ON cases(crime_no);
    CREATE INDEX idx_cases_station ON cases(station);
    CREATE INDEX idx_cases_district ON cases(district);
    CREATE INDEX idx_stations_district ON stations(district);
    CREATE INDEX idx_notifications_read ON notifications(read_status);
    """)

    # NOTE: districts.name stores the FRONTEND district code (not the display
    # name). The function's district-scope SQL does `SELECT name FROM districts
    # WHERE id = ?` and matches it against `cases.district`, so name must equal
    # the coded value used in cases/stations/derived tables.
    out.executemany("INSERT INTO districts (id, name, code, division) VALUES (?,?,?,?)",
                    [(d["id"], code_of(d["name"]), d["code"], d["division"]) for d in districts])
    out.executemany("""INSERT INTO stations (id, name, code, district, division, type, officer_count,
        active_cases, solved_rate, lat, lng, phone, incharge, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    [(s["id"], s["name"], s["code"], s["district"], s["division"], s["type"],
                      s["officer_count"], s["active_cases"], s["solved_rate"], s["lat"], s["lng"],
                      s["phone"], s["incharge"], s["status"], s["created_at"]) for s in stations])
    out.executemany("""INSERT INTO cases (crime_no, case_number, crime_type, crime_head, status, station,
        district, occurrence_date, filing_date, brief_facts, latitude, longitude, accused_names,
        complainant_name, victim_name, num_accused, is_solved, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    [(c["crime_no"], c["case_number"], c["crime_type"], c["crime_head"], c["status"],
                      c["station"], c["district"], c["occurrence_date"], c["filing_date"],
                      c["brief_facts"], c["latitude"], c["longitude"], c["accused_names"],
                      c["complainant_name"], c["victim_name"], c["num_accused"], c["is_solved"],
                      c["created_at"]) for c in cases])
    out.executemany("""INSERT INTO criminal_profiles (name, age, gender, case_count, status, risk_score,
        last_active, modus_operandi, aliases, phone, address, photo_url, district, crime_types, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    [(p["name"], p["age"], p["gender"], p["case_count"], p["status"], p["risk_score"],
                      p["last_active"], p["modus_operandi"], p["aliases"], p["phone"], p["address"],
                      p["photo_url"], p["district"], p["crime_types"], p["created_at"]) for p in profiles])
    out.executemany("""INSERT INTO orders (order_number, title, description, issued_by, issued_to,
        priority, status, created_at) VALUES (?,?,?,?,?,?,?,?)""", orders)
    out.executemany("""INSERT INTO activity (action, entity_type, entity_id, description, user_name,
        station, district, timestamp) VALUES (?,?,?,?,?,?,?,?)""", activity)
    out.executemany("""INSERT INTO notifications (title, message, type, severity, read_status,
        user_role, station, district, created_at) VALUES (?,?,?,?,?,?,?,?,?)""", notifications)
    out.executemany("""INSERT INTO patrol_units (unit_name, station, district, zone, status,
        officer_count, current_area, last_report, created_at) VALUES (?,?,?,?,?,?,?,?,?)""", patrol)
    out.executemany("""INSERT INTO ai_situation_room (title, summary, threat_level, status, district,
        created_at, last_updated) VALUES (?,?,?,?,?,?,?)""", situation)
    out.executemany("""INSERT INTO crime_patterns (pattern_type, crime_type, station, district,
        description, confidence, analysis_date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)""", patterns)
    out.execute("""INSERT OR IGNORE INTO user_auth (username, email, password_hash, name, roles,
        district_id, station_id) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                ("admin", "admin@neural-justice.gov.in", "fake-hash-not-used-in-demo",
                 "System Administrator", json.dumps(["SUPER_ADMIN"]), 1, 1))
    out.commit()
    out.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    out.close()

    # ── Summary ─────────────────────────────────────────────────────────────
    con = sqlite3.connect(OUT_DB)
    print("\nDatabase summary:")
    for row in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
        count = con.execute(f"SELECT COUNT(*) FROM [{row[0]}]").fetchone()[0]
        print(f"  {row[0]}: {count:,} rows")
    con.close()
    size_mb = os.path.getsize(OUT_DB) / 1024 / 1024
    print(f"Output size: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()