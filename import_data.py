import csv
import sqlite3
import os
import random

db_path = 'backend/ksp_demo.db'
csv_dir = "sample dataset's/datasets/Police_FIR_Dataset_CSVs/csv"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check CSV files
files = ['CaseMaster.csv', 'Unit.csv', 'Employee.csv', 'Accused.csv', 'Victim.csv', 'District.csv', 'Division.csv', 'CrimeHead.csv']
for f in files:
    path = os.path.join(csv_dir, f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as fp:
            reader = csv.DictReader(fp)
            rows = list(reader)
            print(f'{f}: {len(rows)} rows, columns: {reader.fieldnames}')
    else:
        print(f'{f}: NOT FOUND')

# Import Districts - columns: DistrictID, DistrictName, StateID, DivisionID, Active
print("\n--- Importing Districts ---")
with open(os.path.join(csv_dir, 'District.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        cursor.execute('INSERT OR REPLACE INTO stations (id, name, code, district, division, type, officer_count, active_cases, solved_rate, lat, lng, phone, incharge, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (row['DistrictID'], row['DistrictName'], f"D{row['DistrictID']:0>3}", row['DistrictName'], '', 'Urban', 0, 0, 0, 0, 0, '', '', 'active', '2026-07-26'))

# Import Divisions - columns: DivisionID, DivisionName, DivisionHeadquarters, Active
print("--- Importing Divisions ---")
with open(os.path.join(csv_dir, 'Division.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        cursor.execute('INSERT OR REPLACE INTO stations (id, name, code, district, division, type, officer_count, active_cases, solved_rate, lat, lng, phone, incharge, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (row['DivisionID'], row['DivisionName'], f"DV{row['DivisionID']:0>3}", '', row['DivisionName'], 'Division', 0, 0, 0, 0, 0, '', '', 'active', '2026-07-26'))

# Import Units (Police Stations) - columns: UnitID, UnitName, TypeID, ParentUnit, NationalityID, StateID, DistrictID, Active
print("--- Importing Units (Police Stations) ---")
with open(os.path.join(csv_dir, 'Unit.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        cursor.execute('''INSERT OR REPLACE INTO stations (id, name, code, district, division, type, officer_count, active_cases, solved_rate, lat, lng, phone, incharge, status, created_at) 
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                      (row['UnitID'], row['UnitName'], f"PS{row['UnitID']:0>3}", 
                       row.get('DistrictID', ''), '', 'Urban', 
                       random.randint(20, 80), random.randint(5, 50), round(random.uniform(60, 95), 1),
                       12.9 + random.uniform(-0.5, 0.5), 77.5 + random.uniform(-0.5, 0.5),
                       f"080-{random.randint(22000000, 22999999)}", '', 'active', '2026-07-26'))

# Import CaseMaster (FIRs) - columns: CaseMasterID, CrimeNo, CaseNo, CrimeRegisteredDate, PolicePersonID, PoliceStationID, CaseCategoryID, GravityOffenceID, CrimeMajorHeadID, CrimeMinorHeadID, CaseStatusID, CourtID, IncidentFromDate, IncidentToDate, InfoReceivedPSDate, latitude, longitude, BriefFacts
print("--- Importing CaseMaster (FIRs) ---")
with open(os.path.join(csv_dir, 'CaseMaster.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    count = 0
    for row in reader:
        if count >= 500:
            break
        cursor.execute('''INSERT OR REPLACE INTO cases (id, crime_no, crime_type, status, station, district, occurrence_date, filing_date, severity, is_repeat_offender, days_open, lat, lng, created_at) 
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                      (row['CaseMasterID'], row['CrimeNo'], row.get('CrimeMajorHeadID', 'Unknown'), row.get('CaseStatusID', 'registered'),
                       row.get('PoliceStationID', ''), row.get('DistrictID', ''), 
                       row.get('IncidentFromDate', ''), row.get('CrimeRegisteredDate', ''),
                       'medium', 0, random.randint(1, 180),
                       float(row.get('latitude', 12.9)) if row.get('latitude') else 12.9 + random.uniform(-0.5, 0.5), 
                       float(row.get('longitude', 77.5)) if row.get('longitude') else 77.5 + random.uniform(-0.5, 0.5), '2026-07-26'))
        count += 1
    print(f"Imported {count} cases")

# Import Crime Heads - columns: CrimeHeadID, CrimeGroupName, Active
print("--- Importing Crime Heads ---")
with open(os.path.join(csv_dir, 'CrimeHead.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        cursor.execute('INSERT OR REPLACE INTO stations (id, name, code, district, division, type, officer_count, active_cases, solved_rate, lat, lng, phone, incharge, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (row['CrimeHeadID'], row['CrimeGroupName'], f"CH{row['CrimeHeadID']:0>3}", '', '', 'CrimeHead', 0, 0, 0, 0, 0, '', '', 'active', '2026-07-26'))

# Import Employees (Police Officers) - columns: EmployeeID, DistrictID, UnitID, RankID, DesignationID, KGID, FirstName, EmployeeDOB, GenderID, BloodGroupID, PhysicallyChallenged, AppointmentDate
print("--- Importing Employees ---")
with open(os.path.join(csv_dir, 'Employee.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        cursor.execute('INSERT OR REPLACE INTO stations (id, name, code, district, division, type, officer_count, active_cases, solved_rate, lat, lng, phone, incharge, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (row['EmployeeID'], row['FirstName'], f"EMP{row['EmployeeID']:0>3}", 
                       row.get('DistrictID', ''), row.get('UnitID', ''), 'Officer', 1, 0, 0, 0, 0, '', '', 'active', '2026-07-26'))

conn.commit()

# Verify
cursor.execute('SELECT COUNT(*) FROM stations')
print(f"\nTotal stations table rows: {cursor.fetchone()[0]}")
cursor.execute('SELECT COUNT(*) FROM cases')
print(f"Total cases: {cursor.fetchone()[0]}")

conn.close()
print("\n=== IMPORT COMPLETE ===")