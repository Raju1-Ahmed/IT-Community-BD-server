# IT Community BD Server

Backend API for the IT Community BD platform. This service handles authentication, job and profile data, seeker and employer flows, premium expertise features, file uploads, and API documentation.

## Responsibilities

- User authentication and authorization
- Job and application APIs
- Seeker and employer profile management
- Premium expertise profile workflow
- File upload handling
- Swagger documentation
- MongoDB persistence

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Multer for uploads
- Swagger for API docs

## Project Structure

```text
src/
  config/       Database configuration
  controllers/  Route handlers
  docs/         Swagger config
  middleware/   Auth and request middleware
  models/       Mongoose schemas
  routes/       API route definitions
  scripts/      Utility and seed scripts
  utils/        Shared helpers
  app.js        Express app setup
  server.js     Entry point
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string

## Environment Variables

Create a `.env` file in the project root with values appropriate for your environment:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/it-community-bd
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PREMIUM_MIN_EXPERIENCE_YEARS=3
```

Optional:

```env
MONGODB_DNS_SERVERS=
```

## Local Development

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Run in production mode:

```bash
npm start
```

Server default URL:

```text
http://localhost:5000
```

API base URL typically used by clients:

```text
http://localhost:5000/api
```

## API Notes

- JWT-based auth is used for protected endpoints.
- Uploaded files are stored under `uploads/`.
- Premium expertise endpoints support expert profile review flows and detail views.
- Swagger-related setup lives in `src/docs/`.

## Common Development Tasks

- Add or update controllers in `src/controllers/`
- Register endpoints in `src/routes/`
- Update schemas in `src/models/`
- Seed or maintain reference data from `src/scripts/`

## Related Repositories

- `IT-Community-BD-Frontend` - public-facing frontend
- `IT-Community-BD-Admin-Dashboard` - admin dashboard
