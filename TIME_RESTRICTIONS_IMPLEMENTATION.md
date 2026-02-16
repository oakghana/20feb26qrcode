# Time-Based Attendance Restrictions Implementation

## Overview
This document describes the implementation of time-based restrictions for check-in and check-out operations in the QCC Electronic Attendance System.

## Business Rules

### Check-In Restrictions
- **Standard Users**: Can only check in before **1:00 PM (13:00)**
- **Exempt Departments**: 
  - Operational/Operations Department
  - Security Department
  - Admin role users
- **Behavior**: Users cannot check in after 1 PM unless they belong to an exempt department

### Check-Out Restrictions
- **Standard Users**: Can only check out before **6:00 PM (18:00)**
- **Exempt Departments**: Same as check-in (Operational, Security, Admin)
- **Notification**: Users attempting to check out after 6 PM receive a warning notification
- **Behavior**: Check-out is blocked for standard users after 6 PM; notification is created

## Implementation Details

### 1. Backend Validation Functions (lib/attendance-utils.ts)

**New Functions Added:**
- `isOperationalDept(dept)`: Checks if department is Operational
- `isExemptFromTimeRestrictions(dept, role)`: Determines if user is exempt from time restrictions
- `canCheckInAtTime(date, dept, role)`: Returns true if check-in is allowed
- `canCheckOutAtTime(date, dept, role)`: Returns true if check-out is allowed
- `getCheckInDeadline()`: Returns "1:00 PM"
- `getCheckOutDeadline()`: Returns "6:00 PM"

### 2. API Route Updates

#### Check-In Route (app/api/attendance/check-in/route.ts)
```javascript
// Added after user profile fetch:
const canCheckIn = canCheckInAtTime(checkInTime, userProfile?.departments, userProfile?.role)
if (!canCheckIn) {
  return NextResponse.json({
    error: `Check-in is only allowed before ${getCheckInDeadline()}...`,
    checkInBlocked: true,
    currentTime: checkInTime.toLocaleTimeString(),
    deadline: getCheckInDeadline(),
  }, { status: 403 })
}
```

#### Check-Out Route (app/api/attendance/check-out/route.tsx)
```javascript
// Added after duplicate checkout check:
const canCheckOut = canCheckOutAtTime(now, userProfileData?.departments, userProfileData?.role)
if (!canCheckOut) {
  // Create notification for user
  await supabase.from("staff_notifications").insert({
    user_id: user.id,
    title: "Check-out Time Exceeded",
    message: `You attempted to check out after ${getCheckOutDeadline()}...`,
    type: "warning",
    is_read: false,
  })
  
  return NextResponse.json({
    error: `Check-out is only allowed before ${getCheckOutDeadline()}...`,
    checkOutBlocked: true,
  }, { status: 403 })
}
```

### 3. Frontend Components

#### Attendance Recorder (components/attendance/attendance-recorder.tsx)

**New State:**
```javascript
const [timeRestrictionWarning, setTimeRestrictionWarning] = useState<{ 
  type: 'checkin' | 'checkout'; 
  message: string 
} | null>(null)
```

**New Effect:**
```javascript
useEffect(() => {
  const now = new Date()
  const canCheckIn = canCheckInAtTime(now, userProfile?.departments, userProfile?.role)
  const canCheckOut = canCheckOutAtTime(now, userProfile?.departments, userProfile?.role)
  
  if (!canCheckIn && !localTodayAttendance?.check_in_time) {
    setTimeRestrictionWarning({
      type: 'checkin',
      message: `Check-in is only allowed before ${getCheckInDeadline()}...`
    })
  } else if (!canCheckOut && localTodayAttendance?.check_in_time && !localTodayAttendance?.check_out_time) {
    setTimeRestrictionWarning({
      type: 'checkout',
      message: `Check-out is only allowed before ${getCheckOutDeadline()}...`
    })
  } else {
    setTimeRestrictionWarning(null)
  }
}, [userProfile, localTodayAttendance])
```

**UI Alert:**
- Displays warning alert when check-in or check-out window is closed
- Shows department exemption info
- Color-coded as red alert for visibility

## Department Configuration

### Exempt Departments (Examples)
```
code: 'operations' | 'operational'
code: 'security'
OR
role: 'admin' | 'department_head' | 'regional_manager'
```

Users can be configured in the database with:
```sql
INSERT INTO departments (code, name) VALUES 
  ('operations', 'Operations Department'),
  ('security', 'Security Department');
```

## Error Responses

### Check-In After 1 PM (Standard User)
```json
{
  "error": "Check-in is only allowed before 1:00 PM. Your department/role does not have exceptions for late check-ins.",
  "checkInBlocked": true,
  "currentTime": "2:30 PM",
  "deadline": "1:00 PM",
  "status": 403
}
```

### Check-Out After 6 PM (Standard User)
```json
{
  "error": "Check-out is only allowed before 6:00 PM. Your department/role does not have exceptions for late check-outs.",
  "checkOutBlocked": true,
  "currentTime": "7:45 PM",
  "deadline": "6:00 PM",
  "notification": "Your attempt to check out after hours has been recorded.",
  "status": 403
}
```

## Testing Scenarios

### Test Case 1: Standard User Check-In Before 1 PM
- **Expected**: Check-in succeeds
- **Result**: Record created in attendance_records

### Test Case 2: Standard User Check-In After 1 PM
- **Expected**: Check-in fails with 403 error
- **Result**: Error message shown, no record created

### Test Case 3: Security Department User Check-In After 1 PM
- **Expected**: Check-in succeeds
- **Result**: Record created, no time restriction applied

### Test Case 4: Standard User Check-Out Before 6 PM
- **Expected**: Check-out succeeds
- **Result**: Record updated with check_out_time

### Test Case 5: Standard User Check-Out After 6 PM
- **Expected**: Check-out fails with 403 error, notification created
- **Result**: staff_notifications table receives new record, user sees warning

## Admin Configuration

### Managing Exempt Departments
1. Navigate to Admin Panel → Departments
2. Departments marked as "Operational" or "Security" automatically get exemptions
3. Users with "admin" role automatically get exemptions

### Adjusting Time Limits (Future)
Currently hardcoded at:
- Check-in: 1:00 PM (13:00)
- Check-out: 6:00 PM (18:00)

To make configurable, add to `system_settings` table and update functions to read from DB.

## Security Considerations

1. **Server-Side Validation**: All restrictions enforced server-side (not client-side)
2. **Audit Trail**: Failed attempts logged in audit_logs
3. **Notifications**: Late checkout attempts create user notifications
4. **Device Security**: Device sharing warnings still apply regardless of time restrictions

## Future Enhancements

1. Make time limits configurable per location
2. Add per-department time limits
3. Emergency override for management
4. Detailed audit reports for time-based violations
5. Integration with geofence-based time calculations

