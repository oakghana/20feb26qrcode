# Check-In/Check-Out System - Full Simulation & Testing Plan

## Test Environment Setup

### Prerequisites
- Valid employee with check-in permissions
- GPS location access enabled
- Device information available
- Supervisor account for approvals

### Database State Before Tests
```sql
-- Ensure today's attendance record is cleared (for fresh testing)
DELETE FROM attendance_records 
WHERE user_id = '<test_user_id>' 
AND DATE(check_in_time) = TODAY();

-- Check off-premises requests
SELECT * FROM off_premises_requests 
WHERE user_id = '<test_user_id>' 
AND DATE(created_at) = TODAY();
```

## Test Scenarios

### Test 1: Normal Check-In and Check-Out
**Objective:** Verify basic check-in and checkout flow works correctly

**Steps:**
1. Open app at 08:00 AM
2. Press "Check In" button with GPS within range
3. Verify check-in succeeds with location validated
4. App shows success message and updates state

**Expected Results:**
- ✓ Check-in recorded in database
- ✓ `check_in_time` set to current time
- ✓ `check_in_location_id` populated
- ✓ `check_in_location_name` shows location
- ✓ UI shows checked-in status
- ✓ Check-out button becomes available

**Check-Out (same day):**
1. Press "Check Out" button at 17:30
2. GPS within range, not early
3. No reason required

**Expected Results:**
- ✓ Check-out recorded
- ✓ `work_hours` calculated correctly (9.5 hours)
- ✓ Success badge displayed with:
  - Check-in time: 08:00 AM
  - Check-out time: 17:30 PM
  - Work hours: 9.50
  - Location: [Valid location]
  - Status: Completed for Today
- ✓ No early checkout warning

---

### Test 2: Late Arrival (After 9:00 AM)
**Objective:** Verify late arrival is detected and warned

**Steps:**
1. Open app at 10:15 AM
2. Press "Check In" button
3. Observe warning in success message

**Expected Results:**
- ✓ Check-in succeeds (not blocked)
- ✓ Message includes: "Late arrival detected - You checked in at 10:15 AM (after 9:00 AM)"
- ✓ Warning logged to audit trail
- ✓ Check-in time shows 10:15 AM correctly

---

### Test 3: Early Checkout with Reason (< 9 hours)
**Objective:** Verify early checkout requires reason when worked < 9 hours

**Steps:**
1. Check-in at 08:00 AM
2. Check-out at 16:00 (before 17:00, only 8 hours worked)
3. API returns error with `requiresEarlyCheckoutReason: true`
4. Modal appears asking for reason
5. User enters reason: "Doctor appointment"
6. Resubmit checkout with reason

**Expected Results:**
- ✓ First checkout attempt rejected
- ✓ Error message: "Early checkout reason is required..."
- ✓ Modal displays for reason input
- ✓ Second attempt succeeds
- ✓ `early_checkout_reason` saved to database
- ✓ Success badge shows:
  - Check-out time: 16:00 PM
  - Work hours: 8.00
  - Status: Completed for Today
- ✓ Reason logged to audit trail

---

### Test 4: Early Checkout without Reason (>= 9 hours)
**Objective:** Verify users with 9+ hours can checkout early without reason

**Steps:**
1. Check-in at 08:00 AM
2. Check-out at 17:15 (but simulate 9+ hours worked internally)
3. Modify test: Check-in at 07:00, checkout at 16:30 (= 9.5 hours)
4. No reason should be required

**Expected Results:**
- ✓ Checkout succeeds without prompting for reason
- ✓ Work hours calculated as 9.5
- ✓ `early_checkout_reason` field is NULL
- ✓ Success badge displays with work hours: 9.50
- ✓ No warning about early checkout (since >= 9 hours)
- ✓ Console log: "[v0] Early checkout for user with 9.50 hours worked - no reason required"

---

### Test 5: Off-Premises Check-In Request
**Objective:** Verify off-premises check-in goes to supervisor, not auto-approved

**Steps:**
1. User presses "Request Off-Premises Check-In"
2. Modal appears with reason input
3. User enters reason: "Working from client office"
4. Submits request

**Expected Results (Immediate):**
- ✓ UI shows "Off-Premises Check-In Request Pending"
- ✓ Display shows location and reason
- ✓ Check-in button disabled
- ✓ Request sent to `/api/attendance/off-premises-request`
- ✓ Creates record in `off_premises_requests` table
- ✓ Status: `pending`
- ✓ `supervisor_id` populated

**Expected Results (After Supervisor Approval):**
- ✓ Record updated to status: `approved`
- ✓ Attendance record created with:
  - `on_official_duty_outside_premises = true`
  - `check_in_time` set to approval time or submission time
  - `check_in_location_id` set to "Off-Premises" location
- ✓ User notified of approval
- ✓ UI updates to show "Checked In - Off-Premises"

---

### Test 6: Off-Premises Checkout Attempt (Should BLOCK)
**Objective:** Verify users with off-premises check-in cannot checkout via app

**Prerequisites:**
- User has `on_official_duty_outside_premises = true`
- Checked in via off-premises approval

**Steps:**
1. User tries to checkout via app
2. Presses "Check Out" button

**Expected Results:**
- ✓ API returns 403 Forbidden
- ✓ Error message: "Off-premises check-in does not allow app-based checkout. Please contact your supervisor for checkout authorization."
- ✓ Checkout button disabled with error message
- ✓ Error logged to audit trail with action: `checkout_blocked_off_premises`

---

### Test 7: GPS Out of Range
**Objective:** Verify GPS location validation prevents checkout outside range

**Steps:**
1. User checked in at valid location
2. User drives away from location
3. GPS now shows 500+ meters away
4. Tries to checkout

**Expected Results:**
- ✓ API validates location (Haversine calculation)
- ✓ Distance > device radius (400m)
- ✓ Returns error: "You are too far from any QCC location..."
- ✓ Suggests: "Please move closer or use QR code option"
- ✓ Violation logged to `device_security_violations` table
- ✓ User can still use QR code to checkout (if available)

---

### Test 8: Device Sharing Detection During Checkout
**Objective:** Verify device sharing is detected but doesn't block checkout

**Prerequisites:**
- Same device used by different user 30 minutes ago
- Both sessions within 2-hour window

**Steps:**
1. User A (checked in) checks out at 17:00
2. Device was used by User B 30 minutes ago

**Expected Results:**
- ✓ Checkout succeeds (not blocked)
- ✓ Response includes `deviceSharingWarning`:
  ```json
  {
    "type": "device_sharing",
    "message": "Device sharing detected: Laptop was used by John Doe 30 min ago"
  }
  ```
- ✓ Audit log created with action: `checkout_device_sharing_detected`
- ✓ Details logged include:
  - Previous user name and ID
  - Time since last use
  - Device MAC address
  - Both IPs

---

### Test 9: Missed Checkout (Previous Day Auto-Close)
**Objective:** Verify yesterday's missed checkout is auto-completed on today's check-in

**Prerequisites:**
- Yesterday's record exists with:
  - `check_in_time`: Yesterday 08:00 AM
  - `check_out_time`: NULL (not checked out)

**Steps:**
1. User checks in today at 08:00 AM
2. System detects yesterday's unclosed record

**Expected Results (Backend):**
- ✓ Yesterday's record auto-updated:
  - `check_out_time`: Yesterday 23:59:59
  - `work_hours`: Calculated (15.99 hours)
  - `check_out_method`: `auto_system`
  - `check_out_location_name`: "Auto Check-out (Missed)"
- ✓ Audit log created with action: `auto_checkout_missed`
- ✓ Today's check-in succeeds normally

**Expected Results (UI):**
- ✓ Warning shown: "You did not check out yesterday. This has been recorded and will be visible to your department head."
- ✓ Success message still shows today's check-in details

---

### Test 10: Duplicate Check-In Prevention
**Objective:** Verify race condition protection prevents duplicate check-in

**Steps:**
1. User at location, ready to check in
2. User rapidly clicks "Check In" button twice (within 1 second)
3. OR: Two devices checking in for same user simultaneously

**Expected Results (First Request):**
- ✓ Check-in succeeds
- ✓ Database record created
- ✓ Unique constraint set: `idx_unique_daily_checkin`

**Expected Results (Second Request):**
- ✓ Returns 400 error
- ✓ Message: "You have already checked in today at [time]. You are currently on duty..."
- ✓ Violation logged to `device_security_violations` table
- ✓ Action: `double_checkin_attempt`

---

### Test 11: Duplicate Checkout Prevention
**Objective:** Verify user cannot checkout twice in same day

**Steps:**
1. User successfully checks out at 17:00
2. User tries to check out again at 17:05

**Expected Results:**
- ✓ Second request returns 400 error
- ✓ Error: "DUPLICATE CHECK-OUT BLOCKED: You have already checked out today at [time]..."
- ✓ Violation logged to `device_security_violations` table
- ✓ Action: `double_checkout_attempt`
- ✓ Original checkout remains unchanged

---

### Test 12: Checkout After Hours (18:00+) - Restricted Department
**Objective:** Verify time-based restrictions work for non-exempt departments

**Steps:**
1. User in "Admin" department (no time exemption)
2. Tries to checkout at 18:15

**Expected Results:**
- ✓ Returns 403 Forbidden
- ✓ Error: "Check-out is only allowed before 18:00. Your department/role does not have exceptions for late check-outs."
- ✓ Notification created with type: `warning`
- ✓ Message visible in notifications section
- ✓ Audit log entry created

---

### Test 13: Checkout After Hours (18:00+) - Exempt Department
**Objective:** Verify exempt departments (Security, Operational) can checkout after hours

**Steps:**
1. User in "Security" department (time exempt)
2. Checks out at 20:00

**Expected Results:**
- ✓ Checkout succeeds
- ✓ No time-based errors
- ✓ Work hours calculated correctly (12+ hours)
- ✓ Audit log notes exempt status

---

### Test 14: Leave Status Blocks Checkout
**Objective:** Verify users on approved leave cannot check out

**Prerequisites:**
- User has approved leave for today
- Leave record created in `leave_status` table

**Steps:**
1. User has leave from today to next 3 days
2. Tries to checkout at 17:00

**Expected Results:**
- ✓ Returns 403 Forbidden
- ✓ Error: "You are currently on approved leave from [date] to [date]. You cannot check out during this period."
- ✓ Check-out button disabled with message
- ✓ No checkout record created

---

### Test 15: Weekend Checkout (No Early Reason Required)
**Objective:** Verify early checkout reason is skipped on weekends

**Prerequisites:**
- Today is Saturday or Sunday
- User checked in at 07:00

**Steps:**
1. Check in at 07:00 on weekend
2. Check out at 12:00 (5 hours worked, clearly early)
3. No reason should be prompted

**Expected Results:**
- ✓ Checkout succeeds immediately
- ✓ No `requiresEarlyCheckoutReason` error
- ✓ `early_checkout_reason` field is NULL
- ✓ Work hours: 5.00
- ✓ Success badge displayed

---

### Test 16: QR Code Check-In (No GPS Required)
**Objective:** Verify QR code method bypasses GPS location validation

**Steps:**
1. User not in GPS range (too far away)
2. User scans QR code at location
3. Submits check-in with `qr_code_used: true`

**Expected Results:**
- ✓ Check-in succeeds
- ✓ GPS validation skipped
- ✓ `check_in_method`: `qr_code`
- ✓ Location correctly set from QR code
- ✓ No geofence violations logged

---

### Test 17: QR Code Checkout (No GPS Required)
**Objective:** Verify QR code method bypasses GPS for checkout

**Steps:**
1. User has checked in via GPS
2. User scans QR code to checkout
3. Submits checkout with `qr_code_used: true`

**Expected Results:**
- ✓ Checkout succeeds
- ✓ GPS location validation skipped
- ✓ `check_out_method`: `qr_code`
- ✓ Location correctly set from QR code
- ✓ Work hours calculated properly
- ✓ Success badge shown

---

### Test 18: Stale Location Rejection
**Objective:** Verify old GPS readings are rejected

**Prerequisites:**
- GPS location is 10 minutes old
- System setting: `maxLocationAge` = 300,000ms (5 minutes)

**Steps:**
1. User submits GPS check-in
2. `location_timestamp` = 10 minutes ago

**Expected Results:**
- ✓ Returns 400 error
- ✓ Message: "Stale or missing GPS timestamp. Please retry using a fresh location reading..."
- ✓ Violation logged: `gps_missing_timestamp`
- ✓ User must retry with fresh GPS

---

### Test 19: Low GPS Accuracy Rejection
**Objective:** Verify poor GPS accuracy is rejected

**Prerequisites:**
- GPS accuracy: 500+ meters
- System setting: `requireHighAccuracy` = true, `allowedAccuracy` = 100m

**Steps:**
1. User submits GPS check-in
2. GPS accuracy = 650 meters

**Expected Results:**
- ✓ Returns 400 error
- ✓ Message: "GPS accuracy is too low. Move to an open area or enable high-accuracy location..."
- ✓ Violation logged: `low_accuracy`
- ✓ Details include accuracy value and allowed value

---

### Test 20: Success Badge Display
**Objective:** Verify job completion badge shows all required information

**Prerequisites:**
- User successfully checked out

**Steps:**
1. Observe success screen after checkout

**Expected Results - Success Badge Shows:**
- ✓ "Success" banner at top (green background)
- ✓ "Attendance Complete!" title with checkmark icon
- ✓ "Your work session has been successfully recorded" subtitle
- ✓ Check-In Time: 08:07 AM
- ✓ Check-In Location: [Location name]
- ✓ Check-Out Time: 17:45 PM
- ✓ Check-Out Location: [Location name]
- ✓ Work Hours: 9.63 hours
- ✓ Status Badge: "✓ Completed for Today" (green)
- ✓ Motivational message: "Great work today!..."
- ✓ Link to reports section

---

## Automated Test Coverage

### API Tests (Jest/Supertest)

**Check-In Endpoint:**
```javascript
describe('POST /api/attendance/check-in', () => {
  test('should reject duplicate check-in', async () => {
    // First check-in succeeds
    // Second check-in with same user returns 400
  })
  
  test('should block off-premises checkout', async () => {
    // Create off-premises check-in
    // Attempt checkout returns 403
  })
  
  test('should calculate work hours correctly', async () => {
    // Check-in at 08:00, check-out at 17:30
    // work_hours should be 9.5
  })
})
```

**Check-Out Endpoint:**
```javascript
describe('POST /api/attendance/check-out', () => {
  test('should require reason for early checkout < 9 hours', async () => {
    // Check-in at 08:00, try checkout at 16:00
    // Should return requiresEarlyCheckoutReason: true
  })
  
  test('should skip reason for >= 9 hours', async () => {
    // Check-in at 07:00, try checkout at 16:30 (9.5 hours)
    // Should succeed without reason requirement
  })
  
  test('should block off-premises users from checkout', async () => {
    // Create off-premises check-in
    // Attempt checkout returns 403
  })
})
```

---

## Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Check-in API latency | < 500ms | < 1000ms |
| Check-out API latency | < 600ms | < 1200ms |
| Geofence validation | < 50ms | < 100ms |
| Device session lookup | < 100ms | < 200ms |
| Database updates | < 200ms | < 400ms |

---

## Post-Implementation Verification

- [ ] All 20 test scenarios pass
- [ ] No database errors in logs
- [ ] No API endpoint errors (500s)
- [ ] Success badge displays correctly
- [ ] Early checkout modal works
- [ ] Off-premises requests route to supervisor
- [ ] 9+ hours logic functioning
- [ ] Device sharing warnings logged
- [ ] Audit trail complete
- [ ] All timestamps correct timezone-aware

