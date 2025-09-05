import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { format, filters } = await request.json()
    const { startDate, endDate, locationId, districtId, reportType } = filters

    let attendanceQuery = supabase.from("attendance_records").select("*")

    if (startDate) {
      attendanceQuery = attendanceQuery.gte("check_in_time", startDate)
    }
    if (endDate) {
      attendanceQuery = attendanceQuery.lte("check_in_time", endDate)
    }
    if (locationId) {
      attendanceQuery = attendanceQuery.eq("check_in_location_id", locationId)
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery.order("check_in_time", {
      ascending: false,
    })

    if (attendanceError) {
      console.error("Attendance fetch error:", attendanceError)
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return NextResponse.json({ error: "No attendance records found" }, { status: 404 })
    }

    const userIds = [...new Set(attendanceRecords.map((record) => record.user_id))]
    const locationIds = [...new Set(attendanceRecords.map((record) => record.check_in_location_id).filter(Boolean))]

    // Fetch user profiles
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, employee_id, department_id")
      .in("id", userIds)

    // Fetch departments
    const departmentIds = [...new Set(userProfiles?.map((profile) => profile.department_id).filter(Boolean) || [])]
    const { data: departments } = await supabase.from("departments").select("id, name").in("id", departmentIds)

    // Fetch locations
    const { data: locations } = await supabase
      .from("geofence_locations")
      .select("id, name, address")
      .in("id", locationIds)

    const userProfileMap = new Map(userProfiles?.map((profile) => [profile.id, profile]) || [])
    const departmentMap = new Map(departments?.map((dept) => [dept.id, dept]) || [])
    const locationMap = new Map(locations?.map((loc) => [loc.id, loc]) || [])

    const exportData = attendanceRecords.map((record) => {
      const userProfile = userProfileMap.get(record.user_id)
      const department = userProfile ? departmentMap.get(userProfile.department_id) : null
      const location = locationMap.get(record.check_in_location_id)

      return {
        "Employee ID": userProfile?.employee_id || "N/A",
        Name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : "N/A",
        Department: department?.name || "N/A",
        District: "N/A", // District info not available in current schema
        Location: location?.name || "N/A",
        "Check In": new Date(record.check_in_time).toLocaleString(),
        "Check Out": record.check_out_time ? new Date(record.check_out_time).toLocaleString() : "Not checked out",
        Status: record.status,
        "Work Hours": record.work_hours || "0",
        Date: new Date(record.check_in_time).toLocaleDateString(),
      }
    })

    if (format === "excel") {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report")

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance-report-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    } else if (format === "pdf") {
      // Generate PDF file
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(16)
      doc.text("QCC Attendance Report", 20, 20)
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

      // Add table
      const tableData = exportData.map((row) => Object.values(row))
      const tableHeaders = Object.keys(exportData[0] || {})

      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      })

      const pdfBuffer = doc.output("arraybuffer")

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="attendance-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
