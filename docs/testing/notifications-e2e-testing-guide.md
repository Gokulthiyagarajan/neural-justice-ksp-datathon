# Notifications E2E Testing Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive E2E testing for the notifications API service fixing endpoint mismatches and ensuring system reliability.

**Architecture:** Multi-layered testing approach covering backend API contracts, frontend integration, and live production validation. Fixes critical endpoint mismatches and establishes automated testing pipeline.

**Tech Stack:** FastAPI (backend), TypeScript/React (frontend), pytest (Python testing), Node.js testing tools

## Global Constraints

- Fixed API endpoint mismatch: frontend PUT methods → backend POST methods
- Maintains existing synthetic data structure in backend
- Preserves TypeScript type definitions
- Follows existing project structure and coding patterns
- Each task must produce independently testable deliverables
- Use checkbox syntax for task tracking
- Complete code in every step - no placeholders or "TODO" comments

---

## Task Structure

### Task 1: Fix API Endpoint Mismatches in Frontend Client

**Files:**
- Modify: `frontend/src/api/notifications.ts:20-25`
- Create: `frontend/tests/api/notifications.test.ts`

**Interfaces:**
- Consumes: None (task foundation)
- Produces: Corrected frontend API client with matching backend endpoints

- [ ] **Step 1: Write failing test for endpoint mismatches**

```typescript
test('markNotificationRead should use POST method', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  mockApi.post.mockResolvedValueOnce({ message: 'success' });

  await markNotificationRead('123');

  expect(mockApi.post).toHaveBeenCalledWith('/notifications/123/read');
  expect(mockApi.put).not.toHaveBeenCalled();
});

test('markAllRead should use POST method', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  mockApi.post.mockResolvedValueOnce({ message: 'success', marked_count: 5 });

  await markAllRead();

  expect(mockApi.post).toHaveBeenCalledWith('/notifications/mark-all-read');
  expect(mockApi.put).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify failures**

```bash
npm run test frontend/tests/api/notifications.test.ts -v
Expected: FAIL with assertion errors about PUT vs POST usage
```

- [ ] **Step 3: Fix endpoint mismatches in frontend client**

```typescript
export async function markNotificationRead(notificationId: string): Promise<{ message: string }> {
  return api.post(`/notifications/${notificationId}/read`);
}

export async function markAllRead(): Promise<{ message: string; marked_count: number }> {
  return api.post('/notifications/mark-all-read');
}

export async function acknowledgeNotification(notificationId: string): Promise<{ message: string }> {
  return api.post(`/notifications/${notificationId}/acknowledge`);
}
```

- [ ] **Step 4: Run tests to verify fixes**

```bash
npm run test frontend/tests/api/notifications.test.ts -v
Expected: PASS with all endpoint mappings correct
```

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/api/notifications.ts frontend/tests/api/notifications.test.ts
git commit -m "fix: correct HTTP methods in notifications API client"
```

### Task 2: Update Backend API Documentation

**Files:**
- Modify: `backend/api/routes/notifications.py:100-130`
- Update: `README.md:276-277`

**Interfaces:**
- Consumes: Frontend API client (now corrected)
- Produces: Updated documentation and comments

- [ ] **Step 1: Document current backend endpoints**

```python
@router.get("/", summary="List notifications")
async def list_notifications(
    notification_type: str | None = Query(None, alias="type"),
    severity: str | None = Query(None),
    is_read: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """GET /notifications - List notifications with filters and pagination"""
    # Implementation unchanged
    pass
```

```python
@router.get("/unread/count", summary="Unread notification count")
async def unread_count():
    """GET /notifications/unread/count - Get unread notification count"""
    pass
```

```python
@router.post("/{notif_id}/read", summary="Mark notification as read")
async def mark_read(notif_id: int):
    """POST /notifications/{notif_id}/read - Mark notification as read"""
    pass
```

```python
@router.post("/{notif_id}/acknowledge", summary="Acknowledge notification")
async def acknowledge_notification(notif_id: int):
    """POST /notifications/{notif_id}/acknowledge - Acknowledge notification"""
    pass
```

```python
@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_read():
    """POST /notifications/mark-all-read - Mark all notifications as read"""
    pass
```

- [ ] **Step 2: Update README.md with correct API endpoints**

```markdown
| Domain | Prefix | Key Endpoints |
|--------|--------|---------------|
| Notifications | `/api/notifications` | `GET /`, `GET /unread-count` |
| | `/api/notifications` | `POST /{notif_id}/read`, `POST /{notif_id}/acknowledge` |
| | `/api/notifications` | `POST /mark-all-read` |
```

- [ ] **Step 3: Run API documentation validation**

```bash
# Check backend API consistency
curl -s "http://localhost:8000/api/docs#/Notifications/list_notifications" | grep -E "POST.*read|POST.*acknowledge|POST.*mark-all-read"
```

Expected: All POST endpoints documented correctly

- [ ] **Step 4: Commit documentation updates**

```bash
git add backend/api/routes/notifications.py README.md
git commit -m "docs: fix API endpoint documentation"
```

### Task 3: Implement Backend Unit Tests

**Files:**
- Create: `backend/tests/test_notifications.py`
- Modify: `backend/tests/__init__.py`

**Interfaces:**
- Consumes: None (task isolation)
- Produces: Full test coverage for all 5 backend endpoints

- [ ] **Step 1: Write failing tests for all backend endpoints**

```python
def test_list_notifications_with_filters():
    response = client.get("/api/notifications?severity=high&page=1&per_page=10")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "data" in data
    assert "total" in data

def test_unread_count_endpoint():
    response = client.get("/api/notifications/unread/count")
    assert response.status_code == 200
    data = response.json()
    assert "unread" in data["data"]
    assert "critical_unread" in data["data"]

def test_mark_notification_read_success():
    response = client.post("/api/notifications/1/read")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert data["data"]["is_read"] == True

def test_mark_notification_read_not_found():
    response = client.post("/api/notifications/99999/read")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data

def test_acknowledge_notification():
    response = client.post("/api/notifications/1/acknowledge")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "acknowledged_by" in data["data"]
    assert data["data"]["acknowledged_by"] == "DCP Operations"

def test_mark_all_notifications_read():
    response = client.post("/api/notifications/mark-all-read")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "message" in data

def test_pagination_endpoint():
    response = client.get("/api/notifications?page=1&per_page=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) <= 5
    assert data["page"] == 1
    assert data["per_page"] == 5
```

- [ ] **Step 2: Run tests to verify all failures**

```bash
cd backend && python -m pytest tests/test_notifications.py -v
Expected: FAIL with "NotFoundError: Test client not found" (setup issue)
```

- [ ] **Step 3: Set up test client and implement endpoint tests**

```python
from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)

# Fix step 2 issue with proper test setup
```python
from fastapi.testclient import TestClient
from backend.api.main import app

# Add client setup to the test file

# Keep all test cases from Step 1
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd backend && python -m pytest tests/test_notifications.py -v
Expected: PASS with all 7 test cases passing
```

- [ ] **Step 5: Commit backend tests**

```bash
git add backend/tests/test_notifications.py
git commit -m "feat: add comprehensive backend notifications tests"
```

### Task 4: Implement Frontend API Integration Tests

**Files:**
- Create: `frontend/tests/api/notifications.test.ts`
- Modify: `frontend/package.json` (add test script)

**Interfaces:**
- Consumes: Backend notifications endpoints
- Produces: Frontend API client integration validation

- [ ] **Step 1: Write failing frontend integration tests**

```typescript
test('getNotifications integrates with backend', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  const mockNotifications = [
    { id: '1', title: 'Test Alert', message: 'Test message', type: 'alert', 
      severity: 'critical', is_read: false, created_at: '2024-01-01T00:00:00Z' }
  ];
  mockApi.get.mockResolvedValueOnce({
    notifications: mockNotifications,
    total: 1,
    unread_count: 1
  });

  const result = await getNotifications({ unread_only: true });

  expect(mockApi.get).toHaveBeenCalledWith('/notifications', { unread_only: true });
  expect(result).toEqual({
    notifications: mockNotifications,
    total: 1,
    unread_count: 1
  });
});

test('markNotificationRead integrates with backend', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  const mockResponse = { message: 'Notification marked as read' };
  mockApi.post.mockResolvedValueOnce(mockResponse);

  const result = await markNotificationRead('123');

  expect(mockApi.post).toHaveBeenCalledWith('/notifications/123/read');
  expect(result).toEqual(mockResponse);
});

test('markAllRead integrates with backend', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  const mockResponse = { message: 'All notifications marked as read', marked_count: 5 };
  mockApi.post.mockResolvedValueOnce(mockResponse);

  const result = await markAllRead();

  expect(mockApi.post).toHaveBeenCalledWith('/notifications/mark-all-read');
  expect(result).toEqual(mockResponse);
});

test('acknowledgeNotification integrates with backend', async () => {
  const mockApi = api as jest.Mocked<typeof api>;
  const mockResponse = { message: 'Notification acknowledged' };
  mockApi.post.mockResolvedValueOnce(mockResponse);

  const result = await acknowledgeNotification('456');

  expect(mockApi.post).toHaveBeenCalledWith('/notifications/456/acknowledge');
  expect(result).toEqual(mockResponse);
});
```

- [ ] **Step 2: Run tests to verify failures**

```bash
cd frontend && npm run test
Expected: FAIL with "Cannot find module 'api'" (setup issue)
```

- [ ] **Step 3: Set up test environment and implement integration tests**

```typescript
// Add jest setup and imports to test file
import { api } from '../src/api/client';
import { getNotifications, markNotificationRead, markAllRead, acknowledgeNotification } from '../src/api/notifications';

// Keep all test cases from Step 1
```

- [ ] **Step 4: Run integration tests to verify pass**

```bash
cd frontend && npm run test
Expected: PASS with all integration tests passing
```

- [ ] **Step 5: Commit frontend integration tests**

```bash
git add frontend/tests/api/notifications.test.ts
npm run lint:fix frontend/tests/api/notifications.test.ts
git commit -m "feat: add frontend API integration tests"
```

### Task 5: Create Test Environment Setup Script

**Files:**
- Create: `frontend/scripts/setup-test-environment.sh`
- Create: `backend/scripts/setup-test-data.py`

**Interfaces:**
- Consumes: Repository infrastructure
- Produces: Test environment and data setup

- [ ] **Step 1: Create frontend test environment setup script**

```bash
#!/bin/bash
# frontend/scripts/setup-test-environment.sh

echo "Setting up frontend test environment..."

# Install test dependencies
npm install --save-dev jest @types/jest jest-environment-jsdom jsdom

# Create jest config if not exists
if [ ! -f "frontend/jest.config.js" ]; then
  cat > frontend/jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['node_modules/(?!.*\.json$)'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\./.*$': '<rootDir>/src/\$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/components/ui/**',
  ],
};
EOF
fi

echo "Frontend test environment setup complete."
```

- [ ] **Step 2: Create backend test data setup script**

```python
#!/usr/bin/env python3
# backend/scripts/setup_test_data.py

"""Setup test data for notifications API testing"""

import asyncio
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient
from backend.api.main import app

def generate_test_notifications(count: int = 20):
    """Generate test notifications for testing"""
    notifications = []
    
    notification_types = ["alert", "warning", "info", "operational", "critical"]
    severities = ["low", "medium", "high", "critical"]
    categories = ["crime_alert", "weather", "traffic", "operational", "system"]
    
    for i in range(count):
        created_at = datetime.now() - timedelta(hours=random.randint(0, 168))
        notification = {
            "id": i + 1,
            "type": random.choice(notification_types),
            "category": random.choice(categories),
            "severity": random.choice(severities),
            "title": f"Test Notification {i + 1}",
            "message": f"This is test notification number {i + 1} for testing purposes",
            "source": "Test System",
            "station": "Test Station",
            "jurisdiction": "Test Jurisdiction",
            "is_read": random.choice([True, False, False]),
            "requires_acknowledgment": random.choice([True, False, False]),
            "acknowledged_by": None,
            "acknowledged_at": None,
            "created_at": created_at.isoformat(),
        }
        
        if notification["requires_acknowledgment"]:
            notification["acknowledged_by"] = "Test Officer"
            notification["acknowledged_at"] = (created_at + timedelta(minutes=30)).isoformat()
        
        notifications.append(notification)
    
    # Sort by creation date, newest first
    notifications.sort(key=lambda n: n["created_at"], reverse=True)
    return notifications

def setup_test_environment():
    """Setup test environment variables and configurations"""
    env_vars = {
        "ENVIRONMENT": "testing",
        "MOCK_AI": "true",
        "DATABASE_URL": "sqlite:///test_notifications.db",
        "JWT_SECRET_KEY": "test-secret-key-needs-to-be-32-chars-long-here",
        "ENCRYPTION_KEY": "test-encryption-key",
    }
    
    # Export environment variables
    for key, value in env_vars.items():
        print(f"export {key}={value}")
    
    return env_vars

def create_test_data_file():
    """Create JSON file with test data"""
    test_data = {
        "notifications": generate_test_notifications(50),
        "summary": {
            "total": 50,
            "unread": 15,
            "critical": 5,
            "today": 3,
        }
    }
    
    data_dir = Path("backend/tests/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    with open(data_dir / "test_notifications.json", "w") as f:
        json.dump(test_data, f, indent=2)
    
    print(f"Test data created at {data_dir / 'test_notifications.json'}")
    return test_data

if __name__ == "__main__":
    print("Setting up test data for notifications API...")
    
    setup_test_environment()
    test_data = create_test_data_file()
    
    print(f"Created {len(test_data['notifications'])} test notifications")
    print("Test setup complete!")
```

- [ ] **Step 3: Set up test data directory structure**

```bash
mkdir -p frontend/tests
mkdir -p backend/tests/data
mkdir -p backend/tests/fixtures
```

- [ ] **Step 4: Make scripts executable**

```bash
chmod +x frontend/scripts/setup-test-environment.sh
chmod +x backend/scripts/setup_test_data.py
```

- [ ] **Step 5: Commit test setup infrastructure**

```bash
git add frontend/scripts/setup-test-environment.sh
blog add backend/scripts/setup_test_data.py
git add -u frontend/tests backend/tests
git commit -m "feat: setup test infrastructure and environment scripts"
```

### Task 6: Create Live API Testing Script

**Files:**
- Create: `tests/live-api-tests.sh`
- Create: `tests/performance-benchmarks.sh`

**Interfaces:**
- Consumes: Live deployed API service
- Produces: Live testing results and performance metrics

- [ ] **Step 1: Create live API testing script**

```bash
#!/bin/bash
# tests/live-api-tests.sh

set -e

LIVE_API_BASE="https://neural-justice-60077006311.development.catalystserverless.in"

function test_endpoint() {
    local endpoint="$1"
    local method="$2"
    local description="$3"
    
    echo "Testing: $description"
    
    case $method in
        GET)
            response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$LIVE_API_BASE$endpoint")
            status_code=${response: -3}
            ;;
        POST)
            response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X POST "$LIVE_API_BASE$endpoint")
            status_code=${response: -3}
            ;;
        *)
            echo "Unsupported method: $method"
            return 1
            ;;
    esac
    
    if [ $status_code -eq 200 ]; then
        echo "✓ PASS: $description"
        return 0
    else
        echo "✗ FAIL: $description (HTTP $status_code)"
        echo "Response: $(cat /tmp/response.json | head -c 200)"
        return 1
    fi
}

echo "Starting live API tests..."
echo "API Base: $LIVE_API_BASE"

# Test all notifications endpoints
results=0

test_endpoint "/server/neural-justice-backend/api/notifications" GET "List notifications endpoint"
results=$((results + $?))

test_endpoint "/server/neural-justice-backend/api/notifications/unread-count" GET "Unread count endpoint"
results=$((results + $?))

test_endpoint "/server/neural-justice-backend/api/notifications/1/read" POST "Mark notification read endpoint"
results=$((results + $?))

test_endpoint "/server/neural-justice-backend/api/notifications/2/acknowledge" POST "Acknowledge notification endpoint"
results=$((results + $?))

test_endpoint "/server/neural-justice-backend/api/notifications/mark-all-read" POST "Mark all read endpoint"
results=$((results + $?))

echo ""
echo "Live API test summary: $((10 - results)) passed, $results failed out of 5 tests"

if [ $results -eq 0 ]; then
    echo "All live API tests passed! ✓"
    exit 0
else
    echo "Some live API tests failed! ✗"
    exit 1
fi
```

- [ ] **Step 2: Create performance benchmarks script**

```bash
#!/bin/bash
# tests/performance-benchmarks.sh

set -e

LIVE_API_BASE="https://neural-justice-60077006311.development.catalystserverless.in"
api_response_time=0
total_requests=0
max_response_time=0
min_response_time=999

function benchmark_endpoint() {
    local endpoint="$1"
    local method="$2"
    local description="$3"
    
    echo "Benchmarking: $description"
    
    # Make 5 requests to get average
    total_time=0
    for i in {1..5}; do
        start_time=$(date +%s%N)
        
        case $method in
            GET)
                curl -s -X GET "$LIVE_API_BASE$endpoint" > /dev/null
                ;;
            POST)
                # Use a test notification ID
                curl -s -X POST "$LIVE_API_BASE$endpoint" > /dev/null
                ;;
        esac
        
        end_time=$(date +%s%N)
        elapsed=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
        total_time=$((total_time + elapsed))
        
        if [ $i -eq 1 ]; then
            min_response_time=$elapsed
        fi
        
        if [ $elapsed -gt $max_response_time ]; then
            max_response_time=$elapsed
        fi
        
        echo "  Request $i: ${elapsed}ms"
        
        # Wait between requests to avoid overwhelming
        sleep 1
    done
    
    avg_time=$((total_time / 5))
    echo "  Average: ${avg_time}ms"
    echo "  Min: ${min_response_time}ms"
    echo "  Max: ${max_response_time}ms"
    
    api_response_time=$((api_response_time + avg_time))
    total_requests=$((total_requests + 5))
}

echo "Starting performance benchmarks..."
echo "API Base: $LIVE_API_BASE"

# Benchmark key endpoints
benchmark_endpoint "/server/neural-justice-backend/api/notifications" GET "List notifications"
benchmark_endpoint "/server/neural-justice-backend/api/notifications/unread-count" GET "Unread count"
benchmark_endpoint "/server/neural-justice-backend/api/notifications/1/read" POST "Mark notification read"

echo ""
echo "Performance benchmark summary:"
overall_avg=0
if [ $total_requests -gt 0 ]; then
    overall_avg=$((api_response_time / total_requests))
fi
echo "  Total Requests: $total_requests"
echo "  Average Response Time: ${overall_avg}ms"
echo "  Throughput: $(echo "scale=2; 1000 / $overall_avg" | bc -l) requests/second"

echo ""
if [ $overall_avg -lt 500 ]; then
    echo "✓ Performance benchmarks PASSED (avg < 500ms)"
    exit 0
else
    echo "✗ Performance benchmarks FAILED (avg >= 500ms)"
    exit 1
fi
```

- [ ] **Step 3: Set up test directory structure**

```bash
mkdir -p tests
cd tests
chmod +x live-api-tests.sh
chmod +x performance-benchmarks.sh
```

- [ ] **Step 4: Create test execution script**

```bash
#!/bin/bash
# run-all-tests.sh

set -e

echo "Running comprehensive notifications E2E tests..."

echo "=== Phase 1: Backend Tests ==="
cd backend
python -m pytest tests/test_notifications.py -v
cd ..

echo ""
echo "=== Phase 2: Frontend Tests ==="
cd frontend
npm run test
echo "=== Phase 3: Live API Tests ==="
./tests/live-api-tests.sh
echo "=== Phase 4: Performance Tests ==="
./tests/performance-benchmarks.sh
echo ""
echo "=== All tests completed ==="
```

- [ ] **Step 5: Commit live testing infrastructure**

```bash
git add tests/live-api-tests.sh tests/performance-benchmarks.sh
chmod +x tests/live-api-tests.sh
chmod +x tests/performance-benchmarks.sh
git commit -m "feat: setup live API and performance testing infrastructure"
```

### Task 7: Create Test Documentation

**Files:**
- Create: `docs/testing/notifications-e2e-testing-guide.md`

**Interfaces:**
- Consumes: All test implementations
- Produces: Comprehensive testing documentation

- [ ] **Step 1: Create comprehensive testing guide**

```markdown
# Notifications E2E Testing Guide

## Overview

This document provides comprehensive testing procedures for the Neural Justice Notifications API service, covering all aspects from backend unit tests to live production validation.

## Quick Start

### Prerequisites

1. **Development Environment**
   - Python 3.11+ with pytest
   - Node.js 18+ with npm
   - Test data setup scripts

2. **Test Configuration**
   ```bash
   # Setup test environment
   chmod +x frontend/scripts/setup-test-environment.sh
   ./frontend/scripts/setup-test-environment.sh
   
   python backend/scripts/setup_test_data.py
   ```

### Running Tests

```bash
# Full test suite
cd neural-justice
./run-all-tests.sh

# Individual test phases
cd backend
python -m pytest tests/test_notifications.py -v

cd frontend
npm run test

# Live API testing
./tests/live-api-tests.sh

# Performance testing
./tests/performance-benchmarks.sh
```

## Test Architecture

### Backend Tests (`backend/tests/test_notifications.py`)

**Purpose:** Validate all 5 API endpoints with synthetic data

**Test Categories:**

1. **Endpoint Functionality Tests**
   - `test_list_notifications_with_filters()` - Filter and pagination
   - `test_unread_count_endpoint()` - Unread count calculation
   - `test_mark_notification_read_success()` - Successful mark read
   - `test_mark_notification_read_not_found()` - Error handling
   - `test_acknowledge_notification()` - Acknowledge notification
   - `test_mark_all_notifications_read()` - Batch mark read
   - `test_pagination_endpoint()` - Pagination validation

2. **Test Setup**

**Environment Variables:**
```bash
ENVIRONMENT=testing
MOCK_AI=true
DATABASE_URL=sqlite:///test_notifications.db
JWT_SECRET_KEY=32-character-test-key-here
ENCRYPTION_KEY=44-character-base64-test-key
```

**Test Data Generation:**
- 50 synthetic notifications created automatically
- Mixed severity levels: critical, high, medium, low
- Mixed read statuses: 70% unread, 30% read
- Various notification types and categories

**Test Execution:**
```bash
python -m pytest tests/test_notifications.py -v --tb=short --capture=no
```

### Frontend Tests (`frontend/tests/api/notifications.test.ts`)

**Purpose:** Validate frontend API client integration

**Test Categories:**

1. **API Endpoint Tests**
   - `getNotifications` integration
   - `markNotificationRead` integration
   - `markAllRead` integration
   - `acknowledgeNotification` integration

2. **Test Environment Setup**

**Jest Configuration:**
```javascript
// frontend/jest.config.js
testEnvironment: 'jsdom',
transformIgnorePatterns: ['node_modules/(?!.*\.json$)'],
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/src/$1',
},
setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
```

**Test Execution:**
```bash
npm run test frontend/tests/api/notifications.test.ts -v --coverage
```

### Live API Tests (`tests/live-api-tests.sh`)

**Purpose:** Validate production API endpoints

**Test Endpoints:**
1. `GET /notifications` - List notifications
2. `GET /notifications/unread-count` - Get unread count
3. `POST /notifications/{id}/read` - Mark as read
4. `POST /notifications/{id}/acknowledge` - Acknowledge notification
5. `POST /notifications/mark-all-read` - Mark all as read

**Test Execution:**
```bash
chmod +x tests/live-api-tests.sh
./tests/live-api-tests.sh
```

### Performance Tests (`tests/performance-benchmarks.sh`)

**Purpose:** Validate API performance under load

**Benchmark Metrics:**

1. **Response Time Measurement**
   - Average response time across 5 requests per endpoint
   - Minimum and maximum response times
   - Requests per second calculation

2. **Performance Thresholds**
```javascript
THRESHOLDS = {
  AVERAGE_RESPONSE_TIME_MS: 500,  // Must be < 500ms
  THROUGHPUT_RPS: 2,             // Must handle 2+ req/sec
  ERROR_RATE_PERCENT: 5,         // Max 5% error rate
}
```

**Test Execution:**
```bash
chmod +x tests/performance-benchmarks.sh
./tests/performance-benchmarks.sh
```

## Test Data Management

### Test Data Structure

**Backend Test Data (`backend/tests/fixtures/notifications.json`):**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "alert",
      "severity": "critical",
      "title": "Test Critical Alert",
      "message": "This is a test critical alert message",
      "is_read": false,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "summary": {
    "total": 1,
    "unread": 1,
    "critical": 1,
    "today": 0
  }
}
```

### Data Cleanup

**Before Each Test Run:**
```bash
# Reset test database
rm -f backend/test_notifications.db

# Recreate test data
python backend/scripts/setup_test_data.py
```

## Error Handling Testing

### Expected Error Scenarios

1. **Invalid Notification IDs**
   ```
   POST /api/notifications/99999/read
   Expected: 404 Not Found
   ```

2. **Invalid Query Parameters**
   ```
   GET /api/notifications?page=0&per_page=200
   Expected: 422 Validation Error
   ```

3. **Missing Authentication**
   ```
   Any protected endpoint without auth token
   Expected: 401 Unauthorized
   ```

### Error Response Validation

**Success Response Format:**
```json
{
  "success": true,
  "data": {...},
  "total": 50,
  "page": 1,
  "per_page": 20
}
```

**Error Response Format:**
```json
{
  "detail": "Notification not found",
  "type": "not_found"
}
```

## Test Coverage Requirements

### Mandatory Test Coverage

| Component | Coverage Target | Metric |
|-----------|----------------|--------|
| Backend API | 90%+ | Lines covered by tests |
| Frontend API | 80%+ | Function calls tested |
| Component Integration | 100% | All components tested |
| Error Handling | 100% | All error paths tested |
| Performance | 100% | All benchmarks pass |

### Coverage Commands

**Backend Coverage:**
```bash
cd backend
python -m pytest tests/test_notifications.py --cov=backend.api.routes.notifications --cov-report=html
```

**Frontend Coverage:**
```bash
cd frontend
npm run test -- --coverage
```

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test-notifications.yml`)

```yaml
name: Notifications E2E Tests

on:
  push:
    paths:
      - 'backend/api/routes/notifications.py'
      - 'frontend/src/api/notifications.ts'
      - 'frontend/src/pages/cp/CPNotifications.tsx'
  pull_request:
    paths:
      - 'backend/api/routes/notifications.py'
      - 'frontend/src/api/notifications.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        python-version: ['3.11', '3.12']
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: 'frontend/package-lock.json'
    
    - name: Setup Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
        cache: 'pip'
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        cd ..
        pip install -r backend/requirements.txt
    
    - name: Run backend tests
      run: |
        cd backend
        python -m pytest tests/test_notifications.py -v
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm run test
    
    - name: Run live API tests (manual trigger)
      if: github.event_name == 'workflow_dispatch'
      run: chmod +x tests/live-api-tests.sh && ./tests/live-api-tests.sh
```

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: "PUT method not allowed"**

**Cause:** API endpoint mismatch between frontend and backend

**Solution:**
```bash
# Check current frontend API client
grep -n "markNotificationRead" frontend/src/api/notifications.ts

# Fix to use POST method
# Change: api.put(...) to api.post(...)
```

**Issue: "404 Not Found" for notifications endpoints**

**Cause:** Endpoints not registered in backend

**Solution:**
```bash
# Check backend API routes
grep -n "notifications" backend/api/main.py

# Ensure all endpoints are imported and registered
```

**Issue: "Enzyme/Adapter error"**

**Cause:** Missing test environment setup

**Solution:**
```bash
# Reinstall test dependencies
chmod +x frontend/scripts/setup-test-environment.sh
./frontend/scripts/setup-test-environment.sh
```

### Log Analysis

**Backend Test Logs:**
```bash
cd backend
python -m pytest tests/test_notifications.py -v --capture=no 2>&1 | grep -E "PASS|FAIL|ERROR"
```

**Frontend Test Logs:**
```bash
cd frontend
npm run test -- --verbose --coverage 2>&1 | tail -50
```

## Maintenance Procedures

### Running Tests After Modifications

```bash
# 1. Code changes
# 2. Run tests
./run-all-tests.sh

# 3. Check results
# 4. Update documentation if needed
```

### Updating Test Data

```python
# Modify backend/scripts/setup_test_data.py
# Add new scenarios
# Run: python backend/scripts/setup_test_data.py
```

### Adding New Test Cases

1. Add test to appropriate test file
2. Commit with descriptive message
3. Update coverage requirements if needed
4. Verify integration with existing tests

## Success Criteria

### Pass/Fail Thresholds

| Test Type | Pass Rate | Threshold |
|-----------|-----------|-----------|
| Backend Unit Tests | 100% | All endpoints functional |
| Frontend Integration | 95% | All API calls working |
| Component Tests | 100% | All components render |
| Live API Tests | 90% | Production endpoints accessible |
| Performance Tests | 100% | All benchmarks pass |

### Acceptance Gates

1. **Backend Layer**
   - All 5 API endpoints functional
   - Error handling for invalid IDs
   - Pagination and filtering working
   - Test coverage >= 90%

2. **Frontend Layer**
   - All API client functions working
   - Component rendering validated
   - Error states handled
   - Integration tests pass

3. **E2E Layer**
   - Live API endpoints accessible
   - Performance benchmarks met
   - Cross-browser compatibility
   - Production readiness confirmed

## Conclusion

This comprehensive testing workflow ensures reliable notifications system operation through systematic validation of all system layers. The structured approach provides clear criteria for success and rapid identification of issues.

The testing pipeline covers:
- Backend API contract validation
- Frontend integration assurance
- Live production verification
- Performance and scalability validation

Regular execution of these tests ensures system reliability and supports continuous delivery of notification services to law enforcement users.
