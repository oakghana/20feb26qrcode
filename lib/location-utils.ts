import { generateQRCode, generateSignature, type QRCodeData } from "./qr-code"

interface GeofenceLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  qr_code?: string
}

export async function generateLocationQR(location: GeofenceLocation): Promise<string> {
  try {
    const timestamp = Date.now()
    const qrData: QRCodeData = {
      type: "location",
      locationId: location.id,
      timestamp,
      signature: generateSignature(location.id, timestamp),
    }

    const qrCodeDataUrl = await generateQRCode(qrData)
    return qrCodeDataUrl
  } catch (error) {
    throw new Error("Failed to generate QR code for location")
  }
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function isWithinGeofence(userLat: number, userLng: number, location: GeofenceLocation): boolean {
  const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude)
  return distance <= location.radius_meters
}

export function validateLocationCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
