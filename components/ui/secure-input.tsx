"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitize?: boolean
  maxLength?: number
  allowedChars?: RegExp
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ className, type, sanitize = true, maxLength, allowedChars, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value

      if (sanitize) {
        // Remove potentially dangerous characters
        value = value
          .replace(/[<>]/g, "") // Remove HTML tags
          .replace(/javascript:/gi, "") // Remove javascript protocol
          .replace(/on\w+=/gi, "") // Remove event handlers
      }

      // Apply character restrictions
      if (allowedChars && !allowedChars.test(value)) {
        return // Don't update if characters are not allowed
      }

      // Apply max length
      if (maxLength && value.length > maxLength) {
        value = value.substring(0, maxLength)
      }

      // Create new event with sanitized value
      const sanitizedEvent = {
        ...event,
        target: {
          ...event.target,
          value,
        },
      }

      onChange?.(sanitizedEvent)
    }

    return <Input type={type} className={cn(className)} ref={ref} onChange={handleChange} {...props} />
  },
)
SecureInput.displayName = "SecureInput"

export { SecureInput }
