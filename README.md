# ProductSync - NestJS Backend

A robust REST API backend for the ProductSync application built with NestJS, Prisma, and PostgreSQL.

## Features

- **Authentication** - JWT-based auth with access/refresh tokens
- **User Management** - Registration, login, logout, and token refresh
- **Product Management** - Full CRUD operations with pagination
- **Token Blacklisting** - Secure logout with token revocation
- **Input Validation** - Request validation using class-validator
- **Error Handling** - Global exception filters for consistent responses

## Tech Stack

- **NestJS 11** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma 7** - Next-generation ORM
- **PostgreSQL** - Relational database
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **class-validator** - DTO validation
- **Docker** - Containerized database and application

## Prerequisites

- **Docker** and **Docker Compose** (recommended - runs everything)

**Or for local development without Docker:**
- **Node.js** `^20.19.0` or `>=22.12.0`
- **npm** or **pnpm**

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd nest-backend
```

### 2. Start with Docker (Recommended)

This will start both PostgreSQL and the NestJS development server:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **NestJS API** on `localhost:3001` (with hot-reload enabled)

The API will be available at `http://localhost:3001`.

### 3. Run database migrations

```bash
docker-compose exec api npx prisma migrate dev
```

### 4. Seed the database (optional)

To populate the database with 200 sample products:

```bash
docker-compose exec api npx tsx prisma/seed.ts
```

The seed script will:
- Clear existing products
- Generate 200 products with random names, descriptions, and prices
- Product names combine adjectives, categories, and nouns (e.g., "Premium Electronics Kit")
- Prices range from $10.00 to $999.99

---

## Local Development (Without Docker for API)

If you prefer to run the NestJS app locally:

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL only

```bash
docker-compose up -d postgres
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

> **Important:** Change the `JWT_SECRET` to a secure random string in production.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Seed the database (optional)

```bash
npx tsx prisma/seed.ts
```

### 6. Start the development server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register a new user | No |
| `POST` | `/auth/login` | Login and get tokens | No |
| `POST` | `/auth/refresh` | Refresh access token | No |
| `POST` | `/auth/logout` | Logout and revoke token | Yes |
| `GET` | `/auth/me` | Get current user info | Yes |

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/products` | Get all products (paginated) | Yes |
| `GET` | `/products/:id` | Get a single product | Yes |
| `POST` | `/products` | Create a new product | Yes |
| `PUT` | `/products/:id` | Update a product | Yes |
| `DELETE` | `/products/:id` | Delete a product | Yes |

### Query Parameters

For `GET /products`:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

## Database Schema

### User
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| firstName | String | User's first name |
| lastName | String | User's last name |
| email | String | Unique email |
| password | String | Hashed password |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Product
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| name | String | Product name |
| description | String? | Optional description |
| price | Decimal | Price (10,2 precision) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### RevokedToken
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| jtiHash | String | Unique token identifier hash |
| expiresAt | DateTime | Token expiration time |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start the application |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in debug mode with watch |
| `npm run start:prod` | Start production build |
| `npm run build` | Build the application |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Lint and fix code |
| `npm run format` | Format code with Prettier |

## Project Structure

```
src/
├── auth/               # Authentication module
│   ├── dto/            # Data transfer objects
│   ├── auth.controller.ts
│   ├── auth.guard.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── blacklist.service.ts
├── common/             # Shared utilities
│   └── filters/        # Exception filters
├── prisma/             # Prisma service
├── products/           # Products module
│   ├── dto/            # Data transfer objects
│   ├── products.controller.ts
│   ├── products.module.ts
│   └── products.service.ts
├── users/              # Users module
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── app.module.ts       # Root module
└── main.ts             # Application entry point

prisma/
├── schema.prisma       # Database schema
├── seed.ts             # Database seeder
└── migrations/         # Migration files
```

## Docker Commands

```bash
# Start all services (PostgreSQL + NestJS API)
docker-compose up -d

# Start only PostgreSQL (for local development)
docker-compose up -d postgres

# View API logs
docker-compose logs -f api

# View PostgreSQL logs
docker-compose logs -f postgres

# Stop all containers
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v

# Rebuild the API container (after package.json changes)
docker-compose up -d --build api

# Run commands inside the API container
docker-compose exec api npx prisma studio
docker-compose exec api npx prisma migrate dev
docker-compose exec api npx tsx prisma/seed.ts
```

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations to database
npx prisma migrate deploy

# Reset database (drops all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed the database
npx tsx prisma/seed.ts
```

## Frontend Integration

This backend is designed to work with the Vue.js frontend. Make sure to:

1. Start the backend first on `http://localhost:3001`
2. Configure the frontend's `VITE_API_BASE_URL` to point to this backend
3. Register a user account through the frontend or API
4. Use the JWT tokens for authenticated requests

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing | `your-super-secret-key` |

## License

UNLICENSED
