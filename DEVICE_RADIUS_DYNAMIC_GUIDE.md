# Device Radius Settings - Dynamic Configuration Guide

## Overview

The Device Radius Settings system allows administrators to dynamically control check-in and check-out distance thresholds for different device types. Changes take effect immediately across all active users without requiring page refresh.

## How It Works

### 1. User-Facing Display
- All users see **"100 meters"** as the standard check-in requirement in the UI
- This is a confidential trade secret distance that provides uniform user expectations

### 2. Actual Device-Based Validation (Server-Side)
The system validates using device-specific radius settings:
- **Mobile**: 100m check-in, 100m check-out (default)
- **Tablet**: 150m check-in, 150m check-out (default)
- **Laptop**: 400m check-in, 400m check-out (default)
- **Desktop**: 2000m check-in, 1500m check-out (default)

### 3. Dynamic Polling System

The `useDeviceRadiusSettings()` hook implements real-time updates:
- **Initial Load**: Fetches settings on component mount
- **Polling Interval**: Updates every 30 seconds (POLL_INTERVAL = 30000ms)
- **No Cache**: Requests use `cache: 'no-store'` to bypass HTTP caching
- **Manual Refresh**: Call `refresh()` function for immediate updates

### 4. Check-In Flow

```
User attempts check-in
    ↓
useDeviceRadiusSettings() hook fetches current settings
    ↓
calculateDistance(userLocation, assignedLocation) 
    ↓
Compare distance with device radius setting (via validateAttendanceLocation)
    ↓
If distance ≤ device radius → Allow check-in
If distance > device radius → Show error message
```

### 5. Check-Out Flow

```
User attempts check-out
    ↓
API route fetches device radius settings from database
    ↓
validateCheckoutLocation(userLocation, qccLocations, deviceCheckOutRadius)
    ↓
Compare distance with check-out radius
    ↓
If distance ≤ check-out radius → Allow check-out
If distance > check-out radius → Reject with error
```

## Updating Device Radius Settings

### API Endpoint: PUT `/api/settings/device-radius`

**Request:**
```json
{
  "settings": {
    "mobile": { "checkIn": 100, "checkOut": 100 },
    "tablet": { "checkIn": 150, "checkOut": 150 },
    "laptop": { "checkIn": 400, "checkOut": 400 },
    "desktop": { "checkIn": 2000, "checkOut": 1500 }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device radius settings updated successfully",
  "settings": { /* updated settings */ }
}
```

**Requirements:**
- User must be authenticated
- User must have `admin` role
- Settings are stored in `system_settings` table with key `'device_radius_settings'`

## Impact of Changes

### When Admin Updates Settings

1. **Immediate Database Update**
   - Settings written to `system_settings` table
   - Stored as JSON object with key `'device_radius_settings'`

2. **Check-Out API (Immediate)**
   - Check-out route fetches fresh settings from database on each request
   - Next user check-out uses new settings immediately

3. **Client-Side UI (Next Poll)**
   - Mobile app polls every 30 seconds
   - Next polling cycle (within 30 seconds) retrieves updated settings
   - Check-in button enables/disables based on new distance thresholds
   - Users can manually call `refresh()` to force immediate update

### Affected Validations
- ✅ Check-in button state (enabled/disabled)
- ✅ Check-in API validation (POST `/api/attendance/check-in`)
- ✅ Check-out API validation (POST `/api/attendance/check-out`)
- ✅ Location proximity warnings
- ✅ Off-premises approval logic

## Database Schema

The settings are stored in the `system_settings` table:

```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  device_radius_settings JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Example record:
INSERT INTO system_settings (key, device_radius_settings) VALUES (
  'device_radius_settings',
  '{
    "mobile": {"checkIn": 100, "checkOut": 100},
    "tablet": {"checkIn": 150, "checkOut": 150},
    "laptop": {"checkIn": 400, "checkOut": 400},
    "desktop": {"checkIn": 2000, "checkOut": 1500}
  }'::jsonb
)
```

## Trade Secret Compliance

**Confidential Information:**
- The actual device-based distance thresholds (100m mobile, 150m tablet, etc.)
- The varying distances by device type
- Any distance greater than the displayed 100m threshold

**What Users See:**
- "100 meters" displayed in all UI messages
- Consistent requirement messaging across all interfaces
- No indication of device-based variations

**Where Actual Distances Are Used:**
- Server-side validation only (never exposed to client)
- Check-in API endpoint
- Check-out API endpoint
- Backend geolocation utilities

## Monitoring & Debugging

### Log Output
The system logs device radius updates:
```
[v0] Device radius settings updated: {
  desktop: { checkIn: 2000, checkOut: 1500 },
  laptop: { checkIn: 400, checkOut: 400 },
  mobile: { checkIn: 100, checkOut: 100 },
  tablet: { checkIn: 150, checkOut: 150 }
} (hooks/useDeviceRadiusSettings.ts:60:15)
```

### Polling Status
```
[v0] Polling device radius settings for updates...
[v0] Device radius settings updated: { ... } timestamp: 2026-02-21T14:35:00Z
```

### Update Timestamp
Each successful poll includes a `lastUpdate` timestamp in milliseconds since epoch for tracking synchronization.

## Best Practices

1. **Adjust During Off-Hours**
   - Update settings during low-activity periods to minimize user impact

2. **Test on Single Device Type**
   - Make incremental adjustments to one device type first
   - Verify effects before changing all devices

3. **Monitor Activity**
   - Check attendance logs after changes
   - Look for check-in/check-out failures that correlate with setting updates

4. **Keep Defaults**
   - Mobile: 100m (standard minimum)
   - Desktop: 2000m (remote/office access)
   - Tablet/Laptop: Intermediate values for hybrid work

5. **Document Changes**
   - Record when settings are changed
   - Document reason for each adjustment
   - Maintain audit trail in system logs

## Troubleshooting

### Changes Not Taking Effect Immediately
- **Cause**: Client-side polling interval (30 seconds)
- **Solution**: Wait for next poll cycle or implement manual refresh button

### Users See "Out of Range" After Settings Update
- **Cause**: New stricter radius setting
- **Solution**: Either users move closer or increase radius settings back

### Check-Out Still Fails After Updating Check-Out Radius
- **Cause**: Check-out also checks `on_official_duty_outside_premises` flag
- **Solution**: Verify off-premises approval status is not blocking check-out

### Different Behavior Between Check-In and Check-Out
- **Note**: Check-in and check-out can have different radius values by design
- **Example**: Desktop: 2000m check-in, 1500m check-out (stricter at end of day)
