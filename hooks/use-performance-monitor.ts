"use client"

import { useEffect, useRef, useCallback } from "react"

interface PerformanceMetrics {
  componentName: string
  renderTime: number
  timestamp: number
  props?: any
}

interface NetworkMetrics {
  url: string
  method: string
  duration: number
  status: number
  timestamp: number
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private networkMetrics: NetworkMetrics[] = []
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.initializeObservers()
      this.interceptFetch()
    }
  }

  private initializeObservers() {
    try {
      // Long Task Observer
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            console.warn(`[Performance] Long task detected: ${entry.duration}ms`)
            this.logMetric("long-task", {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            })
          }
        }
      })
      longTaskObserver.observe({ entryTypes: ["longtask"] })
      this.observers.push(longTaskObserver)

      // Layout Shift Observer
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) {
            // CLS threshold
            console.warn(`[Performance] Layout shift detected: ${(entry as any).value}`)
            this.logMetric("layout-shift", {
              value: (entry as any).value,
              startTime: entry.startTime,
            })
          }
        }
      })
      layoutShiftObserver.observe({ entryTypes: ["layout-shift"] })
      this.observers.push(layoutShiftObserver)
    } catch (error) {
      console.warn("[Performance] Observer not supported:", error)
    }
  }

  private interceptFetch() {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = typeof args[0] === "string" ? args[0] : args[0].url
      const method = args[1]?.method || "GET"

      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - startTime

        this.networkMetrics.push({
          url,
          method,
          duration,
          status: response.status,
          timestamp: Date.now(),
        })

        // Log slow requests
        if (duration > 1000) {
          console.warn(`[Performance] Slow network request: ${url} took ${duration}ms`)
        }

        return response
      } catch (error) {
        const duration = performance.now() - startTime
        this.networkMetrics.push({
          url,
          method,
          duration,
          status: 0,
          timestamp: Date.now(),
        })
        throw error
      }
    }
  }

  recordComponentRender(componentName: string, renderTime: number, props?: any) {
    this.metrics.push({
      componentName,
      renderTime,
      timestamp: Date.now(),
      props: process.env.NODE_ENV === "development" ? props : undefined,
    })

    // Log slow renders
    if (renderTime > 16) {
      // 60fps threshold
      console.warn(`[Performance] Slow render: ${componentName} took ${renderTime}ms`)
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  private logMetric(type: string, data: any) {
    // Send to analytics service
    if (process.env.NODE_ENV === "production") {
      fetch("/api/analytics/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data, timestamp: Date.now() }),
      }).catch(console.error)
    }
  }

  getMetrics() {
    return {
      componentMetrics: this.metrics,
      networkMetrics: this.networkMetrics,
    }
  }

  clearMetrics() {
    this.metrics = []
    this.networkMetrics = []
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
  }
}

export function usePerformanceMonitor(componentName: string, dependencies: any[] = []) {
  const renderStartTime = useRef<number>(0)
  const monitor = useRef<PerformanceMonitor>()

  useEffect(() => {
    monitor.current = PerformanceMonitor.getInstance()
    return () => {
      if (monitor.current && typeof window !== "undefined") {
        monitor.current.destroy()
      }
    }
  }, [])

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const endRender = useCallback(
    (props?: any) => {
      if (renderStartTime.current > 0) {
        const renderTime = performance.now() - renderStartTime.current
        monitor.current?.recordComponentRender(componentName, renderTime, props)
        renderStartTime.current = 0
      }
    },
    [componentName],
  )

  // Auto-track render performance
  useEffect(() => {
    startRender()
    const timeoutId = setTimeout(() => endRender(), 0)
    return () => clearTimeout(timeoutId)
  }, dependencies)

  const measureAsync = useCallback(
    async (operation: () => Promise<any>, operationName: string): Promise<any> => {
      const startTime = performance.now()
      try {
        const result = await operation()
        const duration = performance.now() - startTime

        console.log(`[Performance] ${componentName}.${operationName}: ${duration}ms`)

        if (duration > 100) {
          console.warn(`[Performance] Slow operation: ${componentName}.${operationName} took ${duration}ms`)
        }

        return result
      } catch (error) {
        const duration = performance.now() - startTime
        console.error(
          `[Performance] Failed operation: ${componentName}.${operationName} failed after ${duration}ms`,
          error,
        )
        throw error
      }
    },
    [componentName],
  )

  return {
    startRender,
    endRender,
    measureAsync,
    getMetrics: () => monitor.current?.getMetrics(),
    clearMetrics: () => monitor.current?.clearMetrics(),
  }
}

export function useNetworkMonitor() {
  const retryWithBackoff = useCallback(
    async (operation: () => Promise<any>, maxRetries = 3, baseDelay = 1000): Promise<any> => {
      let lastError: Error

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation()
        } catch (error) {
          lastError = error as Error

          if (attempt === maxRetries) {
            throw lastError
          }

          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
          console.warn(`[Network] Attempt ${attempt} failed, retrying in ${delay}ms:`, error)

          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      throw lastError!
    },
    [],
  )

  return { retryWithBackoff }
}
