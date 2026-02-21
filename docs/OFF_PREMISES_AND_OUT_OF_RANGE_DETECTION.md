# OFF-PREMISES CHECK-IN & OUT-OF-RANGE DETECTION SYSTEM

## 1. WHEN IS THE OFF-PREMISES CHECK-IN BUTTON ACTIVATED?

### Button Visibility Conditions
The "Check In Outside Premises" button appears when BOTH conditions are met:

1. **User is OUT OF RANGE** (`locationValidation?.canCheckIn === false`)
   - User is beyond the configured radius from any registered QCC location
   - System detects user cannot check in at an approved location

2. **No check-in exists yet** (`!localTodayAttendance?.check_in_time`)
   - User hasn't checked in today yet
   - Ensures users only use this for initial check-in, not for multiple check-ins

### Code Logic (Line 1527 in attendance-recorder.tsx)
```javascript
const shouldShow = !locationValidation?.canCheckIn && !localTodayAttendance?.check_in_time
// This means: Show button if (user is out of range) AND (hasn't checked in yet)
```

### Button State
- **ENABLED**: User is out of range AND hasn't checked in
- **DISABLED**: User is checking in (loading state) OR processing request

### What Happens When Clicked
1. User clicks "Check In Outside Premises"
2. System sends check-in request with:
   - Current location (GPS/Wi-Fi)
   - Device information
   - Request reason/justification
3. Request goes to supervisor for approval
4. Supervisor reviews and approves in admin panel
5. **AUTOMATIC**: Employee is automatically checked in when supervisor approves

---

## 2. HOW DO WE DETECT OUT-OF-RANGE STATUS ACROSS ALL DEVICES?

### Device Detection Architecture

The system detects device type and applies appropriate location methods:

#### A. MOBILE DEVICES (Smartphones)
- **Primary Method**: GPS (Geolocation API)
- **Fallback**: Device IP → Approximate location
- **Check-in Radius**: 100 meters
- **Check-out Radius**: 100 meters
- **Accuracy**: ±5-20 meters (varies with GPS signal)
- **Browser Support**: iOS Safari, Android Chrome, Firefox Mobile

#### B. LAPTOPS (Windows, Mac, Linux)
- **Primary Method**: Wi-Fi triangulation + Windows Location Services
- **Secondary**: GPS if available
- **Tertiary**: Device IP geolocation
- **Check-in Radius**: 400 meters
- **Check-out Radius**: 400 meters
- **Accuracy**: ±50-200 meters (varies with Wi-Fi signal strength)
- **Browser Support**: Chrome, Edge (Windows), Safari (Mac)

#### C. DESKTOP PCs (Windows/Mac)
- **Primary Method**: Wi-Fi triangulation + Windows Location Services
- **Secondary**: Device IP geolocation
- **Check-in Radius**: 2000 meters
- **Check-out Radius**: 1500 meters
- **Accuracy**: ±100-500 meters
- **Browser Support**: All major browsers (Chrome, Edge, Firefox, Safari)

#### D. TABLETS & HYBRID DEVICES
- **Primary Method**: GPS + Wi-Fi triangulation
- **Fallback**: Device IP location
- **Check-in Radius**: 200-400 meters
- **Check-out Radius**: 200 meters
- **Accuracy**: ±10-100 meters

---

### Location Detection Process

#### Step 1: Browser Capability Detection (lib/geolocation.ts)
```javascript
const capabilities = detectLocationCapabilities()
// Returns:
{
  browserName: 'Edge',
  hasGPS: true,           // GPS available?
  hasKnownIssues: false,  // Known browser issues?
  isWindows: true,        // OS detection
  supportedSources: ['GPS', 'Wi-Fi', 'Windows Location Services'],
  recommendedSettings: {
    enableHighAccuracy: true,
    maximumAge: 0,      // Don't use cached location
    timeout: 20000      // 20 second timeout
  }
}
```

#### Step 2: Get Current Location
```javascript
const location = await getCurrentLocationData()
// Attempts to get location in this order:
// 1. Call Geolocation API with device-specific settings
// 2. Try up to 3 times if fails
// 3. Return best available location (even if less accurate)
```

#### Step 3: Calculate Distance to QCC Locations
```javascript
const distance = calculateDistance(
  userLocation,           // User's GPS coordinates
  qccLocation,           // QCC location coordinates
  proximity               // 100/400/2000 meters depending on device
)

const isOutOfRange = distance > deviceProximityRadius
```

#### Step 4: Determine Nearest Location
```javascript
const nearestLocation = findNearestQCCLocation(userLocation, allQCCLocations)
// Returns:
{
  name: 'QCC Head Office',
  distance: 250,          // meters from user
  latitude: 5.5556,
  longitude: -0.1234
}
```

---

### Example: How Out-of-Range Detection Works

**Scenario: User in Perth, Australia (Test Location)**
```
User Location: -31.854696, 116.00816

QCC Locations Registered: Ghana (6.5K+ km away)

Distance Calculation:
Distance = 6,500+ km > 100 meters (mobile) or 400 meters (laptop) or 2000 meters (desktop)

Result: isOutOfRange = TRUE
Action: "Check In Outside Premises" button appears
```

**Scenario: User Within 100 meters of QCC Location**
```
User Location: 5.5556, -0.1234
Nearest QCC: 5.5560, -0.1238 (50 meters away)

Distance = 50 meters < 100 meters (mobile/laptop) or 2000 meters (desktop)

Result: isOutOfRange = FALSE
Action: Regular "Check In" button is available instead
```

---

### Location Validation Response

When user is out of range, the system returns:
```json
{
  "canCheckIn": false,
  "canCheckOut": false,
  "distance": 6500000,
  "nearestLocation": {
    "name": "QCC Head Office",
    "distance": 6500000,
    "address": "Ghana"
  },
  "message": "You are 6500 km from the nearest QCC location",
  "shouldShowOffPremisesOption": true
}
```

---

### Device-Specific Radius Justification

| Device Type | Check-In Radius | Check-Out Radius | Reason |
|---|---|---|---|
| Mobile (Phone) | 100m | 100m | GPS most accurate, portable |
| Laptop | 400m | 400m | Wi-Fi less accurate, portable |
| Desktop PC | 2000m | 1500m | Wi-Fi/IP only, less accurate |

---

### Accuracy Factors

**Best Accuracy:**
- Mobile with GPS outdoor (±5-15 meters)
- Near QCC location with strong GPS signal

**Moderate Accuracy:**
- Laptop on strong Wi-Fi network (±50-150 meters)
- Desktop PC indoors

**Poor Accuracy:**
- Mobile indoors without GPS (±100-500 meters)
- Desktop PC in basement (IP-only fallback)

---

### Browser Location Permission Handling

1. **First visit**: Browser asks for permission
2. **User grants permission**: Location is tracked continuously
3. **User denies permission**: System shows "Check In Outside Premises" (assumes out of range)
4. **HTTPS only**: Location API requires secure connection

---

## Summary

- **Off-Premises Check-In Button**: Shows when `!locationValidation?.canCheckIn && !localTodayAttendance?.check_in_time`
- **Out-of-Range Detection**: Uses device-specific radius (100m mobile, 400m laptop, 2000m desktop)
- **Cross-Device Support**: Desktop, laptop, mobile, tablet all supported with optimized detection
- **Automatic Check-In**: After supervisor approval, user is automatically checked in
- **No Manual Intervention**: System handles all range checking in real-time
