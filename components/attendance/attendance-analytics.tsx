"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  Clock,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
} from "lucide-react"

interface AttendanceAnalytics {
  currentStreak: number
  longestStreak: number
  monthlyAttendanceRate: number
  weeklyAverage: number
  totalHoursThisMonth: number
  averageHoursPerDay: number
  punctualityScore: number
  weeklyTrend: Array<{
    day: string
    hours: number
    status: string
  }>
  monthlyComparison: Array<{
    month: string
    attendance: number
    hours: number
  }>
  timeDistribution: Array<{
    timeSlot: string
    checkIns: number
  }>
  locationBreakdown: Array<{
    location: string
    visits: number
    percentage: number
  }>
}

const COLORS = ["#4B8B3B", "#f97316", "#6b7280", "#8B5CF6", "#ea580c"]

export function AttendanceAnalytics() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/attendance/analytics")
      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error("Failed to fetch attendance analytics:", error)
      setError("Failed to load attendance analytics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No analytics data available</p>
        <p className="text-sm text-muted-foreground mt-2">Start tracking your attendance to see insights</p>
      </div>
    )
  }

  const getStreakBadge = (streak: number) => {
    if (streak >= 30) return { variant: "default" as const, icon: Award, text: "Excellent!" }
    if (streak >= 14) return { variant: "secondary" as const, icon: Target, text: "Great!" }
    if (streak >= 7) return { variant: "outline" as const, icon: CheckCircle, text: "Good!" }
    return { variant: "outline" as const, icon: Activity, text: "Keep going!" }
  }

  const getPunctualityColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-blue-600"
    if (score >= 60) return "text-orange-600"
    return "text-red-600"
  }

  const streakBadge = getStreakBadge(analytics.currentStreak)
  const StreakIcon = streakBadge.icon

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Attendance Analytics
        </h2>
        <p className="text-muted-foreground">Insights into your attendance patterns and performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-effect border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <StreakIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-2">{analytics.currentStreak} days</div>
            <div className="flex items-center gap-2">
              <Badge variant={streakBadge.variant} className="text-xs">
                {streakBadge.text}
              </Badge>
              <p className="text-xs text-muted-foreground">Longest: {analytics.longestStreak} days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2 mb-2">{analytics.monthlyAttendanceRate}%</div>
            <Progress value={analytics.monthlyAttendanceRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">This month's attendance</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punctuality Score</CardTitle>
            <Clock className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-2 ${getPunctualityColor(analytics.punctualityScore)}`}>
              {analytics.punctualityScore}%
            </div>
            <Progress value={analytics.punctualityScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">On-time check-ins</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
            <Activity className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4 mb-2">{analytics.averageHoursPerDay.toFixed(1)}h</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Total this month: {analytics.totalHoursThisMonth.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Trend
            </CardTitle>
            <CardDescription>Your attendance pattern over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area type="monotone" dataKey="hours" stroke="#4B8B3B" fill="#4B8B3B" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Breakdown */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Location Usage
            </CardTitle>
            <CardDescription>Where you check in most frequently</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.locationBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ location, percentage }) => `${location} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="visits"
                >
                  {analytics.locationBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Comparison
          </CardTitle>
          <CardDescription>Compare your attendance and hours across months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar yAxisId="left" dataKey="attendance" fill="#4B8B3B" name="Attendance %" />
              <Bar yAxisId="right" dataKey="hours" fill="#f97316" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Check-in Time Distribution */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Check-in Time Distribution
          </CardTitle>
          <CardDescription>When you typically arrive at work</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="timeSlot" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="checkIns" fill="#6b7280" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button onClick={fetchAnalytics} className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Refresh Analytics
        </Button>
      </div>
    </div>
  )
}
