"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Clock, UserCheck } from "lucide-react"

export function ActiveLocationsCard() {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchLocations = async (lat?: number, lng?: number) => {
      try {
        setLoading(true)
        const query = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ""
        const res = await fetch(`/api/locations/active${query}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load')
        if (mounted) setLocations(json.locations || [])
      } catch (err: any) {
        console.error('ActiveLocationsCard error', err)
        if (mounted) setError(err.message || 'Error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const tryWithGeolocation = async () => {
      // Try to get browser geolocation (short timeout), then call API with coords
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const getPos = () =>
          new Promise<GeolocationPosition>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Geolocation timeout')), 5000)
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timer)
                resolve(pos)
              },
              (err) => {
                clearTimeout(timer)
                reject(err)
              },
              { enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 },
            )
          })

        try {
          const pos = await getPos()
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          await fetchLocations(lat, lng)
          return
        } catch (e) {
          // Geolocation failed or denied; fall back to server-side assigned location
          console.warn('ActiveLocationsCard: geolocation unavailable, falling back', e)
        }
      }

      // Fallback: call API without coords (server will try assigned_location)
      await fetchLocations()
    }

    tryWithGeolocation()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Active Locations</CardTitle>
            <CardDescription className="text-sm">Live check-in/out stats</CardDescription>
          </div>
          <MapPin className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading locations…</span>
          </div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">Error: {error}</div>
        ) : locations.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active locations</div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-start justify-between p-3 rounded-md hover:bg-muted/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{loc.name}</span>
                    {loc.location_code && <Badge className="ml-2">{loc.location_code}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {loc.address || "No address"}
                  </div>
                </div>

                <div className="text-right text-sm">
                  <div className="flex items-center gap-3 justify-end">
                    <div className="flex flex-col">
                      <span className="font-medium">{loc.today?.currently_checked_in ?? 0}</span>
                      <span className="text-muted-foreground text-xs">Currently in</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{loc.today?.check_in_count ?? 0}</span>
                      <span className="text-muted-foreground text-xs">Check-ins</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{loc.today?.check_out_count ?? 0}</span>
                      <span className="text-muted-foreground text-xs">Check-outs</span>
                    </div>
                  </div>
                  <div className="mt-2 text-muted-foreground text-xs">
                    {loc.today?.last_check_in_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>In: {new Date(loc.today.last_check_in_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {loc.today?.last_check_out_time && (
                      <div className="flex items-center gap-1 mt-1">
                        <UserCheck className="h-3 w-3" />
                        <span>Out: {new Date(loc.today.last_check_out_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {loc.distance_meters != null && (
                      <div className="mt-1 text-xs">Distance: {loc.distance_meters} m</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActiveLocationsCard
