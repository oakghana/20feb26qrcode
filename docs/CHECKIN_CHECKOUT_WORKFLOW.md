# QCC Attendance - Check-In & Check-Out Workflow

## Overview

The QCC Attendance System provides comprehensive check-in and check-out functionality with multiple layers of validation including location-based proximity checks, time-based rules, and off-premises request handling.

---

## 1. CHECK-IN WORKFLOW

### 1.1 Initial State & Preconditions

**Location:** `components/attendance/attendance-recorder.tsx` Lines 283-313

**Prerequisites:**
- User is authenticated and has loaded their profile
- User has assigned location (`assigned_location_id`)
- Real-time location permissions are granted
- No existing check-in for today

**UI State:**
```typescript
const canCheckInButton =
  (initialCanCheckIn ?? true) &&           // Check-in enabled in settings
  !recentCheckIn &&                        // Not checked in recently (5-min cooldown)
  !localTodayAttendance?.check_in_time &&  // No existing check-in today
  !isOnLeave                               // Not on leave
```

### 1.2 Location Validation (Range Check)

**Location:** `lib/geolocation.ts` Lines 600-610

**Device Proximity Radius:**
| Device Type | Check-In Radius | Check-Out Radius |
|-------------|-----------------|------------------|
| Mobile | 100 meters | 100 meters |
| Laptop | 400 meters | 400 meters |
| Desktop | 2000 meters | 1500 meters |

**Process:**
1. Get user's current GPS location
2. Find nearest QCC office location from database
3. Calculate distance using Haversine formula
4. Compare: `distance ≤ deviceCheckInRadius?`
5. Return validation result with proximity status

**Output Example (Within Range):**
```typescript
{
  canCheckIn: true,
  distance: 45,                    // meters from nearest location
  nearestLocation: {
    name: "QCC Head Office",
    id: "loc-123"
  },
  message: "Within range of QCC location"
}
```

**Output Example (Out of Range):**
```typescript
{
  canCheckIn: false,
  distance: 2500,                  // exceeds 100m mobile limit
  nearestLocation: {
    name: "QCC Head Office",
    id: "loc-123"
  },
  message: "Must be within 100 meters of a QCC location to check in",
  accuracyWarning: "GPS accuracy is low (2500m)..."
}
```

### 1.3 Check-In Button Click Flow

**Location:** `components/attendance/attendance-recorder.tsx` Lines 1031-1060

```
User clicks "Check In Now"
    ↓
handleCheckIn() function called
    ↓
1. Validate location (within range?)
    ↓
    └─ YES → Continue to step 2
    └─ NO → Show error, exit early
    ↓
2. Get user's current GPS coordinates
    ↓
3. Prepare check-in payload:
   - user_id
   - latitude, longitude
   - accuracy
   - check_in_location_id
   - check_in_location_name
   - device_info
    ↓
4. Call API: POST /api/attendance/check-in
    ↓
5. Server validates and records check-in
    ↓
6. Show success message
```

### 1.4 Server-Side Check-In Validation

**Location:** `app/api/attendance/check-in/route.tsx`

**Validations Performed:**
1. User authentication check
2. Location validation (independent server check)
3. No existing check-in today
4. Not on leave status verification
5. Device info validation

**Database Record Created:**
```sql
INSERT INTO attendance (
  user_id,
  check_in_time,
  check_in_location_id,
  check_in_location_name,
  latitude,
  longitude,
  accuracy,
  device_type,
  device_id,
  created_at
) VALUES (...)
```

### 1.5 Off-Premises Check-In Request

**When User is Out of Range:**

If a user is legitimately out of range (e.g., working from home, business trip), they can submit an off-premises request:

**Location:** `components/attendance/attendance-recorder.tsx` Lines 2070-2140

**Flow:**
```
User is OUT OF RANGE
    ↓
Check-In button shows error badge
    ↓
User clicks "Request Off-Premises Check-In"
    ↓
Modal opens asking for reason:
- Minimum 10 characters required
- Maximum 500 characters
- Examples: "Working from home", "Client meeting", etc.
    ↓
User enters reason and submits
    ↓
Request sent to: POST /api/attendance/off-premises-request
    ↓
Payload:
{
  user_id: "user-123",
  request_type: "checkin",
  location_id: "loc-123",
  location_name: "QCC Head Office",
  reason: "Working from home today",
  latitude: -31.854,
  longitude: 116.008,
  submitted_at: "2026-02-21T10:30:00Z"
}
    ↓
Manager receives notification
    ↓
Manager approves/rejects request
    ↓
If approved:
  - Auto check-in recorded with off_premises flag
  - User receives confirmation
    
If rejected:
  - User notified
  - Can submit new request
```

**Off-Premises Request Record:**
```sql
CREATE TABLE off_premises_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  request_type VARCHAR(20),  -- 'checkin' | 'checkout'
  location_id UUID REFERENCES locations(id),
  location_name VARCHAR(255),
  reason TEXT,
  status VARCHAR(20),        -- 'pending' | 'approved' | 'rejected'
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  submitted_at TIMESTAMP,
  approved_by UUID,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP
)
```

---

## 2. CHECK-OUT WORKFLOW

### 2.1 Check-Out Preconditions

**Location:** `components/attendance/attendance-recorder.tsx` Lines 307-313

**Prerequisites:**
- User has checked in today
- User has not already checked out
- Not on leave status
- User is within range OR has valid off-premises request

### 2.2 Location Validation for Check-Out

**Same as Check-In but uses CHECK-OUT radius:**
| Device Type | Radius |
|-------------|--------|
| Mobile | 100 meters |
| Laptop | 400 meters |
| Desktop | 1500 meters |

**Location Badge Display:**

```
Within Range (Within Radius):
├─ Badge Color: Green (✓)
├─ Status: "Within Range"
├─ Check-Out Button: ENABLED
└─ Action: Normal checkout

Out of Range (Beyond Radius):
├─ Badge Color: Red (✗)
├─ Status: "Out of Range"
├─ Check-Out Button: DISABLED
└─ Action: Show error, offer off-premises option
```

### 2.3 Time-Based Checkout Rules

**Location:** `components/attendance/attendance-recorder.tsx` Lines 1408-1440

**Scenarios:**

#### Scenario A: After Official Checkout Time (Default 5:00 PM)
```
Current Time: 17:15 (5:15 PM)
Checkout End Time: 17:00 (5:00 PM)
Location: Within Range

Result:
├─ Time Validation: ✓ PASS (after checkout time)
├─ Location Validation: ✓ PASS (within range)
├─ Reason Required: NO
├─ Modal Shown: NO
└─ Action: Direct checkout allowed
```

#### Scenario B: Before Official Checkout Time (Early Checkout)
```
Current Time: 16:30 (4:30 PM)
Checkout End Time: 17:00 (5:00 PM)
Location: Within Range
Reason Required: YES (defined in settings)

Result:
├─ Time Validation: ✗ FAIL (before checkout time)
├─ Location Validation: ✓ PASS (within range)
├─ Reason Required: YES
├─ Modal Shown: YES
├─ User provides reason
└─ Action: Checkout with early reason documented
```

#### Scenario C: Out of Range at Checkout Time
```
Current Time: 17:15 (5:15 PM)
Checkout End Time: 17:00 (5:00 PM)
Location: Out of Range (distance: 5km)

Result:
├─ Location Validation: ✗ FAIL (out of range)
├─ Location Check: First validation (before time check!)
├─ Button: DISABLED
├─ Modal: NOT shown
└─ Action: Offer off-premises checkout request
```

#### Scenario D: Out of Range + Before Checkout Time
```
Current Time: 16:30 (4:30 PM)
Checkout End Time: 17:00 (5:00 PM)
Location: Out of Range (distance: 2km)

Result:
├─ Location Validation: ✗ FAIL (out of range)
├─ Time Check: SKIPPED (location fails first)
├─ Button: DISABLED
├─ Modal: NOT shown (even though early)
└─ Action: Only off-premises option available
```

### 2.4 Normal Checkout Flow (Within Range)

**Location:** `components/attendance/attendance-recorder.tsx` Lines 1340-1450

```
User clicks "Check Out Now"
    ↓
1. Location validation:
   distance ≤ deviceCheckOutRadius?
    ↓
    └─ NO → Error: "Out of range", offer off-premises
    └─ YES → Continue
    ↓
2. Time validation:
   currentTime ≥ checkoutEndTime?
    ↓
    └─ NO (Early checkout) → Check if reason required
    └─ YES → Continue
    ↓
3. If early checkout reason required:
   └─ Show modal asking for reason
   └─ User submits reason
   └─ Continue
    ↓
4. Prepare checkout payload:
   - user_id
   - latitude, longitude
   - accuracy
   - check_out_location_id
   - early_checkout_reason (if applicable)
   - device_info
    ↓
5. Call API: POST /api/attendance/check-out
    ↓
6. Server validates and records checkout
    ↓
7. Calculate work hours
    ↓
8. Show success screen with attendance summary
```

### 2.5 Early Checkout Modal

**Location:** `components/attendance/attendance-recorder.tsx` Lines 2285-2360

**When Triggered:**
- User is within range
- Current time is before checkout end time
- System requires early checkout reason

**Modal Content:**
```
Title: "Early Checkout"
Message: "Your checkout time is at 5:00 PM.
         Are you sure you want to check out early?"

Input: Text area for reason (optional)

Buttons:
├─ "Cancel" → Close modal, return to dashboard
└─ "Confirm" → Submit checkout with reason
```

**Payload with Early Checkout:**
```typescript
{
  user_id: "user-123",
  latitude: -31.854,
  longitude: 116.008,
  accuracy: 10,
  check_out_location_id: "loc-123",
  check_out_location_name: "QCC Head Office",
  early_checkout_reason: "Client meeting ended early",
  device_info: {...}
}
```

### 2.6 Server-Side Check-Out Validation

**Location:** `app/api/attendance/check-out/route.tsx`

**Validations:**
1. User authentication
2. Location validation (independent)
3. Existing check-in today
4. Not already checked out
5. Time rules (if applicable)
6. On-official-duty-outside-premises flag check

**Database Update:**
```sql
UPDATE attendance SET
  check_out_time = NOW(),
  check_out_location_id = $1,
  check_out_location_name = $2,
  latitude_checkout = $3,
  longitude_checkout = $4,
  accuracy_checkout = $5,
  early_checkout_reason = $6,
  work_hours = EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 3600,
  updated_at = NOW()
WHERE user_id = $7 AND DATE(check_in_time) = CURRENT_DATE
```

### 2.7 Off-Premises Check-Out Request

**When User is Out of Range:**

**Location:** `components/attendance/attendance-recorder.tsx` Lines 2181-2200

```
User tries to check out but is OUT OF RANGE
    ↓
Error message shown: "You are out of range"
    ↓
Option appears: "Request Off-Premises Check-Out"
    ↓
User clicks option
    ↓
Modal opens for reason (required)
    ↓
User enters reason:
- Minimum 10 characters
- Maximum 500 characters
    ↓
Request submitted to: POST /api/attendance/off-premises-request
    ↓
Payload:
{
  user_id: "user-123",
  request_type: "checkout",
  location_id: "loc-123",
  location_name: "QCC Head Office",
  reason: "Left office for client delivery",
  latitude: -31.854,
  longitude: 116.008,
  submitted_at: "2026-02-21T17:30:00Z"
}
    ↓
Manager receives notification
    ↓
Manager approves/rejects
    ↓
If approved:
  - Check-out recorded at approval time
  - Marked as off_premises_checkout
  - User gets confirmation
    
If rejected:
  - User notified with reason
  - Can attempt again if within range
  - Or submit new off-premises request
```

### 2.8 Success Screen After Checkout

**Location:** `components/attendance/attendance-recorder.tsx` Lines 1840-1910

**Displays:**
```
┌─ Success Banner
│  └─ "Success" with checkmark icon
├─ Attendance Complete Card
│  ├─ "Attendance Complete!" title
│  ├─ Subtitle: "Your work session has been successfully recorded"
│  │
│  ├─ Check-In Time
│  │  └─ Time + Location name with pin icon
│  │
│  ├─ Check-Out Time
│  │  └─ Time + Location name with pin icon
│  │
│  ├─ Work Hours
│  │  └─ Total hours in green (e.g., "2.63 hours")
│  │
│  ├─ Status
│  │  └─ Green badge: "✓ Completed for Today"
│  │
│  └─ Footer Message
│     └─ "🎉 Great work today!..."
│
└─ Optional: Refresh timer
   └─ "Status will refresh in X:XX"
```

**Example Output:**
```
SUCCESS ✓

ATTENDANCE COMPLETE!
Your work session has been successfully recorded

┌─────────────────────────────────────┐
│ Check-In Time      │ Check-Out Time  │
│ 08:07 AM           │ 10:45 AM        │
│ 📍 Cocobod Archives │ 📍 Cocobod Archives
├─────────────────────────────────────┤
│ Work Hours         │ Status          │
│ 2.63 hours         │ ✓ Completed     │
└─────────────────────────────────────┘

🎉 Great work today! Your attendance has been successfully recorded.
You can view your full attendance history in the reports section.
```

---

## 3. LOCATION RANGE VALIDATION SYSTEM

### 3.1 How Distance is Calculated

**Formula:** Haversine Distance

**Location:** `lib/geolocation.ts` Lines 535-570

```typescript
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}
```

**Accuracy Considerations:**
- GPS accuracy affects validation
- If accuracy > 100m, warning displayed
- Poor GPS may show "out of range" incorrectly
- Server validates independently

### 3.2 Location Validation Points

```
┌─ On Page Load
│  └─ Initial location captured
│
├─ Real-Time Location Monitoring
│  └─ Updates every time GPS refreshes
│  └─ Affects "Within Range" / "Out of Range" badge
│
├─ On Check-In Click
│  └─ Validates location BEFORE API call
│  └─ Button disabled if out of range
│
└─ On Check-Out Click
   ├─ Client-side validation (Line 1395)
   ├─ Modal re-validation (Line 1438)
   └─ Server-side validation (Route handler)
```

### 3.3 Validation Layers (Defense in Depth)

**Layer 1: Button State (Client UI)**
- Disabled if `canCheckInButton = false`
- Visual feedback via badge color
- Prevents user from clicking

**Layer 2: Handler First Check (Client Logic)**
- `handleCheckIn()` / `handleCheckOut()` first validates location
- Throws error immediately if out of range
- No API call made if fails

**Layer 3: Modal Re-validation (Client Modal)**
- Early checkout modal re-validates before submission
- Ensures user can't bypass if location changed

**Layer 4: Server Validation (API)**
- Independent location validation on backend
- Returns 400 error if validation fails
- Database transaction rolls back if invalid

---

## 4. OFF-PREMISES FLAG SYSTEM

### 4.1 Off-Premises Check-In Flag

**When Set:**
- User submitted off-premises check-in request
- Manager approved the request
- Auto check-in recorded

**Database:**
```sql
on_official_duty_outside_premises = true
is_remote_location = true
```

**Effect on Checkout:**
- Checkout location validation bypassed
- Only time rules apply
- User can checkout from anywhere

### 4.2 Off-Premises Check-Out Flag

**When Set:**
- User submitted off-premises checkout request
- Manager approved the request
- Auto checkout recorded

**Bypass Rules Applied:**
```typescript
const isOffPremisesCheckedIn = 
  !!attendanceRecord.on_official_duty_outside_premises || 
  !!attendanceRecord.is_remote_location

const isOutOfRange = !checkoutLocationData

const bypassTimeRules = 
  isOffPremisesCheckedIn || isOutOfRange

if (!canCheckOut && !bypassTimeRules) {
  // Enforce time rules
}
```

---

## 5. ERROR HANDLING & MESSAGES

### 5.1 Location-Based Errors

| Error | When | Action |
|-------|------|--------|
| "Must be within 100m of QCC location" | Mobile out of range | Offer off-premises |
| "Must be within 400m of QCC location" | Laptop out of range | Offer off-premises |
| "Must be within 1500m of QCC location" | Desktop out of range (checkout) | Offer off-premises |
| "GPS accuracy is low" | Accuracy > 100m | Warning only, allow proceed |
| "Location permission denied" | Browser permission | Guide to enable |

### 5.2 Time-Based Errors

| Error | When | Action |
|-------|------|--------|
| "Before checkout time" | Early checkout, reason required | Show modal for reason |
| "After checkout end window" | After 5:00 PM + buffer | Allow early checkout |

### 5.3 Status Errors

| Error | When | Action |
|-------|------|--------|
| "Already checked in today" | Duplicate check-in | Show existing time |
| "Not checked in today" | Checkout without check-in | Offer check-in |
| "Already checked out today" | Duplicate checkout | Show completion screen |
| "On leave today" | Leave status | Block check-in/out |

---

## 6. COMPLETE WORKFLOW EXAMPLES

### Example 1: Perfect Day (Within Range)

```
08:00 → User arrives at office, within 50m
        └─ Clicks "Check In"
        └─ Location: ✓ Within Range
        └─ Check-in recorded: 08:07 AM
        └─ Shows: "Check-in successful"

08:15 → Badge shows: "Within Range" (green)
        Button shows: "Check Out Now" (enabled)

17:00 → Checkout time reached
        └─ User still within 30m
        └─ Clicks "Check Out"
        └─ Location: ✓ Within Range
        └─ Time: ✓ After checkout time
        └─ No modal needed
        └─ Check-out recorded: 17:05 PM
        └─ Success screen shows:
           - Check-In: 08:07 AM at QCC Head Office
           - Check-Out: 17:05 PM at QCC Head Office
           - Work Hours: 8.97 hours
           - Status: ✓ Completed for Today
```

### Example 2: Early Checkout (Within Range)

```
16:30 → User wants to leave early (before 17:00)
        └─ Clicks "Check Out"
        └─ Location: ✓ Within Range
        └─ Time: ✗ Before checkout time
        └─ Reason required: YES
        └─ Modal appears: "Early Checkout"

16:31 → User enters reason: "Client meeting ended early"
        └─ Clicks "Confirm"
        └─ Validation re-runs
        └─ Location: ✓ Still within range
        └─ Check-out recorded with reason
        └─ Success screen shows:
           - Early checkout reason in record
           - Work hours: 8.05 hours
           - Status: ✓ Completed for Today (Early)
```

### Example 3: Out of Range Check-In

```
08:00 → User working from home
        └─ Location: ✗ Out of range (5km away)
        └─ Badge shows: "Out of Range" (red)
        └─ Button shows: "Check In Now" (disabled)

        User clicks info: "Off-Premises Check-In?"
        └─ Modal opens: "Request Off-Premises Check-In"
        └─ User enters reason: "Working from home today"

08:02 → Request submitted
        └─ Pending status shown
        └─ Manager receives notification

10:00 → Manager approves request
        └─ Auto check-in recorded: 08:00 AM
        └─ User notified
        └─ off_premises flag: TRUE

17:00 → User ready to checkout
        └─ Even though out of range, allowed to checkout
        └─ (Off-premises flag bypasses location rules)
        └─ Check-out recorded from any location
```

### Example 4: Out of Range Check-Out

```
17:00 → User was in office, stepped outside
        └─ Location: ✗ Out of range (500m away)
        └─ Badge shows: "Out of Range" (red)
        └─ Button shows: "Check Out Now" (disabled)

        User sees error: "You are out of range"
        └─ Option: "Request Off-Premises Check-Out?"

17:02 → User clicks option
        └─ Modal: "Off-Premises Check-Out Request"
        └─ User enters reason: "Left office for delivery"

17:03 → Request submitted
        └─ Status: Pending
        └─ User waits for approval

10 min → Manager approves
        └─ Auto check-out recorded: 17:03 PM
        └─ Work hours calculated
        └─ User sees success screen
```

### Example 5: Multiple Locations

```
08:00 → User at QCC Head Office
        └─ Check-in: 08:07 AM at QCC Head Office

13:00 → User drives to Regional Office (different location)
        └─ Badge updates: Still "Within Range" (now to Regional Office)
        └─ Nearest location updated in real-time

17:00 → User checks out
        └─ Detected location: QCC Regional Office
        └─ Check-out location: Regional Office
        └─ System records both locations
        └─ Work hours: 8.88 hours
```

---

## 7. SYSTEM ARCHITECTURE

### 7.1 Data Flow

```
┌─────────────────────────────────────────────────────┐
│ User Browser                                        │
├─────────────────────────────────────────────────────┤
│ 1. GPS Location Capture                             │
│    └─ navigator.geolocation.getCurrentPosition()    │
│                                                     │
│ 2. Distance Calculation                             │
│    └─ Haversine formula (client-side)              │
│                                                     │
│ 3. Validation State Update                          │
│    └─ Set canCheckIn/canCheckOut                    │
│                                                     │
│ 4. UI Render                                        │
│    └─ Badge + Button state                          │
│                                                     │
│ 5. Handler Function                                 │
│    └─ Validate location again + prepare payload     │
└─────────────────────────────────────────────────────┘
              │
              ↓ API Call
┌─────────────────────────────────────────────────────┐
│ Next.js API Route Handler                           │
├─────────────────────────────────────────────────────┤
│ /api/attendance/check-in                            │
│ /api/attendance/check-out                           │
│ /api/attendance/off-premises-request                │
│                                                     │
│ 1. Authentication                                   │
│ 2. Independent validation                           │
│ 3. Business logic                                   │
└─────────────────────────────────────────────────────┘
              │
              ↓ Query
┌─────────────────────────────────────────────────────┐
│ Supabase Database                                   │
├─────────────────────────────────────────────────────┤
│ - attendance (records)                              │
│ - locations (QCC offices)                           │
│ - off_premises_requests (pending requests)          │
│ - user_profiles (user data)                         │
└─────────────────────────────────────────────────────┘
```

### 7.2 Key Components

```
AttendanceRecorder (Main Component)
├─ useRealTimeLocations (Hook - Real-time location updates)
├─ useGeolocation (Hook - GPS capturing)
├─ LocationPreviewCard (Component - Show proximity status)
├─ CheckInCard (Component - Check-in button)
├─ CheckOutCard (Component - Check-out button)
├─ EarlyCheckoutModal (Component - Early checkout reason)
├─ OffPremisesDialog (Component - Off-premises request)
└─ SuccessScreen (Component - Completion summary)
```

---

## 8. TROUBLESHOOTING GUIDE

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Button always disabled | Location validation failing | Check GPS, enable permissions, verify location |
| "Out of range" when near office | GPS accuracy poor | Move closer, refresh page, try on device |
| Off-premises request stuck | Manager not approving | Contact manager, check notification sent |
| Work hours incorrect | Checkout time wrong | Verify checkout location, check server time |
| Modal not appearing | Time validation passed | Check current time vs checkout time |
| Success screen not showing | Page refresh needed | Wait 5 seconds, manual refresh |

---

## 9. SETTINGS & CONFIGURATION

### 9.1 Admin Settings (Define Rules)

```typescript
interface AttendanceSettings {
  checkInEnabled: boolean
  checkOutEnabled: boolean
  checkOutEndTime: "17:00"              // 5:00 PM default
  requireEarlyCheckoutReason: boolean
  allowRemoteCheckIn: boolean
  allowRemoteCheckOut: boolean
  offPremisesRequireApproval: boolean
}
```

### 9.2 Device-Specific Settings

```typescript
interface DeviceProximityRadius {
  mobile: {
    checkIn: 100,    // 100 meters
    checkOut: 100
  }
  laptop: {
    checkIn: 400,    // 400 meters
    checkOut: 400
  }
  desktop: {
    checkIn: 2000,   // 2 km
    checkOut: 1500   // 1.5 km
  }
}
```

---

## 10. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `components/attendance/attendance-recorder.tsx` | Main component, all workflows |
| `lib/geolocation.ts` | Distance calculation, validation |
| `app/api/attendance/check-in/route.tsx` | Check-in API endpoint |
| `app/api/attendance/check-out/route.tsx` | Check-out API endpoint |
| `app/api/attendance/off-premises-request/route.tsx` | Off-premises request endpoint |
| `hooks/use-real-time-locations.ts` | Real-time location subscription |
| `hooks/use-geolocation.ts` | GPS capturing hook |

---

## Summary

The QCC Attendance system provides a robust, multi-layered approach to employee attendance tracking:

1. **Location-based validation** ensures employees check in/out from authorized locations
2. **Time-based rules** manage checkout windows and early checkouts
3. **Off-premises requests** allow legitimate remote work documentation
4. **Multiple validation layers** prevent unauthorized modifications
5. **Real-time updates** provide immediate feedback on proximity status
6. **Comprehensive error handling** guides users through all scenarios

The system balances security and usability, protecting attendance integrity while providing flexibility for legitimate business needs.
