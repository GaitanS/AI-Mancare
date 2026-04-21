# VPS Cron — Price Index Refresh

Replaces Vercel Cron. Runs hourly on the VPS, hits the Next.js endpoint
to invalidate + warm the standard-basket cache and log staleness.

## One-time setup

```bash
# 1. SSH to VPS, go to app dir
cd /var/www/catalogsmart.ro

# 2. Generate a secret and add it to .env.production
openssl rand -hex 32
# paste the output into .env.production as:
#   CRON_SECRET=<paste>
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.production

# 3. Restart PM2 so Next.js picks up the new env var
pm2 restart catalogsmart --update-env

# 4. Make the cron script executable
chmod +x scripts/cron-price-index.sh

# 5. Create the log file with correct ownership
sudo touch /var/log/catalogsmart-price-index.log
sudo chown www-data:www-data /var/log/catalogsmart-price-index.log  # or the user who runs cron

# 6. Install the crontab entry — run AS THE USER THAT OWNS THE APP
crontab -e
# append this line:
0 * * * * /var/www/catalogsmart.ro/scripts/cron-price-index.sh >> /var/log/catalogsmart-price-index.log 2>&1
```

## Verify

```bash
# Run it manually once
/var/www/catalogsmart.ro/scripts/cron-price-index.sh

# Expected: single line starting with "[timestamp] OK 200 {...}"
# Check the log
tail -n 5 /var/log/catalogsmart-price-index.log

# Confirm the cron is installed
crontab -l | grep price-index
```

## What it does

- Hourly: invalidates `price-index:standard-basket` and re-warms via `getPriceIndex()`.
- Logs a warning when the freshest active product is > 36h old.
- Uses `CRON_SECRET` for auth. In production the endpoint rejects requests without it.

## Log rotation

Add to `/etc/logrotate.d/catalogsmart`:

```
/var/log/catalogsmart-price-index.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## Troubleshooting

- `ERROR: CRON_SECRET not set` → missing from `.env.production` or wrong `APP_DIR`. Script defaults to `/var/www/catalogsmart.ro`; override with `APP_DIR=/other/path` in the crontab line.
- `FAIL http=401` → the secret the script sends doesn't match what Next.js loaded. Restart PM2 with `--update-env`.
- `FAIL http=000` → the Next.js app isn't responding on `127.0.0.1:3000`. Check `pm2 status`.
- To trigger manually from outside the VPS (for testing): `curl -H "Authorization: Bearer $SECRET" https://catalogsmart.ro/api/cron/refresh-price-index`.
