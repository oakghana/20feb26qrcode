# Complete System Architecture & Workflow Guide

## System Overview

The redesigned check-in and check-out system implements a comprehensive employee attendance tracking solution with the following core principles:

1. **Security First** - Multiple validation layers prevent spoofing and fraud
2. **User Experience** - Clear feedback, helpful warnings, and success celebrations
3. **Supervisor Control** - Off-premises requests require approval
4. **Flexibility** - Accommodates long shifts, different departments, and edge cases
5. **Auditability** - Every action logged with full context

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ Load Today's Record │◄──── attendance_records
                │ Load Location Info  │◄──── system_settings
                └──────────┬──────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
    ┌─────▼─────┐                     ┌────▼────┐
    │ Checked In?                     │ No      │
    └─────┬─────┘                     │         │
          │                           └────┬────┘
    Yes   │          ┌─────────────────────┘
          │          │
    ┌─────▼──────────▼─────┐
    │  Show Check-In Page  │
    │  - Check-In Button   │
    │  - Location Status   │
    │  - Device Warnings   │
    └─────┬────────────────┘
          │
       User presses Check-In
          │
    ┌─────▼──────────────────────┐
    │ POST /api/attendance/check-in
    │                             │
    │ 1. Authenticate User        │
    │ 2. Check Duplicates         │
    │ 3. Verify Leave Status      │
    │ 4. Validate Location (GPS)  │
    │ 5. Detect Device Sharing    │
    │ 6. Auto-close Yesterday     │
    │ 7. Insert Record            │
    └─────┬──────────────────────┘
          │
    ┌─────▼──────────┐
    │ Success/Error  │
    │ Return Data    │
    └─────┬──────────┘
          │
    ┌─────▼─────────────────────┐
    │  Update Local State      │
    │  Show Success Notification  │
    │  Enable Checkout Button   │
    └─────┬─────────────────────┘
          │
    ┌─────▼─────────────┐
    │ Show Checked-In   │
    │ - Timer Running   │
    │ - Check-Out Ready │
    │ - Work Hours TBD  │
    └─────┬─────────────┘
          │
    Later - User presses Check-Out
          │
    ┌─────▼────────────────────────┐
    │ POST /api/attendance/check-out
    │                               │
    │ 1. Authenticate User          │
    │ 2. Find Today's Record        │
    │ 3. Verify No Duplicate        │
    │ 4. Check Leave Status         │
    │ 5. Calculate Work Hours       │
    │ 6. Determine If >= 9 Hours    │
    │ 7. Check Time Restrictions    │
    │ 8. Block Off-Premises Users   │
    │ 9. Validate Location (GPS)    │
    │ 10. Check Device Sharing      │
    │ 11. Determine Early Checkout  │
    │ 12. Require Reason if < 9h    │
    │ 13. Update Record             │
    │ 14. Log Audit Trail           │
    └─────┬────────────────────────┘
          │
    ┌─────▼──────────────────┐
    │ Success Response with: │
    │ - workHours            │
    │ - checkoutLocation     │
    │ - Device warnings      │
    │ - Badge Data           │
    └─────┬──────────────────┘
          │
    ┌─────▼─────────────────────────┐
    │   Display Success Badge       │
    │ ┌─────────────────────────┐   │
    │ │ ✓ Attendance Complete   │   │
    │ │ Check-In:  08:07 AM     │   │
    │ │ Location:  Cocobod      │   │
    │ │ Check-Out: 17:45 PM     │   │
    │ │ Location:  Cocobod      │   │
    │ │ Hours:     9.63         │   │
    │ │ Status: ✓ Completed     │   │
    │ └─────────────────────────┘   │
    │ Great work today!             │
    └─────────────────────────────────┘
```

## Decision Trees

### Check-In Decision Tree

```
START: User presses Check-In
│
├─ Is user authenticated?
│  ├─ NO  → Return: Unauthorized 401
│  └─ YES ↓
│
├─ Does user already have today's check-in?
│  ├─ YES ↓ (and checkout exists)
│  │     └─ Return: Already Completed message
│  ├─ YES (no checkout yet)
│  │     └─ Return: Duplicate Check-In blocked 400
│  └─ NO ↓
│
├─ Is user on approved leave today?
│  ├─ YES ↓
│  │     └─ Return: Cannot check-in (on leave) 403
│  └─ NO ↓
│
├─ Location Validation:
│  ├─ Used QR code?
│  │  ├─ YES ↓
│  │  │     └─ Skip GPS validation
│  │  └─ NO ↓
│  │
│  ├─ GPS provided?
│  │  ├─ NO  ↓
│  │  │     └─ Return: GPS required 400
│  │  └─ YES ↓
│  │
│  ├─ Location timestamp fresh (< 5 min)?
│  │  ├─ NO  ↓
│  │  │     └─ Return: Stale location 400
│  │  └─ YES ↓
│  │
│  ├─ GPS accuracy good (< 100m)?
│  │  ├─ NO  ↓
│  │  │     └─ Return: Low accuracy 400
│  │  └─ YES ↓
│  │
│  └─ Within geofence radius?
│     ├─ NO  ↓
│     │     └─ Return: Out of range 400
│     └─ YES ↓
│
├─ Device Sharing Check:
│  ├─ Same device used by another user recently?
│  │  ├─ YES → Log warning, Continue
│  │  └─ NO  → Continue
│  │
│  └─ Same IP from different device recently?
│     ├─ YES → Log warning, Continue
│     └─ NO  → Continue
│
├─ Check Yesterday's Record:
│  ├─ Yesterday unclosed check-in?
│  │  ├─ YES → Auto-close at 23:59
│  │  │      → Log auto-checkout
│  │  │      → Show warning
│  │  └─ NO  → Continue
│  └─ Continue
│
└─ SUCCESS: Insert record, return data
   └─ Show success message
      - Check-in time
      - Location name
      - Late arrival warning (if applicable)
      - Device sharing warnings (if any)
```

### Check-Out Decision Tree

```
START: User presses Check-Out
│
├─ Is user authenticated?
│  ├─ NO  → Return: Unauthorized 401
│  └─ YES ↓
│
├─ Find today's check-in record
│  ├─ Not found  → Return: No check-in 400
│  └─ Found ↓
│
├─ Already checked out?
│  ├─ YES → Return: Duplicate checkout blocked 400
│  └─ NO ↓
│
├─ Is user on approved leave?
│  ├─ YES → Return: Cannot check-out (on leave) 403
│  └─ NO ↓
│
├─ Was check-in off-premises approved?
│  ├─ YES → Return: Off-premises users can't checkout 403
│  └─ NO ↓
│
├─ Calculate work hours
│  ├─ >= 9 hours?
│  │  ├─ YES → Set hasWorkedLongShift = true
│  │  └─ NO  → Set hasWorkedLongShift = false
│  └─ Continue
│
├─ Check time restrictions
│  ├─ Is current time before 18:00?
│  │  ├─ YES → Can checkout
│  │  └─ NO ↓
│  │
│  ├─ Is user in exempt department?
│  │  ├─ YES → Can checkout
│  │  └─ NO  → Return: After hours, no exemption 403
│  └─ Continue
│
├─ Location Validation (if not off-premises):
│  ├─ Used QR code?
│  │  ├─ YES ↓
│  │  │     └─ Skip GPS validation
│  │  └─ NO ↓
│  │
│  ├─ GPS provided?
│  │  ├─ YES → Validate location within radius
│  │  │      ├─ NO  → Return: Out of range 400
│  │  │      └─ YES → Set checkoutLocationData
│  │  └─ NO  → Continue with null location
│  └─ Continue
│
├─ Device Sharing Check:
│  ├─ Same device used by another user recently?
│  │  ├─ YES → Log violation, Add warning to response
│  │  └─ NO  → Continue
│  │
│  └─ Same IP from different device recently?
│     ├─ YES → Log violation, Add warning to response
│     └─ NO  → Continue
│
├─ Early Checkout Check:
│  ├─ hasWorkedLongShift?
│  │  ├─ YES → SKIP early checkout reason (continue below)
│  │  └─ NO ↓
│  │
│  ├─ Is it a weekend?
│  │  ├─ YES → SKIP early checkout reason (continue below)
│  │  └─ NO ↓
│  │
│  ├─ Checking out before standard time (17:00)?
│  │  ├─ NO  → Continue (not early)
│  │  └─ YES ↓
│  │      ├─ Does location require reason?
│  │      │  ├─ NO  → Continue
│  │      │  └─ YES ↓
│  │      │      ├─ User provided reason?
│  │      │      │  ├─ NO  → Return: Reason required 400
│  │      │      │  └─ YES → Set earlyCheckoutWarning
│  │      │      └─ Continue
│  │      └─ Continue
│  └─ Continue
│
├─ Update Attendance Record:
│  ├─ Set check_out_time
│  ├─ Set work_hours (calculated)
│  ├─ Set check_out_location (if available)
│  ├─ Set check_out_method (gps/qr_code/remote)
│  ├─ Set is_remote_checkout (if applicable)
│  └─ Update timestamp
│
├─ Log Audit Trail:
│  └─ Record action: check_out
│     - Old values (before)
│     - New values (after)
│     - IP address
│     - User agent
│
└─ SUCCESS: Return response with:
   ├─ success: true
   ├─ data: updated record
   ├─ workHours: "9.63" (formatted)
   ├─ checkoutLocation: "Cocobod Archives"
   ├─ earlyCheckoutWarning: null (if 9+ hours)
   ├─ deviceSharingWarning: { warning } (if applicable)
   └─ Display Success Badge
      ├─ Show location & time
      ├─ Show work hours
      ├─ Show completion badge
      └─ Show motivational message
```

## Error Handling & Messages

### Check-In Errors

| Error | Code | Message | User Action |
|-------|------|---------|-------------|
| Not Authenticated | 401 | "Unauthorized" | Login |
| Duplicate Check-In | 400 | "Already checked in at [time]" | Refresh page |
| On Leave | 403 | "On approved leave from [date] to [date]" | Contact HR |
| GPS Out of Range | 400 | "You are too far from QCC location" | Move closer or use QR |
| Low GPS Accuracy | 400 | "GPS accuracy too low. Move to open area" | Find better location |
| Stale GPS | 400 | "Stale GPS reading. Ensure fresh fix" | Wait and retry |
| Device Sharing | - | Warning (non-blocking) | Continue anyway |
| Geofence Mismatch | 400 | "Device outside allowed proximity" | Use QR code |

### Check-Out Errors

| Error | Code | Message | User Action |
|-------|------|---------|-------------|
| Not Authenticated | 401 | "Unauthorized" | Login |
| No Check-In Today | 400 | "No check-in record found" | Check-in first |
| Duplicate Checkout | 400 | "Already checked out at [time]" | Refresh page |
| On Leave | 403 | "Cannot check out during leave" | Contact HR |
| Off-Premises Checkin | 403 | "Contact supervisor for checkout" | Contact supervisor |
| After Hours | 403 | "Can only checkout before [time]" | Wait or contact manager |
| GPS Out of Range | 400 | "Out of range. Move closer or use QR" | Move closer or use QR |
| Early Checkout No Reason | 400 | "Early checkout reason required" | Provide reason |
| Low GPS Accuracy | 400 | "GPS accuracy too low" | Find better location |

## Security Layers

### Layer 1: Authentication
- Supabase Auth verification
- User ID validation
- Session validation

### Layer 2: Business Rules
- Duplicate prevention (DB constraints + app logic)
- Leave status verification (per-day checks)
- Time-based restrictions

### Layer 3: Location Validation
- GPS timestamp freshness (max 5 minutes)
- GPS accuracy requirements (< 100m)
- Geofence distance calculation (Haversine formula)
- Device-specific radius settings
- Location ID verification

### Layer 4: Device Security
- Device fingerprint tracking
- IP address monitoring
- Device session history
- Suspicious pattern detection

### Layer 5: Audit & Monitoring
- All actions logged with context
- Violations recorded separately
- Timestamp tracking (timezone-aware)
- User agent recording
- IP address logging

## Database Schema Usage

### Core Tables

**attendance_records**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- check_in_time (timestamp)
- check_out_time (timestamp, nullable)
- check_in_latitude, check_in_longitude
- check_out_latitude, check_out_longitude
- check_in_location_id (FK)
- check_out_location_id (FK)
- check_in_location_name (string)
- check_out_location_name (string)
- work_hours (decimal)
- check_in_method (gps/qr_code)
- check_out_method (gps/qr_code/remote_offpremises)
- early_checkout_reason (text, nullable)
- on_official_duty_outside_premises (boolean)
- is_remote_location (boolean)
- is_remote_checkout (boolean)
- created_at, updated_at (timestamps)
```

**off_premises_requests**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- supervisor_id (UUID, FK)
- request_type (checkin/checkout)
- reason (text)
- status (pending/approved/rejected)
- created_at, updated_at
```

**device_sessions**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- device_id (string) - MAC address
- device_type (mobile/tablet/desktop)
- ip_address (string)
- last_activity (timestamp)
```

**device_security_violations**
```sql
- id (UUID, PK)
- device_id (string)
- ip_address (string)
- attempted_user_id (UUID)
- bound_user_id (UUID)
- violation_type (string)
- device_info (json)
- details (json)
- created_at (timestamp)
```

**audit_logs**
```sql
- id (UUID, PK)
- user_id (UUID)
- action (string)
- table_name (string)
- record_id (UUID)
- old_values (json)
- new_values (json)
- ip_address (string)
- user_agent (string)
- created_at (timestamp)
```

## Performance Considerations

### Query Optimization
- Indexed user_id and check_in_time for fast lookups
- Unique constraint on daily check-in (prevents duplicates)
- Device sessions indexed by device_id and ip_address
- Batch operations where possible

### Response Times
- Check-in API: Target < 500ms (acceptable < 1000ms)
- Check-out API: Target < 600ms (acceptable < 1200ms)
- Geofence validation: < 50ms per location
- Device sharing lookup: < 100ms

### Data Management
- Attendance records: Keep 7 years for compliance
- Audit logs: Keep 5 years minimum
- Device sessions: Keep 90 days
- Security violations: Keep 2 years

## Deployment Checklist

1. Database Schema (Already exists, no changes needed)
2. API Endpoint Updates (Check-out fixes implemented)
3. Client Component Updates (Badge styling ready)
4. Documentation Updates (Complete)
5. Testing & Verification (20 scenarios provided)
6. Monitoring Setup (Audit logs configured)
7. Error Handling (All cases covered)
8. Rollback Plan (Keep previous version accessible)

## Success Metrics

- Zero duplicate check-in/outs
- < 2% device sharing incidents
- < 5% out-of-range GPS issues
- 100% audit trail coverage
- < 1000ms API latency (99th percentile)
- 99.9% uptime
- < 1% error rate

