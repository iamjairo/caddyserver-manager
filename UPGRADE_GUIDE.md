# Upgrade Guide to v3.0.0

This guide will help you upgrade from Caddy Manager v2.x to v3.0.0 with all the new modules.

## What's New in v3.0.0

🔐 **Security Enhancements**
- Web Application Firewall (WAF) support (database ready)
- Geo-blocking capabilities (database ready)
- mTLS with client certificate management (database ready)
- Access lists with HTTP basic auth (database ready)

📊 **Monitoring & Analytics**
- Real-time traffic analytics
- Prometheus metrics export
- Comprehensive audit logging
- Historical data retention

🔧 **Configuration Management**
- Reusable configuration snippets
- Service deployment templates
- Location-based routing rules
- Redirect and rewrite rules

🔑 **Access Control**
- API token management
- Enhanced RBAC with MFA support (database ready)
- Forward authentication providers (database ready)

💾 **Operational Features**
- Full backup and restore system
- Custom certificate import
- Advanced DNS controls
- Multi-server management (database ready)

---

## Prerequisites

- Existing Caddy Manager v2.x installation
- Node.js 16+ and npm
- SQLite3
- 5 minutes downtime for upgrade

---

## Upgrade Steps

### 1. Backup Your Current Installation

```bash
# Navigate to your installation directory
cd /path/to/caddyserver-manager

# Create a backup of your database
cp CaddyServer-backend/database.sqlite CaddyServer-backend/database.sqlite.backup

# Optional: Backup the entire installation
tar -czf caddy-manager-backup-$(date +%Y%m%d).tar.gz .
```

### 2. Pull the Latest Code

```bash
# If you have Git access
git fetch origin
git checkout claude/compare-caddy-server-ui-repos
git pull origin claude/compare-caddy-server-ui-repos

# Or download and extract the latest release
# wget https://github.com/iamjairo/caddyserver-manager/archive/v3.0.0.tar.gz
# tar -xzf v3.0.0.tar.gz
```

### 3. Install New Dependencies

```bash
# Navigate to backend directory
cd CaddyServer-backend

# Install new dependencies
npm install

# Verify installation
npm list
```

**New Dependencies Added:**
- `express-rate-limit` - API rate limiting
- `swagger-jsdoc` - API documentation
- `swagger-ui-express` - Interactive API docs
- `node-cron` - Scheduled tasks
- `nodemon` - Development hot reload

### 4. Database Migration

The database will auto-migrate when you start the server. The migration adds:
- 17 new tables for advanced features
- Additional columns to existing tables
- Default snippets and templates

```bash
# Start the backend (migration runs automatically)
npm start
```

**Check the logs for migration success:**
```
Connected to SQLite database.
[DB] Successfully added column waf_enabled to domains table.
[DB] Successfully added column geo_block_enabled to domains table.
... (more migration messages)
```

### 5. Verify the Upgrade

```bash
# Test the API
curl http://localhost:4000/api/ping

# Expected response:
# {"status":"ok","message":"pong","timestamp":"2026-05-20T..."}

# Check new features
curl http://localhost:4000/api/system/discovery

# Expected response should include new features:
# {"name":"Caddy Manager","version":"3.0.0","features":[...]}
```

### 6. Test New Endpoints

```bash
# Login and get JWT token
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"caddy123"}' \
  | jq -r '.token')

# Test snippets endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/snippets

# Test service templates endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/service-templates

# Test audit logs endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/audit-logs?limit=10

# Test Prometheus metrics (public endpoint)
curl http://localhost:4000/metrics
```

### 7. Restart as System Service

If you're running as a systemd service:

```bash
# Stop the service
sudo systemctl stop caddymanager

# Update the service if needed (paths should remain the same)
# Edit /etc/systemd/system/caddymanager.service if necessary

# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start caddymanager

# Check status
sudo systemctl status caddymanager

# View logs
sudo journalctl -u caddymanager -f
```

---

## Post-Upgrade Configuration

### 1. Create Your First API Token

```bash
curl -X POST http://localhost:4000/api/v1/api-tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Pipeline",
    "expires_at": "2027-12-31T23:59:59Z",
    "permissions": ["domains:read", "domains:write"]
  }'
```

### 2. Configure Prometheus Scraping

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'caddy-manager'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### 3. Set Up Automated Backups

Create a cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * curl -X POST http://localhost:4000/api/v1/backups \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Daily Backup","includes_db":true,"includes_caddyfile":true}'
```

### 4. Enable Audit Logging

Audit logging is automatic! Check your logs:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/audit-logs?limit=50"
```

### 5. Add Configuration Snippets

```bash
# Create a custom snippet
curl -X POST http://localhost:4000/api/v1/snippets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-custom-headers",
    "description": "Custom security headers",
    "category": "security",
    "content": "header {\n  X-Custom-Header value\n}",
    "tags": ["security", "custom"]
  }'
```

---

## Rollback Procedure

If you encounter issues:

### 1. Stop the Service

```bash
sudo systemctl stop caddymanager
# or
killall node
```

### 2. Restore Database Backup

```bash
cd /path/to/caddyserver-manager/CaddyServer-backend
rm database.sqlite
mv database.sqlite.backup database.sqlite
```

### 3. Revert Code

```bash
git checkout v2.0.4
# or extract your backup
cd ..
tar -xzf caddy-manager-backup-YYYYMMDD.tar.gz
```

### 4. Reinstall Old Dependencies

```bash
cd CaddyServer-backend
rm -rf node_modules package-lock.json
npm install
```

### 5. Restart Service

```bash
sudo systemctl start caddymanager
```

---

## Breaking Changes

### API Changes
- No breaking changes to existing endpoints
- All v2.x endpoints remain compatible
- New endpoints added under `/api/v1/` prefix

### Database Changes
- Additive only - no data loss
- Automatic migration on first run
- Backward compatible with v2.x data

### Configuration Files
- No changes to Caddyfile generation
- Existing `.env` files remain compatible
- New optional environment variables available

---

## Troubleshooting

### Issue: Migration Errors

```bash
# Check database permissions
ls -la CaddyServer-backend/database.sqlite

# Should be writable by the service user
chmod 644 CaddyServer-backend/database.sqlite
```

### Issue: Module Not Found

```bash
# Reinstall dependencies
cd CaddyServer-backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port Already in Use

```bash
# Check what's using port 4000
lsof -i :4000

# Kill the process if needed
kill -9 <PID>
```

### Issue: API Token Creation Fails

```bash
# Verify JWT_SECRET is set
cat CaddyServer-backend/.env | grep JWT_SECRET

# If missing, add it:
echo "JWT_SECRET=$(openssl rand -hex 32)" >> CaddyServer-backend/.env
```

---

## Performance Considerations

### Analytics Data Retention

By default, analytics are kept for 90 days. To change:

```javascript
// In routes/analytics.js, modify:
const cleanOldAnalytics = (days = 90) => { ... }

// Or set up a cron job to clean more frequently
```

### Database Optimization

After upgrade, optimize the database:

```bash
cd CaddyServer-backend
sqlite3 database.sqlite "VACUUM;"
sqlite3 database.sqlite "ANALYZE;"
```

---

## Next Steps

1. ✅ Complete the upgrade
2. 📖 Read [NEW_MODULES.md](NEW_MODULES.md) for detailed API documentation
3. 🎨 Wait for UI components (coming soon)
4. 🔐 Configure security features (WAF, geo-blocking)
5. 📊 Set up Grafana dashboards for metrics
6. 🧪 Test backup and restore procedures

---

## Support

- **Documentation**: See [NEW_MODULES.md](NEW_MODULES.md)
- **Issues**: https://github.com/iamjairo/caddyserver-manager/issues
- **Discussions**: https://github.com/iamjairo/caddyserver-manager/discussions

---

## Changelog Summary

### Added
- 17 new database tables
- 6 new API route modules
- API token authentication system
- Comprehensive audit logging
- Traffic analytics with Prometheus
- Configuration snippets
- Service templates
- Backup and restore system
- Extensive API documentation

### Changed
- Version bumped to 3.0.0
- Enhanced RBAC schema
- Improved domain table with feature flags
- Updated package dependencies

### Fixed
- N/A (new features only)

---

**Upgrade Time**: ~5-10 minutes
**Downtime Required**: ~2-3 minutes
**Data Loss Risk**: None (additive changes only)
**Rollback Time**: ~3-5 minutes
