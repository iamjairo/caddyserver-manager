const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err.message);
  else console.log('Connected to SQLite database.');
});

db.serialize(() => {
  // servers table with all fields from types.ts
  db.run(`CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    apiUrl TEXT NOT NULL,
    apiPort INTEGER NOT NULL,
    apiPath TEXT,
    requiresAuth INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    pullConfig INTEGER DEFAULT 1,
    status TEXT DEFAULT 'online',
    type TEXT DEFAULT 'managed',
    lastContact DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user TEXT,
    action TEXT,
    details TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT,
    tags TEXT,
    content TEXT,
    status TEXT DEFAULT 'draft',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    upstream TEXT NOT NULL,
    ssl INTEGER DEFAULT 1,
    type TEXT DEFAULT 'proxy',
    status TEXT DEFAULT 'active',
    logo TEXT,
    force_ssl INTEGER DEFAULT 1,
    http2_enabled INTEGER DEFAULT 1,
    hsts_enabled INTEGER DEFAULT 0,
    hsts_subdomains INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: Add columns if they don't exist
  db.all("PRAGMA table_info(domains)", (err, columns) => {
    if (err) return console.error('[DB] Failed to get table info for domains:', err.message);

    const alterTable = (column, type, defaultValue = null) => {
      const hasColumn = columns.some(c => c.name === column);
      if (!hasColumn) {
        let query = `ALTER TABLE domains ADD COLUMN ${column} ${type}`;
        if (defaultValue !== null) query += ` DEFAULT ${defaultValue}`;
        db.run(query, (err) => {
          if (err) console.error(`[DB] Migration failed: ${query} -`, err.message);
          else console.log(`[DB] Successfully added column ${column} to domains table.`);
        });
      }
    };

    alterTable('logo', 'TEXT');
    alterTable('dns_provider', 'TEXT');
    alterTable('dns_data', 'TEXT');
    alterTable('dns_provider_custom', 'TEXT');
    alterTable('force_ssl', 'INTEGER', 1);
    alterTable('http2_enabled', 'INTEGER', 1);
    alterTable('hsts_enabled', 'INTEGER', 0);
    alterTable('hsts_subdomains', 'INTEGER', 0);
    alterTable('custom_config', 'TEXT');
    alterTable('allowed_ips', 'TEXT', "''");
    alterTable('template', 'TEXT', "'proxy'");
    alterTable('canonical_type', 'TEXT', "'off'");
    alterTable('header_rules', 'TEXT', "'[]'");
    alterTable('lb_policy', 'TEXT', "'random'");
    alterTable('health_check_enabled', 'INTEGER', 0);
    alterTable('file_browse_enabled', 'INTEGER', 1);
    alterTable('upstream_proto', 'TEXT', "'http'");
    alterTable('auth_user', 'TEXT');
    alterTable('auth_pass', 'TEXT');
    alterTable('enable_logging', 'INTEGER', 0);
    alterTable('blocked_ips', 'TEXT', "''");
    alterTable('health_check_path', 'TEXT', "'/'");
  });

  // Migration for streams
  db.all("PRAGMA table_info(streams)", (err, columns) => {
    if (err) return;
    const hasProxyProtocol = columns.some(c => c.name === 'proxy_protocol');
    if (!hasProxyProtocol) {
      db.run("ALTER TABLE streams ADD COLUMN proxy_protocol TEXT");
    }
    const hasAllowedIps = columns.some(c => c.name === 'allowed_ips');
    if (!hasAllowedIps) {
      db.run("ALTER TABLE streams ADD COLUMN allowed_ips TEXT DEFAULT ''");
    }
    const hasBlockedIps = columns.some(c => c.name === 'blocked_ips');
    if (!hasBlockedIps) {
      db.run("ALTER TABLE streams ADD COLUMN blocked_ips TEXT DEFAULT ''");
    }
    const hasTemplate = columns.some(c => c.name === 'template');
    if (!hasTemplate) {
      db.run("ALTER TABLE streams ADD COLUMN template TEXT DEFAULT 'relay'");
    }
  });

  // Streams table for TCP/UDP port forwarding
  db.run(`CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    template TEXT DEFAULT 'relay',
    listen_port INTEGER NOT NULL,
    protocol TEXT DEFAULT 'tcp',
    upstream_host TEXT NOT NULL,
    upstream_port INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    allowed_ips TEXT DEFAULT '',
    blocked_ips TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // App settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Users table for RBAC
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    permissions TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default users (passwords are pre-hashed for stability in init)
  // admin: caddy123
  db.run(`INSERT OR IGNORE INTO users (username, passwordHash, role, permissions) 
          VALUES ('admin', '$2b$10$i9V60AVEL1o5qRYHJxot7erzkJrRm8xPE.xw1S1nSIq918pieWAz.', 'admin', '["common"]')`);

  // asifagaria: @dminkaka
  db.run(`INSERT OR IGNORE INTO users (username, passwordHash, role, permissions) 
          VALUES ('asifagaria', '$2b$10$r3znT/HsWxVPf2hsi8E.weh1yPpQBB7L3y4t2FqWUdkpTa225oeNq', 'superuser', '["all"]')`);

  // Insert default settings if not exists
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('app_title', 'Caddyserver WebUI')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('app_logo', '')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('footer_text', '© 2026 Caddyserver WebUI. All rights reserved.')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('footer_links', '[]')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_site_action', 'congratulations')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_site_html', '<!-- Enter your custom HTML content here -->')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_site_redirect_url', '')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_web_root', '')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ads_enabled', '0')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ad_mob_banner_id', '')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ad_mob_interstitial_id', '')`);

  // === NEW MODULE TABLES ===

  // API Tokens for programmatic access
  db.run(`CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    expires_at DATETIME,
    last_used DATETIME,
    permissions TEXT DEFAULT '[]',
    created_by TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // Audit logs for compliance and tracking
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    severity TEXT DEFAULT 'info'
  )`);

  // Traffic analytics for monitoring
  db.run(`CREATE TABLE IF NOT EXISTS traffic_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    domain_id INTEGER,
    host TEXT,
    path TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    bytes_sent INTEGER,
    bytes_received INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    country_code TEXT,
    referer TEXT,
    protocol TEXT,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // WAF (Web Application Firewall) rules
  db.run(`CREATE TABLE IF NOT EXISTS waf_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER,
    name TEXT NOT NULL,
    rule_type TEXT DEFAULT 'owasp',
    enabled INTEGER DEFAULT 1,
    severity TEXT DEFAULT 'medium',
    rule_content TEXT,
    suppressed_rules TEXT DEFAULT '[]',
    custom_directives TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // WAF events log
  db.run(`CREATE TABLE IF NOT EXISTS waf_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    domain_id INTEGER,
    rule_id INTEGER,
    severity TEXT,
    action TEXT,
    ip_address TEXT,
    request_uri TEXT,
    user_agent TEXT,
    message TEXT,
    raw_log TEXT,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES waf_rules (id) ON DELETE SET NULL
  )`);

  // Geo-blocking rules
  db.run(`CREATE TABLE IF NOT EXISTS geo_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    mode TEXT DEFAULT 'block',
    countries TEXT DEFAULT '[]',
    continents TEXT DEFAULT '[]',
    asn_list TEXT DEFAULT '[]',
    cidr_list TEXT DEFAULT '[]',
    ip_whitelist TEXT DEFAULT '[]',
    fail_closed INTEGER DEFAULT 1,
    response_code INTEGER DEFAULT 403,
    response_body TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // mTLS (Mutual TLS) configuration
  db.run(`CREATE TABLE IF NOT EXISTS mtls_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER,
    enabled INTEGER DEFAULT 0,
    ca_cert TEXT,
    ca_key TEXT,
    fail_closed INTEGER DEFAULT 1,
    revoked_serials TEXT DEFAULT '[]',
    rbac_rules TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // Client certificates for mTLS
  db.run(`CREATE TABLE IF NOT EXISTS client_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mtls_config_id INTEGER,
    common_name TEXT NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    certificate TEXT NOT NULL,
    private_key TEXT,
    roles TEXT DEFAULT '[]',
    revoked INTEGER DEFAULT 0,
    expires_at DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mtls_config_id) REFERENCES mtls_config (id) ON DELETE CASCADE
  )`);

  // Configuration snippets
  db.run(`CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Service templates
  db.run(`CREATE TABLE IF NOT EXISTS service_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    icon TEXT,
    config_template TEXT NOT NULL,
    variables TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    is_builtin INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Location rules (path-based routing)
  db.run(`CREATE TABLE IF NOT EXISTS location_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    upstream TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    strip_prefix INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // Redirect rules
  db.run(`CREATE TABLE IF NOT EXISTS redirect_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    source_path TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status_code INTEGER DEFAULT 301,
    enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // Rewrite rules
  db.run(`CREATE TABLE IF NOT EXISTS rewrite_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    match_path TEXT NOT NULL,
    rewrite_to TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
  )`);

  // Access lists (HTTP basic auth)
  db.run(`CREATE TABLE IF NOT EXISTS access_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Access list users
  db.run(`CREATE TABLE IF NOT EXISTS access_list_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_list_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (access_list_id) REFERENCES access_lists (id) ON DELETE CASCADE
  )`);

  // Domain access list assignments
  db.run(`CREATE TABLE IF NOT EXISTS domain_access_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    access_list_id INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE,
    FOREIGN KEY (access_list_id) REFERENCES access_lists (id) ON DELETE CASCADE,
    UNIQUE(domain_id, access_list_id)
  )`);

  // Custom certificates
  db.run(`CREATE TABLE IF NOT EXISTS custom_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT,
    certificate TEXT NOT NULL,
    private_key TEXT NOT NULL,
    ca_bundle TEXT,
    expires_at DATETIME,
    is_active INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Backup snapshots
  db.run(`CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    backup_data TEXT NOT NULL,
    size_bytes INTEGER,
    includes_db INTEGER DEFAULT 1,
    includes_caddyfile INTEGER DEFAULT 1,
    includes_certificates INTEGER DEFAULT 1,
    created_by TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forward auth providers
  db.run(`CREATE TABLE IF NOT EXISTS forward_auth_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'oidc',
    enabled INTEGER DEFAULT 1,
    config TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Domain forward auth assignments
  db.run(`CREATE TABLE IF NOT EXISTS domain_forward_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    excluded_paths TEXT DEFAULT '[]',
    required_groups TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES forward_auth_providers (id) ON DELETE CASCADE,
    UNIQUE(domain_id)
  )`);

  // Prometheus metrics history
  db.run(`CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    labels TEXT DEFAULT '{}'
  )`);

  // Migration: Add new columns to domains table for advanced features
  db.all("PRAGMA table_info(domains)", (err, columns) => {
    if (err) return;

    const alterDomainTable = (column, type, defaultValue = null) => {
      const hasColumn = columns.some(c => c.name === column);
      if (!hasColumn) {
        let query = `ALTER TABLE domains ADD COLUMN ${column} ${type}`;
        if (defaultValue !== null) query += ` DEFAULT ${defaultValue}`;
        db.run(query, (err) => {
          if (err) console.error(`[DB] Migration failed: ${query} -`, err.message);
          else console.log(`[DB] Successfully added column ${column} to domains table.`);
        });
      }
    };

    // Advanced features
    alterDomainTable('waf_enabled', 'INTEGER', 0);
    alterDomainTable('geo_block_enabled', 'INTEGER', 0);
    alterDomainTable('mtls_enabled', 'INTEGER', 0);
    alterDomainTable('forward_auth_enabled', 'INTEGER', 0);
    alterDomainTable('analytics_enabled', 'INTEGER', 1);
    alterDomainTable('rate_limit_enabled', 'INTEGER', 0);
    alterDomainTable('rate_limit_requests', 'INTEGER', 100);
    alterDomainTable('rate_limit_window', 'TEXT', "'1m'");
    alterDomainTable('custom_dns_resolvers', 'TEXT');
    alterDomainTable('dns_address_family', 'TEXT', "'both'");
  });

  // Migration: Enhance users table for RBAC
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) return;

    const alterUserTable = (column, type, defaultValue = null) => {
      const hasColumn = columns.some(c => c.name === column);
      if (!hasColumn) {
        let query = `ALTER TABLE users ADD COLUMN ${column} ${type}`;
        if (defaultValue !== null) query += ` DEFAULT ${defaultValue}`;
        db.run(query, (err) => {
          if (err) console.error(`[DB] Migration failed: ${query} -`, err.message);
          else console.log(`[DB] Successfully added column ${column} to users table.`);
        });
      }
    };

    alterUserTable('email', 'TEXT');
    alterUserTable('is_active', 'INTEGER', 1);
    alterUserTable('last_login', 'DATETIME');
    alterUserTable('failed_login_attempts', 'INTEGER', 0);
    alterUserTable('mfa_enabled', 'INTEGER', 0);
    alterUserTable('mfa_secret', 'TEXT');
  });

  // Insert default snippets
  db.run(`INSERT OR IGNORE INTO snippets (name, description, category, content, tags) VALUES
    ('cloudflare-dns', 'Cloudflare DNS-01 Challenge Configuration', 'ssl',
     'tls {\n  dns cloudflare {env.CF_API_TOKEN}\n}',
     '["ssl","dns","cloudflare"]')`);

  db.run(`INSERT OR IGNORE INTO snippets (name, description, category, content, tags) VALUES
    ('security-headers', 'Common Security Headers', 'security',
     'header {\n  X-Content-Type-Options "nosniff"\n  X-Frame-Options "DENY"\n  X-XSS-Protection "1; mode=block"\n  Referrer-Policy "strict-origin-when-cross-origin"\n}',
     '["security","headers"]')`);

  db.run(`INSERT OR IGNORE INTO snippets (name, description, category, content, tags) VALUES
    ('rate-limit', 'Rate Limiting Configuration', 'security',
     'rate_limit {\n  zone example_zone {\n    key {remote_host}\n    events 100\n    window 1m\n  }\n}',
     '["security","rate-limit"]')`);

  // Insert built-in service templates
  db.run(`INSERT OR IGNORE INTO service_templates (name, description, category, icon, config_template, variables, is_builtin) VALUES
    ('WordPress', 'WordPress with PHP-FPM', 'cms', '📝',
     '{{host}} {\n  root * /var/www/html\n  php_fastcgi {{upstream}}:9000\n  file_server\n  encode gzip\n}',
     '["host","upstream"]', 1)`);

  db.run(`INSERT OR IGNORE INTO service_templates (name, description, category, icon, config_template, variables, is_builtin) VALUES
    ('Docker Registry', 'Private Docker Registry', 'devops', '🐳',
     '{{host}} {\n  reverse_proxy {{upstream}}:5000\n  tls {{email}}\n  encode gzip\n}',
     '["host","upstream","email"]', 1)`);
});

module.exports = db;
