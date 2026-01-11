/**
 * Input Validation Utilities
 * Provides type-safe validation for API inputs
 */

import { logger } from './logger'

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate script name for admin operations
 */
export function validateScriptName(script: string): string {
  const ALLOWED_SCRIPTS = ['catalogs', 'products', 'recipes', 'images']

  if (!script || typeof script !== 'string') {
    throw new ValidationError('Script name is required')
  }

  if (!ALLOWED_SCRIPTS.includes(script)) {
    throw new ValidationError(
      `Invalid script name. Allowed: ${ALLOWED_SCRIPTS.join(', ')}`,
      'script'
    )
  }

  return script
}

/**
 * Validate date string (YYYY-MM-DD)
 */
export function validateDate(date: string | null): string | undefined {
  if (!date) return undefined

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    throw new ValidationError('Invalid date format. Expected YYYY-MM-DD', 'date')
  }

  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid date', 'date')
  }

  return date
}

/**
 * Validate log level
 */
export function validateLogLevel(level: string | null): 'debug' | 'info' | 'warn' | 'error' | 'critical' | undefined {
  if (!level) return undefined

  const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'critical']

  if (!VALID_LEVELS.includes(level)) {
    throw new ValidationError(
      `Invalid log level. Allowed: ${VALID_LEVELS.join(', ')}`,
      'level'
    )
  }

  return level as any
}

/**
 * Validate and sanitize string input
 */
export function validateString(
  value: string | null,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    fieldName?: string
  } = {}
): string | undefined {
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    pattern,
    fieldName = 'value',
  } = options

  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }

  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName
    )
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`,
      fieldName
    )
  }

  if (pattern && !pattern.test(value)) {
    throw new ValidationError(`${fieldName} has invalid format`, fieldName)
  }

  return value
}

/**
 * Validate number input
 */
export function validateNumber(
  value: string | number | null,
  options: {
    required?: boolean
    min?: number
    max?: number
    integer?: boolean
    fieldName?: string
  } = {}
): number | undefined {
  const {
    required = false,
    min,
    max,
    integer = false,
    fieldName = 'value',
  } = options

  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return undefined
  }

  const num = typeof value === 'number' ? value : parseFloat(value)

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName)
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName)
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName)
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName)
  }

  return num
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate environment variable exists
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    const error = `Required environment variable ${name} is not set`
    logger.critical(error, undefined, undefined, 'EnvValidation')
    throw new Error(error)
  }
  return value
}

/**
 * Safe JSON parse with validation
 */
export function parseJSON<T = any>(
  input: string,
  fieldName: string = 'input'
): T {
  try {
    return JSON.parse(input)
  } catch (error) {
    throw new ValidationError(`Invalid JSON in ${fieldName}`, fieldName)
  }
}
