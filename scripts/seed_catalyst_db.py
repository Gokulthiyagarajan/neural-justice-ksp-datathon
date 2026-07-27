"""
Seed Catalyst Backend Database from Police FIR CSV Dataset.

Transforms the raw CSV schema into the tables expected by
functions/neural-justice-backend/main.py.

Output: functions/neural-justice-backend/neural_justice.db
"""
import csv
import json
import os
import random
import sqlite3
from datetime import datetime, timedelta

CSV_DIR = r"D:\KSP-DATATHON-PROTOTYPE (1)\KSP-DATATHON-PROTOTYPE\sample dataset's\datasets\Police_FIR_Dataset_CSVs\csv"
OUTPUT_DB = r"D:\KSP-DATATHON-PROTOTYPE (1)\KSP-DATATHON-PROTOTYPE\functions\neural-justice-backend\neural_justice.db"

random.seed(42)

# ── Helpers ──

def load_csv(filename):
    path = os.path.join(CSV_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def si(v, default=0):
    try: return int(float(v)) if v and str(v).strip() else default
    except: return default

def sf(v, default=0.0):
    try: return float(v) if v and str(v).strip() else default
    except: return default

def ss(v, default=""):
    return str(v).strip() if v and str(v).strip() else default

def parse_date(v):
    if not v or not str(v).strip(): return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%dT%H:%M:%S"):
        try: return datetime.strptime(str(v).strip()[:19], fmt)
        except: continue
    return None

# ── Load CSVs ──

print("Loading CSV data...")
case_master = load_csv("CaseMaster.csv")
accused = load_csv("Accused.csv")
complainants = load_csv("ComplainantDetails.csv")
victims = load_csv("Victim.csv")
crime_heads = load_csv("CrimeHead.csv")
crime_subheads = load_csv("CrimeSubHead.csv")
case_statuses = load_csv("CaseStatusMaster.csv")
units = load_csv("Unit.csv")
unit_types = load_csv("UnitType.csv")
districts = load_csv("District.csv")
divisions = load_csv("Division.csv")
employees = load_csv("Employee.csv")

# Lookups (keys as strings from CSV)
status_map = {r["CaseStatusID"]: r["CaseStatusName"] for r in case_statuses}
crime_head_map = {r["CrimeHeadID"]: r["CrimeGroupName"] for r in crime_heads}
crime_subhead_map = {r["CrimeSubHeadID"]: r["CrimeHeadName"] for r in crime_subheads}
unit_map = {r["UnitID"]: r for r in units}
district_map = {r["DistrictID"]: r for r in districts}
division_map = {r["DivisionID"]: r for r in divisions}
unit_type_map = {r["UnitTypeID"]: r["UnitTypeName"] for r in unit_types}

# Filter to police stations only
station_units = [u for u in units if unit_type_map.get(ss(u.get("TypeID"))) == "Police Station"]
print(f"  Found {len(station_units)} police stations from {len(units)} total units")

# ── Build cases table ──

print("Building cases table...")
cases = []
for cm in case_master:
    cmid = cm["CaseMasterID"]
    crime_no = ss(cm.get("CrimeNo"))
    if not crime_no:
        continue

    # Crime type
    minor_id = ss(cm.get("CrimeMinorHeadID"))
    major_id = ss(cm.get("CrimeMajorHeadID"))
    crime_type = crime_subhead_map.get(minor_id) or crime_head_map.get(major_id) or "Unknown"
    crime_head_name = crime_head_map.get(major_id) or "Other"

    # Status
    status = status_map.get(ss(cm.get("CaseStatusID")), "Under Investigation")

    # Dates
    reg_date = parse_date(cm.get("CrimeRegisteredDate"))
    occ_date = parse_date(cm.get("IncidentFromDate"))

    # Station / District
    unit = unit_map.get(ss(cm.get("PoliceStationID")))
    station_name = ss(unit.get("UnitName")) if unit else "Unknown Station"
    district_id = ss(unit.get("DistrictID")) if unit else "0"
    dist = district_map.get(district_id, {})
    district_name = ss(dist.get("DistrictName")) if dist else "Unknown"

    # Accused / Complainant / Victim
    case_accused = [a for a in accused if a.get("CaseMasterID") == cmid]
    accused_names = [ss(a.get("AccusedName")) for a in case_accused[:3]]
    case_complainants = [c for c in complainants if c.get("CaseMasterID") == cmid]
    complainant_name = ss(case_complainants[0].get("ComplainantName")) if case_complainants else ""
    case_victims = [v for v in victims if v.get("CaseMasterID") == cmid]
    victim_name = ss(case_victims[0].get("VictimName")) if case_victims else ""

    brief = ss(cm.get("BriefFacts")) or f"Case registered at {station_name}"
    lat = sf(cm.get("latitude"))
    lng = sf(cm.get("longitude"))
    filing_date = reg_date.isoformat() if reg_date else None
    occurrence = occ_date.isoformat() if occ_date else None
    created = reg_date.isoformat() if reg_date else datetime.now().isoformat()
    num_accused = len(case_accused)
    is_solved = "closed" in status.lower() or "charge" in status.lower()

    cases.append({
        "crime_no": crime_no,
        "crime_type": crime_type,
        "crime_head": crime_head_name,
        "status": status.lower().replace(" ", "_"),
        "station": station_name,
        "district": district_name,
        "occurrence_date": occurrence or created[:10],
        "filing_date": filing_date or created[:10],
        "brief_facts": brief[:500],
        "latitude": lat,
        "longitude": lng,
        "accused_names": json.dumps(accused_names),
        "complainant_name": complainant_name,
        "victim_name": victim_name,
        "num_accused": num_accused,
        "is_solved": 1 if is_solved else 0,
        "created_at": created,
    })

print(f"  -> {len(cases)} cases loaded")

# ── Build stations table ──

print("Building stations table...")
stations = []
seen_station_names = set()
for idx, u in enumerate(station_units):
    name = ss(u.get("UnitName"))
    if not name or name in seen_station_names:
        continue
    seen_station_names.add(name)
    
    uid = u["UnitID"]
    did = ss(u.get("DistrictID"))
    dist = district_map.get(did, {})
    district_name = ss(dist.get("DistrictName")) if dist else "Unknown"
    
    # Count cases for this station
    station_cases = [c for c in cases if c["station"] == name]
    active = sum(1 for c in station_cases if c["status"] not in ("closed", "resolved", "chargesheeted"))
    total = len(station_cases)
    solved = sum(1 for c in station_cases if c["is_solved"])
    solved_rate = round(solved / max(total, 1) * 100, 1)
    
    unit_employees = [e for e in employees if ss(e.get("UnitID")) == uid]
    officer_count = len(unit_employees) or max(1, total // 5)
    
    case_lats = [c["latitude"] for c in station_cases if c["latitude"]]
    case_lngs = [c["longitude"] for c in station_cases if c["longitude"]]
    lat = round(sum(case_lats) / len(case_lats), 4) if case_lats else round(12.97 + random.uniform(-0.5, 0.5), 4)
    lng = round(sum(case_lngs) / len(case_lngs), 4) if case_lngs else round(77.59 + random.uniform(-0.5, 0.5), 4)
    
    stations.append({
        "id": idx + 1,
        "name": name,
        "code": f"PS{idx + 1:03d}",
        "district": district_name,
        "division": ss(division_map.get(ss(dist.get("DivisionID")), {}).get("DivisionName")) if dist else "Unknown",
        "type": "urban",
        "officer_count": officer_count,
        "active_cases": active,
        "solved_rate": solved_rate,
        "lat": lat,
        "lng": lng,
        "phone": f"080-{22000000 + idx}",
        "incharge": f"Inspector {chr(65 + idx % 26)}",
        "status": "active" if active > 0 else "inactive",
        "created_at": datetime.now().isoformat(),
    })

print(f"  -> {len(stations)} stations built")

# ── Build criminal_profiles ──

print("Building criminal_profiles...")
seen_accused = {}
for a in accused:
    name = ss(a.get("AccusedName"))
    if not name or name.lower() in ("unknown", ""):
        continue
    key = name.lower()
    if key in seen_accused:
        seen_accused[key]["case_count"] += 1
        continue
    seen_accused[key] = {
        "name": name,
        "age": si(a.get("AgeYear"), 30),
        "gender": "Male" if a.get("GenderID") == "M" else "Female",
        "case_count": 1,
        "risk_score": round(random.uniform(0.3, 0.95), 2),
    }

profiles = list(seen_accused.values())
print(f"  -> {len(profiles)} profiles built")

# ── Create SQLite DB ──

print("Creating output database...")
if os.path.exists(OUTPUT_DB):
    os.remove(OUTPUT_DB)

conn = sqlite3.connect(OUTPUT_DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=5000")

conn.executescript("""
CREATE TABLE IF NOT EXISTS user_auth (
    username TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '[]',
    district_id INTEGER,
    station_id INTEGER,
    totp_secret TEXT,
    totp_enrolled INTEGER NOT NULL DEFAULT 0,
    mfa_exempt INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crime_no TEXT UNIQUE NOT NULL,
    crime_type TEXT,
    crime_head TEXT,
    status TEXT DEFAULT 'under_investigation',
    station TEXT,
    district TEXT,
    occurrence_date TEXT,
    filing_date TEXT,
    brief_facts TEXT,
    latitude REAL,
    longitude REAL,
    accused_names TEXT DEFAULT '[]',
    complainant_name TEXT DEFAULT '',
    victim_name TEXT DEFAULT '',
    num_accused INTEGER DEFAULT 0,
    is_solved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT,
    district TEXT,
    division TEXT,
    type TEXT DEFAULT 'urban',
    officer_count INTEGER DEFAULT 0,
    active_cases INTEGER DEFAULT 0,
    solved_rate REAL DEFAULT 0.0,
    lat REAL,
    lng REAL,
    phone TEXT,
    incharge TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS criminal_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    case_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    risk_score REAL DEFAULT 0.0,
    last_active TEXT,
    modus_operandi TEXT,
    aliases TEXT DEFAULT '[]',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    district TEXT DEFAULT '',
    crime_types TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT,
    title TEXT,
    description TEXT,
    issued_by TEXT,
    issued_to TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    description TEXT,
    user_name TEXT,
    station TEXT,
    district TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    type TEXT DEFAULT 'info',
    severity TEXT DEFAULT 'info',
    read_status TEXT DEFAULT 'unread',
    user_role TEXT DEFAULT '',
    station TEXT,
    district TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patrol_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_name TEXT,
    station TEXT,
    district TEXT,
    zone TEXT,
    status TEXT DEFAULT 'active',
    officer_count INTEGER DEFAULT 0,
    current_area TEXT,
    last_report TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_situation_room (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    threat_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'active',
    station TEXT,
    district TEXT,
    created_at TEXT,
    last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crime_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT,
    crime_type TEXT,
    station TEXT,
    district TEXT,
    description TEXT,
    confidence REAL DEFAULT 0.0,
    analysis_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cases_crime_no ON cases(crime_no);
CREATE INDEX IF NOT EXISTS idx_cases_station ON cases(station);
CREATE INDEX IF NOT EXISTS idx_cases_district ON cases(district);
CREATE INDEX IF NOT EXISTS idx_stations_district ON stations(district);
CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_status);
""")

print("Tables created. Inserting data...")

# ── Insert cases ──

case_batch = []
for c in cases:
    case_batch.append((
        c["crime_no"], c["crime_type"], c["crime_head"], c["status"],
        c["station"], c["district"], c["occurrence_date"], c["filing_date"],
        c["brief_facts"], c["latitude"], c["longitude"],
        c["accused_names"], c["complainant_name"], c["victim_name"],
        c["num_accused"], c["is_solved"], c["created_at"],
    ))

conn.executemany("""
    INSERT OR IGNORE INTO cases
        (crime_no, crime_type, crime_head, status, station, district,
         occurrence_date, filing_date, brief_facts, latitude, longitude,
         accused_names, complainant_name, victim_name, num_accused, is_solved, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
""", case_batch)
print(f"  Inserted cases: {len(case_batch)}")

# ── Insert stations ──

station_batch = []
for s in stations:
    station_batch.append((
        s["name"], s["code"], s["district"], s["division"], s["type"],
        s["officer_count"], s["active_cases"], s["solved_rate"],
        s["lat"], s["lng"], s["phone"], s["incharge"], s["status"], s["created_at"],
    ))

conn.executemany("""
    INSERT OR IGNORE INTO stations
        (name, code, district, division, type, officer_count, active_cases,
         solved_rate, lat, lng, phone, incharge, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
""", station_batch)
print(f"  Inserted stations: {len(station_batch)}")

# ── Insert criminal_profiles ──

profile_batch = []
for p in profiles[:200]:
    profile_batch.append((
        p["name"], p["age"], p["gender"], p["case_count"],
        "active", p["risk_score"], datetime.now().isoformat(),
        f"Repeat offender with {p['case_count']} case(s)",
        "[]", "", "", "", "", "[]", datetime.now().isoformat(),
    ))

conn.executemany("""
    INSERT INTO criminal_profiles
        (name, age, gender, case_count, status, risk_score, last_active,
         modus_operandi, aliases, phone, address, photo_url, district, crime_types, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
""", profile_batch)
print(f"  Inserted profiles: {len(profile_batch)}")

# ── Generate orders ──

print("Generating orders...")
order_types_list = ["Investigation Order", "Transfer Order", "Surveillance Order", "Arrest Warrant", "Search Warrant"]
order_batch = []
for i, c in enumerate(cases[:150]):
    ot = order_types_list[i % len(order_types_list)]
    order_batch.append((
        f"ORD-{2024}-{i+1:04d}",
        f"{ot} - {c['crime_no']}",
        f"{ot} issued for case {c['crime_no']} at {c['station']}",
        "SP Bengaluru", c["station"],
        "medium" if i % 3 else "high",
        "active" if c["status"] not in ("closed", "resolved") else "completed",
        c["created_at"],
    ))

conn.executemany("""
    INSERT INTO orders (order_number, title, description, issued_by, issued_to, priority, status, created_at)
    VALUES (?,?,?,?,?,?,?,?)
""", order_batch)
print(f"  Inserted orders: {len(order_batch)}")

# ── Generate activity ──

print("Generating activity...")
actions_list = ["case_registered", "case_updated", "arrest_made", "chargesheet_filed", "evidence_collected", "witness_interviewed"]
activity_batch = []
for i, c in enumerate(cases[:300]):
    act = actions_list[i % len(actions_list)]
    occ_date = parse_date(c["occurrence_date"])
    ts = (occ_date + timedelta(hours=random.randint(1, 24))).isoformat() if occ_date else datetime.now().isoformat()
    activity_batch.append((
        act, "case", c["crime_no"],
        f"{act.replace('_', ' ').title()} for {c['crime_no']}",
        "Officer", c["station"], c["district"], ts,
    ))

conn.executemany("""
    INSERT INTO activity (action, entity_type, entity_id, description, user_name, station, district, timestamp)
    VALUES (?,?,?,?,?,?,?,?)
""", activity_batch)
print(f"  Inserted activity: {len(activity_batch)}")

# ── Generate notifications ──

print("Generating notifications...")
notif_types_list = ["warning", "info", "alert", "update"]
notif_batch = []
for i, c in enumerate(cases[:200]):
    nt = notif_types_list[i % len(notif_types_list)]
    sev = "critical" if nt == "warning" else "high" if nt == "alert" else "info"
    notif_batch.append((
        f"{nt.title()} - {c['crime_no']}",
        f"{nt.title()}: Case {c['crime_no']} status is {c['status']} at {c['station']}",
        nt, sev, "unread", "SUPER_ADMIN", c["station"], c["district"], c["created_at"],
    ))

conn.executemany("""
    INSERT INTO notifications (title, message, type, severity, read_status, user_role, station, district, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
""", notif_batch)
print(f"  Inserted notifications: {len(notif_batch)}")

# ── Generate patrol_units ──

print("Generating patrol_units...")
zones_list = ["A", "B", "C", "D"]
patrol_batch = []
for i, s in enumerate(stations[:30]):
    zone = zones_list[i % len(zones_list)]
    patrol_batch.append((
        f"Patrol {s['code']}-{zone}", s["name"], s["district"], f"Zone {zone}",
        "active", max(2, s["officer_count"] // 4), f"{s['name']} Area",
        datetime.now().isoformat(), datetime.now().isoformat(),
    ))

conn.executemany("""
    INSERT INTO patrol_units (unit_name, station, district, zone, status, officer_count, current_area, last_report, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
""", patrol_batch)
print(f"  Inserted patrol_units: {len(patrol_batch)}")

# ── Generate ai_situation_room ──

print("Generating ai_situation_room...")
threats_list = ["low", "medium", "high", "critical"]
situation_batch = []
for i, d in enumerate(districts[:10]):
    dn = ss(d.get("DistrictName"))
    if not dn:
        continue
    tl = threats_list[i % len(threats_list)]
    situation_batch.append((
        f"Situation Report - {dn}",
        f"District {dn}: {random.randint(5, 50)} active cases, threat level {tl}",
        tl, "active", dn, datetime.now().isoformat(), datetime.now().isoformat(),
    ))

conn.executemany("""
    INSERT INTO ai_situation_room (title, summary, threat_level, status, district, created_at, last_updated)
    VALUES (?,?,?,?,?,?,?)
""", situation_batch)
print(f"  Inserted ai_situation_room: {len(situation_batch)}")

# ── Generate crime_patterns ──

print("Generating crime_patterns...")
pattern_types_list = ["seasonal", "emerging", "cluster", "hotspot", "trend"]
crime_types_list = ["Theft", "Robbery", "Assault", "Burglary", "Cybercrime", "Vehicle Theft", "Chain Snatching"]
pattern_batch = []
for i, s in enumerate(stations[:40]):
    pt = pattern_types_list[i % len(pattern_types_list)]
    ct = crime_types_list[i % len(crime_types_list)]
    pattern_batch.append((
        pt, ct, s["name"], s["district"],
        f"{pt.replace('_', ' ').title()} pattern detected: {ct} in {s['name']} area",
        round(random.uniform(0.6, 0.98), 2),
        datetime.now().isoformat(), "active", datetime.now().isoformat(),
    ))

conn.executemany("""
    INSERT INTO crime_patterns (pattern_type, crime_type, station, district, description, confidence, analysis_date, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
""", pattern_batch)
print(f"  Inserted crime_patterns: {len(pattern_batch)}")

# ── Seed default admin user ──

conn.execute("""
    INSERT OR IGNORE INTO user_auth (username, email, password_hash, name, roles, district_id, station_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
""", ("admin", "admin@neural-justice.gov.in",
      "fake-hash-not-used-in-demo", "System Administrator",
      json.dumps(["SUPER_ADMIN"]), 1, 1))

conn.commit()

# ── Summary ──

print("\nDatabase summary:")
cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
for row in cur.fetchall():
    count = conn.execute(f"SELECT COUNT(*) FROM [{row[0]}]").fetchone()[0]
    print(f"  {row[0]}: {count} rows")
conn.close()
print("\nDone!")
