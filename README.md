# 🐾 Get A Pet — API - Back-end

A **RESTful API** built with **Node.js**, **Express**, and **MongoDB (Mongoose)** for a pet-adoption platform. Users can register, authenticate, list pets for adoption, schedule visits, and complete adoptions. Authentication is fully **stateless and token-based**, combining **bcrypt** for password hashing with **JWT (JSON Web Tokens)** for session verification — no server-side session store is used. The API is decoupled from any front-end (CORS-restricted to a single trusted origin) and fully containerized with **Docker**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Authentication & Security — bcrypt + JWT](#authentication--security--bcrypt--jwt)
- [Image Upload](#image-upload)
- [Data Models](#data-models)
- [Routes](#routes)
- [Docker & Environment Setup](#docker--environment-setup)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Project Overview

Get A Pet is a pure JSON API (no server-rendered views) designed to sit behind a separate front-end client. Its core objective is to demonstrate a **secure, production-style authentication flow** for a headless API:

- Password hashing with **bcrypt**, never storing or logging plain-text passwords
- Stateless authentication via **JWT**, issued on register/login and delivered through an **httpOnly cookie**
- Route-level protection through a reusable `verifyToken` middleware
- A relational-style data model between `User` and `Pet` (owner + adopter references), built on MongoDB/Mongoose
- File uploads (profile pictures and pet photos) handled with **Multer**
- Paginated listings for pets, "my pets", and "my adoptions"

Core features:

- User registration with field validation, password-confirmation check, and duplicate-email protection
- Login with hashed-password verification and JWT issuance; logout clears the session cookie server-side
- `checkuser` endpoint to silently validate the current session from the cookie
- Full pet lifecycle: create, list (paginated), fetch by id, edit (appending new photos), delete individual photos, delete the whole listing
- Adoption workflow: schedule a visit, cancel a scheduled visit, and toggle the adoption outcome (`/pets/petadopted/:id`) — with ownership checks preventing users from adopting or editing their own pets
- Image uploads for user avatars and pet photos, stored per-entity under `public/images/`, with request body limits raised to comfortably handle image payloads

---

## Tech Stack

| Layer                 | Technology                                     |
| --------------------- | ---------------------------------------------- |
| Runtime               | Node.js (Alpine, containerized)                |
| Web Framework         | Express 5                                      |
| Database              | MongoDB                                        |
| ODM                   | Mongoose                                       |
| Password Hashing      | bcrypt                                         |
| Authentication        | jsonwebtoken (JWT)                             |
| Cookie Handling       | cookie-parser                                  |
| File Uploads          | Multer                                         |
| Cross-Origin Requests | cors                                           |
| Environment Config    | dotenv                                         |
| Containerization      | Docker + Docker Compose                        |
| Local DB Admin        | Mongo Express (dev-only, via Compose override) |
| Dev Tooling           | nodemon                                        |

---

## Project Structure

```
Get-A-Pet/
├── server.js
├── package.json
├── env.exemple
├── dockerfile
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose-prod.yml
├── .dockerignore
├── .gitignore
├── src/
│   ├── controllers/
│   │   ├── UserController.js
│   │   └── PetController.js
│   ├── database/
│   │   └── conn.js              ← Mongoose/MongoDB connection
│   ├── helpers/
│   │   ├── create-user-token.js  ← signs the JWT and sets the auth cookie
│   │   ├── get-token.js          ← extracts the token from the request cookie
│   │   ├── get-user-by-token.js  ← resolves the authenticated User from a token
│   │   ├── verify-token.js       ← route-protection middleware
│   │   ├── clear-token.js        ← clears the auth cookie on logout
│   │   └── image-upload.js       ← Multer disk-storage configuration
│   ├── models/
│   │   ├── User.js
│   │   └── Pet.js
│   ├── routes/
│   │   ├── UserRoutes.js
│   │   └── PetRoutes.js
│   └── views/                   ← unused (pure JSON API, no server-rendered pages)
│
└── public/
    └── images/
        ├── users/
        └── pets/
```

---

## Architecture

The API follows a lightweight **layered structure** on top of Express, without server-side views:

| Layer           | Responsibility                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Models**      | Mongoose schemas for `User` and `Pet`                                                                                  |
| **Controllers** | Business logic per domain — user auth/profile, pet CRUD and adoption flow                                              |
| **Routes**      | Express routers mapping HTTP verbs/paths to controller methods, wiring in middleware (`verifyToken`, `imageUpload`)    |
| **Helpers**     | Cross-cutting concerns reused across controllers: token creation, token parsing, user resolution, upload configuration |

`server.js` wires everything together: it configures `express.json({ limit: "5mb" })` and `express.urlencoded({ extended: true, limit: "5mb" })` (raised to comfortably accommodate image-carrying requests), serves `public/` as static assets, applies a strict CORS policy scoped to `URL_FRONT` with `credentials: true` (required for cookies to be sent cross-origin) and explicit `allowedHeaders`, registers `cookie-parser`, and mounts the `/users` and `/pets` routers.

---

## Authentication & Security — bcrypt + JWT

Authentication here is intentionally split into two independent responsibilities: **bcrypt** answers _"is this the right password?"_, and **JWT** answers _"is this request coming from an already-authenticated user?"_ on every subsequent call.

### 1. Password hashing with bcrypt

- On **registration** (`UserController.create`), the plain password is never persisted. A salt is generated with `bcrypt.genSalt(12)` and the password is hashed with `bcrypt.hash(password, salt)`; only the resulting hash is stored on the `User` document.
- On **login** (`UserController.login`), the submitted password is never compared directly — `bcrypt.compare(password, existingUser.password)` re-derives the hash internally and checks it against the stored one, so the plain password is never re-derived, decrypted, or logged.
- On **profile edit** (`UserController.editUser`), if a new password and confirmation are provided, the same salt-and-hash routine runs again before overwriting the stored hash — so passwords are always re-hashed, never copied or re-encrypted.

### 2. Session handling with JWT

- After a successful register or login, `helpers/create-user-token.js` calls `jwt.sign()` with a minimal payload (`{ name, id }`), signed with `process.env.JWT_SECRET`, and a **1-hour expiration** (`expiresIn: "1h"`).
- The signed token is written to an **httpOnly cookie** (`access_token`), configured with `secure` (driven by `COOKIE_SECURE`), `sameSite: "lax"`, and `maxAge: 3600000` — the token is inaccessible to client-side JavaScript, mitigating XSS-based token theft, and is only sent over HTTPS in production.
- The same response also returns the token and `userId` in the JSON body, so the front-end can use either the cookie (automatic, for browser flows) or the token value directly (for non-cookie clients).

### 3. Protecting routes

- `helpers/get-token.js` pulls the token out of `req.cookies.access_token`.
- `helpers/verify-token.js` is the **route-protection middleware**: it extracts the token, rejects the request with `401` if none is present, and otherwise calls `jwt.verify(token, JWT_SECRET)`. An invalid or tampered token returns `400`; a valid one attaches the decoded payload to `req.user` and calls `next()`.
- `helpers/get-user-by-token.js` goes one step further than `verifyToken`: it verifies the token **and** resolves the full `User` document from the database via the decoded `id`, so controllers can act on the actual authenticated user (e.g. checking pet ownership) rather than just the token payload.
- `verifyToken` is applied selectively at the route level (`UserRoutes.js`, `PetRoutes.js`) on every mutating or user-scoped endpoint — registration, login, and the public pet listing remain open, while editing a profile, creating/editing/deleting a pet, and the adoption flow all require a valid session.
- `UserController.checkUser` provides a lightweight "who am I" endpoint: if an `access_token` cookie is present, it verifies it and returns a minimal confirmation (`{ message, id }`) rather than the full user document; otherwise it returns `null`, letting the front-end silently determine login state without over-exposing user data.

### 4. Logout

- `helpers/clear-token.js` is a dedicated helper that clears the session by calling `res.clearCookie("access_token", ...)` with **the exact same flags used when the cookie was set** (`httpOnly`, `secure` from `COOKIE_SECURE`, `sameSite: "lax"`, `path: "/"`) — mismatched flags are a common bug that silently fails to clear cookies in the browser, so this keeps both operations in sync.
- `UserController.logout` invokes this helper and responds with a `Cache-Control: no-store` header to prevent the now-invalidated session from being served out of any cache.
- Exposed at `GET /users/logout`.

### 5. Secrets & configuration

- `JWT_SECRET`, MongoDB credentials, and cookie settings are read exclusively from environment variables via `dotenv` — never hardcoded.
- Only `env.exemple` (placeholder values) is version-controlled; the real `.env` is excluded via `.gitignore` and `.dockerignore`.
- All controller actions are wrapped in `try/catch`, returning a generic `500` on failure instead of leaking internal error details to the client.

---

## Image Upload

`helpers/image-upload.js` configures **Multer** with disk storage:

- Destination folder is chosen dynamically based on the request's base path (`public/images/users` for user avatars, `public/images/pets` for pet photos).
- Filenames are generated from `Date.now()` plus the original file extension to avoid collisions.
- A file filter restricts uploads to `.jpg` and `.png`.
- `UserRoutes` uses `imageUpload.single("image")` for a single avatar; `PetRoutes` uses `imageUpload.array("images")` to accept multiple pet photos per request.

---

## Data Models

| Model  | Fields                                                                       | Relationship                                                                    |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `User` | `name`, `email`, `password` (hash), `image`, `phone`                         | Referenced by `Pet.user` and `Pet.adopter`                                      |
| `Pet`  | `name`, `age`, `weight`, `color`, `images[]`, `available`, `user`, `adopter` | Embeds a snapshot of the owning `User` and, once scheduled, the adopting `User` |

`Pet.user` and `Pet.adopter` store a denormalized snapshot (`_id`, `name`, `image`, `phone`) of the related user rather than a Mongoose `ref`, so pet listings don't require a separate population query. `Pet.available` defaults to `true` on creation, so a newly listed pet is immediately open for adoption without extra client-side logic.

---

## Routes

### Users (`/users`)

| Method | Route        | Auth required | Controller                   | Description                                                                         |
| ------ | ------------ | :-----------: | ---------------------------- | ----------------------------------------------------------------------------------- |
| POST   | `/register`  |      No       | `UserController.create`      | Registers a user, hashes the password, issues a JWT                                 |
| POST   | `/login`     |      No       | `UserController.login`       | Verifies credentials with bcrypt, issues a JWT                                      |
| GET    | `/checkuser` |     No\*      | `UserController.checkUser`   | Resolves the current session from the cookie, if any                                |
| GET    | `/:id`       |      No       | `UserController.getUserById` | Fetches a user by id (password excluded)                                            |
| PATCH  | `/edit/:id`  |    **Yes**    | `UserController.editUser`    | Updates profile data, optionally re-hashing a new password and replacing the avatar |
| GET    | `/logout`    |      No       | `UserController.logout`      | Clears the `access_token` cookie, ending the session                                |

### Pets (`/pets`)

| Method | Route                 | Auth required | Controller                     | Description                                                                                                                     |
| ------ | --------------------- | :-----------: | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/create`             |    **Yes**    | `PetController.create`         | Creates a pet listing with uploaded images                                                                                      |
| GET    | `/`                   |      No       | `PetController.getAll`         | Paginated list of all pets available for adoption                                                                               |
| GET    | `/mypets`             |    **Yes**    | `PetController.getMyPets`      | Paginated list of pets owned by the current user                                                                                |
| GET    | `/myadoptions`        |    **Yes**    | `PetController.getPetsAdopted` | Paginated list of pets the current user has scheduled/adopted                                                                   |
| GET    | `/:id`                |      No       | `PetController.getPetById`     | Fetches a single pet by id                                                                                                      |
| DELETE | `/delete/:id`         |    **Yes**    | `PetController.deletePetById`  | Deletes a pet (owner-only)                                                                                                      |
| PATCH  | `/edit/:id`           |    **Yes**    | `PetController.editPet`        | Updates a pet's data; new photos are appended to the existing ones instead of overwriting them (owner-only)                     |
| PATCH  | `/edit/images/:id`    |    **Yes**    | `PetController.deleteImage`    | Removes a single photo from a pet, deleting the file from disk and pulling it from `images[]` (owner-only)                      |
| PATCH  | `/schedule/:id`       |    **Yes**    | `PetController.schedule`       | Schedules an adoption visit (blocks self-adoption and duplicate scheduling)                                                     |
| PATCH  | `/cancelschedule/:id` |    **Yes**    | `PetController.cancelSchedule` | Cancels a scheduled visit, removing the `adopter` reference (owner or the scheduled adopter only)                               |
| PATCH  | `/petadopted/:id`     |    **Yes**    | `PetController.petAdopted`     | Toggles `available` via `{ available }` in the body — finalizes the adoption or releases the pet back for adoption (owner-only) |

\* `checkuser` doesn't reject unauthenticated requests — it simply returns `null` when no valid cookie is present.

---

## Docker & Environment Setup

The project ships with three Compose files for different contexts:

| File                          | Purpose                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker-compose.yml`          | Base services: Node.js app + MongoDB (`mongodb-atlas-local` image)                                                                               |
| `docker-compose.override.yml` | Local development overrides — live volume mount for hot-reload, exposed Node/Mongo ports, and a `mongo-express` service for visual DB management |
| `docker-compose-prod.yml`     | Production overrides — `restart: always` policies for both services                                                                              |

The `dockerfile` builds a lightweight `node:24-alpine` image, installs only production dependencies (`npm install --omit=dev`), exposes port `5000`, and starts the app with `node server.js`.

---

## Environment Variables

All configuration is driven by environment variables (see `env.exemple`):

```
COMPOSE_PROJECT_NAME=   # Project name for Docker Compose
URL_FRONT=               # Authorized front-end origin (used for CORS)
BACK_PORT_HOST=          # Host port for the Node.js API

MONGO_HOST=              # MongoDB host (service name in the Docker network)
MONGO_PORT=              # MongoDB port
MONGO_USER=              # MongoDB user
MONGO_USER_PASS=         # MongoDB user password

MONGOEXP_PORT=           # Local Mongo Express port (dev only)
MONGOEXP_USER=           # Mongo Express basic-auth user
MONGOEXP_USER_PASS=      # Mongo Express basic-auth password

JWT_SECRET=              # Secret used to sign and verify JWTs
COOKIE_SECURE=           # false in dev, true in production (cookie "secure" flag)
```

> ⚠️ Never commit a real `.env` file. Only `env.exemple` (with placeholder values) is tracked in version control.

---

## Getting Started

```bash
# 1. Clone the repository and enter the project folder
cd Get-A-Pet

# 2. Copy the example environment file and fill in real values
cp env.exemple .env

# 3. Start the full stack (Node.js + MongoDB + Mongo Express) in dev mode
docker compose up --build

# The API will be available at http://localhost:<BACK_PORT_HOST>
# Mongo Express will be available at http://localhost:<MONGOEXP_PORT>
```

For a production-like run:

```bash
docker compose -f docker-compose.yml -f docker-compose-prod.yml up --build -d
```

An Insomnia collection (`Insomnia_2026-07-25-07-13-48.yaml`) is included with all `/users` and `/pets` requests pre-configured for local testing.

---

## Acknowledgments

This project was originally proposed as a guided exercise in the course **["Node.js do Zero a Maestria com diversos Projetos"](https://www.udemy.com/course/nodejs-do-zero-a-maestria-com-diversos-projetos/)**, by **Matheus Battisti**. The base concept, feature scope, and educational purpose of this API are credited to that course.

The following were **added independently, beyond the course's original scope**:

- Storing the JWT in an **httpOnly cookie** (`access_token`) instead of relying solely on returning the token in the response body, reducing exposure to client-side script access
- The full **Docker / Docker Compose** setup (base, dev override, and production configurations), isolating credentials and secrets through environment variables rather than hardcoding them
- Security-oriented environment configuration — `JWT_SECRET`, MongoDB credentials, and the `COOKIE_SECURE` flag all driven by `.env`, with only a placeholder `env.exemple` tracked in version control

---

## License

This project is developed and maintained by [M2K Soluções](https://kelvesmoura.com). The original project concept and course materials referenced above remain the intellectual property of their author, Matheus Battisti.
