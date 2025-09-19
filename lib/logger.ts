type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private sessionId: string
  private userId?: string

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Auto-flush logs periodically
    if (typeof window !== "undefined") {
      setInterval(() => this.flush(), 30000) // Every 30 seconds

      // Flush on page unload
      window.addEventListener("beforeunload", () => this.flush())
    }
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    component?: string,
    action?: string,
    error?: Error,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      component,
      action,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }
  }

  debug(message: string, context?: Record<string, any>, component?: string) {
    const entry = this.createLogEntry("debug", message, context, component)
    this.addLog(entry)

    if (process.env.NODE_ENV === "development") {
      console.debug(`[${component || "App"}] ${message}`, context)
    }
  }

  info(message: string, context?: Record<string, any>, component?: string, action?: string) {
    const entry = this.createLogEntry("info", message, context, component, action)
    this.addLog(entry)

    console.info(`[${component || "App"}] ${message}`, context)
  }

  warn(message: string, context?: Record<string, any>, component?: string, action?: string) {
    const entry = this.createLogEntry("warn", message, context, component, action)
    this.addLog(entry)

    console.warn(`[${component || "App"}] ${message}`, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>, component?: string, action?: string) {
    const entry = this.createLogEntry("error", message, context, component, action, error)
    this.addLog(entry)

    console.error(`[${component || "App"}] ${message}`, error, context)

    // Immediately flush critical errors
    this.flush()
  }

  // Specific logging methods for common use cases
  userAction(action: string, component: string, context?: Record<string, any>) {
    this.info(`User action: ${action}`, context, component, action)
  }

  apiCall(method: string, url: string, duration: number, status: number, component?: string) {
    const level = status >= 400 ? "error" : status >= 300 ? "warn" : "info"
    this[level](
      `API ${method} ${url} - ${status} (${duration}ms)`,
      {
        method,
        url,
        duration,
        status,
      },
      component,
      "api-call",
    )
  }

  performance(operation: string, duration: number, component?: string, context?: Record<string, any>) {
    const level = duration > 1000 ? "warn" : "info"
    this[level](
      `Performance: ${operation} took ${duration}ms`,
      {
        operation,
        duration,
        ...context,
      },
      component,
      "performance",
    )
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)

    // Keep only last 500 logs in memory
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500)
    }
  }

  private async flush() {
    if (this.logs.length === 0) return

    const logsToSend = [...this.logs]
    this.logs = []

    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsToSend }),
      })
    } catch (error) {
      console.error("Failed to send logs:", error)
      // Re-add logs if sending failed
      this.logs.unshift(...logsToSend)
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter((log) => log.level === level) : this.logs
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = Logger.getInstance()

// React hook for component logging
export function useLogger(componentName: string) {
  return {
    debug: (message: string, context?: Record<string, any>) => logger.debug(message, context, componentName),
    info: (message: string, context?: Record<string, any>, action?: string) =>
      logger.info(message, context, componentName, action),
    warn: (message: string, context?: Record<string, any>, action?: string) =>
      logger.warn(message, context, componentName, action),
    error: (message: string, error?: Error, context?: Record<string, any>, action?: string) =>
      logger.error(message, error, context, componentName, action),
    userAction: (action: string, context?: Record<string, any>) => logger.userAction(action, componentName, context),
    apiCall: (method: string, url: string, duration: number, status: number) =>
      logger.apiCall(method, url, duration, status, componentName),
    performance: (operation: string, duration: number, context?: Record<string, any>) =>
      logger.performance(operation, duration, componentName, context),
  }
}
