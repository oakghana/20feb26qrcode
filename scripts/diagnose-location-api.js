// This script checks what the user-location API is actually returning
// Run this in the browser console to diagnose the caching issue

async function testLocationAPI() {
  console.log("[v0 Diagnostic] Testing /api/attendance/user-location endpoint...");
  
  try {
    const timestamp = Date.now();
    const response = await fetch(`/api/attendance/user-location?t=${timestamp}&bust=${Math.random()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await response.json();
    console.log("[v0 Diagnostic] API Response Headers:", {
      cacheControl: response.headers.get('Cache-Control'),
      pragma: response.headers.get('Pragma'),
      expires: response.headers.get('Expires')
    });
    
    console.log("[v0 Diagnostic] API Response Data:", data);
    
    // Check for Cocobod Archives specifically
    const cocobod = data.data?.find(loc => loc.name?.includes('Cocobod'));
    if (cocobod) {
      console.log("[v0 Diagnostic] Cocobod Archives coordinates:", {
        lat: cocobod.latitude,
        lng: cocobod.longitude,
        isGhana: cocobod.latitude > 4 && cocobod.latitude < 12 && cocobod.longitude < 2 && cocobod.longitude > -4,
        isAustralia: cocobod.latitude < -20 && cocobod.longitude > 100
      });
    }
    
    return data;
  } catch (error) {
    console.error("[v0 Diagnostic] Error:", error);
  }
}

// Run it
testLocationAPI();
