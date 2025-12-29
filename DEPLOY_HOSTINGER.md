# Ghid Deployment pe Hostinger Cloud Startup

## 📋 Pre-requisite

- **Cont Hostinger**: Cloud Startup plan (7.99€/lună)
- **Domeniu**: retete-ieftine.ro (sau alt domeniu)
- **Access SSH**: Activat în Hostinger control panel
- **OpenAI API Key**: Pentru procesare AI
- **Git**: (Optional) pentru deploy automat

## 🔑 Pasul 1: Configurare Inițială Hostinger

### 1.1 Cumpără & Configurează Hosting

1. Mergi pe [Hostinger.com](https://www.hostinger.com)
2. Alege **Cloud Startup** plan
3. Comandă domeniu `.ro` (ex: retete-ieftine.ro)
4. Activează SSL gratuit (Let's Encrypt)
5. Notează credențialele SSH:
   - Host: ssh.retete-ieftine.ro
   - Port: 65002
   - Username: u123456789

### 1.2 Creează MySQL Database

1. Intră în **Hostinger Control Panel**
2. Mergi la **Databases** → **MySQL Databases**
3. Creează database nou:
   - **Database Name**: `u123456789_oferte_retete`
   - **Username**: `u123456789_oferte`
   - **Password**: [GENEREAZĂ PAROLĂ PUTERNICĂ]
4. **NOTEAZĂ CREDENTIALELE** - vei avea nevoie de ele!

## 🚀 Pasul 2: Deployment Local → Server

### 2.1 Build Local

```bash
# În directorul proiect
npm install
npm run build

# Verifică că build-ul a reușit
ls -la .next/standalone
```

### 2.2 Creează Pachet de Deploy

```bash
# Creează arhivă cu toate fișierele necesare
tar -czf retete-ieftine-deploy.tar.gz \
  .next/standalone \
  .next/static \
  public \
  prisma \
  scripts \
  ecosystem.config.js \
  package.json \
  package-lock.json

# Verifică mărimea arhivei
ls -lh retete-ieftine-deploy.tar.gz
```

### 2.3 Upload pe Server (SFTP)

**Opțiunea A: FileZilla/WinSCP**
1. Conectare:
   - Host: `sftp://ssh.retete-ieftine.ro`
   - Port: `65002`
   - User: `u123456789`
   - Password: [din Hostinger]

2. Upload `retete-ieftine-deploy.tar.gz` la:
   ```
   /home/u123456789/domains/retete-ieftine.ro/
   ```

**Opțiunea B: SCP (Linux/Mac)**
```bash
scp -P 65002 retete-ieftine-deploy.tar.gz \
  u123456789@ssh.retete-ieftine.ro:/home/u123456789/domains/retete-ieftine.ro/
```

## 🔧 Pasul 3: Configurare pe Server

### 3.1 Conectare SSH

```bash
ssh -p 65002 u123456789@ssh.retete-ieftine.ro
```

### 3.2 Setup Environment

```bash
# Navigate to directory
cd /home/u123456789/domains/retete-ieftine.ro

# Extract archive
tar -xzf retete-ieftine-deploy.tar.gz

# Verifică Node.js version
node --version  # Trebuie să fie >= 20.0.0

# Dacă versiunea e veche:
nvm install 20
nvm use 20
nvm alias default 20
```

### 3.3 Configurare Environment Variables

```bash
# Creează fișier .env.production
nano .env.production
```

Conținut:
```env
NODE_ENV=production
PORT=3000

# Database (folosește credentialele create anterior)
DATABASE_URL="mysql://u123456789_oferte:PAROLA_TA@localhost:3306/u123456789_oferte_retete"

# AI APIs (din OpenAI/Anthropic dashboard)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Application
NEXT_PUBLIC_SITE_URL=https://retete-ieftine.ro
STORAGE_PATH=/home/u123456789/domains/retete-ieftine.ro/storage

# Security (generează string-uri random de 32+ caractere)
JWT_SECRET=GENEREAZĂ_STRING_RANDOM_32PLUS_CARACTERE
SESSION_SECRET=ALT_STRING_RANDOM_32PLUS_CARACTERE

# AdSense (optional)
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxx

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@retete-ieftine.ro
SMTP_PASS=parola_email

# Cron Configuration
SCRAPING_ENABLED=true
SCRAPING_CRON="0 2 * * 1"
RECIPE_GENERATION_CRON="0 6 * * 1"
WEEKLY_RECIPES_COUNT=10

# Cache
CACHE_TTL_DEFAULT=600
CACHE_TTL_PRODUCTS=3600
CACHE_TTL_RECIPES=7200

# Rate Limiting
OPENAI_RATE_LIMIT_RPM=60
OPENAI_RATE_LIMIT_DELAY_MS=2000
```

Salvează cu `Ctrl+X`, `Y`, `Enter`.

### 3.4 Instalare Dependencies

```bash
# Install production dependencies
npm install --production

# Install PM2 global
npm install -g pm2

# Install Prisma CLI (pentru migrations)
npm install -D prisma
```

### 3.5 Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Verifică conexiunea
npx prisma studio  # Ctrl+C pentru a închide
```

### 3.6 Creează Directoare Necesare

```bash
# Storage directories
mkdir -p storage/{catalogs,images,temp}
mkdir -p logs

# Set permissions
chmod 755 storage logs
chmod 755 storage/{catalogs,images,temp}
```

## 🚀 Pasul 4: Start Application cu PM2

### 4.1 Start Processes

```bash
# Start toate procesele (web + cron jobs)
pm2 start ecosystem.config.js --env production

# Verifică status
pm2 status

# Ar trebui să vezi:
# ┌─────┬──────────────────────┬─────────┬────────┐
# │ id  │ name                 │ status  │ cpu    │
# ├─────┼──────────────────────┼─────────┼────────┤
# │ 0   │ retete-ieftine-web   │ online  │ 0%     │
# │ 1   │ cron-scraper         │ stopped │ 0%     │
# │ 2   │ cron-recipe-...      │ stopped │ 0%     │
# │ 3   │ catalog-processor    │ stopped │ 0%     │
# └─────┴──────────────────────┴─────────┴────────┘

# View logs
pm2 logs retete-ieftine-web --lines 50
```

### 4.2 Save PM2 Configuration

```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Copiază comanda afișată și rulează-o
# Va fi ceva de genul:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u u123456789 --hp /home/u123456789
```

## 🌐 Pasul 5: Configurare Nginx (Reverse Proxy)

Hostinger folosește Nginx. Trebuie să configurezi reverse proxy către aplicația Next.js.

### 5.1 Configurare Nginx

Contactează suportul Hostinger și cere-le să adauge:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Cache static assets
location /_next/static {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Serve storage files directly
location /storage/ {
    alias /home/u123456789/domains/retete-ieftine.ro/storage/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

SAU, dacă ai acces la fișierele Nginx:

```bash
# Editează configurația site-ului
nano /etc/nginx/sites-available/retete-ieftine.ro

# Restart Nginx
sudo systemctl reload nginx
```

## ✅ Pasul 6: Verificare & Testing

### 6.1 Test Website

```bash
# Pe server, test local
curl http://localhost:3000

# Din browser
https://retete-ieftine.ro
```

### 6.2 Test Scraping Manual

```bash
# Test scraper
node scripts/cron-scraper.js

# Verifică logs
pm2 logs cron-scraper --lines 100
```

### 6.3 Test PDF Processing

```bash
# Test catalog processor (dacă ai cataloage descărcate)
node scripts/catalog-processor.js

# Verifică logs
pm2 logs catalog-processor --lines 100
```

## 📊 Pasul 7: Monitoring & Maintenance

### 7.1 Comenzi Utile PM2

```bash
# Status processes
pm2 status

# Monitor resources în timp real
pm2 monit

# View logs
pm2 logs
pm2 logs retete-ieftine-web
pm2 logs --lines 200

# Restart application
pm2 restart retete-ieftine-web

# Reload (zero-downtime)
pm2 reload retete-ieftine-web

# Stop/Start
pm2 stop retete-ieftine-web
pm2 start retete-ieftine-web

# Delete process
pm2 delete retete-ieftine-web
```

### 7.2 Database Backup

```bash
# Creează script backup
nano /home/u123456789/backup-db.sh
```

Conținut:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/u123456789/backups"
mkdir -p $BACKUP_DIR

mysqldump -u u123456789_oferte -p u123456789_oferte_retete > \
  $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +8 | xargs rm -f

echo "Backup created: backup_$DATE.sql"
```

```bash
# Make executable
chmod +x /home/u123456789/backup-db.sh

# Add to crontab (daily at 3 AM)
crontab -e

# Add line:
0 3 * * * /home/u123456789/backup-db.sh >> /home/u123456789/backup.log 2>&1
```

### 7.3 Check Disk Space

```bash
# Check disk usage
df -h

# Check storage directory
du -sh storage/*

# Clean old PDFs (older than 30 days)
find storage/catalogs -type f -mtime +30 -delete
```

### 7.4 Application Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Reload PM2
pm2 reload ecosystem.config.js --env production

# Check status
pm2 status
pm2 logs retete-ieftine-web --lines 50
```

## 🐛 Troubleshooting

### App nu pornește

```bash
# Check logs
pm2 logs retete-ieftine-web --err --lines 100

# Check port 3000
netstat -tulpn | grep :3000

# If port busy, kill process
lsof -ti:3000 | xargs kill -9

# Restart
pm2 restart retete-ieftine-web
```

### Database connection errors

```bash
# Test MySQL connection
mysql -u u123456789_oferte -p u123456789_oferte_retete

# Check DATABASE_URL in .env.production
cat .env.production | grep DATABASE_URL

# Test with Prisma
npx prisma db pull
```

### Out of memory

```bash
# Check memory usage
free -h
pm2 monit

# Reduce max_memory_restart în ecosystem.config.js
# Restart PM2
pm2 reload ecosystem.config.js
```

### SSL issues

```bash
# Verifică SSL
curl -I https://retete-ieftine.ro

# Forțează renew (Hostinger auto-renew, but just in case)
# Contactează Hostinger support pentru SSL issues
```

## 📞 Support

- **Hostinger Support**: https://www.hostinger.com/support
- **Project Issues**: Check logs în `/logs/` și PM2 logs

---

**Version**: 1.0
**Last Updated**: 2024-12-28
