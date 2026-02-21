# Attendance Check-In and Off-Premises Request Simulation Guide

## Overview
This guide provides step-by-step instructions to test the complete attendance check-in workflow and off-premises check-in requests with supervisor approval flow.

## System Architecture
- **Check-In**: User location is validated, device info is captured, and attendance record is created
- **Off-Premises Check-In Request**: User submits request to supervisors with reason, supervisors approve/reject, user is automatically checked in upon approval
- **Check-Out**: User must wait 2 hours minimum, location is validated, completion badge displays

## Simulation Test Cases

### Test Case 1: Standard Check-In (Baseline)
**Objective**: Verify basic check-in functionality with location validation

**Steps**:
1. Navigate to `/dashboard/attendance`
2. System auto-detects location using GPS/WiFi
3. Click "Check In" button
4. Verify location is "Within Range" (green badge)
5. Confirm "Active Work Session" card appears with check-in time
6. Verify "On Duty" badge displays

**Expected Results**:
- Check-in time recorded
- Location shown correctly
- System allows check-in
- Toast notification: "Successfully checked in"

---

### Test Case 2: Off-Premises Check-In Request
**Objective**: Verify supervisors can approve off-premises check-in requests

**Prerequisites**:
- User must be out of geofence range OR manually trigger off-premises request
- Supervisor account access required

**Steps**:
1. From attendance page, trigger off-premises check-in (location shows "Out of Range")
2. System should show option to request off-premises check-in
3. Enter reason: "Client meeting at Accra office" (min 10 chars)
4. Click "Send Request"
5. Toast shows: "Off-premises check-in request submitted for approval"
6. Request appears pending in attendance page

**Supervisor Approval Flow**:
1. Login as supervisor
2. Navigate to `/dashboard/admin/pending-requests` or notifications
3. Review off-premises check-in request from user
4. Click "Approve" 
5. User receives notification: "Off-premises check-in request approved"
6. User's attendance page updates: "Automatically checked in"

**Expected Results**:
- Request created with timestamp
- Supervisor notification received
- Upon approval: user checked in with "Off-Premises" designation
- Attendance record shows: check_in_time, on_official_duty_outside_premises=true
- User cannot request off-premises checkout (blocked at API level)

---

### Test Case 3: Normal Check-Out After 2 Hours
**Objective**: Verify 2-hour minimum enforcement and checkout completion badge

**Steps**:
1. After successful check-in, countdown timer displays
2. Timer shows: "Minimum 2-hour work period required"
3. Wait 2 hours (or advance system time for testing)
4. Timer transitions: "Ready to check out"
5. Click "Check Out" button
6. Location validation runs
7. System records check-out

**Expected Results**:
- Checkout button hidden for first 2 hours
- Countdown timer accurate
- After 2 hours: "Check Out" button appears
- Success: Completion badge displays with:
  - Check-in time & location
  - Check-out time & location
  - Total work hours
  - Status: "Completed for Today" (green badge)

---

### Test Case 4: Location Validation During Check-Out
**Objective**: Verify user must be in range to checkout (unless off-premises approved)

**Scenario A - Within Range**:
1. Check-in at valid location (e.g., "Cocobod Archives")
2. Stay within geofence (400m radius for desktop)
3. After 2 hours, click "Check Out"
4. Expected: Success, completion badge displays

**Scenario B - Out of Range**:
1. Check-in at valid location
2. Leave geofence (move outside 400m radius)
3. After 2 hours, try to checkout
4. Expected: "You are out of range" error message
5. Note: Off-premises request NOT available for checkout (only for check-in)

---

### Test Case 5: Device Sharing Detection
**Objective**: Verify system detects and warns about shared devices

**Steps**:
1. Check-in on Device A at 10:00 AM as User 1
2. Logout User 1
3. Check-in on same Device A at 10:15 AM as User 2
4. System detects device sharing
5. On checkout: Warning appears about shared device
6. Checkout proceeds with device sharing log

**Expected Results**:
- Warning message: "Device has been used by another user recently"
- Checkout still allowed but flagged for audit
- Device sharing recorded in logs

---

### Test Case 6: Early Checkout (< 9 hours)
**Objective**: Verify early checkout behavior

**Scenario A - Less than 9 hours, location allows early checkout**:
1. Check-in at 8:00 AM
2. Attempt checkout at 4:00 PM (8 hours)
3. Reason required: "Attending training session"
4. Checkout succeeds with reason logged

**Scenario B - 9+ hours worked**:
1. Check-in at 7:00 AM
2. Attempt checkout at 5:00 PM (10 hours)
3. No reason required (automatically skipped)
4. Checkout succeeds immediately

**Expected Results**:
- Reason required only for < 9 hours
- 9+ hours: No reason dialog shown
- Both checkout successfully with completion badge

---

### Test Case 7: Data Integrity Check
**Objective**: Verify all checkout data is stored correctly in database

**Steps**:
1. Complete full check-in and check-out flow
2. Navigate to `/dashboard/reports`
3. View attendance history
4. Verify record shows:
   - `check_in_time`: Timestamp
   - `check_out_time`: Timestamp
   - `check_in_location_name`: Location name
   - `check_out_location_name`: Location name (should match or nearby location)
   - `work_hours`: Calculated correctly
   - `check_out_method`: "gps" or "qr_code"

**Expected Results**:
- All fields populated correctly
- Work hours calculated (checkout_time - checkin_time)
- Location names match geofence entries
- Timestamps in correct timezone
- Device info captured

---

## Key Features Being Tested

### Check-In Features:
- Location auto-detection (GPS/WiFi)
- Geofence validation
- Device info capture (device_id, device_type, browser, OS)
- Duplicate check-in prevention
- Leave status verification
- Off-premises request initiation

### Off-Premises Request Features:
- Supervisor approval workflow
- Automatic check-in upon approval
- Audit trail logging
- Notification to user
- Request status tracking

### Check-Out Features:
- 2-hour minimum enforcement
- Location range validation
- Device sharing detection
- Work hours calculation
- Completion badge display
- Early checkout logic (9+ hour exemption)

---

## Debug Commands (Console)

Monitor real-time actions:
```javascript
// Check-in flow
[v0] Check-in initiated
[v0] Location acquired: {latitude, longitude, accuracy}
[v0] Location validation: {distance, location, canCheckIn}
[v0] Check-in successful: {id, user_id, check_in_time}

// Off-premises request
[v0] Off-premises request submitted: {reason, location}
[v0] Supervisor approval: {request_id, approved_at}

// Check-out flow
[v0] Check-out initiated
[v0] Check-out validation: {distance, location, workHours}
[v0] Checkout successful: {id, check_out_time, work_hours}
```

---

## Common Test Data

### Test Locations:
- **Cocobod Archives** (lat: 5.559285, lng: -0.197431) - 400m radius
- **Kumasi Regional Office** (lat: 6.687316, lng: -1.617649) - 50m radius
- **Accra HQ** (lat: 5.625185, lng: -0.191189) - 500m radius

### Test Users:
- Employee ID: 1151908 (IT Department)
- Supervisor Role: Can approve off-premises requests
- Admin Role: Can view all requests

---

## Success Criteria

✅ Check-in completes without errors  
✅ Location validation works correctly  
✅ Off-premises request submits and supervisor receives notification  
✅ Supervisor can approve request  
✅ User auto-checked in upon approval  
✅ 2-hour countdown enforced  
✅ Check-out completes successfully  
✅ Completion badge displays all required data  
✅ No checkout data loss  
✅ Device sharing detected and logged  

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Location permission denied" | Browser permission issue | Allow location access in browser settings |
| "Out of range" error | User outside geofence | Ensure you're within test location radius |
| Check-out fails after 2 hours | Server cache issue | Hard refresh browser (Ctrl+Shift+R) |
| Off-premises request stuck "Pending" | Supervisor hasn't reviewed | Check supervisor notifications/pending queue |
| Work hours calculate incorrectly | Timezone mismatch | Verify server timezone settings |

