import fs from 'fs'
import path from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    context?: string
    data?: any
    error?: {
        name: string
        message: string
        stack?: string
    }
    requestId?: string
    userId?: string
    duration?: number
}

/**
 * Enhanced structured logger with file output and error tracking
 * Outputs JSON in production, pretty-prints in development
 * Writes to rotating log files for persistence
 */
class Logger {
    private isDev = process.env.NODE_ENV === 'development'
    private logDir = path.join(process.cwd(), 'logs')
    private errorCache: LogEntry[] = [] // Keep last 100 errors in memory
    private maxErrorCache = 100

    constructor() {
        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true })
        }
    }

    private log(level: LogLevel, message: string, data?: any, error?: Error, context?: string, meta?: any) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            ...(data && { data }),
            ...(error && {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            }),
            ...meta
        }

        // Console output
        if (this.isDev) {
            // Pretty print for development
            const emoji = {
                debug: '🔍',
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌',
                critical: '🚨'
            }[level]

            const contextStr = context ? `[${context}]` : ''
            console[level === 'debug' ? 'log' : level === 'critical' ? 'error' : level](
                `${emoji} [${entry.timestamp}] ${contextStr} ${level.toUpperCase()}: ${message}`,
                data || '',
                error || ''
            )
        } else {
            // JSON for production (easier to parse by log aggregators)
            console.log(JSON.stringify(entry))
        }

        // File output
        this.writeToFile(entry)

        // Cache errors for quick access
        if (level === 'error' || level === 'critical') {
            this.errorCache.unshift(entry)
            if (this.errorCache.length > this.maxErrorCache) {
                this.errorCache.pop()
            }
        }
    }

    private writeToFile(entry: LogEntry) {
        try {
            const date = new Date().toISOString().split('T')[0]
            const logFile = path.join(this.logDir, `app-${date}.log`)
            const logLine = JSON.stringify(entry) + '\n'

            fs.appendFileSync(logFile, logLine)

            // Also write errors to separate file
            if (entry.level === 'error' || entry.level === 'critical') {
                const errorFile = path.join(this.logDir, `errors-${date}.log`)
                fs.appendFileSync(errorFile, logLine)
            }
        } catch (err) {
            // Don't throw - logging should never break the app
            console.error('Failed to write log file:', err)
        }
    }

    debug(message: string, data?: any, context?: string) {
        this.log('debug', message, data, undefined, context)
    }

    info(message: string, data?: any, context?: string) {
        this.log('info', message, data, undefined, context)
    }

    warn(message: string, data?: any, context?: string) {
        this.log('warn', message, data, undefined, context)
    }

    error(message: string, error?: Error | any, context?: string) {
        const err = error instanceof Error ? error : undefined
        const data = error instanceof Error ? undefined : error
        this.log('error', message, data, err, context)
    }

    critical(message: string, error?: Error, data?: any, context?: string) {
        this.log('critical', message, data, error, context)
    }

    /**
     * Create a context logger that automatically adds context to all logs
     */
    child(context: string) {
        return {
            debug: (message: string, data?: any) => this.debug(message, data, context),
            info: (message: string, data?: any) => this.info(message, data, context),
            warn: (message: string, data?: any) => this.warn(message, data, context),
            error: (message: string, error?: Error | any) => this.error(message, error, context),
            critical: (message: string, error?: Error, data?: any) => this.critical(message, error, data, context),
        }
    }

    /**
     * Time an async function and log duration
     */
    async time<T>(label: string, fn: () => Promise<T>, context?: string): Promise<T> {
        const start = Date.now()
        this.debug(`${label} - Started`, undefined, context)

        try {
            const result = await fn()
            const duration = Date.now() - start
            this.info(`${label} - Completed`, { duration: `${duration}ms` }, context)
            return result
        } catch (error) {
            const duration = Date.now() - start
            this.error(`${label} - Failed`, error as Error, context)
            throw error
        }
    }

    /**
     * Get cached errors (last 100)
     */
    getRecentErrors(limit: number = 20): LogEntry[] {
        return this.errorCache.slice(0, limit)
    }

    /**
     * Read logs from file
     */
    readLogs(options?: {
        date?: string
        level?: LogLevel
        context?: string
        limit?: number
    }): LogEntry[] {
        try {
            const date = options?.date || new Date().toISOString().split('T')[0]

            // Validate date format to prevent path traversal
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                console.error('Invalid date format for logs')
                return []
            }

            const logFile = path.join(this.logDir, `app-${date}.log`)

            // Verify resolved path is within logDir
            const resolvedPath = path.resolve(logFile)
            const resolvedLogDir = path.resolve(this.logDir)
            if (!resolvedPath.startsWith(resolvedLogDir)) {
                console.error('Path traversal attempt blocked in logger')
                return []
            }

            if (!fs.existsSync(logFile)) {
                return []
            }

            const content = fs.readFileSync(logFile, 'utf-8')
            const lines = content.trim().split('\n').filter(Boolean)

            let entries: LogEntry[] = lines
                .map((line) => {
                    try {
                        return JSON.parse(line)
                    } catch {
                        return null
                    }
                })
                .filter(Boolean) as LogEntry[]

            // Filter by level
            if (options?.level) {
                const levelOrder = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 }
                const minLevel = levelOrder[options.level]
                entries = entries.filter((e) => levelOrder[e.level] >= minLevel)
            }

            // Filter by context
            if (options?.context) {
                entries = entries.filter((e) => e.context?.includes(options.context!))
            }

            // Limit results
            if (options?.limit) {
                entries = entries.slice(-options.limit)
            }

            return entries
        } catch (error) {
            console.error('Failed to read logs:', error)
            return []
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats(date?: string): {
        total: number
        byLevel: Record<string, number>
        byContext: Record<string, number>
        recent: LogEntry[]
    } {
        const entries = this.readLogs({ date, level: 'error' })

        const byLevel: Record<string, number> = {}
        const byContext: Record<string, number> = {}

        entries.forEach((entry) => {
            byLevel[entry.level] = (byLevel[entry.level] || 0) + 1
            if (entry.context) {
                byContext[entry.context] = (byContext[entry.context] || 0) + 1
            }
        })

        return {
            total: entries.length,
            byLevel,
            byContext,
            recent: entries.slice(-10),
        }
    }

    /**
     * Get list of available log files
     */
    getLogFiles(): { name: string; size: number; date: string }[] {
        try {
            const files = fs.readdirSync(this.logDir)
            return files
                .filter((f) => f.endsWith('.log'))
                .map((f) => {
                    const filePath = path.join(this.logDir, f)
                    const stats = fs.statSync(filePath)
                    return {
                        name: f,
                        size: stats.size,
                        date: stats.mtime.toISOString(),
                    }
                })
                .sort((a, b) => b.date.localeCompare(a.date))
        } catch (error) {
            return []
        }
    }

    /**
     * Log API request with performance metrics
     */
    apiRequest(req: Request, duration: number, status: number) {
        this.info('API Request', {
            method: req.method,
            url: req.url,
            status,
            duration,
            userAgent: req.headers.get('user-agent')
        })
    }

    /**
     * Log AI operation with cost tracking
     */
    aiOperation(
        operation: string,
        tokens: number,
        cost: number,
        duration: number,
        metadata?: any
    ) {
        this.info('AI Operation', {
            operation,
            tokens,
            cost,
            duration,
            ...metadata
        })
    }

    /**
     * Log database query performance
     */
    dbQuery(query: string, duration: number, rowCount?: number) {
        if (duration > 1000) {
            this.warn('Slow database query', { query, duration, rowCount })
        } else {
            this.debug('Database query', { query, duration, rowCount })
        }
    }

    /**
     * Log cache operations
     */
    cache(operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, data?: any) {
        this.debug(`Cache ${operation}`, { key, ...data })
    }
}

export const logger = new Logger()
