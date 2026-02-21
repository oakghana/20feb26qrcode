# Quick Reference Card - Check-In/Check-Out System

## Key API Changes

### POST /api/attendance/check-out - Breaking Changes

**NEW: Off-Premises User Block**
```javascript
// ADDED: Lines 151-160
if (isOffPremisesCheckedIn) {
  return error: "Off-premises check-in does not allow app-based checkout",
         status: 403
}
```

**NEW: 9+ Hours Early Checkout Exemption**
```javascript
// ADDED: Lines 138-143
const hasWorkedLongShift = workHours >= 9

// MODIFIED: Line 477
if (isEarlyCheckout && requireReason && !isWeekend && !hasWorkedLongShift) {
  // Require reason
}
```

**UPDATED: Early Checkout Condition**
- OLD: Only weekend check
- NEW: Weekend OR work hours >= 9

**UPDATED: Success Response**
```json
{
  "workHours": "9.63",           // NEW: Formatted string
  "checkoutLocation": "...",      // NEW: For badge
  "earlyCheckoutWarning": null    // NEW: Nullified for 9+ hours
}
```

## Critical Fixes Applied

| Issue | Location | Fix |
|-------|----------|-----|
| checkoutLocationData undefined | Line 147 → 376 | Moved init earlier |
| Off-premises checkout allowed | Line 146-149 | Added explicit block |
| 9+ hours not exempted | Lines 477-495 | Added condition |
| Early checkout condition incomplete | Line 476 | Added work hours check |

## Testing Priorities

### Must Test First
1. Normal check-in/checkout cycle
2. Off-premises user checkout block (403 error)
3. 9+ hours early checkout without reason
4. Early checkout < 9 hours with reason requirement

### High Priority
5. Success badge displays all data
6. Work hours calculated correctly
7. Early checkout modal only appears when needed
8. Device sharing warnings logged

### Standard Testing
9-20. See FULL_SIMULATION_TESTING_PLAN.md

## Field Reference

### attendance_records Important Columns

**For Check-In:**
- `check_in_time` - Set by API
- `check_in_location_id` - Validated GPS location
- `check_in_latitude, check_in_longitude` - Raw coordinates
- `on_official_duty_outside_premises` - Flag for off-premises

**For Check-Out:**
- `check_out_time` - Set by API (NEW)
- `check_out_location_id` - Validated location (NEW)
- `check_out_latitude, check_out_longitude` - Raw coordinates (NEW)
- `work_hours` - Calculated from times (NEW)
- `early_checkout_reason` - User reason if required (NEW)
- `check_out_method` - gps/qr_code/remote_offpremises (NEW)

## Common Response Scenarios

### Success (Normal Checkout)
```json
{
  "success": true,
  "workHours": "9.50",
  "checkoutLocation": "Office Building",
  "earlyCheckoutWarning": null,
  "message": "Successfully checked out..."
}
```

### Success (9+ Hours)
```json
{
  "success": true,
  "workHours": "10.25",
  "earlyCheckoutWarning": null,  // ← No warning even if early
  "message": "Successfully checked out..."
}
```

### Error (Off-Premises User)
```json
{
  "error": "Off-premises check-in does not allow app-based checkout...",
  "isOffPremisesCheckIn": true,
  "status": 403
}
```

### Error (Early Checkout - No Reason)
```json
{
  "error": "Early checkout reason is required...",
  "requiresEarlyCheckoutReason": true,
  "status": 400
}
```

## Decision Matrix

### Should Early Checkout Require Reason?

```
Work >= 9 hours?
├─ YES  → NO reason required ✓
└─ NO   → Check next condition
        │
        ├─ Is weekend?
        │  ├─ YES → NO reason required ✓
        │  └─ NO  → Check next condition
        │         │
        │         ├─ Before 17:00?
        │         │  ├─ YES → Reason REQUIRED ✗
        │         │  └─ NO  → Reason NOT required ✓
        │         └─
        └─
```

## Environment Variables (No Changes)

All existing environment variables remain the same:
- Database connection strings
- Authentication keys
- Geofence settings
- Device radius settings
- System settings

## Debug Commands

### Check Today's Attendance
```sql
SELECT * FROM attendance_records 
WHERE user_id = '<user_id>' 
  AND DATE(check_in_time) = TODAY();
```

### Find Off-Premises Checkins
```sql
SELECT * FROM attendance_records 
WHERE on_official_duty_outside_premises = true
  AND DATE(check_in_time) = TODAY();
```

### Check Device Violations
```sql
SELECT * FROM device_security_violations 
WHERE DATE(created_at) = TODAY()
ORDER BY created_at DESC;
```

### Verify Audit Trail
```sql
SELECT * FROM audit_logs 
WHERE user_id = '<user_id>' 
  AND action IN ('check_in', 'check_out')
  AND DATE(created_at) = TODAY();
```

## Common Curl Commands

### Test Check-Out API
```bash
curl -X POST http://localhost:3000/api/attendance/check-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "latitude": 5.632,
    "longitude": -0.195,
    "location_id": "<location_uuid>",
    "qr_code_used": false,
    "device_info": {"device_id": "abc123", "device_type": "mobile"},
    "early_checkout_reason": null
  }'
```

### Check Success Response
```bash
# Expected: 200 OK with workHours and checkoutLocation
jq '.workHours, .checkoutLocation' response.json
```

## Documentation Files

| File | Purpose |
|------|---------|
| NEW_CHECKIN_CHECKOUT_SPECIFICATION.md | Full specification |
| FULL_SIMULATION_TESTING_PLAN.md | 20 test scenarios |
| SYSTEM_ARCHITECTURE_GUIDE.md | Architecture & flows |
| IMPLEMENTATION_SUMMARY.md | Changes made |
| This file | Quick reference |

## Rollback Plan

If issues occur:

1. **Immediate Rollback:**
   - Revert check-out/route.tsx to previous version
   - Keeps old behavior

2. **Partial Rollback:**
   - Keep off-premises block (critical fix)
   - Revert 9+ hours exemption if causing issues
   - Revert success badge if rendering issues

3. **Database Rollback:**
   - No schema changes, so no DB migration needed
   - Old records remain intact
   - Can run with old API code anytime

## Performance Baselines

```
Operation          Target    Acceptable
─────────────────────────────────────────
Check-in API       < 500ms   < 1000ms
Check-out API      < 600ms   < 1200ms
Geofence calc      < 50ms    < 100ms
DB update          < 200ms   < 400ms
Device lookup      < 100ms   < 200ms
```

## Success Criteria

- [ ] API compiles without errors
- [ ] All 20 test scenarios pass
- [ ] Success badge displays correctly
- [ ] Off-premises checkout blocked
- [ ] 9+ hours exemption working
- [ ] Early checkout modal appears when needed
- [ ] Audit logs complete
- [ ] Performance within baselines
- [ ] No database errors
- [ ] All error messages clear

## Support Contacts

**For API Issues:**
- Check logs in `/app/api/attendance/check-out/route.tsx`
- Look for `[v0]` debug markers
- Check database constraints

**For UI Issues:**
- Check browser console for errors
- Verify `workHours` in response
- Check `checkoutLocation` field

**For Database Issues:**
- Query `audit_logs` for action sequence
- Check `device_security_violations` for anomalies
- Verify `attendance_records` integrity

