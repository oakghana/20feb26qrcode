export class ValidationError extends Error {
  public field?: string
  public value?: any
  public code?: string

  constructor(message: string, field?: string, value?: any, code?: string) {
    super(message)
    this.name = "ValidationError"
    this.field = field
    this.value = value
    this.code = code
  }
}

export function createValidationError(message: string, field?: string, value?: any, code?: string): ValidationError {
  return new ValidationError(message, field, value, code)
}

export function validateRequired(value: any, fieldName: string): void {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw createValidationError(`${fieldName} is required`, fieldName, value, "REQUIRED_FIELD_MISSING")
  }
}

export function validateEmail(email: string, fieldName = "email"): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createValidationError(`Invalid email format: ${email}`, fieldName, email, "INVALID_EMAIL_FORMAT")
  }
}

export function validateLength(value: string, minLength: number, maxLength: number, fieldName: string): void {
  if (value.length < minLength) {
    throw createValidationError(
      `${fieldName} must be at least ${minLength} characters long`,
      fieldName,
      value,
      "VALUE_TOO_SHORT",
    )
  }
  if (value.length > maxLength) {
    throw createValidationError(
      `${fieldName} must be no more than ${maxLength} characters long`,
      fieldName,
      value,
      "VALUE_TOO_LONG",
    )
  }
}

export function validateNumericRange(value: number, min: number, max: number, fieldName: string): void {
  if (isNaN(value)) {
    throw createValidationError(`${fieldName} must be a valid number`, fieldName, value, "INVALID_NUMBER")
  }
  if (value < min || value > max) {
    throw createValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      value,
      "VALUE_OUT_OF_RANGE",
    )
  }
}
