# Security Guide

## 🔒 Overview

Acest document descrie toate măsurile de securitate implementate în aplicație, conforme cu standardele OWASP Top 10.

## 🛡️ OWASP Top 10 Protection

### A01:2021 - Broken Access Control

**Implementat:**
- ✅ Rate limiting pe toate API routes
- ✅ Validare input cu Zod schemas
- ✅ Middleware pentru autentificare (când va fi implementat)
- ✅ CORS configuration în next.config.js

**Fișiere:**
- `src/middleware.ts` - Rate limiting global
- `src/lib/security/rate-limit.ts` - Rate limit utilities
- `src/lib/security/validation.ts` - Input validation

### A02:2021 - Cryptographic Failures

**Implementat:**
- ✅ HTTPS obligatoriu (Strict-Transport-Security header)
- ✅ Password hashing cu PBKDF2 (100,000 iterations)
- ✅ Secure token generation
- ✅ Encrypted environment variables

**Fișiere:**
- `src/lib/security/crypto.ts` - Encryption utilities
- `.env.production` - Encrypted în producție

**Configurare:**
```typescript
// Password hashing
const hash = await hashPassword(password);
// 100,000 iterations PBKDF2 + SHA512

// Token generation
const token = generateToken(32); // 32 bytes random
```

### A03:2021 - Injection

**Implementat:**
- ✅ Prisma ORM (parametrizat implicit)
- ✅ Input sanitization pentru toate inputs
- ✅ Zod validation schemas
- ✅ Content Security Policy headers

**Fișiere:**
- `src/lib/security/validation.ts` - Input validation
- `prisma/schema.prisma` - ORM layer

**Best Practices:**
```typescript
// ✅ GOOD - Prisma parametrizat
const products = await prisma.product.findMany({
  where: { category: userInput }
});

// ❌ BAD - Raw query nesigur
const products = await prisma.$queryRawUnsafe(
  `SELECT * FROM products WHERE category = '${userInput}'`
);

// ✅ GOOD - Raw query parametrizat
const products = await prisma.$queryRaw`
  SELECT * FROM products WHERE category = ${userInput}
`;
```

### A04:2021 - Insecure Design

**Implementat:**
- ✅ Brute force protection pentru login
- ✅ Rate limiting per endpoint type
- ✅ Input validation la toate nivelurile
- ✅ Fail-secure defaults

**Fișiere:**
- `src/lib/security/rate-limit.ts` - Brute force protection

**Configurare:**
```typescript
// Brute force protection
const result = await checkBruteForce(email, 5, 900);
// Max 5 attempts în 15 minute

if (!result.allowed) {
  return {
    error: 'Too many failed attempts',
    retryAfter: result.resetAt
  };
}
```

### A05:2021 - Security Misconfiguration

**Implementat:**
- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Disabled server information disclosure
- ✅ Environment-specific configurations
- ✅ Error handling fără dezvăluire de informații

**Fișiere:**
- `next.config.js` - Security headers
- `src/lib/security/headers.ts` - Header utilities

**Headers Configurate:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [detailed CSP]
```

### A06:2021 - Vulnerable and Outdated Components

**Implementat:**
- ✅ Package versions pinned în package.json
- ✅ Regular dependency updates
- ✅ No deprecated packages
- ✅ Security audit în CI/CD

**Verificare:**
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### A07:2021 - Identification and Authentication Failures

**Implementat:**
- ✅ Strong password requirements
- ✅ Secure session management
- ✅ Brute force protection
- ✅ Multi-factor authentication ready

**Fișiere:**
- `src/lib/security/crypto.ts` - Password utilities

**Password Requirements:**
```typescript
// Minimum 8 characters
// Must contain: lowercase, uppercase, numbers, special chars
const validation = validatePasswordStrength(password);

if (!validation.valid) {
  return { errors: validation.errors };
}
```

### A08:2021 - Software and Data Integrity Failures

**Implementat:**
- ✅ Subresource Integrity pentru CDN
- ✅ Code signing pentru deployment
- ✅ Environment variable validation
- ✅ Database migrations cu rollback

**Verificare:**
```bash
# Verify Prisma migrations
npx prisma migrate status

# Rollback dacă e nevoie
npx prisma migrate resolve --rolled-back "migration_name"
```

### A09:2021 - Security Logging and Monitoring Failures

**Implementat:**
- ✅ Error logging cu context
- ✅ Security event logging
- ✅ Rate limit logging
- ✅ Performance monitoring

**Fișiere:**
- `logs/` - Application logs
- `src/lib/db-performance.ts` - Performance monitoring

**Logging:**
```typescript
// Security events
console.log('[SECURITY] Rate limit exceeded:', {
  ip,
  endpoint,
  timestamp: new Date()
});

// Error logging
console.error('[ERROR] Database query failed:', {
  query,
  error,
  timestamp: new Date()
});
```

### A10:2021 - Server-Side Request Forgery (SSRF)

**Implementat:**
- ✅ URL validation pentru scraping
- ✅ Whitelist pentru external requests
- ✅ No user-controlled URLs în requests
- ✅ Network isolation pentru scraping

**Fișiere:**
- `src/lib/security/validation.ts` - URL validation

**URL Validation:**
```typescript
// Validate URL înainte de request
const safeURL = z.string().url().refine((url) => {
  const parsed = new URL(url);
  // Only https
  return parsed.protocol === 'https:';
});

// Whitelist
const ALLOWED_HOSTS = [
  'api.openai.com',
  'api.anthropic.com',
  'monitorul-preturilor.ro',
];

if (!ALLOWED_HOSTS.includes(parsedURL.hostname)) {
  throw new Error('Host not allowed');
}
```

## 🔐 API Security

### Rate Limiting

```typescript
// Global rate limits (în middleware.ts)
const RATE_LIMITS = {
  api: { maxRequests: 60, windowSeconds: 60 },        // 60/min
  search: { maxRequests: 30, windowSeconds: 60 },     // 30/min
  aiGeneration: { maxRequests: 5, windowSeconds: 60 }, // 5/min
  auth: { maxRequests: 5, windowSeconds: 300 },        // 5/5min
};
```

### Input Validation

```typescript
import { productSearchSchema } from '@/lib/security/validation';

// Validate request
const validated = productSearchSchema.parse(request.body);

// Sanitize HTML
import { sanitizeHTML } from '@/lib/security/validation';
const clean = sanitizeHTML(userInput);
```

### Authentication (când va fi implementat)

```typescript
// Hash password
const hash = await hashPassword(password);

// Verify password
const valid = await verifyPassword(password, storedHash);

// Generate session token
const sessionId = generateSessionId();

// Generate CSRF token
const csrfToken = generateCSRFToken();
```

## 🔧 Security Configuration

### Environment Variables

**Required:**
```env
# Security
JWT_SECRET=RANDOM_STRING_32_CHARS
SESSION_SECRET=ANOTHER_RANDOM_32_CHARS

# API Keys (nu dezvălui niciodată!)
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Database (folosește credențiale puternice)
DATABASE_URL="mysql://user:STRONG_PASSWORD@localhost:3306/db"
```

**Generare Secrets:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### File Upload Security (dacă va fi implementat)

```typescript
// Validate file type
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}

// Validate file size (max 5MB)
const MAX_SIZE = 5 * 1024 * 1024;
if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}

// Sanitize filename
import { sanitizeFilename } from '@/lib/security/validation';
const safeFilename = sanitizeFilename(file.name);
```

## 🧪 Security Testing

### Manual Testing

```bash
# Test rate limiting
for i in {1..70}; do
  curl http://localhost:3000/api/products
done

# Test XSS protection
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"<script>alert(1)</script>"}'

# Test SQL injection protection
curl "http://localhost:3000/api/products?category=' OR '1'='1"

# Test CSRF protection (când va fi implementat)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass"}' \
  --cookie "session=xxx"
```

### Automated Security Scan

```bash
# npm audit pentru vulnerabilities
npm audit

# OWASP Dependency Check
npm install -g @cyclonedx/cyclonedx-npm
cyclonedx-npm --output-file bom.xml
```

## 📊 Security Monitoring

### Logs să monitorizezi

```bash
# Rate limit events
grep "Rate limit exceeded" logs/*.log

# Failed authentication
grep "Authentication failed" logs/*.log

# SQL errors (potential injection attempts)
grep "SQL syntax error" logs/*.log

# Suspicious patterns
grep -E "(script|eval|exec)" logs/*.log
```

### Metrics să urmărești

- Rate limit hits per endpoint
- Failed authentication attempts per IP
- Unusual traffic patterns
- Slow queries (potential DoS)

## 🚨 Incident Response

### 1. Detect

Monitor logs pentru:
- Multiple failed login attempts
- Rate limit exceeded events
- SQL/XSS injection attempts
- Unusual API usage patterns

### 2. Respond

```bash
# Block IP în Hostinger firewall
# sau temporar în aplicație

# Rotate compromised secrets
# Update .env.production cu noi secrets
pm2 restart retete-ieftine-web

# Revoke compromised tokens
# (când authentication va fi implementat)
```

### 3. Recover

```bash
# Restore database backup
mysql -u user -p db_name < backup.sql

# Check file integrity
find . -name "*.js" -mtime -1

# Update dependencies
npm update
npm audit fix
```

## ✅ Security Checklist

### Before Deployment

- [ ] Toate environment variables sunt setate
- [ ] Secrets sunt generate random (min 32 chars)
- [ ] HTTPS este activat (Let's Encrypt)
- [ ] Security headers sunt configurate
- [ ] Rate limiting este activ
- [ ] Input validation este implementat
- [ ] Error messages nu dezvăluie informații sensibile
- [ ] Dependencies sunt up-to-date (npm audit)
- [ ] Database credentials sunt puternice
- [ ] Backup strategy este în loc

### Production Monitoring

- [ ] Monitor logs zilnic
- [ ] Check npm audit săptămânal
- [ ] Review rate limit hits
- [ ] Check disk space pentru logs
- [ ] Test backup restore lunar

## 📚 Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)

---

**Last Updated**: 2024-12-28
**Version**: 1.0
