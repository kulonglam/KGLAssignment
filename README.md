# Karibu Groceries API

Backend API for Karibu Groceries LTD wholesale cereals operations (procurement, stock, sales, notifications, and user roles across branches).

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Swagger (`/api-docs`)

## Project Structure

- `server.js` - app bootstrap and route wiring
- `config/db.js` - MongoDB connection
- `models/` - database schemas and schema-level validation
- `controllers/` - business logic
- `routes/` - API route definitions and request validation
- `seed.js` - idempotent user seeding script

## Prerequisites

- Node.js 18+ (recommended)
- MongoDB running locally or reachable by connection string

## Environment Variables

Only `.env` is required.

```env
PORT=3000
NODE_ENV=development
DATABASE_URI=mongodb://localhost:27017/karibu_groceries_db
JWT_SECRET=your_jwt_secret
```

## Installation

```bash
npm install
```

## Seed Initial Users

```bash
npm run seed
```

`seed.js` seeds the required baseline workforce and is idempotent (safe to rerun).

### Seeded Accounts

| Role | Branch | Username | Email | Password |
|---|---|---|---|---|
| Director | - | `MrOrban` | `orban@kgl.local` | `Orban@2026!` |
| Manager | Maganjo | `manager_maganjo` | `manager.maganjo@kgl.local` | `ManagerMaganjo@2026` |
| SalesAgent | Maganjo | `salesagent_maganjo_1` | `salesagent1.maganjo@kgl.local` | `SalesMaganjo1@2026` |
| SalesAgent | Maganjo | `salesagent_maganjo_2` | `salesagent2.maganjo@kgl.local` | `SalesMaganjo2@2026` |
| Manager | Matugga | `manager_matugga` | `manager.matugga@kgl.local` | `ManagerMatugga@2026` |
| SalesAgent | Matugga | `salesagent_matugga_1` | `salesagent1.matugga@kgl.local` | `SalesMatugga1@2026` |
| SalesAgent | Matugga | `salesagent_matugga_2` | `salesagent2.matugga@kgl.local` | `SalesMatugga2@2026` |

## Run the API

```bash
npm start
```

Base URL (local): `http://localhost:3000`

- Health: `GET /`
- Swagger UI: `GET /api-docs`
- OpenAPI JSON: `GET /api-docs.json`

## Authentication

1. Login:
   - `POST /users/login`
2. Use returned JWT in protected requests:
   - `Authorization: Bearer <token>`

## Main Endpoints

### Users

- `POST /users/login` - login
- `POST /users` - create user (Manager or Director under controller rules)
- `GET /users` - list users (Manager)
- `GET /users/:id` - get user (Manager)
- `PATCH /users/:id` - update user (Manager)
- `DELETE /users/:id` - delete user (Manager)

### Procurement

- `POST /procurement` - record procurement (Manager)
- `GET /procurement` - list procurements (Manager)
- `GET /procurement/:id` - get procurement (Manager)
- `PATCH /procurement/:id` - update procurement (Manager)
- `DELETE /procurement/:id` - delete procurement (Manager)

### Sales

- `POST /sales/cash` - record cash sale (Manager, SalesAgent)
- `POST /sales/credit` - record credit sale (Manager, SalesAgent)
- `GET /sales/reports/totals` - aggregated cross-branch totals (Director)
- `GET /sales` - list sales (Manager, SalesAgent)
- `GET /sales/:id` - get sale (Manager, SalesAgent)
- `PATCH /sales/:id` - update sale (Manager, SalesAgent)
- `DELETE /sales/:id` - delete sale (Manager, SalesAgent)

### Notifications

- `GET /notifications` - list notifications (Manager)
- `GET /notifications/:id` - get notification (Manager)
- `POST /notifications` - create notification (Manager)
- `PATCH /notifications/:id/read` - mark read (Manager)
- `PATCH /notifications/:id` - update notification (Manager)
- `DELETE /notifications/:id` - delete notification (Manager)

## Implemented Business Rules (Summary)

- Supported produce: Beans, Grain Maize, Cow peas, G-nuts, Soybeans.
- Branches: Maganjo, Matugga.
- Procurement source types: IndividualDealer, Company, Farm.
- Individual dealer procurement requires at least 1000kg.
- Farm source name must be Maganjo or Matugga.
- Only stock in inventory can be sold.
- Stock tonnage is reduced on sale and adjusted on update/delete flows.
- Manager gets stock notifications on unavailable/low/out-of-stock cases.
- Sales amount is validated against manager-set selling price in inventory.
- Director totals endpoint returns aggregations only.

## Scripts

- `npm start` - start server
- `npm run seed` - seed baseline users

