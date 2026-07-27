# Police FIR Management System — Synthetic Dataset
**Karnataka Police Department | Prototype Dataset**

Generated from the supplied ER diagram (`Police_FIR_ER_Diagram.pdf`). 28 tables, 4,415 rows, fully referentially consistent — verified both by custom validation scripts and by SQLite's own foreign-key engine.

---

## 1. What's in this package

| File | Description |
|---|---|
| `csv/` (28 files) | All tables as CSV, one file per table, headers included |
| `schema.sql` | Full T-SQL DDL (SQL Server dialect, matching the source PDF's types) |
| `police_fir_dataset.db` | SQLite database, pre-loaded with all data, FK constraints enforced |
| `README.md` | This file |

### Table list (28)
`State, Division, District, UnitType, Unit, Rank, Designation, Employee, CaseCategory, GravityOffence, CaseStatusMaster, CrimeHead, CrimeSubHead, Act, Section, CrimeHeadActSection, CasteMaster, ReligionMaster, OccupationMaster, Court, CaseMaster, ComplainantDetails, ActSectionAssociation, Victim, Accused, ArrestSurrender, inv_arrestsurrenderaccused, ChargesheetDetails`

**`Division` is a schema extension not present in the source ER diagram** — added so the dataset reflects Karnataka's real administrative structure: all **31 districts**, correctly grouped into the **4 official divisions** (Bengaluru: 9, Mysuru: 8, Belagavi: 7, Kalaburagi: 7). Every district now has at least one police station and staff; previously only 15 districts (informally grouped) were represented.

---

## 2. Dataset scale

| Table | Rows | Table | Rows |
|---|---:|---|---:|
| CaseMaster (FIRs) | 450 | Accused | 640 |
| ComplainantDetails | 494 | Victim | 482 |
| ActSectionAssociation | 702 | ArrestSurrender | 243 |
| ChargesheetDetails | 236 | inv_arrestsurrenderaccused | 373 |
| Employee | 484 | Unit (police stations etc.) | 48 |
| Section | 41 | CrimeSubHead | 29 |
| District | 33 (31 Karnataka + 2 other-state) | Division | 4 |

Cases span registration years **2023–2026** (through July 10, 2026, the dataset's "current date"), across **all 31 Karnataka districts** in all **4 official divisions**, and **48 units** (police stations, circle offices, cyber crime PS, women's PS, etc.) — every district has at least one station and dedicated staff.

---

## 3. How to use it

**SQLite (fastest way to explore):**
```bash
sqlite3 police_fir_dataset.db
sqlite> SELECT CrimeNo, CrimeRegisteredDate FROM CaseMaster LIMIT 5;
```
Foreign keys are enforced (`PRAGMA foreign_keys = ON`), so any accidental bad insert during prototype development will fail loudly instead of silently corrupting the data.

**SQL Server / other RDBMS:** run `schema.sql` to create the schema, then bulk-load each CSV in the order listed in the "load order" comment pattern (masters → District/Unit/Employee → CaseMaster → its children) — parents must load before children for FK constraints to succeed.

**Python/Pandas:** each CSV loads independently; `CaseMaster.csv` is the hub table everything else hangs off via `CaseMasterID`.

---

## 4. Key design decisions (where the source spec was ambiguous or inconsistent)

The source PDF was detailed but had a few gaps/inconsistencies. Here's exactly what I did and why, so you can override any of these if your actual system decided differently:

- **`ActSectionAssociation.ActID` / `.SectionID` typed VARCHAR, not INT.** The source declares these as INT but says they FK to `Act.ActCode` and `Section.SectionCode`, both VARCHAR primary keys. A foreign key's column type must match what it references, so I implemented these as VARCHAR — otherwise the schema can't actually enforce the constraint in a real database.
- **`Section`'s primary key is composite `(ActCode, SectionCode)`.** The source never marks a PK for `Section`, but section numbers repeat across acts (e.g., different acts could each have a "20"), so section codes are only unique *within* an act. I also added a matching composite FK from `CrimeHeadActSection` and `ActSectionAssociation`.
- **`GenderID` stored as `'M'/'F'/'T'` (VARCHAR(1)), not INT.** The source types this column INT everywhere but its own column descriptions say Victim's GenderID is "like m, f, t" and Accused's is "mentioned as M/F/T" — and no Gender lookup table exists anywhere in the schema (unlike Religion/Caste/Occupation, which do have master tables). I used the letter codes literally and consistently across Employee, ComplainantDetails, Victim, and Accused.
- **UDR cases (`CaseCategoryID=3`) are always classified under a dedicated "Unnatural Death / Suspicious Death (Inquest)" CrimeSubHead** (id 29, under CrimeHead "Crimes Against Body"), invoke **only BNSS Section 194** (the inquest provision — successor to CrPC §174, verified via web search), and **always have zero Accused records**. A UDR is a death inquest, not a prosecution of a specific offence against a specific person; if foul play is later confirmed, a separate murder FIR would normally be registered rather than the UDR itself gaining an accused. UDR case status is restricted to Under Investigation / Closed-Undetected / Transferred — never Chargesheeted/Convicted/Acquitted, since an inquest doesn't itself go to trial.
- **`PAR` category left unrestricted (spans all crime heads), flagged as uncertain.** The source PDF shows "PAR" only as a numbering example (`404430006202600001`) and never defines what it stands for. I didn't find a way to confidently pin this down, so unlike UDR I didn't force a narrow interpretation I couldn't verify — PAR cases in this dataset are drawn from the general crime-head distribution. If your actual system defines PAR precisely (e.g., "Preliminary Assessment Report" for a specific case subset), let me know and I can re-generate with that constraint.
- **`inv_arrestsurrenderaccused` (junction table) structure was inferred.** It's named only in the relationship matrix, never given a column list. I built it as `(JunctionID PK, ArrestSurrenderID FK, AccusedMasterID FK)` — a standard many-to-many junction — consistent with the matrix's description ("One arrest event can link multiple accused via junction").
- **`Inv_OccuranceTime` was *not* built.** It's referenced in the relationship matrix as a one-to-one child of CaseMaster ("One FIR has one occurrence time/location record") but its columns are never defined anywhere in the source document. Rather than inventing a structure that wasn't specified, I omitted it — CaseMaster already directly carries the equivalent fields (`IncidentFromDate`, `IncidentToDate`, `latitude`, `longitude`, `InfoReceivedPSDate`). Flag this to your schema owner if a genuinely separate normalized table is required and I'll build it to the correct spec.
- **`CrimeNo`'s embedded year reflects the *registration* year, not the incident year.** This matches how real FIR numbering works (the running serial resets each year based on when the case is registered) and only differs from incident year for the rare case registered a few days into a new year.
- **Case status is time-aware.** A case registered 3 days ago won't show as "Convicted" — status distributions shift from mostly "Under Investigation" for recent cases toward the full spread (Chargesheeted, Pending Trial, Convicted, Acquitted, etc.) as case age increases, matching how court timelines actually work.

---

## 5. Divisions and districts (31 districts, 4 divisions)

| Division | Districts (9 / 8 / 7 / 7) |
|---|---|
| **Bengaluru** | Bengaluru Urban, Bengaluru Rural, Ramanagara, Kolar, Chikkaballapura, Tumakuru, Chitradurga, Davanagere, Shivamogga |
| **Mysuru** | Mysuru, Mandya, Hassan, Chamarajanagar, Kodagu, Dakshina Kannada, Udupi, Chikkamagaluru |
| **Belagavi** | Belagavi, Vijayapura, Bagalkote, Dharwad, Gadag, Haveri, Uttara Kannada |
| **Kalaburagi** | Kalaburagi, Bidar, Yadgir, Raichur, Koppal, Ballari, Vijayanagara |

**⚠️ Naming note — two districts were renamed in mid-2025, after most reference material (including common GK sources) was written:**
- **"Bengaluru Rural" → officially "Bengaluru North"** (Karnataka Cabinet, approved July 2, 2025)
- **"Ramanagara" → officially "Bengaluru South"** (Karnataka Cabinet, approved May 2025)

This dataset uses the **older, long-established names** (Bengaluru Rural / Ramanagara), since that's what was requested and what most existing police/court records still use during the transition — district courts' own websites, for instance, were still issuing notifications under "Bengaluru Rural District" as of March 2025. If your KSP Datathon reference materials or judging rubric use the new official names instead, this is a one-line change in `01_generate_masters.py` (two `DistrictName` values) and I can regenerate — just let me know which convention to standardize on.

Two districts also had a station-name/district-name spelling note worth knowing: the police station I'd originally named "Vijayanagar Women Police Station" (a real Bengaluru city locality) has been renamed to "Basavanagudi Women Police Station" to avoid any visual confusion with the "Vijayanagara" **district** (a different place, spelled with a trailing 'a', carved from Ballari in 2020/2021) now in the dataset.


## 6. Validation performed

Every one of the following passed with **zero violations** on the final dataset:

**Referential integrity (44 checks)** — every FK in the schema (CaseMaster → 8 parents, ComplainantDetails → 4 parents, ArrestSurrender → 7 parents, District → Division, etc.) verified to resolve to an existing parent row.

**Database-engine-level check** — the SQLite file was built with `PRAGMA foreign_keys = ON` and passed `PRAGMA foreign_key_check` with 0 violations, i.e., SQLite's own constraint engine (not just my Python scripts) confirms consistency.

**Deep cross-table logic checks (7 checks)**, beyond simple FK existence:
1. Every `ArrestSurrender.AccusedMasterID` belongs to the *same* case as the arrest event itself
2. Every junction-table row links an accused person to the correct case
3. `CrimeNo`'s embedded year always matches `CrimeRegisteredDate`'s year
4. `CaseNo` always equals the last 9 digits of `CrimeNo` (per the spec's stated format)
5. Running serial numbers are unique per (station, category, year) — no duplicate FIR numbers
6. Chargesheet dates never precede the case's registration date
7. Arrest dates never precede the case's registration date

**Primary key uniqueness** verified on every table's PK column.

**Format checks**: `CrimeNo` is always exactly 18 digits (1 + 4 + 4 + 4 + 5, per spec), all 450 values globally unique. Lat/long coordinates all fall within Karnataka's geographic bounds.

---

## 7. Realism notes

- Case category mix: ~76% FIR, ~12% UDR, ~7% PAR, ~5% Zero FIR
- Crime classification spans all 8 CrimeHead groups (Body, Property, Women, Children, Economic, Cyber, Public Tranquility, SLL) with realistic BNS/IPC/POCSO/NDPS/Arms Act section pairings per offence type
- Employee ranks/designations follow real Karnataka Police hierarchy naming (Constable → Head Constable → ASI → SI → Inspector → DySP → SP → ADGP → DGP)
- Police stations use real Bengaluru/Karnataka locality names; districts use actual Karnataka district names
- `BriefFacts` narrative text is templated per crime type (e.g., robbery narratives differ from cheating-fraud narratives from dowry-death narratives) rather than generic filler

## 8. Regenerating or scaling up

The generation pipeline is seeded (`random.seed(...)` per script) for reproducibility. If you want more volume (e.g., 5,000 FIRs instead of 450) or different proportions, the case-count and weighting constants are isolated at the top of each script — I can adjust and re-run in one pass if useful.
