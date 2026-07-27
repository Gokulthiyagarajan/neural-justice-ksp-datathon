-- ============================================================================
-- Police FIR Management System — Database Schema (DDL)
-- Karnataka Police Department | Prototype
-- Dialect: T-SQL (SQL Server), matching the source ER diagram's data types
-- ============================================================================
-- NOTE ON CORRECTIONS TO THE SOURCE SPEC:
-- Two FK columns in the source PDF are declared INT but reference VARCHAR
-- primary keys (ActSectionAssociation.ActID -> Act.ActCode, and
-- ActSectionAssociation.SectionID -> Section.SectionCode). A foreign key's
-- column type must match the referenced primary key's type, so these two
-- columns are implemented here as VARCHAR to make the constraint valid.
-- Section had no declared single-column PK in the source; since section
-- codes (e.g. "302") repeat across different Acts, its natural key is the
-- composite (ActCode, SectionCode) — implemented that way below.
-- All other tables, column names, and types follow the source document
-- exactly. See README.md for the full list of design decisions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MASTER / LOOKUP TABLES (no dependencies)
-- ---------------------------------------------------------------------------

CREATE TABLE State (
    StateID INT PRIMARY KEY,
    StateName VARCHAR(100) NOT NULL,
    NationalityID INT,
    Active BIT NOT NULL DEFAULT 1
);

-- EXTENSION beyond the source ER diagram: Karnataka's 31 districts are
-- officially grouped into 4 administrative/police divisions. Added so the
-- prototype can reflect that structure. See README for details.
CREATE TABLE Division (
    DivisionID INT PRIMARY KEY,
    DivisionName VARCHAR(50) NOT NULL,
    DivisionHeadquarters VARCHAR(50),
    Active BIT NOT NULL DEFAULT 1
);

CREATE TABLE UnitType (
    UnitTypeID INT PRIMARY KEY,
    UnitTypeName VARCHAR(100) NOT NULL,
    CityDistState VARCHAR(20),
    Hierarchy INT,
    Active BIT NOT NULL DEFAULT 1
);

CREATE TABLE Rank (
    RankID INT PRIMARY KEY,
    RankName VARCHAR(100) NOT NULL,
    Hierarchy INT,
    Active BIT NOT NULL DEFAULT 1
);

CREATE TABLE Designation (
    DesignationID INT PRIMARY KEY,
    DesignationName VARCHAR(100) NOT NULL,
    Active BIT NOT NULL DEFAULT 1,
    SortOrder INT
);

CREATE TABLE CaseCategory (
    CaseCategoryID INT PRIMARY KEY,
    LookupValue VARCHAR(50) NOT NULL
);

CREATE TABLE GravityOffence (
    GravityOffenceID INT PRIMARY KEY,
    LookupValue VARCHAR(50) NOT NULL
);

CREATE TABLE CaseStatusMaster (
    CaseStatusID INT PRIMARY KEY,
    CaseStatusName VARCHAR(100) NOT NULL
);

CREATE TABLE CrimeHead (
    CrimeHeadID INT PRIMARY KEY,
    CrimeGroupName VARCHAR(100) NOT NULL,
    Active BIT NOT NULL DEFAULT 1
);

CREATE TABLE CasteMaster (
    caste_master_id INT PRIMARY KEY,
    caste_master_name VARCHAR(100) NOT NULL
);

CREATE TABLE ReligionMaster (
    ReligionID INT PRIMARY KEY,
    ReligionName VARCHAR(50) NOT NULL
);

CREATE TABLE OccupationMaster (
    OccupationID INT PRIMARY KEY,
    OccupationName VARCHAR(100) NOT NULL
);

CREATE TABLE Act (
    ActCode VARCHAR(20) PRIMARY KEY,
    ActDescription VARCHAR(255) NOT NULL,
    ShortName VARCHAR(50),
    Active BIT NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- TABLES DEPENDENT ON MASTERS (1 level)
-- ---------------------------------------------------------------------------

CREATE TABLE District (
    DistrictID INT PRIMARY KEY,
    DistrictName VARCHAR(100) NOT NULL,
    StateID INT NOT NULL,
    DivisionID INT NULL,                    -- NULL for non-Karnataka districts
    Active BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (StateID) REFERENCES State(StateID),
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID)
);

CREATE TABLE CrimeSubHead (
    CrimeSubHeadID INT PRIMARY KEY,
    CrimeHeadID INT NOT NULL,
    CrimeHeadName VARCHAR(100) NOT NULL,  -- Note: per source spec, this stores the SUB-head's name
    SeqID INT,
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID)
);

-- Composite PK (ActCode, SectionCode) — see header note.
CREATE TABLE Section (
    ActCode VARCHAR(20) NOT NULL,
    SectionCode VARCHAR(20) NOT NULL,
    SectionDescription VARCHAR(255),
    Active BIT NOT NULL DEFAULT 1,
    PRIMARY KEY (ActCode, SectionCode),
    FOREIGN KEY (ActCode) REFERENCES Act(ActCode)
);

-- ---------------------------------------------------------------------------
-- TABLES DEPENDENT ON DISTRICT / STATE (2 levels)
-- ---------------------------------------------------------------------------

CREATE TABLE Unit (
    UnitID INT PRIMARY KEY,
    UnitName VARCHAR(150) NOT NULL,
    TypeID INT NOT NULL,
    ParentUnit INT,                         -- self-reference to UnitID (hierarchy)
    NationalityID INT,
    StateID INT NOT NULL,
    DistrictID INT NOT NULL,
    Active BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (TypeID) REFERENCES UnitType(UnitTypeID),
    FOREIGN KEY (StateID) REFERENCES State(StateID),
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (ParentUnit) REFERENCES Unit(UnitID)
);

CREATE TABLE Court (
    CourtID INT PRIMARY KEY,
    CourtName VARCHAR(200) NOT NULL,
    DistrictID INT NOT NULL,
    StateID INT NOT NULL,
    Active BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (StateID) REFERENCES State(StateID)
);

CREATE TABLE CrimeHeadActSection (
    CrimeHeadID INT NOT NULL,
    ActCode VARCHAR(20) NOT NULL,
    SectionCode VARCHAR(20) NOT NULL,
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

CREATE TABLE Employee (
    EmployeeID INT PRIMARY KEY,
    DistrictID INT NOT NULL,
    UnitID INT NOT NULL,
    RankID INT NOT NULL,
    DesignationID INT NOT NULL,
    KGID VARCHAR(20) NOT NULL,
    FirstName VARCHAR(100) NOT NULL,
    EmployeeDOB DATE,
    GenderID VARCHAR(1),                    -- 'M' / 'F' / 'T' — see README design decisions
    BloodGroupID VARCHAR(5),
    PhysicallyChallenged BIT NOT NULL DEFAULT 0,
    AppointmentDate DATE,
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (UnitID) REFERENCES Unit(UnitID),
    FOREIGN KEY (RankID) REFERENCES Rank(RankID),
    FOREIGN KEY (DesignationID) REFERENCES Designation(DesignationID)
);

-- ---------------------------------------------------------------------------
-- CORE TRANSACTIONAL TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE CaseMaster (
    CaseMasterID INT PRIMARY KEY,
    CrimeNo VARCHAR(20) NOT NULL UNIQUE,
    CaseNo VARCHAR(20) NOT NULL,
    CrimeRegisteredDate DATE NOT NULL,
    PolicePersonID INT NOT NULL,
    PoliceStationID INT NOT NULL,
    CaseCategoryID INT NOT NULL,
    GravityOffenceID INT NOT NULL,
    CrimeMajorHeadID INT NOT NULL,
    CrimeMinorHeadID INT NOT NULL,
    CaseStatusID INT NOT NULL,
    CourtID INT NULL,
    IncidentFromDate DATETIME NOT NULL,
    IncidentToDate DATETIME NOT NULL,
    InfoReceivedPSDate DATETIME,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    BriefFacts NVARCHAR(MAX),
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID),
    FOREIGN KEY (GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID),
    FOREIGN KEY (CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID),
    FOREIGN KEY (CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID)
);

-- ---------------------------------------------------------------------------
-- CHILDREN OF CaseMaster
-- ---------------------------------------------------------------------------

CREATE TABLE ComplainantDetails (
    ComplainantID INT PRIMARY KEY,
    CaseMasterID INT NOT NULL,
    ComplainantName VARCHAR(150) NOT NULL,
    AgeYear INT,
    OccupationID INT,
    ReligionID INT,
    CasteID INT,
    GenderID VARCHAR(1),
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (OccupationID) REFERENCES OccupationMaster(OccupationID),
    FOREIGN KEY (ReligionID) REFERENCES ReligionMaster(ReligionID),
    FOREIGN KEY (CasteID) REFERENCES CasteMaster(caste_master_id)
);

CREATE TABLE ActSectionAssociation (
    CaseMasterID INT NOT NULL,
    ActID VARCHAR(20) NOT NULL,             -- corrected from INT — see header note
    SectionID VARCHAR(20) NOT NULL,         -- corrected from INT — see header note
    ActOrderID INT,
    SectionOrderID INT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (ActID) REFERENCES Act(ActCode),
    FOREIGN KEY (ActID, SectionID) REFERENCES Section(ActCode, SectionCode)
);

CREATE TABLE Victim (
    VictimMasterID INT PRIMARY KEY,
    CaseMasterID INT NOT NULL,
    VictimName VARCHAR(150) NOT NULL,
    AgeYear INT,
    GenderID VARCHAR(1),
    VictimPolice VARCHAR(1) NOT NULL DEFAULT '0',
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

CREATE TABLE Accused (
    AccusedMasterID INT PRIMARY KEY,
    CaseMasterID INT NOT NULL,
    AccusedName VARCHAR(150) NOT NULL,
    AgeYear INT,
    GenderID VARCHAR(1),
    PersonID VARCHAR(10),                   -- e.g. 'A1', 'A2'
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

CREATE TABLE ArrestSurrender (
    ArrestSurrenderID INT PRIMARY KEY,
    CaseMasterID INT NOT NULL,
    ArrestSurrenderTypeID INT,              -- 1=Arrest, 2=Voluntary Surrender
    ArrestSurrenderDate DATE,
    ArrestSurrenderStateId INT,
    ArrestSurrenderDistrictId INT,
    PoliceStationID INT,
    IOID INT,
    CourtID INT,
    AccusedMasterID INT NOT NULL,
    IsAccused BIT NOT NULL DEFAULT 1,
    IsComplainantAccused BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (ArrestSurrenderStateId) REFERENCES State(StateID),
    FOREIGN KEY (ArrestSurrenderDistrictId) REFERENCES District(DistrictID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (IOID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID),
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

-- Junction table (many-to-many between ArrestSurrender and Accused).
-- Referenced in the source's relationship matrix but not given an explicit
-- column list in the Table Definitions section — structure inferred from
-- its described purpose and PK/FK relationships.
CREATE TABLE inv_arrestsurrenderaccused (
    JunctionID INT PRIMARY KEY,
    ArrestSurrenderID INT NOT NULL,
    AccusedMasterID INT NOT NULL,
    FOREIGN KEY (ArrestSurrenderID) REFERENCES ArrestSurrender(ArrestSurrenderID),
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

CREATE TABLE ChargesheetDetails (
    CSID INT PRIMARY KEY,
    CaseMasterID INT NOT NULL,
    csdate DATETIME,
    cstype CHAR(1),                         -- A=Chargesheet, B=False Case, C=Undetected
    PolicePersonID INT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID)
);

-- ============================================================================
-- NOT IMPLEMENTED: Inv_OccuranceTime
-- The relationship matrix references a one-to-one child of CaseMaster named
-- "Inv_OccuranceTime" ("One FIR has one occurrence time/location record"),
-- but the source document never defines its columns anywhere in the Table
-- Definitions section. Rather than inventing an unspecified structure, this
-- table is intentionally omitted — CaseMaster already carries the
-- equivalent fields directly (IncidentFromDate, IncidentToDate, latitude,
-- longitude, InfoReceivedPSDate). Flag this to your schema owner if a
-- separate normalized table is actually required.
-- ============================================================================
