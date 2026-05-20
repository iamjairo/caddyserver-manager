# Caddy Manager v3.0

**The ultimate visual control plane for modern Caddy Server orchestration with enterprise security, analytics, and multi-instance management.**

Caddy Manager is a full-stack dashboard designed to simplify the management of Caddy Server. It provides a sleek, high-performance interface for managing domains, SSL certificates, TCP/UDP streams (port forwarding), real-time terminal interaction, and now includes advanced security features, traffic analytics, and comprehensive API management.

---

## 🚀 What's New in v3.0

### 🔐 Security & Protection
- **API Token Management**: Secure programmatic access with token-based authentication
- **Audit Logging**: Comprehensive activity tracking for compliance and security monitoring
- **WAF Support**: Web Application Firewall integration ready (database schema)
- **Geo-Blocking**: Country/ASN/CIDR-based access control (database schema)
- **mTLS**: Mutual TLS with client certificate management (database schema)
- **Access Lists**: HTTP basic authentication with bcrypt-hashed passwords (database schema)

### 📊 Monitoring & Analytics
- **Traffic Analytics**: Real-time request/response tracking with geographic distribution
- **Prometheus Metrics**: Native metrics export for Grafana integration
- **Performance Monitoring**: Response time tracking and status code analytics
- **90-Day Retention**: Configurable data retention policies

### 🔧 Configuration Management
- **Snippets System**: Reusable configuration blocks (security headers, rate limiting, etc.)
- **Service Templates**: Pre-configured deployments (WordPress, Docker Registry, etc.)
- **Location Rules**: Path-based routing to different upstreams (database schema)
- **Redirect/Rewrite Rules**: Advanced URL manipulation (database schema)

### 💾 Operational Excellence
- **Backup & Restore**: One-click full system backup with selective table recovery
- **Multi-Server Support**: Manage multiple Caddy instances from one dashboard (database schema)
- **Advanced DNS Controls**: Custom resolvers and address family selection (database schema)
- **Certificate Import**: Manual SSL/TLS certificate management (database schema)

---

## Key Features (v2.x + v3.0)

### Core Domain Management
- **Domain Matrix**: Effortlessly manage site configurations with automatic SSL and **one-click domain previews**.
- **Wildcard SSL & DNS-01**: Native support for **Wildcard Certificates** via ACME DNS-01 challenge.
- **Enterprise Load Balancing**: Distribute traffic across multiple upstreams with configurable **Selection Policies** (Random, Round Robin, Least Conn, First).
- **Active Health Monitoring**: Automatic failover with integrated **Upstream Health Checks**.
- **Edge Header Engine**: In-flight **Header Transformations** (SET, ADD, DELETE) for granular request/response manipulation.

### Security & Access Control
- **Advanced Security Suite**: Deep control over **HSTS** (Strict-Transport-Security), **Force SSL**, and **HTTP/2** protocols.
- **IP Filtering**: Allow/block lists for domains and streams
- **Authentication**: JWT-based user authentication with role-based access control

### Templates & Blueprints
- **Blueprint Versatility**: Optimized templates for Reverse Proxy, SPA, Static Files, and PHP with built-in **Directory Browsing** support.
- **DNS Provider Ecosystem**: Integrated presets for 14+ providers plus a **Generic Custom Provider** for any Caddy DNS plugin.
- **Service Templates**: Quick-deploy configurations for popular applications

### User Experience
- **Multi-Theme Engine**: Premium design paradigms including **Prism (Neon)**, **Horizon (Space)**, **Terminal (Retro)**, and **Flat (Light)**.
- **Branding Office**: Customizable title, logo, and footer attribution.
- **Integrated Terminal**: Browser-based server interaction via Xterm.js and node-pty.

### Network Layer
- **Stream Orchestrator**: Advanced Layer4 TCP/UDP port forwarding with real-time status tracking.

---

##  Architecture

The project is divided into three primary layers:

1. **Frontend (React + Vite)**: A premium, theme-aware UI built with Tailwind CSS and Framer Motion. It supports multiple design templates from high-contrast neon to professional white-label modes.
2. **Backend (Node.js + Express)**: A robust middleware handling SQLite3 data persistence, Caddy API orchestration, and WebSocket terminal streams. [View Documentation](./CaddyServer-backend/README.md)
3. **Engine (Caddy + Layer4)**: A high-performance web server built with custom modules for advanced networking capabilities.

### 🏗️ Technology Stack

**Frontend Stack:**
- ⚛️ **React 19.2.0** - Latest stable React with modern hooks and concurrent features
- ⚡ **Vite 4.5.14** - Lightning-fast build tool with HMR and optimized production builds
- 🎨 **Tailwind CSS 3.4.17** - Utility-first CSS framework with JIT compilation
- 🎭 **Framer Motion 12.29.2** - Production-ready animation library for smooth transitions
- 🎨 **PostCSS + Autoprefixer** - CSS processing pipeline
- 🔤 **Lucide React 0.563.0** - Beautiful, consistent icon system (1000+ icons)
- 🌐 **Axios** - Promise-based HTTP client for API communication
- 💻 **@xterm/xterm** - Full-featured terminal emulator in the browser
- 🎨 **clsx + tailwind-merge** - Dynamic className management

**Backend Stack:**
- 🚀 **Node.js + Express 5.2.1** - Fast, minimalist web framework
- 💾 **SQLite3** - Lightweight, serverless database with 17 tables
- 🔐 **bcryptjs** - Secure password hashing
- 🎫 **jsonwebtoken** - JWT authentication with API token support
- 📊 **Prometheus Metrics** - Native metrics export for monitoring
- 📝 **Swagger/OpenAPI** - Interactive API documentation
- ⏰ **node-cron** - Scheduled task management
- 🔌 **WebSocket (ws)** - Real-time bidirectional communication
- 🗜️ **adm-zip** - Backup compression and extraction

**Database Schema:**
- 17+ tables supporting domains, streams, users, analytics, WAF, geo-blocking, mTLS, snippets, templates, backups, and more
- Automatic migrations on startup
- Foreign key constraints and proper indexing

### 📦 Project Structure

```
caddyserver-manager/
├── CaddyServer-frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── Documentation.jsx
│   │   │   ├── Domains.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── WebTerminal.jsx
│   │   │   └── ...
│   │   ├── data/                  # Static data and configs
│   │   ├── api.js                 # API client wrapper
│   │   ├── App.jsx                # Main application component
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Tailwind directives
│   ├── vite.config.js             # Vite configuration
│   ├── tailwind.config.js         # Tailwind customization
│   ├── postcss.config.js          # PostCSS setup
│   └── package.json
│
├── CaddyServer-backend/           # Node.js + Express backend
│   ├── routes/                    # API route modules (v3.0)
│   │   ├── index.js               # Routes orchestrator
│   │   ├── api-tokens.js          # Token management
│   │   ├── audit-logs.js          # Activity tracking
│   │   ├── analytics.js           # Traffic analytics
│   │   ├── snippets.js            # Config snippets
│   │   ├── service-templates.js   # Deployment templates
│   │   └── backups.js             # Backup/restore
│   ├── db.js                      # Database initialization
│   ├── auth.js                    # Authentication middleware
│   ├── server.js                  # Express application
│   ├── terminal.js                # WebSocket terminal handler
│   └── package.json
│
├── NEW_MODULES.md                 # v3.0 API documentation
├── UPGRADE_GUIDE.md               # Migration instructions
└── README.md                      # This file
```

### 🔌 API Architecture

**REST API (v3.0):**
All new endpoints are versioned under `/api/v1/`:

```javascript
// Authentication
POST   /api/auth/login              // JWT login
POST   /api/auth/logout             // Session termination

// API Tokens
GET    /api/v1/api-tokens           // List tokens
POST   /api/v1/api-tokens           // Create token
DELETE /api/v1/api-tokens/:id       // Revoke token

// Audit Logs
GET    /api/v1/audit-logs           // Query logs with filters
GET    /api/v1/audit-logs/stats     // Aggregated statistics

// Traffic Analytics
GET    /api/v1/analytics/traffic    // Raw traffic data
GET    /api/v1/analytics/stats      // Aggregated metrics

// Configuration Snippets
GET    /api/v1/snippets             // List snippets
POST   /api/v1/snippets             // Create snippet
PUT    /api/v1/snippets/:id         // Update snippet
DELETE /api/v1/snippets/:id         // Delete snippet

// Service Templates
GET    /api/v1/service-templates    // List templates
POST   /api/v1/service-templates    // Create template
POST   /api/v1/service-templates/:id/render  // Render with variables

// Backup & Restore
GET    /api/v1/backups              // List backups
POST   /api/v1/backups              // Create backup
POST   /api/v1/backups/:id/restore  // Restore from backup
GET    /api/v1/backups/:id/download // Download backup file

// Prometheus Metrics
GET    /metrics                     // Prometheus exposition format
```

### 🎨 Component Integration

The architecture is fully compatible with any React+Vite+Tailwind dashboard or component library. New features can be added seamlessly:

```jsx
// Example: Adding a new analytics component
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import axios from 'axios';

export const Analytics = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/api/v1/analytics/stats?hours=24')
      .then(res => setStats(res.data));
  }, []);

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-primary-500" />
        <h2 className="text-xl font-bold">Traffic Analytics</h2>
      </div>
      {/* Component content with Tailwind classes */}
    </motion.div>
  );
};
```

### 🔄 Development Workflow

```bash
# Frontend development (port 3000)
cd CaddyServer-frontend
npm install
npm run dev

# Backend development (port 4000)
cd CaddyServer-backend
npm install
npm run dev  # Uses nodemon for auto-reload

# Production build
cd CaddyServer-frontend
npm run build  # Outputs to dist/
```

**Vite Configuration Highlights:**
- API proxy: `/api` → `http://localhost:4000`
- WebSocket proxy: `/ws` → `ws://localhost:4000`
- Hot Module Replacement (HMR) enabled
- Automatic React refresh on save
- Optimized production bundles with code splitting

**Tailwind Configuration:**
- Custom primary color palette (blue scale)
- Dark mode support via `class` strategy
- Content scanning for all `.jsx`, `.js`, `.tsx`, `.ts` files
- JIT compilation for minimal CSS output

---

##  Design & Aesthetic

Caddy Manager is built on a custom design system that prioritizes visual depth and user immersion.

- **Glassmorphism**: UI elements utilize adaptive blurred backgrounds that react to the current theme.
- **Theme-Aware Tokens**: Every component is powered by CSS variables, ensuring consistent contrast across light and dark modes.
- **Micro-Animations**: Buttery-smooth transitions powered by Framer Motion for a premium, high-integrity feel.
- **Responsive Layouts**: Fully optimized for both high-density desktop monitoring and mobile quick-actions.

---

##  Advanced Orchestration (Admin Panel)

The Caddy Manager's Admin Panel provides enterprise-grade orchestration features directly through the Domain Matrix.

### 1. Load Balancing & High Availability
When a domain is configured with multiple comma-separated upstreams (e.g., `localhost:8080, localhost:8081`), the manager unlocks advanced LB settings:
- **Selection Policies**: Choose how traffic is distributed (e.g., Round Robin for even distribution, Least Conn for optimized load).
- **Active Health Checks**: Toggle real-time monitoring. Caddy will automatically bypass unhealthy upstreams based on active probing.

### 2. Edge Rule Engine (Headers)
Manipulate incoming and outgoing headers without editing configuration files. The **Rule Engine** supports:
- **SET**: Enforce specific header values (e.g., `SET X-Content-Type-Options: nosniff`).
- **ADD**: Append values to existing headers.
- **DELETE**: Strip sensitive headers before they reach the client or upstream.

### 3. Blueprint Specializations
- **Static & PHP**: Toggle **Directory Browsing** to present a modern, functional file explorer for public directories.
- **SPA Blueprint**: Automatic URI rewriting (`{path} /index.html`) to support client-side routers like React Router.
- **Protocol Selection**: Toggle between `HTTP` and `HTTPS` for upstream communication, with automatic `insecure_skip_verify` for backend self-signed certificates.

---

---



##  Preview


![Demo Preview](images/demo.gif)


### Dashboard Overview
![Dashboard Overview](images/dashboard-main.png)

---

### Site Details
![Site Details](images/site-configuration.png)

---

### Terminal Access
![Terminal Access](images/terminal-view.png)

---

### Authentication
![Authentication](images/auth-login.png)

---

### Dashboard Stats
![Dashboard Stats](images/dashboard-stats.png)

---

### Domain List
![Domain List](images/domain-list.png)

---

### SSL Settings
![SSL Settings](images/ssl-settings.png)

---

### Advanced Settings
![Advanced Settings](images/advanced-settings.png)

---

### Proxy Rules
![Proxy Rules](images/proxy-rules.png)

---

### Load Balancing
![Load Balancing](images/load-balancing.png)

---

### Health Checks
![Health Checks](images/health-checks.png)

---

### Header Rules
![Header Rules](images/header-rules.png)

---

### Caddy Configuration
![Caddy Configuration](images/caddy-config.png)

---


---

##  Quick Start

### 1. Unified Installation
The engine includes a "Zero-Touch" installer that handles Node.js, Caddy, and all custom Go modules.

```bash
chmod +x install.sh
./install.sh
```

### 2. Service Installation (Daemon)
To install Caddy Manager as a systemd service (auto-start on boot):

```bash
chmod +x install-service.sh
./install-service.sh
```

### 3. Login Credentials
Once the service is running, access the dashboard and use the following default credentials:

- **Username**: `admin`
- **Password**: `caddy123`

> [!IMPORTANT]
> Change the default password immediately after your first login for security.

### 4. Launching the Manager
Run the orchestration script to start or check the service status (does not block terminal):

```bash
./start.sh
```

### 5. Useful Service Commands

- **Check logs**: `sudo journalctl -u caddymanager -f`
- **Stop service**: `sudo systemctl stop caddymanager`
- **Restart service**: `sudo systemctl restart caddymanager`

---

##  Configuration

### Environmental Variables
Create a `.env` file in the `CaddyServer-backend` directory:
- `JWT_SECRET`: Secure token for session management.
- `PORT`: Backend listener port (default: 4000).

---

## 🤝 Contributing

We welcome contributions from the community! To maintain the highest standards of visual and technical excellence, please follow these guidelines:

###  How to Contribute
1.  **Fork the Repository**: Create your own branch from `main`.
2.  **Aesthetic Alignment**: All UI changes must adhere to the "WebUI" design system (Dark Mode, HSL-based colors, and subtle micro-animations).
3.  **Code Standards**: Ensure all new backend logic is documented and frontend components are modular.
4.  **Workflow**:
    - Build locally and verify using `npm run dev`.
    - Test edge cases for Caddyfile generation.
    - Submit a Pull Request with a detailed summary of changes.

###  Bug Reports
If you find a bug, please open an issue with:
- A clear description of the problem.
- Steps to reproduce.
- Environment details (Caddy version, OS).

---

##  License
This project is licensed under the ISC License. 

*Designed and Engineered by Lyarinet.*
