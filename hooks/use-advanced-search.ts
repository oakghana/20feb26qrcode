"use client"

import { useState, useCallback, useMemo } from "react"
import type { SearchFilter, SearchPreset } from "@/components/ui/advanced-search"

interface UseAdvancedSearchOptions<T> {
  data: T[]
  searchableFields: string[]
  defaultPresets?: SearchPreset[]
}

export function useAdvancedSearch<T extends Record<string, any>>({
  data,
  searchableFields,
  defaultPresets = [],
}: UseAdvancedSearchOptions<T>) {
  const [savedPresets, setSavedPresets] = useState<SearchPreset[]>(defaultPresets)
  const [currentFilters, setCurrentFilters] = useState<SearchFilter[]>([])

  const applyFilters = useCallback(
    (filters: SearchFilter[]): T[] => {
      if (filters.length === 0) return data

      return data.filter((item) => {
        // For quick search (multiple filters with OR logic)
        const quickSearchFilters = filters.filter((f) => f.id.startsWith("quick-"))
        if (quickSearchFilters.length > 0) {
          return quickSearchFilters.some((filter) => {
            const fieldValue = getNestedValue(item, filter.field)
            return matchesFilter(fieldValue, filter)
          })
        }

        // For advanced search (all filters with AND logic)
        return filters.every((filter) => {
          const fieldValue = getNestedValue(item, filter.field)
          return matchesFilter(fieldValue, filter)
        })
      })
    },
    [data],
  )

  const getNestedValue = useCallback((obj: any, path: string): any => {
    return path.split(".").reduce((current, key) => current?.[key], obj)
  }, [])

  const matchesFilter = useCallback((value: any, filter: SearchFilter): boolean => {
    if (value == null) return false

    const stringValue = String(value).toLowerCase()
    const filterValue = filter.value

    switch (filter.operator) {
      case "contains":
        return stringValue.includes(String(filterValue).toLowerCase())

      case "equals":
        return stringValue === String(filterValue).toLowerCase()

      case "starts_with":
        return stringValue.startsWith(String(filterValue).toLowerCase())

      case "ends_with":
        return stringValue.endsWith(String(filterValue).toLowerCase())

      case "greater_than":
        if (filter.field.includes("date")) {
          return new Date(value) > new Date(String(filterValue))
        }
        return Number(value) > Number(filterValue)

      case "less_than":
        if (filter.field.includes("date")) {
          return new Date(value) < new Date(String(filterValue))
        }
        return Number(value) < Number(filterValue)

      case "between":
        if (typeof filterValue === "object" && "from" in filterValue && "to" in filterValue) {
          if (filter.field.includes("date")) {
            const date = new Date(value)
            return date >= new Date(filterValue.from) && date <= new Date(filterValue.to)
          }
          const num = Number(value)
          return num >= Number(filterValue.from) && num <= Number(filterValue.to)
        }
        return false

      case "in":
        if (Array.isArray(filterValue)) {
          return filterValue.some((val) => stringValue.includes(String(val).toLowerCase()))
        }
        return false

      default:
        return true
    }
  }, [])

  const filteredData = useMemo(() => {
    return applyFilters(currentFilters)
  }, [applyFilters, currentFilters])

  const handleSearch = useCallback((filters: SearchFilter[]) => {
    setCurrentFilters(filters)
  }, [])

  const savePreset = useCallback((preset: Omit<SearchPreset, "id">) => {
    const newPreset: SearchPreset = {
      ...preset,
      id: `preset-${Date.now()}`,
    }
    setSavedPresets((prev) => [...prev, newPreset])
  }, [])

  const deletePreset = useCallback((presetId: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== presetId))
  }, [])

  const exportData = useCallback(
    (filters: SearchFilter[], format: "csv" | "json" = "csv") => {
      const dataToExport = applyFilters(filters)

      if (format === "json") {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `export-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // CSV export
        if (dataToExport.length === 0) return

        const headers = Object.keys(dataToExport[0])
        const csvContent = [
          headers.join(","),
          ...dataToExport.map((row) =>
            headers
              .map((header) => {
                const value = getNestedValue(row, header)
                return `"${String(value).replace(/"/g, '""')}"`
              })
              .join(","),
          ),
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `export-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    },
    [applyFilters, getNestedValue],
  )

  return {
    filteredData,
    currentFilters,
    savedPresets,
    handleSearch,
    savePreset,
    deletePreset,
    exportData,
    totalResults: filteredData.length,
    totalRecords: data.length,
  }
}
