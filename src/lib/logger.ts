type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    data?: any
}

/**
 * Structured logger for application-wide logging
 * Outputs JSON in production, pretty-prints in development
 */
class Logger {
    private isDev = process.env.NODE_ENV === 'development'

    private log(level: LogLevel, message: string, data?: any) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...(data && { data })
        }

        if (this.isDev) {
            // Pretty print for development
            const emoji = {
                debug: '🔍',
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌'
            }[level]

            console[level === 'debug' ? 'log' : level](
                `${emoji} [${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
                data || ''
            )
        } else {
            // JSON for production (easier to parse by log aggregators)
            console.log(JSON.stringify(entry))
        }
    }

    debug(message: string, data?: any) {
        this.log('debug', message, data)
    }

    info(message: string, data?: any) {
        this.log('info', message, data)
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data)
    }

    error(message: string, data?: any) {
        this.log('error', message, data)
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
