const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();
const db = require('./db');
const { createTerminalServer } = require('./terminal');
const { authMiddleware, setupAuthRoutes, initCredentials } = require('./auth');
const { exec } = require('child_process');
const AdmZip = require('adm-zip');
const os = require('os');
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Import new module routes
const { setupRoutes } = require('./routes');



const app = express();
const PORT = process.env.PORT || 4000;
const CADDY_ADMIN_API = process.env.CADDY_ADMIN_API || 'http://localhost:2019';

app.use(cors());
app.use(express.json({ limit: '50mb', strict: false }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup auth routes BEFORE middleware
setupAuthRoutes(app);

// Public discovery endpoints for mobile app
app.get('/api/ping', (req, res) => res.json({ status: 'ok', message: 'pong', timestamp: new Date().toISOString() }));
app.get('/api/system/discovery', (req, res) => {
    res.json({
        name: 'Caddy Manager',
        version: '3.0.0',
        platform: process.platform,
        features: [
            'domains', 'terminal', 'ssl', 'deployment',
            'analytics', 'waf', 'geo-blocking', 'mtls',
            'api-tokens', 'audit-logs', 'backup-restore',
            'snippets', 'templates', 'prometheus-metrics'
        ],
        auth_required: true
    });
});

// Setup new v3.0 API routes (includes auth middleware internally)
setupRoutes(app, authMiddleware);

// Apply auth middleware to legacy routes below
app.use(authMiddleware);

// --- System Management Endpoints (Mobile/Web) ---
app.post('/api/system/restart', (req, res) => {
    console.log('[SYSTEM] Restart requested...');
    res.json({ success: true, message: 'Service restart initiated' });

    // Graceful delay for response to send before killing process
    setTimeout(() => {
        exec('sudo systemctl restart caddymanager', (err) => {
            if (err) {
                console.error('[SYSTEM] Restart failed:', err);
                // Fallback: just terminate and let systemd or entrypoint handle it
                process.exit(1);
            }
        });
    }, 1000);
});

app.get('/api/system/logs', (req, res) => {
    const logPath = path.join(PROJECT_ROOT, 'caddy_server.log');
    if (!fs.existsSync(logPath)) {
        return res.status(404).json({ error: 'Log file not found' });
    }

    // Return last 200 lines
    const { exec } = require('child_process');
    exec(`tail -n 200 "${logPath}"`, (err, stdout) => {
        if (err) return res.status(500).json({ error: 'Failed to read logs' });
        res.json({ logs: stdout });
    });
});

// Serve static files from the frontend build directory
const distPath = path.resolve(__dirname, '../CaddyServer-frontend/dist');
app.use(express.static(distPath));

// Helper for host validation (DNS compliant)
const isValidHost = (host) => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|localhost/i;
    return domainRegex.test(host);
};

// Helper to stringify/parse tags and JSON
const serialize = (obj) => {
    const newObj = { ...obj };
    if (newObj.tags && Array.isArray(newObj.tags)) newObj.tags = JSON.stringify(newObj.tags);
    if (newObj.content && typeof newObj.content === 'object') newObj.content = JSON.stringify(newObj.content);
    if (newObj.details && typeof newObj.details === 'object') newObj.details = JSON.stringify(newObj.details);
    if (newObj.header_rules && typeof newObj.header_rules === 'object') newObj.header_rules = JSON.stringify(newObj.header_rules);
    if (newObj.dns_data && typeof newObj.dns_data === 'object') newObj.dns_data = JSON.stringify(newObj.dns_data);
    return newObj;
};

const isValidIP = (ip) => {
    const [addr, mask] = ip.split('/');

    if (mask !== undefined) {
        const maskNum = parseInt(mask);
        if (isNaN(maskNum)) return false;
        if (addr.includes('.')) {
            if (maskNum < 0 || maskNum > 32) return false;
        } else {
            if (maskNum < 0 || maskNum > 128) return false;
        }
    }

    if (addr.includes('.')) {
        const parts = addr.split('.');
        if (parts.length !== 4) return false;
        return parts.every(p => {
            const n = parseInt(p);
            return !isNaN(n) && n >= 0 && n <= 255 && p === n.toString();
        });
    }

    if (addr.includes(':')) {
        if ((addr.match(/:/g) || []).length < 2) return false;
        if (addr.includes(':::')) return false;
        const hexParts = addr.split(':').filter(p => p !== '');
        return hexParts.every(p => /^[0-9a-fA-F]{1,4}$/.test(p));
    }

    return false;
};

const validateIPList = (ipString) => {
    if (!ipString || ipString.trim() === '') return [];
    return ipString.split(',').map(i => i.trim()).filter(i => i).filter(ip => !isValidIP(ip));
};

// Helper to ensure directory exists recursively
const ensureDirectoryExists = (dirPath, template = 'static') => {
    if (!dirPath) return;
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[FILESYSTEM] Created directory: ${dirPath}`);
        }

        // Add a default entry point if the directory is empty
        const files = fs.readdirSync(dirPath);
        if (files.length === 0) {
            const isPHP = template === 'php';
            const fileName = isPHP ? 'index.php' : 'index.html';
            const indexPath = path.join(dirPath, fileName);

            const defaultContent = isPHP ? `<?php
echo "<!DOCTYPE html>
<html>
<head>
    <title>Welcome to " . htmlspecialchars(basename("${dirPath}")) . "</title>
    <style>
        body { font-family: sans-serif; background: #0b0d17; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        h1 { color: #00f2ff; }
    </style>
</head>
<body>
    <div class='card'>
        <h1>Welcome!</h1>
        <p>This PHP directory was automatically created by Caddy Manager.</p>
        <p>PHP Version: " . phpversion() . "</p>
        <p style='color: #94a3b8; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;'>
            You can rename <code>index.php</code> or delete it to manage your own files.
        </p>
    </div>
</body>
</html>";
?>` : `<!DOCTYPE html>
<html>
<head>
    <title>Welcome to ${path.basename(dirPath)}</title>
    <style>
        body { font-family: sans-serif; background: #0b0d17; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        h1 { color: #00f2ff; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Welcome!</h1>
        <p>This directory was automatically created by Caddy Manager.</p>
        <p>You can now upload your files here.</p>
        <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
            You can rename <code>index.html</code> or delete it to manage your own files.
        </p>
    </div>
</body>
</html>`;
            fs.writeFileSync(indexPath, defaultContent);
            console.log(`[FILESYSTEM] Created default ${fileName} at: ${indexPath}`);
        }
    } catch (err) {
        console.error(`[FILESYSTEM] Failed to ensure directory ${dirPath}:`, err.message);
    }
};

const deserialize = (row) => {
    if (!row) return row;
    if (row.tags) {
        try { row.tags = JSON.parse(row.tags); } catch (e) { row.tags = []; }
    }
    if (row.content) {
        try { row.content = JSON.parse(row.content); } catch (e) { row.content = {}; }
    }
    if (row.details) {
        try { row.details = JSON.parse(row.details); } catch (e) { row.details = {}; }
    }
    if (row.dns_data) {
        try { row.dns_data = JSON.parse(row.dns_data); } catch (e) { row.dns_data = {}; }
    }
    if (row.header_rules) {
        try { row.header_rules = JSON.parse(row.header_rules); } catch (e) { row.header_rules = []; }
    }
    // Convert SQLite 1/0 to boolean
    const booleans = [
        'requiresAuth', 'isActive', 'pullConfig', 'ssl',
        'enable_logging', 'force_ssl', 'http2_enabled',
        'hsts_enabled', 'hsts_subdomains', 'health_check_enabled',
        'file_browse_enabled'
    ];
    booleans.forEach(key => {
        if (row[key] !== undefined) row[key] = !!row[key];
    });

    row.blocked_ips = row.blocked_ips || '';
    row.allowed_ips = row.allowed_ips || '';

    if (row.id) row.id = row.id.toString();
    if (row.custom_config === null || row.custom_config === undefined) row.custom_config = "";
    return row;
};

const syncFullCaddyConfig = async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM domains', [], (err, rows) => {
            if (err) return reject(err);
            const domains = rows.map(deserialize);

            db.all('SELECT * FROM streams WHERE status = "active"', [], (err, streamRows) => {
                if (err) return reject(err);
                const streams = streamRows;

                db.all('SELECT * FROM settings', [], async (err, settingsRows) => {
                    if (err) return reject(err);
                    const settings = {};
                    settingsRows.forEach(row => settings[row.key] = row.value);
                    const homeDir = process.env.HOME || PROJECT_ROOT;
                    const defaultWebRoot = settings.default_web_root || path.join(homeDir, 'www');

                    console.log(`[SYNC] Found ${domains.length} domains, ${streams.length} streams, and ${settingsRows.length} settings in DB`);
                    domains.forEach(d => {
                        if (d.dns_provider && d.dns_provider !== 'none') {
                            console.log(`[DEBUG] Host: ${d.host}, DNS Provider: ${d.dns_provider}, DNS Data: ${JSON.stringify(d.dns_data)}`);
                        }
                    });
                    console.log(`[SYNC] Domain hosts: ${domains.map(d => d.host).join(', ')}`);

                    try {
                        // --- 1. ALWAYS START WITH A FRESH CONFIG (Atomic Swap) ---
                        // This prevents "ghost" routes from deleted domains or previous states.
                        const currentConfig = {
                            apps: {
                                http: {
                                    servers: {
                                        srv0: {
                                            listen: [":80", ":443"],
                                            routes: [],
                                            automatic_https: { disable: false }
                                        }
                                    }
                                },
                                tls: {
                                    automation: {
                                        policies: []
                                    }
                                },
                                pki: {
                                    certificate_authorities: {
                                        local: {
                                            install_trust: false,
                                            root_common_name: "Caddy Local Authority - 2026 ECC Root",
                                            intermediate_common_name: "Caddy Local Authority - 2026 ECC Intermediate"
                                        }
                                    }
                                },
                                layer4: { servers: {} }
                            }
                        };

                        // --- Under Attack Mode Logic Removal (Moved to finalRoutes) ---

                        // --- Domain Sync Logic ---
                        const routesPromises = domains.map(async d => {
                            console.log(`[MAP] Processing host: ${d.host} (Template: ${d.template}, Auth: ${!!d.auth_user})`);
                            const template = d.template || 'proxy';
                            const handles = [];

                            // --- PHASE 1: Authentication (Applies to all templates) ---
                            if (d.auth_user && d.auth_pass) {
                                // Caddy JSON requires bcrypt hashed passwords.
                                // We use async hashing to avoid blocking the event loop.
                                const hashedPassword = await bcrypt.hash(d.auth_pass, 10);

                                handles.push({
                                    handler: "authentication",
                                    providers: {
                                        http_basic: {
                                            hash: {
                                                algorithm: "bcrypt"
                                            },
                                            accounts: [{
                                                username: d.auth_user,
                                                password: hashedPassword
                                            }]
                                        }
                                    }
                                });
                            }



                            // --- PHASE 1.1: Security / IP Banning ---
                            if (d.blocked_ips && d.blocked_ips.trim().length > 0) {
                                const ranges = d.blocked_ips.split(',').map(ip => ip.trim()).filter(ip => ip);
                                if (ranges.length > 0) {
                                    handles.push({
                                        handler: "subroute",
                                        routes: [{
                                            handle: [{
                                                handler: "static_response",
                                                status_code: 403,
                                                body: "Access Denied"
                                            }],
                                            match: [{
                                                remote_ip: { ranges: ranges }
                                            }]
                                        }]
                                    });
                                }
                            }

                            // --- PHASE 1.6: IP Whitelist (Allowed IPs) ---
                            // Sequential Logic: If allowed_ips is set, we BLOCK everyone NOT in the list.
                            // Then we proceed to blacklist checks (Phase 1.5).
                            if (d.allowed_ips && d.allowed_ips.trim() !== '') {
                                const allowedRanges = d.allowed_ips.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
                                if (allowedRanges.length > 0) {
                                    handles.push({
                                        handler: "subroute", // Cleanest way to group rejection logic
                                        routes: [{
                                            handle: [{
                                                handler: "static_response",
                                                status_code: 403,
                                                body: "Access Denied (Not Whitelisted)"
                                            }],
                                            match: [{
                                                not: [{
                                                    remote_ip: { ranges: allowedRanges }
                                                }]
                                            }]
                                        }]
                                    });
                                }
                            }

                            // --- PHASE 1.5: Security Headers ---
                            if (d.hsts_enabled) {
                                const hstsValue = `max-age=31536000${d.hsts_subdomains ? "; includeSubDomains" : ""}; preload`;
                                handles.push({
                                    handler: "headers",
                                    response: {
                                        set: {
                                            "Strict-Transport-Security": [hstsValue]
                                        }
                                    }
                                });
                            }

                            // --- PHASE 1.1: Custom Headers Rule Engine ---
                            if (d.header_rules && Array.isArray(d.header_rules) && d.header_rules.length > 0) {
                                const headerHandle = {
                                    handler: "headers",
                                    response: {}
                                };

                                d.header_rules.forEach(rule => {
                                    const { op, name, value } = rule; // op: set, add, delete
                                    if (!op || !name) return;

                                    if (op === 'delete') {
                                        headerHandle.response.delete = headerHandle.response.delete || [];
                                        headerHandle.response.delete.push(name);
                                    } else {
                                        headerHandle.response[op] = headerHandle.response[op] || {};
                                        headerHandle.response[op][name] = [value || ""];
                                    }
                                });

                                if (Object.keys(headerHandle.response).length > 0) {
                                    handles.push(headerHandle);
                                }
                            }

                            // --- PHASE 2: Template-specific Handlers ---
                            if (template === 'proxy' || template === 'spa') {
                                // Multi-Upstream Parsing
                                const upstreamList = (d.upstream || "").split(',')
                                    .map(u => u.trim())
                                    .filter(u => u.length > 0);

                                let useTls = d.upstream_proto === 'https';

                                const upstreams = upstreamList.map(u => {
                                    let cleanUpstream = u;
                                    if (cleanUpstream.startsWith('https://')) {
                                        useTls = true;
                                        cleanUpstream = cleanUpstream.replace('https://', '');
                                    } else if (cleanUpstream.startsWith('http://')) {
                                        cleanUpstream = cleanUpstream.replace('http://', '');
                                    }
                                    return { dial: cleanUpstream };
                                });

                                const proxyHandle = {
                                    handler: "reverse_proxy",
                                    upstreams: upstreams
                                };

                                // Load Balancing Policy
                                if (upstreams.length > 1) {
                                    proxyHandle.load_balancing = {
                                        selection_policy: {
                                            policy: d.lb_policy || 'random'
                                        }
                                    };
                                }

                                // Health Checks
                                if (d.health_check_enabled && upstreams.length > 1) {
                                    proxyHandle.health_checks = {
                                        active: {
                                            path: d.health_check_path || "/",
                                            interval: "10s",
                                            timeout: "5s"
                                        }
                                    };
                                }

                                if (useTls) {
                                    proxyHandle.transport = {
                                        protocol: "http",
                                        tls: { insecure_skip_verify: true }
                                    };
                                }

                                if (template === 'spa') {
                                    handles.push({
                                        handler: "rewrite",
                                        uri: "{path} /index.html"
                                    });
                                }

                                handles.push(proxyHandle);
                            }
                            else if (template === 'php') {
                                // PHP: php_fastcgi logic
                                let rootPath = d.upstream;

                                // Auto-Directory normalization
                                if (!rootPath || rootPath.trim() === '') {
                                    rootPath = path.join(defaultWebRoot, d.host);
                                } else if (!path.isAbsolute(rootPath)) {
                                    rootPath = path.resolve(defaultWebRoot, rootPath);
                                }

                                // Ensure it exists physically
                                ensureDirectoryExists(rootPath, 'php');

                                handles.push({
                                    handler: "reverse_proxy",
                                    transport: {
                                        protocol: "fastcgi",
                                        split_path: [".php"]
                                    },
                                    upstreams: [{ dial: "unix//run/php/php-fpm.sock" }] // Default common path
                                });
                                handles.push({
                                    handler: "vars",
                                    root: rootPath
                                });
                                handles.push({
                                    handler: "file_server",
                                    browse: d.file_browse_enabled ? {} : undefined
                                });
                            }
                            else if (template === 'static') {
                                let rootPath = d.upstream;

                                // Auto-Directory normalization
                                if (!rootPath || rootPath.trim() === '') {
                                    rootPath = path.join(defaultWebRoot, d.host);
                                } else if (!path.isAbsolute(rootPath)) {
                                    // If not absolute, it's relative to our default web root
                                    rootPath = path.resolve(defaultWebRoot, rootPath);
                                }

                                // Ensure it exists physically
                                ensureDirectoryExists(rootPath);

                                handles.push({
                                    handler: "vars",
                                    root: rootPath
                                });
                                handles.push({
                                    handler: "file_server",
                                    browse: d.file_browse_enabled ? {} : undefined
                                });
                            }
                            else if (template === 'custom') {
                                // THE ARCHITECT: Custom Caddyfile Directives
                                if (d.custom_config && d.custom_config.trim() !== '') {
                                    // We'll process this at the end or use a promise-based approach.
                                    // Since this map is synchronous, we can't await exec here easily.
                                    // Refactoring: we need to use a loop that supports async or handle custom sites differently.
                                    // For now, we will return a SPECIAL object that the caller must handle, 
                                    // OR we run this synchronously (not recommended) or promisify the entire map.
                                    return {
                                        is_custom: true,
                                        host: d.host,
                                        config: `${d.host} {\n${d.custom_config}\n}`,
                                        logging: d.enable_logging
                                    };
                                }
                            }

                            const route = {
                                match: [{ host: [d.host] }],
                                handle: handles
                            };

                            // Tagging for logs 
                            if (d.enable_logging) {
                                route.terminal = true;
                                handles.unshift({
                                    handler: "rewrite",
                                    uri: "{path}"
                                });
                            }

                            // --- Redirect Wizard (Canonical Domain) ---
                            if (d.canonical_type && d.canonical_type !== 'off') {
                                const isWWW = d.host.startsWith('www.');
                                let targets = [];

                                if (d.canonical_type === 'root' && isWWW) {
                                    // Handled elsewhere
                                } else if (d.canonical_type === 'root' && !isWWW) {
                                    targets.push(`www.${d.host}`);
                                } else if (d.canonical_type === 'www' && !isWWW) {
                                    targets.push(d.host);
                                    route.match[0].host = [`www.${d.host}`];
                                }

                                if (targets.length > 0) {
                                    const redirRoute = {
                                        match: [{ host: targets }],
                                        handle: [{
                                            handler: "static_response",
                                            status_code: 301,
                                            headers: {
                                                Location: [`{http.request.scheme}://${d.canonical_type === 'www' ? 'www.' : ''}${d.host.replace('www.', '')}{http.request.uri}`]
                                            }
                                        }]
                                    };
                                    return [redirRoute, route];
                                }
                            }

                            return [route];
                        }).flat();

                        const customSites = domains.filter(d => d.template === 'custom' && d.custom_config && d.custom_config.trim() !== '');

                        const adaptCustomConfig = (site) => {
                            return new Promise((resolve) => {
                                // Construct Caddyfile
                                const configContent = `${site.host} {\n${site.custom_config}\n}`;
                                const tmpFile = path.join(__dirname, `temp_${site.host}_${Date.now()}.caddyfile`);
                                fs.writeFileSync(tmpFile, configContent);

                                exec(`caddy adapt --config ${tmpFile} --adapter caddyfile`, (error, stdout, stderr) => {
                                    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) { }

                                    if (error) {
                                        console.error(`[CUSTOM] Failed to adapt config for ${site.host}:`, stderr);
                                        resolve(null);
                                        return;
                                    }

                                    try {
                                        const json = JSON.parse(stdout);
                                        if (json.apps && json.apps.http && json.apps.http.servers) {
                                            const serverKeys = Object.keys(json.apps.http.servers);
                                            if (serverKeys.length > 0) {
                                                const firstServer = json.apps.http.servers[serverKeys[0]];
                                                if (firstServer.routes) {
                                                    console.log(`[CUSTOM] Successfully adapted ${site.host}`);
                                                    resolve(firstServer.routes);
                                                    return;
                                                }
                                            }
                                        }
                                        resolve(null);
                                    } catch (e) {
                                        console.error(`[CUSTOM] Failed to parse JSON for ${site.host}:`, e);
                                        resolve(null);
                                    }
                                });
                            });
                        };

                        Promise.all([...customSites.map(adaptCustomConfig), ...routesPromises]).then(async (results) => {
                            const customRoutesArrays = results.slice(0, customSites.length);
                            const routesNested = results.slice(customSites.length);
                            const routes = routesNested.flat();

                            const validCustomRoutes = customRoutesArrays.flat().filter(r => r);
                            const activeRoutes = routes.filter(r => !r.is_custom);

                            const systemRoutes = [{
                                match: [{ path: ["/api/*", "/terminal"] }],
                                handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "127.0.0.1:4000" }] }]
                            }];

                            // --- Default Site Route ---
                            let defaultRoute = null;
                            const action = settings.default_site_action || 'congratulations';

                            if (action === 'congratulations') {
                                defaultRoute = {
                                    handle: [{
                                        handler: "static_response",
                                        body: `<!DOCTYPE html>
<html>
<head>
    <title>Congratulations!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0d17; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 3rem; border-radius: 2rem; text-align: center; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 500px; }
        h1 { font-size: 3rem; font-weight: 900; margin: 0; background: linear-gradient(135deg, #00f2ff, #006ae6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic; }
        p { color: #94a3b8; font-size: 1.1rem; margin-top: 1rem; line-height: 1.6; }
        .status { margin-top: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.5rem 1.5rem; border-radius: 99px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .status::before { content: ""; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Congratulations!</h1>
        <p>Your Caddy Server is successfully deployed and managing traffic. The engine is operational and ready for your sites.</p>
        <div class="status">Engine Online</div>
    </div>
</body>
</html>`,
                                        headers: { "Content-Type": ["text/html"] }
                                    }]
                                };
                            } else if (action === '404') {
                                defaultRoute = {
                                    handle: [{
                                        handler: "static_response",
                                        status_code: 404,
                                        body: "404 Not Found"
                                    }]
                                };
                            } else if (action === 'abort') {
                                defaultRoute = {
                                    handle: [{
                                        handler: "static_response",
                                        abort: true
                                    }]
                                };
                            } else if (action === 'redirect') {
                                defaultRoute = {
                                    handle: [{
                                        handler: "static_response",
                                        status_code: 302,
                                        headers: {
                                            "Location": [settings.default_site_redirect_url || "/"]
                                        }
                                    }]
                                };
                            } else if (action === 'html') {
                                defaultRoute = {
                                    handle: [{
                                        handler: "static_response",
                                        body: settings.default_site_html || "<h1>Welcome</h1>",
                                        headers: { "Content-Type": ["text/html"] }
                                    }]
                                };
                            }

                            const finalRoutes = [];

                            // Emergency Security Layer (Under Attack Mode)
                            if (settings.under_attack === 'true') {
                                console.log('[SYNC] Under Attack Mode is ACTIVE. Injecting emergency layer.');
                                finalRoutes.push({
                                    handle: [{
                                        handler: "subroute",
                                        routes: [{
                                            handle: [{
                                                handler: "static_response",
                                                status_code: 403,
                                                body: "Security: Access Denied (Under Attack Mode Active)"
                                            }],
                                            match: [{
                                                not: [{
                                                    header_regexp: {
                                                        "User-Agent": {
                                                            "pattern": "^(Mozilla/5.0|Mozilla/4.0|Opera/|Dalvik/|Chrome/|Safari/|Edge/|Firefox/).*"
                                                        }
                                                    }
                                                }]
                                            }]
                                        }]
                                    }]
                                });
                            }

                            finalRoutes.push(...systemRoutes, ...activeRoutes, ...validCustomRoutes);
                            if (defaultRoute) finalRoutes.push(defaultRoute);

                            const sslDisabledHosts = domains.filter(d => !d.ssl).map(d => d.host);
                            currentConfig.apps.http.servers = currentConfig.apps.http.servers || {};
                            currentConfig.apps.http.servers.srv0 = {
                                listen: [":80", ":443"],
                                routes: finalRoutes,
                                automatic_https: {
                                    disable: false,
                                    skip_certificates: sslDisabledHosts.length > 0 ? sslDisabledHosts : undefined
                                }
                            };

                            const uniqueHosts = [...new Set(domains.filter(d => d.ssl).map(d => d.host))];
                            currentConfig.apps.tls = currentConfig.apps.tls || {};
                            currentConfig.apps.tls.automation = currentConfig.apps.tls.automation || {};

                            const policies = [];
                            if (uniqueHosts.length > 0) {
                                // Split hosts into standard and DNS-required (wildcards)
                                const dnsRequiredHosts = domains.filter(d => d.ssl && d.dns_provider && d.dns_provider !== 'none').map(d => d.host);
                                const standardHosts = uniqueHosts.filter(h => !dnsRequiredHosts.includes(h));

                                if (standardHosts.length > 0) {
                                    policies.push({ subjects: standardHosts });
                                }

                                // Add individual policies for domains requiring DNS challenge
                                domains.filter(d => d.ssl && d.dns_provider && d.dns_provider !== 'none').forEach(d => {
                                    policies.push({
                                        subjects: [d.host],
                                        issuers: [{
                                            module: "acme",
                                            challenges: {
                                                dns: {
                                                    provider: {
                                                        name: d.dns_provider === 'generic' ? d.dns_provider_custom : d.dns_provider,
                                                        ...d.dns_data
                                                    }
                                                }
                                            }
                                        }]
                                    });
                                });
                            }

                            // Fallback policy for unknown hosts (Internal/Self-signed CA)
                            policies.push({
                                issuers: [{ module: 'internal' }]
                            });

                            currentConfig.apps.tls.automation.policies = policies;


                            // --- Stream Sync Logic ---
                            const layer4Servers = {};
                            streams.forEach(stream => {
                                const serverName = `stream_${stream.listen_port}`;
                                const protocols = (stream.protocol || 'tcp').split(',');
                                const listen = protocols.map(p => `${p === 'udp' ? 'udp/' : ''}:${stream.listen_port}`);

                                const routes = [];

                                // 1. Blacklist Logic (Matches = Terminate)
                                if (stream.blocked_ips && stream.blocked_ips.trim() !== '') {
                                    const blocked = stream.blocked_ips.split(',').map(i => i.trim()).filter(i => i);
                                    if (blocked.length > 0) {
                                        routes.push({
                                            match: [{ remote_ip: { ranges: blocked } }],
                                            handle: [{ handler: "close" }]
                                        });
                                    }
                                }

                                // 2. Whitelist Logic (Matches = Proxy, No Match = Terminate)
                                const proxyHandle = [{
                                    handler: "proxy",
                                    upstreams: [{ dial: [`${stream.upstream_host}:${stream.upstream_port}`] }]
                                }];

                                if (stream.allowed_ips && stream.allowed_ips.trim() !== '') {
                                    const allowed = stream.allowed_ips.split(',').map(i => i.trim()).filter(i => i);
                                    if (allowed.length > 0) {
                                        routes.push({
                                            match: [{ remote_ip: { ranges: allowed } }],
                                            handle: proxyHandle
                                        });
                                        // Final catch-all for whitelist mode
                                        routes.push({
                                            handle: [{ handler: "close" }]
                                        });
                                    } else {
                                        routes.push({ handle: proxyHandle });
                                    }
                                } else {
                                    // Default: Allow all (that aren't blacklisted)
                                    routes.push({ handle: proxyHandle });
                                }

                                layer4Servers[serverName] = {
                                    listen: listen,
                                    routes: routes
                                };
                            });
                            currentConfig.apps.layer4.servers = layer4Servers;

                            // --- Final Load ---
                            console.log('[SYNC] Final Config to Load (Summary):', {
                                apps: Object.keys(currentConfig.apps),
                                http_routes: currentConfig.apps.http.servers.srv0.routes.length,
                                layer4_servers: Object.keys(currentConfig.apps.layer4.servers).length
                            });

                            try {
                                await axios.post(`${CADDY_ADMIN_API}/load`, currentConfig, {
                                    headers: { 'Content-Type': 'application/json' },
                                    maxContentLength: Infinity,
                                    maxBodyLength: Infinity
                                });
                                console.log('[SYNC] Successfully reloaded Caddy configuration.');
                                resolve('Caddy synced successfully');
                            } catch (error) {
                                console.error('[SYNC] Failed to load config to Caddy:', error.message);
                                if (error.response) {
                                    console.error('Caddy Error Details:', JSON.stringify(error.response.data, null, 2));
                                }
                                reject(error);
                            }
                        });
                        return; // Prevent fallthrough
                    } catch (error) {
                        console.error('[SYNC] Sync failed:', error.response?.data || error.message);
                        reject(error);
                    }
                });
            });

        });
    });
};

const syncDomainsWithCaddy = () => syncFullCaddyConfig();
const syncStreamsWithCaddy = () => syncFullCaddyConfig();


app.get('/api/servers', (req, res) => {
    db.all('SELECT * FROM servers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(deserialize));
    });
});

app.post('/api/servers', (req, res) => {
    const s = serialize(req.body);
    const query = `INSERT INTO servers 
    (name, description, tags, apiUrl, apiPort, apiPath, requiresAuth, isActive, pullConfig, status, type) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        s.name, s.description || '', s.tags || '[]', s.apiUrl, s.apiPort, s.apiPath || '/config/',
        s.requiresAuth ? 1 : 0, s.isActive ? 1 : 0, s.pullConfig ? 1 : 0, s.status || 'online', s.type || 'managed'
    ];

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM servers WHERE id = ?', [this.lastID], (err, row) => {
            res.json(deserialize(row));
        });
    });
});

app.put('/api/servers/:id', (req, res) => {
    const s = serialize(req.body);
    const query = `UPDATE servers SET 
    name = ?, description = ?, tags = ?, apiUrl = ?, apiPort = ?, apiPath = ?, 
    requiresAuth = ?, isActive = ?, pullConfig = ?, status = ?, type = ? 
    WHERE id = ?`;
    const params = [
        s.name, s.description, s.tags, s.apiUrl, s.apiPort, s.apiPath,
        s.requiresAuth ? 1 : 0, s.isActive ? 1 : 0, s.pullConfig ? 1 : 0, s.status, s.type,
        req.params.id
    ];

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM servers WHERE id = ?', [req.params.id], (err, row) => {
            res.json(deserialize(row));
        });
    });
});

app.delete('/api/servers/:id', (req, res) => {
    db.run('DELETE FROM servers WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/servers/:serverId/apply/:configId', async (req, res) => {
    const { serverId, configId } = req.params;

    db.get('SELECT * FROM servers WHERE id = ?', [serverId], (err, server) => {
        if (err || !server) return res.status(404).json({ error: 'Server not found' });

        db.get('SELECT * FROM configs WHERE id = ?', [configId], async (err, config) => {
            if (err || !config) return res.status(404).json({ error: 'Configuration not found' });

            const s = deserialize(server);
            const c = deserialize(config);

            const targetUrl = `${s.apiUrl}:${s.apiPort}/load`;

            try {
                const response = await axios.post(targetUrl, c.content, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });

                // Log the action and update lastContact
                db.run('INSERT INTO logs (user, action, details) VALUES (?, ?, ?)',
                    ['admin', 'APPLY_CONFIG', JSON.stringify({ server: s.name, config: c.name, status: response.status })]);

                db.run('UPDATE servers SET lastContact = CURRENT_TIMESTAMP WHERE id = ?', [serverId]);

                res.json({ message: 'Configuration applied successfully', status: response.status });
            } catch (error) {
                console.error('[APPLY_ERROR] Failed to apply config:', error.message, error.response?.data);
                res.status(500).json({
                    error: 'Failed to apply configuration to remote server',
                    details: error.response?.data || error.message
                });
            }
        });
    });
});


// --- Logs ---
app.get('/api/logs', (req, res) => {
    db.all('SELECT * FROM logs ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(deserialize));
    });
});

app.post('/api/logs', (req, res) => {
    const { user, action, details } = req.body;
    db.run('INSERT INTO logs (user, action, details) VALUES (?, ?, ?)', [user, action, JSON.stringify(details)], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID.toString() });
    });
});

app.get('/api/caddy/logs', (req, res) => {
    const logPath = path.join(__dirname, '../caddy_server.log');
    require('child_process').exec(`tail -n 50 "${logPath}"`, (err, stdout) => {
        if (err) {
            console.error('Error reading log file:', err);
            return res.json([]);
        }
        const lines = stdout.split('\n').filter(Boolean);
        const parsed = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return {
                    ts: Date.now() / 1000,
                    level: 'info',
                    msg: line
                };
            }
        });
        res.json(parsed.reverse());
    });
});

// --- Configurations ---
app.get('/api/configs', (req, res) => {
    db.all('SELECT * FROM configs', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(deserialize));
    });
});

app.post('/api/configs', (req, res) => {
    const c = serialize(req.body);
    db.run('INSERT INTO configs (name, description, version, tags, content, status) VALUES (?, ?, ?, ?, ?, ?)',
        [c.name, c.description || '', c.version || '1.0', c.tags || '[]', c.content || '{}', c.status || 'draft'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get('SELECT * FROM configs WHERE id = ?', [this.lastID], (err, row) => {
                res.json(deserialize(row));
            });
        });
});

app.delete('/api/configs/:id', (req, res) => {
    db.run('DELETE FROM configs WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Domains ---
app.get('/api/domains', (req, res) => {
    db.all('SELECT * FROM domains', [], (err, rows) => {
        if (err) {
            console.error('[DOMAINS] Failed to fetch domains:', err.message);
            return res.status(500).json({ error: 'Database error while fetching domains', details: err.message });
        }
        res.json(rows.map(deserialize));
    });
});

app.post('/api/domains', (req, res) => {
    const { host, upstream, logo, ssl, template, canonical_type, upstream_proto, auth_user, auth_pass, enable_logging, force_ssl, http2_enabled, hsts_enabled, hsts_subdomains, blocked_ips, allowed_ips, lb_policy, health_check_enabled, health_check_path, file_browse_enabled, header_rules, custom_config } = req.body;
    if (!isValidHost(host)) return res.status(400).json({ error: `Invalid host format: ${host}` });

    // Check if domain already exists
    db.get('SELECT id FROM domains WHERE host = ?', [host], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) return res.status(400).json({ error: `Domain ${host} already exists. Update the existing entry instead.` });

        db.run(
            'INSERT INTO domains (host, upstream, logo, ssl, template, canonical_type, upstream_proto, auth_user, auth_pass, enable_logging, dns_provider, dns_data, dns_provider_custom, force_ssl, http2_enabled, hsts_enabled, hsts_subdomains, blocked_ips, allowed_ips, lb_policy, health_check_enabled, health_check_path, file_browse_enabled, header_rules, custom_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [host, upstream, logo, ssl ? 1 : 0, template || 'proxy', canonical_type || 'off', upstream_proto || 'http', auth_user || null, auth_pass || null, enable_logging ? 1 : 0, req.body.dns_provider || null, req.body.dns_data ? JSON.stringify(req.body.dns_data) : null, req.body.dns_provider_custom || null, force_ssl !== undefined ? (force_ssl ? 1 : 0) : 1, http2_enabled !== undefined ? (http2_enabled ? 1 : 0) : 1, hsts_enabled ? 1 : 0, hsts_subdomains ? 1 : 0, blocked_ips || '', allowed_ips || '', lb_policy || 'random', health_check_enabled ? 1 : 0, health_check_path || '/', file_browse_enabled !== undefined ? (file_browse_enabled ? 1 : 0) : 1, header_rules ? JSON.stringify(header_rules) : '[]', custom_config || ''],
            async function (err) {
                if (err) {
                    console.error('[DOMAINS] Failed to insert domain:', err.message);
                    return res.status(500).json({ error: 'Database error while saving domain', details: err.message });
                }
                try { await syncDomainsWithCaddy(); } catch (e) { console.error('[DOMAINS] Sync failed after insert:', e.message); }
                db.get('SELECT * FROM domains WHERE id = ?', [this.lastID], (err, row) => {
                    if (err) return res.status(500).json({ error: 'Failed to retrieve saved domain' });
                    res.json(deserialize(row));
                });
            }
        );
    });
});

app.delete('/api/domains/:id', (req, res) => {
    db.run('DELETE FROM domains WHERE id = ?', req.params.id, async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        try { await syncDomainsWithCaddy(); } catch (e) { }
        res.json({ success: true });
    });
});

app.post('/api/domains/:id/toggle-ssl', (req, res) => {
    db.run('UPDATE domains SET ssl = 1 - ssl WHERE id = ?', req.params.id, async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        try { await syncDomainsWithCaddy(); } catch (e) { }
        res.json({ success: true });
    });
});

app.put('/api/domains/:id', (req, res) => {
    const { host, upstream, logo, ssl, template, canonical_type, upstream_proto, auth_user, auth_pass, enable_logging, force_ssl, http2_enabled, hsts_enabled, hsts_subdomains, blocked_ips, allowed_ips, lb_policy, health_check_enabled, health_check_path, file_browse_enabled, header_rules, custom_config } = req.body;
    if (!isValidHost(host)) return res.status(400).json({ error: `Invalid host format: ${host}` });
    db.run(
        'UPDATE domains SET host=?, upstream=?, logo=?, ssl=?, template=?, canonical_type=?, upstream_proto=?, auth_user=?, auth_pass=?, enable_logging=?, dns_provider=?, dns_data=?, dns_provider_custom=?, force_ssl=?, http2_enabled=?, hsts_enabled=?, hsts_subdomains=?, blocked_ips=?, allowed_ips=?, lb_policy=?, health_check_enabled=?, health_check_path=?, file_browse_enabled=?, header_rules=?, custom_config=? WHERE id=?',
        [host, upstream, logo, ssl ? 1 : 0, template || 'proxy', canonical_type || 'off', upstream_proto || 'http', auth_user || null, auth_pass || null, enable_logging ? 1 : 0, req.body.dns_provider || null, req.body.dns_data ? JSON.stringify(req.body.dns_data) : null, req.body.dns_provider_custom || null, force_ssl ? 1 : 0, http2_enabled ? 1 : 0, hsts_enabled ? 1 : 0, hsts_subdomains ? 1 : 0, blocked_ips || '', allowed_ips || '', lb_policy || 'random', health_check_enabled ? 1 : 0, health_check_path || '/', file_browse_enabled ? 1 : 0, header_rules ? JSON.stringify(header_rules) : '[]', custom_config || '', req.params.id],
        async (err) => {
            if (err) return res.status(500).json({ error: err.message });
            try { await syncFullCaddyConfig(); } catch (e) { console.error('[DOMAINS] Sync failed:', e); }
            res.json({ success: true });
        }
    );
});

app.get('/api/domains/:id/ssl/download', async (req, res) => {
    const domainId = req.params.id;
    db.get('SELECT host FROM domains WHERE id = ?', [domainId], async (err, domain) => {
        if (err || !domain) return res.status(404).json({ error: 'Domain not found' });

        const host = domain.host;
        const homeDir = process.env.HOME || PROJECT_ROOT;
        const baseDir = path.join(homeDir, '.local/share/caddy/certificates');

        // Find .crt and .key files safely
        const { spawn } = require('child_process');
        const find = spawn('find', [baseDir, '-name', `${host}.crt`, '-o', '-name', `${host}.key`]);

        let stdout = '';
        find.stdout.on('data', (data) => stdout += data);
        find.on('close', (code) => {
            if (code !== 0 || !stdout) {
                console.error('[SSL_DOWNLOAD] No files found for:', host);
                return res.status(404).json({ error: 'SSL certificates not found on server' });
            }

            const files = stdout.split('\n').filter(Boolean);
            if (files.length === 0) {
                return res.status(404).json({ error: 'SSL certificates not found matching host' });
            }

            try {
                const zip = new AdmZip();
                files.forEach(file => {
                    if (fs.existsSync(file)) {
                        zip.addLocalFile(file);
                    }
                });

                const zipBuffer = zip.toBuffer();
                res.set('Content-Type', 'application/zip');
                res.set('Content-Disposition', `attachment; filename=${host}_ssl.zip`);
                res.set('Content-Length', zipBuffer.length);
                res.send(zipBuffer);
            } catch (e) {
                console.error('[SSL_DOWNLOAD] Error creating zip:', e.message);
                res.status(500).json({ error: 'Failed to package certificates', details: e.message });
            }
        });
    });
});

app.post('/api/domains/:id/ssl/renew', async (req, res) => {
    const domainId = req.params.id;
    db.get('SELECT host FROM domains WHERE id = ?', [domainId], async (err, domain) => {
        if (err || !domain) return res.status(404).json({ error: 'Domain not found' });

        const host = domain.host;
        const homeDir = process.env.HOME || PROJECT_ROOT;
        const certDir = path.join(homeDir, '.local/share/caddy/certificates');

        try {
            // Find and delete the certificate directory for this host safely
            const { spawn } = require('child_process');
            const findAndRemove = spawn('find', [certDir, '-type', 'd', '-name', host, '-exec', 'rm', '-rf', '{}', '+']);

            findAndRemove.on('close', async (code) => {
                if (code !== 0) {
                    console.error('[SSL_RENEW] Error deleting cert directory for:', host);
                }

                // Trigger a sync to force Caddy to request a new cert
                try {
                    await syncDomainsWithCaddy();
                    res.json({ success: true, message: `SSL renewal triggered for ${host}. Caddy will re-provision the certificate.` });
                } catch (syncErr) {
                    console.error('[SSL_RENEW] Sync failed:', syncErr.message);
                    res.status(500).json({ error: 'Failed to trigger sync with Caddy', details: syncErr.message });
                }
            });
        } catch (e) {
            console.error('[SSL_RENEW] Unexpected error:', e.message);
            res.status(500).json({ error: 'An unexpected error occurred during SSL renewal', details: e.message });
        }
    });
});


// --- Streams API (TCP/UDP Port Forwarding) ---
app.get('/api/streams', (req, res) => {
    db.all('SELECT * FROM streams ORDER BY listen_port ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/streams', (req, res) => {
    const { name, listen_port, protocol, upstream_host, upstream_port, status, allowed_ips, blocked_ips, template } = req.body;

    // IP Validation
    const invalidAllowed = validateIPList(allowed_ips);
    const invalidBlocked = validateIPList(blocked_ips);
    if (invalidAllowed.length > 0 || invalidBlocked.length > 0) {
        return res.status(400).json({
            error: 'Invalid IP address format detected.',
            details: { allowed: invalidAllowed, blocked: invalidBlocked }
        });
    }

    // Validate if port is already in use by an active stream
    db.get('SELECT id FROM streams WHERE listen_port = ? AND status = "active"', [listen_port], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: `Port ${listen_port} is already being used by another active stream.` });

        db.run(
            'INSERT INTO streams (name, listen_port, protocol, upstream_host, upstream_port, status, allowed_ips, blocked_ips, template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, listen_port, protocol || 'tcp', upstream_host, upstream_port, status || 'active', allowed_ips || '', blocked_ips || '', template || 'relay'],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });
                try {
                    await syncStreamsWithCaddy();
                    res.json({ id: this.lastID, success: true });
                } catch (e) {
                    console.error('[STREAMS] Sync failed:', e);
                    res.status(400).json({
                        error: 'Stream saved but Caddy failed to reload configuration.',
                        details: e.response?.data?.error || e.message
                    });
                }
            }
        );
    });
});

app.put('/api/streams/:id', (req, res) => {
    const { name, listen_port, protocol, upstream_host, upstream_port, status, allowed_ips, blocked_ips, template } = req.body;
    const streamId = req.params.id;

    // IP Validation
    const invalidAllowed = validateIPList(allowed_ips);
    const invalidBlocked = validateIPList(blocked_ips);
    if (invalidAllowed.length > 0 || invalidBlocked.length > 0) {
        return res.status(400).json({
            error: 'Invalid IP address format detected.',
            details: { allowed: invalidAllowed, blocked: invalidBlocked }
        });
    }

    // Validate port collision (excluding self)
    db.get('SELECT id FROM streams WHERE listen_port = ? AND status = "active" AND id != ?', [listen_port, streamId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && status === 'active') return res.status(400).json({ error: `Port ${listen_port} is already being used by another active stream.` });

        db.run(
            'UPDATE streams SET name=?, listen_port=?, protocol=?, upstream_host=?, upstream_port=?, status=?, allowed_ips=?, blocked_ips=?, template=? WHERE id=?',
            [name, listen_port, protocol, upstream_host, upstream_port, status, allowed_ips, blocked_ips, template, streamId],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });
                try {
                    await syncStreamsWithCaddy();
                    res.json({ success: true });
                } catch (e) {
                    console.error('[STREAMS] Sync failed:', e);
                    res.status(400).json({
                        error: 'Changes saved but Caddy failed to reload configuration.',
                        details: e.response?.data?.error || e.message
                    });
                }
            }
        );
    });
});

app.delete('/api/streams/:id', (req, res) => {
    db.run('DELETE FROM streams WHERE id=?', [req.params.id], async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        try { await syncStreamsWithCaddy(); } catch (e) { console.error('[STREAMS] Sync failed:', e); }
        res.json({ success: true });
    });
});

// --- App Settings API ---
app.post('/api/monetization/verify', (req, res) => {
    const { secret } = req.body;
    const DEFAULT_MONETIZATION_SECRET = Buffer.from('cm9vdA==', 'base64').toString();
    const MONETIZATION_SECRET = process.env.MONETIZATION_SECRET || DEFAULT_MONETIZATION_SECRET;

    if (secret === MONETIZATION_SECRET) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid monetization secret' });
    }
});

app.post('/api/github/verify', (req, res) => {
    const { secret } = req.body;
    const DEFAULT_GITHUB_SECRET = Buffer.from('cm9vdA==', 'base64').toString();
    const GITHUB_SECRET = process.env.GITHUB_SECRET || DEFAULT_GITHUB_SECRET;

    if (secret === GITHUB_SECRET) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid GitHub secret' });
    }
});

app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    });
});
// --- Mobile & Status API ---
// These endpoints help mobile apps verify connectivity and software identity
app.get('/api/system/status', (req, res) => {
    res.json({
        name: 'Caddy Manager',
        version: '2.0.4',
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAvg: os.loadavg(),
        uptime: os.uptime(),
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

// Public settings (no auth required - for login page)
app.get('/api/settings/public', (req, res) => {
    db.all('SELECT * FROM settings WHERE key IN ("app_title", "app_logo", "footer_text", "show_github", "github_url", "under_attack", "ads_enabled", "ad_mob_banner_id", "ad_mob_interstitial_id")', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    });
});

app.put('/api/settings/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;

    db.run('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, datetime("now"))',
        [key, valueStr],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`[SETTINGS] Updated ${key}`);
            res.json({ success: true, key, value });
        });
});

app.post('/api/system/sync', (req, res) => {
    console.log('[DEBUG] Hit /api/system/sync endpoint');
    const settings = { ...req.body };


    const DEFAULT_GITHUB_SECRET = Buffer.from('cm9vdA==', 'base64').toString();
    const GITHUB_SECRET = process.env.GITHUB_SECRET || DEFAULT_GITHUB_SECRET;
    // Obfuscated default secret 'root' -> 'cm9vdA=='
    const DEFAULT_MONETIZATION_SECRET = Buffer.from('cm9vdA==', 'base64').toString();
    const MONETIZATION_SECRET = process.env.MONETIZATION_SECRET || DEFAULT_MONETIZATION_SECRET;

    // Verify Secret for GitHub changes - non-blocking for bulk updates
    if (settings.github_url !== undefined || settings.show_github !== undefined) {
        if (!settings.github_secret || settings.github_secret !== GITHUB_SECRET) {
            delete settings.github_url;
            delete settings.show_github;
            console.log('[SETTINGS] Skipping GitHub updates: Invalid/missing secret');
        }
        delete settings.github_secret;
    }

    // Verify Secret for Monetization changes
    if (settings.ads_enabled !== undefined || settings.ad_mob_banner_id !== undefined || settings.ad_mob_interstitial_id !== undefined) {
        if (!settings.monetization_secret || settings.monetization_secret !== MONETIZATION_SECRET) {
            delete settings.ads_enabled;
            delete settings.ad_mob_banner_id;
            delete settings.ad_mob_interstitial_id;
            console.log('[SETTINGS] Skipping Monetization updates: Invalid/missing secret');
        }
        delete settings.monetization_secret;
    }


    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, datetime("now"))');

    Object.entries(settings).forEach(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        stmt.run(key, valueStr);
    });

    stmt.finalize((err) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('[SETTINGS] Bulk update completed');
        res.json({ success: true });
    });
});

// --- Caddy Reload API ---
app.post('/api/caddy/reload', async (req, res) => {
    try {
        await syncFullCaddyConfig();
        console.log('[CADDY] Force reload triggered');
        res.json({ success: true, message: 'Caddy configuration reloaded successfully' });
    } catch (e) {
        console.error('[CADDY] Reload failed:', e.message);
        res.status(500).json({ error: 'Failed to reload Caddy', details: e.message });
    }
});

// --- Caddy Admin API Proxy (Generic config paths) ---
app.all(/\/api\/caddy\/config(\/.*)?/, async (req, res) => {
    const configPath = req.params[0] || '';
    const targetUrl = `${CADDY_ADMIN_API}/config${configPath}`;

    // Ensure body is properly handled (especially for primitives)
    // If express.json didn't parse it (e.g. wrong content-type), it might be a Buffer or string
    let data = req.body;

    // Log incoming proxy request
    console.log(`[PROXY] ${req.method} ${configPath} | Body:`, data);

    try {
        // Caddy leaf nodes (strings, bools) MUST be valid JSON (i.e. quoted strings)
        // If it's not an object and not null, it's a primitive that needs stringifying
        const finalData = (typeof data === 'object' && data !== null) ? data : JSON.stringify(data);

        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: finalData,
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });

        console.log(`[PROXY_SUCCESS] ${req.method} ${configPath} -> ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`[PROXY_ERROR] ${req.method} ${configPath}:`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: `Failed to proxy ${req.method} to Caddy Admin API`,
            details: error.response?.data || error.message
        });
    }
});

const waitForCaddy = async () => {
    let retries = 10;
    while (retries > 0) {
        try {
            await axios.get(`${CADDY_ADMIN_API}/config/`);
            console.log('[STARTUP] Caddy is ready.');
            return true;
        } catch (e) {
            console.log(`[STARTUP] Waiting for Caddy... (${retries} left) Error: ${e.message}`);
            retries--;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    console.error('[STARTUP] Caddy failed to become ready.');
    return false;
};

// Create HTTP server and attach WebSocket terminal
const server = http.createServer(app);
createTerminalServer(server);

const startServer = async () => {
    await initCredentials();

    server.listen(PORT, async () => {
        console.log(`Backend Middleware running on http://localhost:${PORT}`);
        console.log(`WebSocket Terminal available at ws://localhost:${PORT}/terminal`);
        console.log('Connected to SQLite database.');

        if (await waitForCaddy()) {
            try {
                await syncFullCaddyConfig();
                console.log('[STARTUP] Initial sync completed successfully.');
            } catch (err) {
                console.error('[STARTUP] Initial sync failed:', err.message);
            }
        }
    });
};


startServer();

app.post('/api/caddy/format', async (req, res) => {
    const { caddyfile } = req.body;
    if (!caddyfile) return res.status(400).json({ error: 'Caddyfile content is required' });

    const { exec } = require('child_process');
    const tempFile = path.resolve(__dirname, `temp_caddyfile_${Date.now()}`);
    try {
        fs.writeFileSync(tempFile, caddyfile);
        exec(`caddy fmt ${tempFile}`, (error, stdout, stderr) => {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            if (error && !stdout) {
                const details = (stderr || error.message).includes('module not registered')
                    ? `Missing Caddy module: ${stderr.match(/module not registered: ([^, ]+)/)?.[1] || 'Unknown'}. You may need a custom Caddy build.`
                    : stderr || error.message;
                return res.status(500).json({ error: 'Failed to format Caddyfile', details });
            }
            res.json({ formatted: stdout });
        });
    } catch (e) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        res.status(500).json({ error: 'Internal Error', details: e.message });
    }
});

app.post('/api/caddy/validate', async (req, res) => {
    const { caddyfile } = req.body;
    if (!caddyfile) return res.status(400).json({ error: 'Caddyfile content is required' });

    const { exec } = require('child_process');
    const tempFile = path.resolve(__dirname, `temp_validate_${Date.now()}`);
    try {
        fs.writeFileSync(tempFile, caddyfile);
        exec(`caddy validate --config ${tempFile} --adapter caddyfile`, (error, stdout, stderr) => {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            if (error) {
                const details = (stderr || stdout || error.message).includes('module not registered')
                    ? `Missing Caddy module: ${(stderr || stdout).match(/module not registered: ([^, ]+)/)?.[1] || 'Unknown'}. You may need a custom Caddy build.`
                    : stderr || stdout || error.message;
                return res.status(400).json({ valid: false, details });
            }
            res.json({ valid: true, details: stdout });
        });
    } catch (e) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        res.status(500).json({ error: 'Internal Error', details: e.message });
    }
});

// --- Caddyfile Helpers ---
app.post('/api/caddy/adapt', async (req, res) => {
    const { caddyfile } = req.body;
    if (!caddyfile) return res.status(400).json({ error: 'Caddyfile content is required' });

    console.log('[ADAPT] Adapting Caddyfile length:', caddyfile.length);
    try {
        const response = await axios.post(`${CADDY_ADMIN_API}/adapt`, caddyfile, {
            headers: { 'Content-Type': 'text/caddyfile' },
            timeout: 5000
        });
        console.log('[ADAPT] Caddy response keys:', Object.keys(response.data));
        res.json(response.data);
    } catch (error) {
        console.error('[ADAPT] Error:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to adapt Caddyfile',
            details: error.response?.data || error.message
        });
    }
});

app.post('/api/caddy/load', async (req, res) => {
    const { config } = req.body;
    console.log('[LOAD] Received config keys:', config ? Object.keys(config) : 'null');

    if (!config) return res.status(400).json({ error: 'Configuration content is required' });

    try {
        const response = await axios.post(`${CADDY_ADMIN_API}/load`, config, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        res.json({ success: true, status: response.status });
    } catch (error) {
        console.error('[LOAD] Caddy Error:', error.response?.data);
        res.status(error.response?.status || 500).json({
            error: 'Failed to load configuration into Caddy',
            details: error.response?.data || error.message
        });
    }
});

// --- Caddyfile Persistence ---
const CADDYFILE_PATH = path.resolve(__dirname, '../Caddyfile');

app.post('/api/caddy/save', async (req, res) => {
    const { caddyfile } = req.body;
    if (!caddyfile) return res.status(400).json({ error: 'Caddyfile content is required' });

    try {
        fs.writeFileSync(CADDYFILE_PATH, caddyfile, 'utf8');
        console.log('[SAVE] Caddyfile saved to disk:', CADDYFILE_PATH);
        res.json({ success: true, message: 'Caddyfile saved to disk', path: CADDYFILE_PATH });
    } catch (error) {
        console.error('[SAVE] Error:', error.message);
        res.status(500).json({ error: 'Failed to save Caddyfile', details: error.message });
    }
});

app.get('/api/caddy/caddyfile', async (req, res) => {
    try {
        if (fs.existsSync(CADDYFILE_PATH)) {
            const content = fs.readFileSync(CADDYFILE_PATH, 'utf8');
            res.json({ content });
        } else {
            res.json({ content: '' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read Caddyfile', details: error.message });
    }
});

app.get('/api/caddy/modules', async (req, res) => {
    const { exec } = require('child_process');
    exec('caddy list-modules --versions', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to list modules', details: stderr || error.message });
        }

        const lines = stdout.split('\n');
        const modules = lines
            .filter(line => line.trim() && !line.startsWith(' ') && !line.includes('modules:'))
            .map(line => {
                const parts = line.split(/\s+/);
                return {
                    id: parts[0],
                    version: parts[1],
                    package: parts[2]
                };
            })
            .filter(m => m.id);

        res.json(modules);
    });
});

app.post('/api/caddy/build', async (req, res) => {
    const { modules } = req.body; // Array of module names (e.g. ["github.com/mholt/caddy-l4"])
    if (!modules || !Array.isArray(modules)) {
        return res.status(400).json({ error: 'Invalid module list' });
    }

    const { exec } = require('child_process');
    // We always include Layer4 as it's core to our engine
    const defaultModules = ["github.com/mholt/caddy-l4@6e8e0581253cebed901773d5e5d54afe9488a0fa"];
    const allModules = [...new Set([...defaultModules, ...modules])];

    const buildCmd = `xcaddy build v2.8.4 ${allModules.map(m => `--with ${m}`).join(' ')}`;
    console.log('[BUILD] Starting Caddy build:', buildCmd);

    res.write(JSON.stringify({ status: 'starting', message: 'Initializing build environment...' }) + '\n');

    exec(buildCmd, (error, stdout, stderr) => {
        if (error) {
            console.error('[BUILD] Error:', stderr || error.message);
            return res.end(JSON.stringify({ status: 'failed', details: stderr || error.message }) + '\n');
        }

        res.write(JSON.stringify({ status: 'installing', message: 'Deploying new binary...' }) + '\n');

        exec('sudo mv caddy /usr/bin/caddy && sudo setcap cap_net_bind_service=+ep /usr/bin/caddy', (mvError, mvStdout, mvStderr) => {
            if (mvError) {
                return res.end(JSON.stringify({ status: 'failed', details: mvStderr || mvError.message }) + '\n');
            }

            res.write(JSON.stringify({ status: 'completed', message: 'Build successful. Restarting engine...' }) + '\n');
            res.end();

            // Restart Caddy in the background
            setTimeout(() => {
                exec('sudo systemctl restart caddy || (pkill caddy && ./start.sh)', (rError) => {
                    if (rError) console.error('[BUILD] Restart failed:', rError.message);
                });
            }, 1000);
        });
    });
});

app.get(/^\/api\/caddy\/config\/(.*)/, async (req, res) => {
    const subPath = req.params[0] || '';
    try {
        const response = await axios.get(`${CADDY_ADMIN_API}/config/${subPath}`, { timeout: 3000 });
        res.json(response.data);
    } catch (e) {
        const isConnError = e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT';
        const details = isConnError ? 'Caddy Admin API is unreachable. Is Caddy running?' : (e.response?.data?.details || e.response?.data?.error || e.message);
        res.status(e.response?.status || 500).json({ error: 'Failed to fetch Caddy configuration', details });
    }
});

app.post(/^\/api\/caddy\/config\/(.*)/, async (req, res) => {
    const subPath = req.params[0] || '';
    try {
        const response = await axios.post(`${CADDY_ADMIN_API}/config/${subPath}`, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 3000
        });
        res.json(response.data || { success: true });
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: 'Failed to create Caddy configuration', details: e.response?.data || e.message });
    }
});

app.put(/^\/api\/caddy\/config\/(.*)/, async (req, res) => {
    const subPath = req.params[0] || '';
    try {
        const response = await axios.put(`${CADDY_ADMIN_API}/config/${subPath}`, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 3000
        });
        res.json(response.data || { success: true });
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: 'Failed to replace Caddy configuration', details: e.response?.data || e.message });
    }
});


app.delete(/^\/api\/caddy\/config\/(.*)/, async (req, res) => {
    const subPath = req.params[0] || '';
    try {
        const response = await axios.delete(`${CADDY_ADMIN_API}/config/${subPath}`, { timeout: 3000 });
        res.json(response.data || { success: true });
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: 'Failed to delete Caddy configuration', details: e.response?.data || e.message });
    }
});

app.get('/api/caddy/info', async (req, res) => {
    try {
        const { execSync } = require('child_process');
        // Retrieve Caddy version safely
        let version = 'Unknown';
        try {
            version = execSync('caddy version').toString().trim();
        } catch (e) {
            console.error('[INFO] Failed to get caddy version:', e.message);
        }

        let apps = [];
        let config = {};
        try {
            const response = await axios.get(`${CADDY_ADMIN_API}/config/`, { timeout: 2000 });
            config = response.data || {};
            apps = Object.keys(config.apps || {});
        } catch (e) {
            console.error('[INFO] Could not fetch config:', e.message);
        }

        res.json({
            version,
            admin_api: CADDY_ADMIN_API,
            apps,
            config,
            env: {
                arch: process.arch,
                platform: process.platform,
                uptime: process.uptime(),
                os_uptime: os.uptime(),
                loadavg: os.loadavg(),
                cpus: os.cpus().length,
                total_mem: os.totalmem(),
                free_mem: os.freemem(),
                node_version: process.version,
                memory: process.memoryUsage()
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch Caddy info', details: e.message });
    }
});




// --- Caddy Upstreams & Control ---
app.get('/api/caddy/upstreams', async (req, res) => {
    try {
        const response = await axios.get(`${CADDY_ADMIN_API}/reverse_proxy/upstreams`, { timeout: 3000 });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch upstreams', details: e.response?.data || e.message });
    }
});

app.post('/api/caddy/control/:action', async (req, res) => {
    const { action } = req.params;

    if (action === 'reload') {
        try {
            await syncFullCaddyConfig();
            console.log('[CONTROL] Atomic reload triggered');
            return res.json({ message: 'Caddy synchronized and reloaded successfully' });
        } catch (e) {
            console.error('[CONTROL] Reload failed:', e.message);
            return res.status(500).json({ error: 'Reload failed', details: e.message });
        }
    }

    if (action === 'stop') {
        const { exec } = require('child_process');
        exec('caddy stop', (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Stop failed', details: stderr });
            }
            res.json({ message: 'Caddy stopped successfully', output: stdout });
        });
        return;
    }

    // Fallback for other actions if needed
    res.status(400).json({ error: 'Unknown action' });
});

app.get('/api/caddy/pki/ca', async (req, res) => {
    try {
        // Fetch authorities from the config, which is the Source of Truth
        const response = await axios.get(`${CADDY_ADMIN_API}/config/apps/pki/certificate_authorities`);
        res.json(response.data || {});
    } catch (error) {
        // If PKI app is not configured, Caddy returns 400 "invalid traversal path"
        if (error.response?.status === 400) {
            return res.json({}); // Return empty object when PKI not configured
        }
        console.error('[PKI_FETCH_ERROR]:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch PKI authorities',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/pki/root', async (req, res) => {
    try {
        const response = await axios.get(`${CADDY_ADMIN_API}/pki/ca/local`, {
            responseType: 'json'
        });
        const cert = response.data.root_certificate;
        if (!cert) throw new Error('Root certificate not found in response');

        res.set('Content-Type', 'application/x-x509-ca-cert');
        res.set('Content-Disposition', 'attachment; filename=caddy_root_ca.crt');
        res.send(cert);
    } catch (error) {
        console.error('[PKI_DOWNLOAD_ERROR]:', error.message);
        res.status(500).json({ error: 'Failed to fetch Root CA from Caddy API' });
    }
});

// --- Settings Control ---
app.post('/api/settings/under-attack', async (req, res) => {
    const { active } = req.body;
    const value = active ? 'true' : 'false';

    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['under_attack', value], async (err) => {
        if (err) {
            console.error('[SETTINGS] Failed to update under_attack status:', err.message);
            return res.status(500).json({ error: 'Failed to update status' });
        }

        try {
            await syncFullCaddyConfig();
            console.log(`[SETTINGS] Under Attack Mode set to: ${active}`);
            res.json({ success: true, active: active });
        } catch (e) {
            console.error('[SETTINGS] Failed to reload Caddy after setting update:', e.message);
            res.status(500).json({ error: 'Status updated but reload failed', details: e.message });
        }
    });
});

// SPA Fallback: Serve index.html for any other requests (React Router support)
// This must be the VERY LAST route/middleware to act as a catch-all for the frontend.
app.use((req, res, next) => {
    // Skip for API routes
    if (req.path.startsWith('/api')) return next();

    // Check if it's a file request that should have been caught by express.static
    // If not an API and not found, serve the frontend SPA
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            // If index.html fails, don't loop, just 404
            res.status(404).send('Not Found');
        }
    });
});
