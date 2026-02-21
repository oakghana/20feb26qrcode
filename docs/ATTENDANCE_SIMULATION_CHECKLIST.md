# QCC Attendance System - Check-In & Off-Premises Simulation Guide

## Overview
This guide walks through simulating a complete attendance workflow including:
1. Normal check-in at an approved location
2. Off-premises check-in request submission
3. Supervisor approval of off-premises request
4. Automatic check-in after approval

---

## Part 1: Normal Check-In Simulation

### Step 1: Navigate to Attendance Page
- Go to http://localhost:3001/dashboard/attendance
- The page loads with your user profile and assigned location

### Step 2: Check Location Permissions
- Allow browser location access when prompted
- The system detects your GPS coordinates
- Validates location against assigned checkout location radius (default: 400m)

### Step 3: Standard Check-In
1. Click the **"Check In"** button
2. The system:
   - Captures current GPS location
   - Validates proximity to assigned location
   - Records check-in time and location
   - Stores device information

### Expected Success Response:
```
✓ Successfully checked in at [Location Name]
  Check-in time: [HH:MM AM/PM]
  Location: [Address]
```

The page displays:
- ✓ Green check-in badge
- Check-in time and location
- Active session timer showing work duration
- Countdown timer to checkout availability (2-hour minimum)

---

## Part 2: Off-Premises Check-In Request

### Scenario: User is Away from Office
When a user is NOT at their assigned location and needs to work from elsewhere:

### Step 1: Attempt Check-In Outside Location
1. Navigate to Attendance page
2. Click **"Check In"** button while outside the approved location radius
3. System detects location is out of range

### Step 2: Initiate Off-Premises Request
1. A dialog appears: **"Off-Premises Check-In Request"**
2. The form shows:
   - Current GPS location coordinates
   - Reverse-geocoded address
   - Location map indicator
   - Reason text area (required, minimum 10 characters)

### Step 3: Provide Justification
Enter a valid reason in the textarea. Examples:
- "Working on client site audit at XYZ Corporation"
- "Attending mandatory training session at venue"
- "On official field assignment - site inspection"
- "Working from home - approved remote work"

### Step 4: Submit Request
1. Click **"Send Request"** button
2. System sends request to supervisors with:
   - Your GPS coordinates and location
   - Reason provided
   - Device information
   - Timestamp

### Expected Response:
```
SUCCESS: Request Submitted
Your off-premises check-in request has been sent for approval.
Reason: "[Your reason]"
A manager will review it shortly and you will be notified.
```

The page displays:
- **"Off-Premises Request Pending"** card showing:
  - Location where request was sent from
  - Reason provided
  - Pending status

---

## Part 3: Supervisor Approval Flow

### For Supervisors/Managers:

#### Access Pending Requests
1. Navigate to Admin Dashboard: /dashboard/admin
2. Go to **Attendance Management** → **Pending Off-Premises Requests**
3. View list of submitted requests with:
   - Employee name and ID
   - Submitted location and GPS coordinates
   - Reason provided
   - Request timestamp
   - Current status

#### Review Request Details
Click on any request to see:
- Full request details
- Map of submitted location
- User's device information
- Previous off-premises request history

#### Approve/Reject Request
**To Approve:**
1. Click **"Approve"** button
2. Optional comment field
3. Click **"Confirm Approval"**
4. System automatically checks in the employee:
   - Records check-in time as current time
   - Sets `on_official_duty_outside_premises` flag
   - Marks request as approved

**To Reject:**
1. Click **"Reject"** button
2. Provide rejection reason
3. Click **"Confirm Rejection"**
4. Employee receives notification of rejection

---

## Part 4: Automatic Check-In After Approval

### Employee Experience
1. Employee receives notification:
   ```
   ✓ Your off-premises check-in request has been APPROVED
   You have been automatically checked in at [location]
   ```

2. Attendance page updates automatically showing:
   - ✓ Green check-in badge
   - Check-in time (time of approval)
   - Check-in location: "Off-Premises Approved" or the submitted location
   - Active session timer
   - 2-hour countdown to checkout availability

### Data Stored
- `check_in_time`: Approval timestamp
- `check_in_location`: GPS coordinates from request
- `on_official_duty_outside_premises`: true
- `approved_by`: Supervisor user ID
- `approval_reason`: Original employee reason

---

## Part 5: Check-Out After Off-Premises Check-In

### After 2-Hour Minimum
1. Countdown timer reaches 00:00:00
2. **"Check Out"** button becomes enabled
3. Click to checkout:
   - System records checkout time
   - Calculates work hours
   - Displays completion badge

### Off-Premises Checkout Notes
- Users with approved off-premises check-ins CAN use location-based checkout
- Or they can be remotely checked out by their supervisor
- Off-premises checkout requests are NOT available (removed)

---

## Simulation Checklist

### Quick Test Flow:
- [ ] Page loads without errors
- [ ] Location permission works
- [ ] Standard check-in succeeds
- [ ] Check-in badge shows
- [ ] 2-hour countdown displays
- [ ] Off-premises button shows (if out of range)
- [ ] Off-premises request form opens
- [ ] Can enter reason (10+ chars)
- [ ] Request submits successfully
- [ ] Pending status card displays
- [ ] Supervisor receives notification
- [ ] Supervisor can approve/reject
- [ ] Employee gets auto check-in on approval
- [ ] 2-hour countdown starts after approval
- [ ] Check-out button enabled after 2 hours
- [ ] Checkout records completion

---

## Troubleshooting

### Issue: "Location not available"
- Allow browser location permission
- Ensure GPS/location services enabled on device
- Check if within 400m of assigned location

### Issue: "Off-Premises button not showing"
- Verify you're outside the location radius
- Check browser console for location accuracy
- May need to move further from approved location

### Issue: "Request not sending"
- Ensure reason is at least 10 characters
- Check internet connection
- Verify supervisor exists and is active

### Issue: "Not auto-checking in after approval"
- Refresh page manually with "Refresh Attendance Status" button
- Check notifications for approval confirmation
- Verify you have Supabase real-time subscriptions enabled

---

## Database Tables Involved

1. **attendance_records**
   - Stores check-in/check-out times and locations
   - `on_official_duty_outside_premises` flag

2. **off_premises_requests**
   - Stores pending/approved off-premises requests
   - `status`: 'pending', 'approved', 'rejected'
   - `request_reason`, `approval_reason`

3. **user_profiles**
   - Employee information
   - `assigned_location_id`

4. **locations**
   - Approved work locations
   - Radius for each location

---

## Expected Timeline

| Action | Time | Actor |
|--------|------|-------|
| Submit off-premises request | T | Employee |
| Notification sent to supervisor | T+1s | System |
| Supervisor reviews request | T+1m | Supervisor |
| Supervisor approves | T+2m | Supervisor |
| Employee auto-checked in | T+2m | System |
| Notification sent to employee | T+2m | System |
| Employee sees updated status | T+2m+refresh | Employee |
| Employee can check out | T+2h+2m | Employee |
