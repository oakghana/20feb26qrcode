# Redesigned Check-In & Check-Out System Specification

## Overview
Complete redesign of attendance recording system with improved UX, off-premises workflow changes, and job completion badges.

## Key Changes

### 1. Check-In Workflow

**User Flow:**
1. App loads and fetches today's attendance record (if any) and location settings
2. User presses "Check In" button
3. App gathers location/device data and validates
4. Posts to `/api/attendance/check-in` endpoint

**Server-Side Validation:**
- ✓ Authentication check
- ✓ Duplicate check-in prevention
- ✓ Leave status verification
- ✓ Location validity (GPS/QR code)
- ✓ Device sharing detection
- ✓ Auto-checkout yesterday's missed record (if needed)

**Off-Premises Check-In:**
- User requests off-premises check-in
- Request goes to supervisor for approval (NOT auto-approved)
- Admin/supervisor reviews and approves/rejects
- Once approved, creates attendance record with `on_official_duty_outside_premises = true`

**Client Response:**
- Updates UI with check-in time
- Caches record locally
- Shows warnings if applicable (device sharing, late arrival)
- Shows success dialog

### 2. Check-Out Workflow

**User Flow:**
1. User presses "Check Out" button
2. App gathers location/device data
3. Posts to `/api/attendance/check-out` endpoint

**Server-Side Validation:**
- ✓ Authentication check
- ✓ Existing check-in validation
- ✓ Leave status verification
- ✓ Duplicate checkout prevention
- ✓ Location validity (if not off-premises)
- ✓ Time-based restrictions (before 18:00 unless exempt)
- ✓ Work hours calculation

**Off-Premises Checkout Prevention:**
- If user was checked in via off-premises (`on_official_duty_outside_premises = true`)
- **BLOCK** app-based checkout
- Return error: "Off-premises check-in does not allow app-based checkout. Contact supervisor."
- Off-premises users must be manually checked out by supervisor

**9+ Hours Logic:**
- If user has worked >= 9 hours
- **SKIP** early checkout reason requirement
- Allow checkout anytime without reason

**Early Checkout (< 9 hours):**
- If checking out before standard end time (17:00)
- AND not on weekend
- AND worked < 9 hours
- **REQUIRE** reason from user
- Return error if reason not provided

**Location Validation:**
- If GPS: Must be within device radius (400m default for mobile)
- If QR code: No location validation needed
- If off-premises check-in: Skip location validation

**Device Sharing Detection:**
- Check if device used by another user recently (2-hour window)
- Check if IP address shared with other device/user
- Log violations to audit trail
- Include warning in response

**Client Response:**
- Success with job completion badge showing:
  - Check-out time
  - Check-out location
  - Work hours calculated
  - Status badge "Completed for Today"
  - Motivational message
- Cache updated record
- Show device sharing warnings if applicable

### 3. Job Completion Badge (Success Screen)

**Displayed After Successful Checkout:**
```
┌─ "Success" Banner ─────────────────┐
│  Attendance Complete!              │
│  Your work session has been recorded
├─────────────────────────────────────┤
│ Check-In Time: 08:07 AM            │
│ Location: Cocobod Archives         │
│                                     │
│ Check-Out Time: 17:45 PM           │
│ Location: Cocobod Archives         │
│                                     │
│ Work Hours: 9.63 hours             │
│ Status: ✓ Completed for Today     │
├─────────────────────────────────────┤
│ Great work today! Your attendance  │
│ has been successfully recorded.    │
│ View full history in Reports.      │
└─────────────────────────────────────┘
```

**Information Shown:**
- ✓ Check-in time & location
- ✓ Check-out time & location  
- ✓ Total work hours (formatted)
- ✓ Status badge (green)
- ✓ Congratulatory message
- ✓ Link to view history

### 4. Warnings & Errors

**Location Out of Range (GPS):**
- Error: "You are too far from any QCC location..."
- Suggest moving closer or using QR code

**Device Sharing Detected:**
- Warning (not blocking): "Device shared by [User Name] 5 min ago"
- Logged to audit trail
- Include device MAC and type

**Missed Checkout (Yesterday):**
- Auto-checkout yesterday at 23:59
- Show warning on today's check-in
- Visible to department head

**Early Checkout Without Reason:**
- Error: "Early checkout reason required"
- Only if < 9 hours worked
- Include modal for reason input

**Off-Premises Checkout Attempt:**
- Error: "Off-premises check-in does not allow app-based checkout"
- Status: 403 Forbidden
- Guide to supervisor

### 5. Database Usage

**No Schema Changes:** Uses existing tables
- `attendance_records` - Core check-in/out data
- `device_sessions` - Device sharing tracking
- `device_security_violations` - Security events
- `audit_logs` - Action logging
- `leave_status` - Leave verification

**Key Columns:**
- `on_official_duty_outside_premises` - Off-premises flag
- `is_remote_location` - Remote checkout flag
- `check_out_time` - Checkout timestamp
- `work_hours` - Calculated hours
- `early_checkout_reason` - Optional reason text

### 6. API Response Structures

**Check-In Success:**
```json
{
  "success": true,
  "attendance": { ... },
  "message": "Successfully checked in...",
  "checkInPosition": 5
}
```

**Check-Out Success (With Badge Data):**
```json
{
  "success": true,
  "data": { ... },
  "workHours": "9.63",
  "checkoutLocation": "Cocobod Archives",
  "message": "Successfully checked out...",
  "earlyCheckoutWarning": null
}
```

**Check-Out Error (Off-Premises):**
```json
{
  "error": "Off-premises check-in does not allow app-based checkout...",
  "isOffPremisesCheckIn": true,
  "status": 403
}
```

### 7. Client UI Changes

**Check-In Button:**
- Shows location validation status
- "Checking in..." during request
- Shows success/error after response

**Off-Premises Request Dialog:**
- Modal for reason input (min 10 chars)
- "Submit for Approval" button
- Shows pending status after submit

**Check-Out Restrictions:**
- Disable checkout before 17:00 (except weekends/exempt)
- Show countdown timer or "Available at HH:MM"
- For off-premises users: Show error message in place of button

**Early Checkout Modal:**
- Only appears if < 9 hours AND before 17:00
- Text input for reason
- Optional cancel button
- Submit sends reason to API

**Success Screen:**
- New comprehensive badge with all details
- Auto-close after 5-10 seconds or manual close
- Refresh attendance status

## Implementation Priority

1. ✓ Fix critical API bugs (off-premises block, checkoutLocationData)
2. Implement 9+ hours logic
3. Add off-premises checkout prevention
4. Design and build success badge component
5. Update client UI for new flows
6. Comprehensive testing

## Testing Scenarios

1. **Normal Check-In/Out:** User at location, within hours
2. **Late Arrival:** User checks in after 9:00 AM
3. **Early Checkout < 9 hours:** Requires reason
4. **Early Checkout >= 9 hours:** No reason required
5. **Off-Premises Check-In:** Pending supervisor approval
6. **Off-Premises Checkout Attempt:** Block and return error
7. **GPS Out of Range:** Suggest QR code
8. **Device Sharing:** Warn but allow
9. **Missed Yesterday Checkout:** Auto-complete and warn
10. **Weekend Checkout:** Skip time restrictions

