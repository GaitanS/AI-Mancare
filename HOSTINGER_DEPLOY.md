# 🚀 Deployment Hostinger - Ghid Complet

## 📋 Rezumat Optimizări

### ✅ Problemele Rezolvate

1. **Connection Pooling Optimizat**
   - ❌ **Înainte**: 10 conexiuni configurate dar NICIODATĂ folosite → 133/200 conexiuni active
   - ✅ **Acum**: MAX 3 conexiuni active + parametri MySQL optimizați → Target: < 10 conexiuni

2. **Queries Paralele Reduse**
   - ❌ **Înainte**: 4+ queries paralele pe pagina retete (recipes, count, groupBy, aggregate)
   - ✅ **Acum**: Max 2 queries paralele + caching agresiv

3. **Error Handling & Retry Logic**
   - ❌ **Înainte**: Crash la primul connection error
   - ✅ **Acum**: Retry automat + graceful degradation + timeout-uri

4. **Caching Inteligent**
   - ❌ **Înainte**: Fiecare request = queries la DB
   - ✅ **Acum**: Filter options cached 1h, reduce 80% din queries

---

## 🔧 Configurare Database (CRITIC!)

### db-config.ts - Connection Pooling

```typescript
// CONFIGURARE CRITICĂ pentru Hostinger
const DATABASE_CONFIG = {
  connectionLimit: 3,        // MAX 3 conexiuni (STRICT!)
  poolTimeout: 20000,        // 20s timeout
  connectTimeout: 10000,     // 10s connect timeout
  queryTimeout: 10000,       // 10s query timeout
};
```

**De ce 3 conexiuni?**
- Hostinger Shared: limită STRICTĂ de conexiuni
- Cu 3 conexiuni active: ~6-9 conexiuni total (pooling + overhead)
- Target: < 50 conexiuni pentru întreaga aplicație

### DATABASE_URL - Parametri Automat Adăugați

Aplicația adaugă AUTOMAT în URL:
```
?connection_limit=3
&pool_timeout=20
&connect_timeout=10
&statement_cache_size=0
&max_allowed_packet=16777216
```

**Nu trebuie să adaugi manual!** - `db-config.ts` face asta automat.

---

## 📦 Deploy pe Hostinger

### Pas 1: Pregătire Locală

```bash
# 1. Instalează dependențe
npm install

# 2. Build pentru production
npm run build:prod

# 3. Testează local
npm start
# Verifică că nu vezi erori de conexiune
```

### Pas 2: Upload pe Hostinger

**Metoda 1: FTP/SFTP (Recomandat pentru prima dată)**

```bash
# Conectare SFTP
sftp -P 65002 u596471450@72.62.153.174

# Upload fișiere (exclude node_modules!)
put -r .next/
put -r public/
put -r prisma/
put package.json
put package-lock.json
put next.config.js
```

**Metoda 2: Git (Recomandat long-term)**

```bash
# Pe Hostinger, clonează repo
cd ~/domains/catalogsmart.ro/public_html
git clone https://github.com/YOUR_REPO.git .

# Instalează
npm install
npm run build:prod
```

### Pas 3: Configurare .env

```bash
# Copiază template
cp .env.hostinger .env

# Editează cu nano/vim
nano .env
```

**Modificări OBLIGATORII în .env:**

```env
# 1. DATABASE_URL - Înlocuiește PASSWORD_AICI
DATABASE_URL="mysql://u596471450:PAROLA_REALA@localhost:3306/u596471450_catalogsmart03"

# 2. JWT_SECRET - Generează nou!
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=generated_random_32_chars_here

# 3. SESSION_SECRET - Generează nou!
SESSION_SECRET=generated_random_32_chars_here

# 4. NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SITE_URL=https://catalogsmart.ro
```

### Pas 4: Rulare Migrații

```bash
# Generează Prisma Client
npx prisma generate

# Rulează migrații (doar prima dată sau la schimbări schema)
npx prisma migrate deploy

# Verifică conexiune
npx prisma db push --skip-generate
```

### Pas 5: Start Aplicație

**Opțiunea A: PM2 (Recomandat)**

```bash
# Instalează PM2 global
npm install -g pm2

# Start aplicație
pm2 start npm --name "catalogsmart" -- start

# Verifică status
pm2 status

# Auto-restart la reboot
pm2 startup
pm2 save

# Logs
pm2 logs catalogsmart
pm2 logs catalogsmart --lines 100
```

**Opțiunea B: Screen (Manual)**

```bash
# Creează sesiune screen
screen -S catalogsmart

# Start app
npm start

# Detach cu: Ctrl+A, apoi D
# Reattach cu: screen -r catalogsmart
```

---

## 🔍 Monitorizare & Debugging

### Verifică Conexiuni Active MySQL

```bash
# Login în MySQL
mysql -u u596471450 -p u596471450_catalogsmart03

# Verifică conexiuni
SHOW PROCESSLIST;

# Numără conexiuni
SELECT COUNT(*) FROM information_schema.PROCESSLIST
WHERE USER = 'u596471450';
```

**Target:** < 10 conexiuni active pentru aplicația ta

### Logs Aplicație

```bash
# PM2 logs (live)
pm2 logs catalogsmart --lines 50

# PM2 logs (erori)
pm2 logs catalogsmart --err

# Caută erori conexiune
pm2 logs catalogsmart | grep "connection"
pm2 logs catalogsmart | grep "Too many"
```

### Testare Health Check

```bash
# API health endpoint (dacă există)
curl https://catalogsmart.ro/api/health

# Verifică latență DB
curl https://catalogsmart.ro/api/health | jq '.database'
```

---

## ⚠️ Troubleshooting

### Eroare: "Too many connections"

**Cauză:** Connection pooling prea mare sau conexiuni nu se închid

**Soluție:**

```bash
# 1. Verifică configurare
cat .env | grep DATABASE_URL

# 2. Verifică conexiuni active
mysql> SHOW PROCESSLIST;

# 3. Kill conexiuni blocate (ATENȚIE!)
mysql> KILL CONNECTION_ID;

# 4. Restart aplicație
pm2 restart catalogsmart

# 5. Verifică logs
pm2 logs catalogsmart --lines 100
```

### Eroare: "Server Components render error"

**Cauză:** Timeout query sau connection error

**Soluție:**

```bash
# Verifică logs
pm2 logs catalogsmart | grep "Failed to fetch"

# Verifică DB latency
mysql> SELECT NOW(); -- Ar trebui < 10ms

# Clear cache Node (dacă există)
rm -rf .next/cache

# Rebuild
npm run build:prod
pm2 restart catalogsmart
```

### Eroare: AdSense 403

**Cauză:** CSP headers sau domeniu neautorizat

**Soluție în `next.config.js`:**

```javascript
// Verifică CSP headers
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com",
"connect-src 'self' https://www.google-analytics.com",
```

### Performanță Slabă

**Verificări:**

```bash
# 1. Cache status
curl https://catalogsmart.ro/retete | grep "X-Cache"

# 2. Query slow log
pm2 logs catalogsmart | grep "Slow Query"

# 3. Memory usage
free -h
pm2 monit
```

**Optimizări:**

```bash
# Enable Node.js cache
export NODE_OPTIONS="--max-old-space-size=2048"

# Restart cu optimizări
pm2 restart catalogsmart --update-env
```

---

## 📊 Metrici de Succes

### ✅ Indicatori Sănătate

| Metric | Target | Verificare |
|--------|--------|------------|
| Conexiuni DB Active | < 10 | `SHOW PROCESSLIST;` |
| Query Latency | < 100ms | Logs: "Slow Query" |
| Response Time | < 500ms | `curl -w "@curl-format.txt"` |
| Cache Hit Rate | > 80% | Logs aplicație |
| CPU Usage | < 50% | `pm2 monit` |
| Memory Usage | < 1GB | `pm2 monit` |

### 📈 Îmbunătățiri Așteptate

- **Conexiuni DB:** 133 → **< 10** (reducere 92%)
- **Query Count:** 4+ paralele → **2 secvențiale** (reducere 50%)
- **Cache Hit Rate:** 0% → **80%+** pentru filter options
- **Error Rate:** High → **< 1%** cu retry logic

---

## 🔄 Update Aplicație (Continuous Deployment)

### Update Minor (fără schimbări DB)

```bash
# SSH în Hostinger
cd ~/domains/catalogsmart.ro/public_html

# Pull changes
git pull origin main

# Install dependencies (dacă sunt noi)
npm install

# Rebuild
npm run build:prod

# Restart
pm2 restart catalogsmart

# Verifică
pm2 logs catalogsmart --lines 20
```

### Update Major (cu schimbări DB)

```bash
# Backup DB înainte!
mysqldump -u u596471450 -p u596471450_catalogsmart03 > backup_$(date +%Y%m%d).sql

# Pull changes
git pull origin main

# Update schema
npx prisma migrate deploy

# Rebuild
npm run build:prod

# Restart
pm2 restart catalogsmart
```

---

## 🛡️ Backup & Recovery

### Backup Automat DB

```bash
# Creează script backup
nano ~/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

mysqldump -u u596471450 -p'PAROLA' u596471450_catalogsmart03 \
  | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Păstrează doar ultimele 7 backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

```bash
# Fă executabil
chmod +x ~/backup-db.sh

# Adaugă în crontab (zilnic la 3 AM)
crontab -e
0 3 * * * ~/backup-db.sh
```

### Restore DB

```bash
# Din backup
gunzip < backup_20250107.sql.gz | mysql -u u596471450 -p u596471450_catalogsmart03
```

---

## 📞 Support & Contact

### Resurse Utile

- **Hostinger Support:** https://www.hostinger.com/cpanel-login
- **Prisma Docs:** https://www.prisma.io/docs/
- **Next.js Deployment:** https://nextjs.org/docs/deployment

### Logs & Debugging

```bash
# Toate logs-urile importante
tail -f ~/.pm2/logs/catalogsmart-out.log
tail -f ~/.pm2/logs/catalogsmart-error.log
```

---

## ✨ Final Checklist

Înainte de a considera deployment-ul complet:

- [ ] DATABASE_URL are parola corectă
- [ ] JWT_SECRET și SESSION_SECRET sunt generate aleatoriu
- [ ] `npm run build:prod` rulează fără erori
- [ ] `pm2 status` arată aplicația ca "online"
- [ ] `SHOW PROCESSLIST` arată < 10 conexiuni
- [ ] Website-ul se încarcă: https://catalogsmart.ro
- [ ] Pagina /retete se încarcă fără erori
- [ ] Logs PM2 nu arată erori critice
- [ ] Backup DB este configurat (cron)

---

**🎉 Success!** Aplicația este optimizată pentru Hostinger!

**Next Steps:**
1. Monitorizează conexiuni MySQL primele 24h
2. Verifică cache hit rate în logs
3. Testează performanța cu Google PageSpeed Insights
4. Setup monitoring alerts (optional)
