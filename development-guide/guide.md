# Workshop POS: Development Guide

## 1. Project Overview
A modular Point of Sale (POS) system designed for a workshop environment ("Bengkel").
- **Architecture**: Web-based (React frontend, Node.js backend).
- **Database**: Microsoft SQL Server (MSSQL) hosted on the local network.
- **Access**: Multi-device access via Local IP (e.g., `192.168.x.x`).

## 2. Technical Stack
- **Language**: TypeScript throughout (Strongly typed).
- **Frontend**: Next.js 15 (React) + Tailwind CSS (for "vibe" consistency and responsive design).
- **Backend**: Node.js with Express.js (REST API).
- **Database**: Microsoft SQL Server (MSSQL).
- **Networking**: Static IP configuration for local network broadcasting.

## 3. Core Modules & Pages
Maintain strict separation between these views:

| Module | Description |
| :--- | :--- |
| **Login** | Secure authentication for workshop staff. |
| **Dashboard** | Overview of daily sales and workshop status. |
| **Sales** | The POS interface (item selection, total calculation, checkout). |
| **Inventory** | Parts and supplies management (stock levels, alerts).Logic must be separate from "Sales". |
| **Reports** | Sales history, revenue, and stock usage analytics. |
| **Settings** | User management and local network/database configurations. |

## 4. Development Principles
- **Vibe Strategy**: Prioritize clean, readable code and minimalist, premium UI (Shadcn/Tailwind).
- **Modularity**: Use custom hooks or services for shared logic. "Inventory" logic should not bleed into "Sales".
- **Security**: 
    - Sanitize all SQL inputs (use parameterized queries or ORM like Prisma/TypeORM/Sequelize).
    - Never store plain-text passwords.
    - Enable CORS for specific local network IPs only.
- **Scalability**: Ensure the database schema can handle high transaction volume (indexing key columns like `sale_date` and `part_id`).
- **Responsiveness**: Mobile-first approach for workshop tablets.

## 5. Documentation Workflow (Mandatory)
Every session, update the following files:

### Changelog Management
Insert updates into `changelog.md`:
```markdown
## [Version] - [Date]
### Added
- [Feature name]
### Changed
- [Description of change]
### Fixed
- [Bug description]
```

### Bug Tracking
Document issues in `bugs.md`:
```markdown
## [Bug Name] - [Date]
- **Description**: [Brief description]
- **Expected behavior**: [What should happen]
- **Actual behavior**: [What is happening]
- **Solution**: [How it was fixed]
- **Status**: [Open | In-Progress | Fixed | Closed]
```

## 6. Local Network Setup Instructions
- The backend should listen on `0.0.0.0` to be discoverable on the network.
- The Frontend `.env` must use the Host IP (e.g., `REACT_APP_API_URL=http://192.168.1.50:5000`) rather than `localhost`.