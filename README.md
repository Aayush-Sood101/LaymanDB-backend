# LaymanDB — Backend

<div align="center">

> **AI-powered database design platform** that transforms natural language into professional database schemas, multi-dialect SQL, Mermaid ER diagrams, and comprehensive documentation.

</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Architecture & Request Flow](#5-architecture--request-flow)
6. [Data Models](#6-data-models)
7. [Environment Variables](#7-environment-variables)
8. [Setup & Installation](#8-setup--installation)
9. [Running the Server](#9-running-the-server)
10. [API Endpoints Reference](#10-api-endpoints-reference)
    - [Health Check](#health-check)
    - [Schema Management](#schema-management--apischema)
    - [Session Management](#session-management--apisession)
    - [Query Generation](#query-generation--apiquery)
    - [Export & Code Generation](#export--code-generation--apiexport)
    - [Gemini AI — ER Diagram](#gemini-ai--er-diagram--apigemini)
    - [Gemini AI — Prompt Enhancement](#gemini-ai--prompt-enhancement--apigeminiprompt)
    - [Mermaid Query Generation](#mermaid-query-generation--apimermaid-query)
11. [Real-Time Communication (Socket.IO)](#11-real-time-communication-socketio)
12. [Logging System](#12-logging-system)
13. [SQL Dialect Support](#13-sql-dialect-support)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

**LaymanDB** is an intelligent database design platform that bridges the gap between natural language requirements and production-ready database implementations. Users simply describe their data needs in plain English, and the platform:

- Parses the description using **OpenAI** to extract entities, relationships, and attributes.
- Generates a structured **database schema** with tables, columns, primary/foreign keys, and constraints.
- Renders an interactive **Entity-Relationship Diagram** (ERD) using Mermaid syntax.
- Produces **SQL DDL scripts** for MySQL, PostgreSQL, SQLite, and SQL Server from a single schema.
- Writes thorough **Markdown documentation** describing every table and relationship.
- Provides a **Gemini AI Playground** for direct ER diagram generation and prompt enhancement using Google's Gemini model.
- Broadcasts schema changes to all connected browser tabs via **Socket.IO**.

This repository contains the **Node.js/Express backend**. The companion frontend is a Next.js application that consumes this API.

---

## 2. Key Features

| Feature | Description |
|---------|-------------|
| **Natural Language → Schema** | Describe a database in plain English; get back a fully structured schema object. |
| **Prompt Refinement Loop** | Two endpoints (`optimize-prompt`, `enhance-prompt`) let users iteratively improve their descriptions before committing to schema generation. |
| **Multi-Dialect SQL Export** | A single schema produces ready-to-run DDL for MySQL, PostgreSQL, SQLite, and SQL Server. |
| **Mermaid ERD Generation** | Convert any stored schema to Mermaid `erDiagram` syntax, embeddable in Markdown or rendered by the frontend. |
| **Gemini AI Playground** | Directly ask Google Gemini to produce an ER diagram or enhance a prompt without going through the full schema pipeline. |
| **Natural Language Queries** | Ask questions about a schema in English and receive generated SQL queries with explanations. |
| **Comprehensive Documentation** | Auto-generate Markdown (or HTML) documentation that records every design decision. |
| **Real-Time Updates** | Socket.IO broadcasts schema changes to all connected clients. |
| **Structured Logging** | Winston writes timestamped logs to `combined.log`, `error.log`, and a dedicated `openai-responses.log`. |
| **In-Memory Storage** | No database installation required; schemas and sessions are stored in process memory during a server run. |

---

## 3. Technology Stack

### Runtime & Framework

| Package | Version | Role |
|---------|---------|------|
| **Node.js** | >= 18.x | JavaScript runtime |
| **Express** | 5.1.0 | HTTP web framework |
| **Socket.IO** | 4.7.4 | Real-time WebSocket communication |

### AI & NLP

| Package | Version | Role |
|---------|---------|------|
| **openai** | 4.35.0 | OpenAI API client — entity extraction, prompt optimization, SQL generation |
| **@google/generative-ai** | 0.24.1 | Google Gemini API client — direct ER diagram generation, prompt enhancement |
| **natural** | 6.10.0 | Supplementary NLP tokenisation / stemming utilities |

### Utilities

| Package | Version | Role |
|---------|---------|------|
| **dotenv** | 16.3.1 | Loads `.env` into `process.env` |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing headers |
| **winston** | 3.11.0 | Structured, multi-transport logger |
| **sql-formatter** | 15.6.6 | Formats generated SQL for readability |
| **axios** | 1.11.0 | HTTP client (used within services) |
| **react-markdown** | 10.1.0 | Markdown rendering utility |
| **redis** | 4.6.12 | Redis client (imported; available for future persistent caching) |

### Development & Testing

| Package | Version | Role |
|---------|---------|------|
| **nodemon** | 3.0.3 | Auto-restarts the server on file changes |
| **jest** | 29.7.0 | Test framework |
| **supertest** | 6.3.4 | HTTP assertion library for integration tests |

---

## 4. Directory Structure

```
LaymanDB-backend/
├── src/
│   ├── server.js                        # Entry point — Express app, Socket.IO, middleware
│   │
│   ├── routes/                          # Route definitions (thin — delegate to controllers)
│   │   ├── index.js                     # Aggregates all route modules under /api
│   │   ├── schema.routes.js             # /api/schema/*
│   │   ├── session.routes.js            # /api/session/*
│   │   ├── query.routes.js              # /api/query/*
│   │   ├── export.routes.js             # /api/export/*
│   │   ├── gemini.routes.js             # /api/gemini/generate
│   │   ├── gemini.prompt.routes.js      # /api/gemini/prompt/enhance
│   │   └── mermaidQuery.routes.js       # /api/mermaid-query/*
│   │
│   ├── controllers/                     # Request handlers — validate input, call services, format response
│   │   ├── schema.controller.js
│   │   ├── session.controller.js
│   │   ├── query.controller.js
│   │   ├── export.controller.js
│   │   ├── export.controller.mermaid.js
│   │   ├── gemini.controller.js
│   │   ├── gemini.prompt.controller.js
│   │   └── mermaidQuery.controller.js
│   │
│   ├── services/                        # Business logic — AI calls, transformations
│   │   ├── nlp.service.js               # OpenAI — entity/relationship extraction, prompt optimization
│   │   ├── schemaGenerator.service.js   # Assembles Schema objects from extracted entities
│   │   ├── sqlGenerator.service.js      # Routes to the correct dialect generator
│   │   ├── queryGenerator.service.js    # OpenAI/Gemini — NL-to-SQL
│   │   ├── mermaidGenerator.service.js  # Schema -> Mermaid erDiagram syntax
│   │   ├── mermaidQueryGenerator.service.js  # NL -> Mermaid diagram
│   │   ├── documentation.service.js     # Schema -> Markdown/HTML documentation
│   │   ├── promptEnhancer.service.js    # OpenAI — prompt enrichment
│   │   ├── geminiService.js             # Google Gemini — ER diagram generation
│   │   ├── geminiPromptEnhancer.service.js   # Google Gemini — prompt enhancement
│   │   └── dialects/                    # Dialect-specific SQL DDL generators
│   │       ├── mysql.generator.js
│   │       ├── postgresql.generator.js
│   │       ├── sqlite.generator.js
│   │       └── sqlserver.generator.js
│   │
│   ├── models/                          # In-memory data models (no external DB required)
│   │   ├── schema.model.js              # Schema class with save/findById/findByIdAndUpdate
│   │   └── session.model.js             # Session class with save/findById/populate
│   │
│   └── utils/
│       └── logger.js                    # Winston logger config + openaiResponseLogger
│
├── logs/                                # Auto-created at runtime
│   ├── combined.log
│   ├── error.log
│   └── openai-responses.log
│
├── package.json
├── package-lock.json
└── README.md
```

---

## 5. Architecture & Request Flow

### High-Level Architecture

```
+-----------------------------------------------------+
|                  Frontend (Next.js)                 |
|              http://localhost:3000                  |
+------------------+----------------------------------+
                   |  HTTP (REST)   |  WebSocket (Socket.IO)
                   v                v
+------------------+--+   +------------------------+
|  Express REST API   |   |  Socket.IO Server      |
|  (port 4000)        |   |  (same port 4000)      |
|                     |   |                        |
|  /api/*  -----------+   |  Event: schema-update  |
|  /health            |   |  Broadcast: schema-updated
+------------------+--+   +------------------------+
                   |
                   v
+------------------------------------------------------+
|                  Controller Layer                    |
|  - Input validation                                  |
|  - Error categorisation (NLP_ERROR, TIMEOUT_ERROR)   |
|  - Response formatting                               |
+------------------------------------------------------+
                   |
                   v
+------------------------------------------------------+
|                   Service Layer                      |
|                                                      |
|  nlp.service -------------------> OpenAI API         |
|  promptEnhancer.service --------> OpenAI API         |
|  schemaGenerator.service                             |
|  sqlGenerator.service -> dialects/{mysql,pg,...}.js  |
|  queryGenerator.service --------> Gemini / OpenAI   |
|  mermaidGenerator.service                            |
|  mermaidQueryGenerator.service -> Gemini / OpenAI   |
|  documentation.service                               |
|  geminiService -----------------> Google Gemini API  |
|  geminiPromptEnhancer.service --> Google Gemini API  |
+------------------------------------------------------+
                   |
                   v
+------------------------------------------------------+
|               In-Memory Data Layer                   |
|  Schema  -- Map<id, Schema>                          |
|  Session -- Map<id, Session>                         |
+------------------------------------------------------+
```

### Step-by-Step Flow: Schema Generation

```
1.  POST /api/schema/generate  { prompt: "..." }
          |
          v
2.  schema.controller.generateSchema()
    - validates prompt is present
          |
          v
3.  nlp.service.extractEntities(prompt)
    - calls OpenAI Chat Completions
    - returns { entities[], relationships[], attributes{} }
          |
          v
4.  schemaGenerator.service.generateSchema(extractedEntities, options)
    - builds Table and Column objects
    - assigns data types, primary/foreign keys, constraints
          |
          v
5.  new Schema(schemaData).save()
    - persists to in-memory Map
          |
          v
6.  Response 201  { message, schema }
```

### Step-by-Step Flow: SQL Export

```
1.  POST /api/export/sql  { schemaId, dialect: "postgresql" }
          |
          v
2.  export.controller.generateSQL()
    - validates schemaId and dialect
          |
          v
3.  Schema.findById(schemaId)
          |
          v
4.  sqlGenerator.service.generateSQL(schema, dialect)
    - routes to dialects/postgresql.generator.js
    - iterates tables -> columns -> constraints
    - applies sql-formatter
          |
          v
5.  Response 200  { message, sql, dialect }
```

### Step-by-Step Flow: Gemini ER Diagram

```
1.  POST /api/gemini/generate  { input: "..." }
          |
          v
2.  gemini.controller.generateERDiagram()
    - validates input length >= 10 chars
    - checks geminiService.isInitialized()
          |
          v
3.  geminiService.generateERDiagram(input)
    - calls Google Gemini API
    - extracts Mermaid erDiagram block from response
          |
          v
4.  Response 200  { success: true, mermaidCode }
```

---

## 6. Data Models

All data is stored in JavaScript `Map` objects in process memory. There is no external database requirement.

### Schema

```javascript
{
  _id:           string,      // Auto-incrementing integer cast to string ("1", "2", ...)
  name:          string,      // Display name (default: "New Schema")
  description:   string,      // Optional description

  tables: [
    {
      name:              string,
      description:       string,
      isWeakEntity:      boolean,
      isLookupTable:     boolean,
      assumptionsMade:   string[],
      position: {
        x:           number,
        y:           number,
        isDraggable: boolean
      },
      columns: [
        {
          name:          string,
          dataType:      string,   // e.g. "VARCHAR(255)", "INT", "TIMESTAMP"
          isPrimaryKey:  boolean,
          isForeignKey:  boolean,
          isNullable:    boolean,
          isUnique:      boolean,
          defaultValue:  string | undefined,
          description:   string
        }
      ]
    }
  ],

  relationships: [
    {
      name:         string,
      sourceEntity: string,   // Table name
      targetEntity: string,   // Table name
      type:         "1:1" | "1:N" | "N:M",
      cardinality: {
        source: string,
        target: string
      }
    }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

### Session

```javascript
{
  _id:            string,      // Auto-incrementing integer cast to string
  name:           string,      // Display name (default: "New Session")
  description:    string,
  prompt:         string,      // The original natural language prompt
  schemas:        string[],    // Array of Schema _id references
  activeSchemaId: string | null,
  createdAt:      Date,
  updatedAt:      Date
}
```

> **Note:** Data is ephemeral — it resets on every server restart. Persistent storage (MongoDB, Redis, or another database) can be added by replacing the in-memory model implementations.

---

## 7. Environment Variables

Create a `.env` file in the project root (same directory as `package.json`):

```dotenv
# --- Server ---------------------------------------------------
PORT=4000                          # Port the HTTP server listens on (default: 4000)
NODE_ENV=development               # "development" | "production"
FRONTEND_URL=http://localhost:3000 # Allowed CORS origin (your frontend URL)
LOG_LEVEL=info                     # Winston log level: error | warn | info | http | debug

# --- OpenAI ---------------------------------------------------
OPENAI_API_KEY=sk-...              # Required for NLP entity extraction and prompt optimization

# --- Google Gemini --------------------------------------------
GEMINI_API_KEY=AIza...             # Required for /api/gemini/* endpoints
GEMINI_MODEL_NAME=gemini-2.5-flash # Gemini model identifier (default: gemini-2.5-flash)
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | HTTP server port |
| `NODE_ENV` | No | — | Enables debug logging when set to `development` |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS allowed origin |
| `LOG_LEVEL` | No | `info` | Minimum log level |
| `OPENAI_API_KEY` | **Yes** | — | OpenAI secret key |
| `GEMINI_API_KEY` | Conditional | — | Google Gemini API key (required only for `/api/gemini/*`) |
| `GEMINI_MODEL_NAME` | No | `gemini-2.5-flash` | Gemini model name |

---

## 8. Setup & Installation

### Prerequisites

- **Node.js** v18.x or higher ([download](https://nodejs.org/))
- **npm** v9.x or higher (bundled with Node.js)
- An **OpenAI API key** — get one at [platform.openai.com](https://platform.openai.com/)
- A **Google Gemini API key** (optional, only for Gemini endpoints) — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Step 1 — Clone the repository

```bash
git clone https://github.com/Aayush-Sood101/LaymanDB-backend.git
cd LaymanDB-backend
```

### Step 2 — Install dependencies

```bash
npm install
```

This installs all production and development dependencies listed in `package.json`.

### Step 3 — Create the environment file

Copy the template below, fill in your API keys, and save it as `.env` in the project root:

```dotenv
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info

OPENAI_API_KEY=sk-YOUR_OPENAI_KEY_HERE
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
GEMINI_MODEL_NAME=gemini-2.5-flash
```

> **Security note:** The `.env` file is listed in `.gitignore`. Never commit API keys to source control.

### Step 4 — Verify the setup

```bash
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT || 4000)"
```

Expected output: `PORT: 4000`

---

## 9. Running the Server

### Development (with auto-reload)

```bash
npm run dev
```

Uses **nodemon** to watch for file changes and restart automatically. The server starts on `http://localhost:4000`.

### Production

```bash
npm start
```

Starts the server with `node src/server.js`. No file watching.

### Verify the server is running

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{ "status": "ok", "uptime": 3.14 }
```

### npm scripts summary

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node src/server.js` | Start in production mode |
| `npm run dev` | `nodemon src/server.js` | Start in development mode with auto-reload |
| `npm test` | `jest` | Run the test suite |

---

## 10. API Endpoints Reference

**Base URL:** `http://localhost:4000`

All REST endpoints are mounted under `/api`. Every request and response body uses `application/json`.

---

### Health Check

#### `GET /health`

Returns server status and uptime. Useful for load-balancer health probes.

**Response `200`**
```json
{
  "status": "ok",
  "uptime": 42.7
}
```

---

### Schema Management — `/api/schema`

#### `POST /api/schema/generate`

Generates a complete database schema from a natural language description.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | Natural language description of the database |
| `name` | `string` | No | Schema display name (default: `"New Schema"`) |
| `description` | `string` | No | Free-text description stored with the schema |

```json
{
  "prompt": "I need an e-commerce system with customers, products, orders, and payments. Customers can place multiple orders, each order can contain multiple products.",
  "name": "E-Commerce DB",
  "description": "Basic e-commerce schema"
}
```

**Response `201 Created`**
```json
{
  "message": "Schema generated successfully",
  "schema": {
    "_id": "1",
    "name": "E-Commerce DB",
    "description": "Basic e-commerce schema",
    "tables": [
      {
        "name": "customers",
        "columns": [
          {
            "name": "customer_id",
            "dataType": "INT",
            "isPrimaryKey": true,
            "isForeignKey": false,
            "isNullable": false,
            "isUnique": true,
            "description": "Unique customer identifier"
          },
          {
            "name": "email",
            "dataType": "VARCHAR(255)",
            "isPrimaryKey": false,
            "isForeignKey": false,
            "isNullable": false,
            "isUnique": true,
            "description": "Customer email address"
          }
        ],
        "description": "Stores customer account information",
        "isWeakEntity": false,
        "isLookupTable": false,
        "assumptionsMade": [],
        "position": { "x": 0, "y": 0, "isDraggable": true }
      }
    ],
    "relationships": [
      {
        "name": "customer_orders",
        "sourceEntity": "customers",
        "targetEntity": "orders",
        "type": "1:N",
        "cardinality": { "source": "1", "target": "N" }
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error responses**

| Status | Error Code | Meaning |
|--------|------------|---------|
| `400` | — | `prompt` is missing |
| `500` | `NLP_ERROR` | OpenAI returned an error |
| `500` | `JSON_PARSE_ERROR` | OpenAI response contained invalid JSON |
| `500` | `TIMEOUT_ERROR` | Request exceeded the 90-second timeout |
| `500` | `SCHEMA_GEN_ERROR` | Error building the schema structure |
| `500` | `SAVE_ERROR` | Error persisting schema to memory |

---

#### `POST /api/schema/optimize-prompt`

Uses OpenAI to rewrite a user's prompt so it is clearer and more effective for schema generation (removes ambiguities, adds specificity).

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | The original prompt to optimize |

```json
{ "prompt": "make a database for a shop" }
```

**Response `200 OK`**
```json
{
  "message": "Prompt optimized successfully",
  "optimizedPrompt": "Design a retail shop database with customers (name, email, phone), products (SKU, name, price, stock_quantity, category), orders (order date, status, total amount), and order_items (quantity, unit price). Customers can place multiple orders, and each order can contain multiple products."
}
```

---

#### `POST /api/schema/enhance-prompt`

Uses OpenAI to expand a prompt with additional detail and context while preserving the user's original intent.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | The prompt to enhance |

```json
{ "prompt": "blog with posts and comments" }
```

**Response `200 OK`**
```json
{
  "message": "Prompt enhanced successfully",
  "enhancedPrompt": "A blogging platform database where registered users can create and publish blog posts. Each post belongs to one or more categories and can have multiple comments. Users have profiles with usernames, emails, and bios. Posts include a title, body, publication date, status (draft/published), and featured image URL. Comments are tied to both a post and a user and support threaded replies."
}
```

---

#### `GET /api/schema/templates`

Returns a list of predefined schema templates that users can use as starting points.

**Response `200 OK`**
```json
{
  "templates": [
    {
      "id": "ecommerce",
      "name": "E-Commerce",
      "description": "Standard e-commerce database schema with products, customers, orders, and payments"
    },
    {
      "id": "blog",
      "name": "Blog/CMS",
      "description": "Content management system with posts, users, comments, and categories"
    },
    {
      "id": "inventory",
      "name": "Inventory Management",
      "description": "Inventory tracking system with products, warehouses, and stock movements"
    },
    {
      "id": "crm",
      "name": "Customer Relationship Management",
      "description": "CRM system with contacts, companies, deals, and activities"
    }
  ]
}
```

---

#### `GET /api/schema/:id`

Retrieves a previously generated schema by its ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | The schema `_id` returned from `/generate` |

**Response `200 OK`**
```json
{
  "schema": { }
}
```

**Response `404 Not Found`**
```json
{ "error": "Schema not found" }
```

---

#### `PUT /api/schema/:id`

Updates an existing schema. Any fields included in the request body will overwrite the stored values.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | The schema `_id` to update |

**Request Body** (all fields optional)

```json
{
  "name": "Updated Schema Name",
  "description": "New description",
  "tables": [],
  "relationships": []
}
```

**Response `200 OK`**
```json
{
  "message": "Schema updated successfully",
  "schema": { }
}
```

---

### Session Management — `/api/session`

Sessions represent a user's working context. A session tracks the prompt used and references one or more schemas.

#### `POST /api/session/create`

Creates a new design session.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | No | Session display name (default: `"New Session"`) |
| `description` | `string` | No | Optional free-text description |
| `prompt` | `string` | No | The natural language prompt associated with this session |
| `schemaId` | `string` | No | An existing schema to associate immediately |

```json
{
  "name": "My E-Commerce Project",
  "description": "Working on the orders flow",
  "prompt": "e-commerce system with customers, products, orders"
}
```

**Response `201 Created`**
```json
{
  "message": "Session created successfully",
  "session": {
    "_id": "1",
    "name": "My E-Commerce Project",
    "description": "Working on the orders flow",
    "prompt": "e-commerce system with customers, products, orders",
    "schemas": [],
    "activeSchemaId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### `GET /api/session/:id`

Retrieves a session by ID, with schemas populated.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | The session `_id` |

**Response `200 OK`**
```json
{
  "session": {
    "_id": "1",
    "name": "My E-Commerce Project",
    "schemas": [],
    "activeSchemaId": null
  }
}
```

**Response `404 Not Found`**
```json
{ "error": "Session not found" }
```

---

#### `POST /api/session/:id/save`

Saves a schema to an existing session and sets it as the active schema.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | The session `_id` |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | `string` | Yes | The schema `_id` to attach to this session |

```json
{ "schemaId": "3" }
```

**Response `200 OK`**
```json
{
  "message": "Session saved successfully",
  "session": { }
}
```

---

### Query Generation — `/api/query`

Convert natural language questions about a schema into executable SQL queries.

#### `POST /api/query/generate`

Generates a SQL query for a given natural language question and schema.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | `string` | Yes | Natural language question |
| `schema` | `object` | Yes | A Schema object (must include a `tables` array) |
| `dialect` | `string` | No | `mysql` (default) / `postgresql` / `sqlite` / `sqlserver` |

```json
{
  "question": "Find all customers who placed more than 3 orders in the last 30 days",
  "schema": {
    "name": "E-Commerce DB",
    "tables": [
      { "name": "customers", "columns": [] },
      { "name": "orders", "columns": [] }
    ]
  },
  "dialect": "postgresql"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "query": "SELECT c.customer_id, c.email, COUNT(o.order_id) AS order_count\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nWHERE o.order_date >= NOW() - INTERVAL '30 days'\nGROUP BY c.customer_id, c.email\nHAVING COUNT(o.order_id) > 3;",
  "explanation": "This query joins customers with orders, filters for the last 30 days, groups by customer, and returns only those with more than 3 orders."
}
```

**Response `400 Bad Request`** (invalid dialect)
```json
{
  "success": false,
  "error": "Invalid dialect. Must be one of: mysql, postgresql, sqlite, sqlserver"
}
```

---

#### `POST /api/query/examples`

Generates a list of example natural language questions suited to the provided schema. Useful for onboarding users.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema` | `object` | Yes | A Schema object (must include a `tables` array) |

```json
{
  "schema": {
    "name": "Blog DB",
    "tables": [
      { "name": "posts", "columns": [] },
      { "name": "comments", "columns": [] }
    ]
  }
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "examples": [
    "Show all published posts ordered by date",
    "Find posts with more than 10 comments",
    "List users who commented in the last week",
    "Count total comments per post"
  ]
}
```

---

### Export & Code Generation — `/api/export`

#### `POST /api/export/sql`

Generates a complete SQL DDL script (CREATE TABLE statements, primary keys, foreign keys, indexes) for the given schema and dialect.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | `string` | Yes | The `_id` of a stored schema |
| `dialect` | `string` | No | `mysql` (default) / `postgresql` / `sqlite` / `sqlserver` |

```json
{ "schemaId": "1", "dialect": "mysql" }
```

**Response `200 OK`**
```json
{
  "message": "SQL generated successfully",
  "dialect": "mysql",
  "sql": "-- E-Commerce DB\n-- Generated by LaymanDB\n\nCREATE TABLE `customers` (\n  `customer_id` INT NOT NULL AUTO_INCREMENT,\n  `email` VARCHAR(255) NOT NULL UNIQUE,\n  PRIMARY KEY (`customer_id`)\n) ENGINE=InnoDB;\n"
}
```

---

#### `POST /api/export/erd`

Exports ERD diagram data. Returns diagram metadata and data that can be rendered by the frontend.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | `string` | Yes | The `_id` of a stored schema |
| `format` | `string` | No | `svg` (default) / `png` |
| `diagramData` | `any` | No | Optional pre-built diagram data to pass through |

```json
{ "schemaId": "1", "format": "svg" }
```

**Response `200 OK`**
```json
{
  "message": "ERD exported successfully",
  "format": "svg",
  "diagramData": {}
}
```

---

#### `POST /api/export/documentation`

Generates human-readable documentation for a schema, describing every table, column, and relationship.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | `string` | Yes | The `_id` of a stored schema |
| `format` | `string` | No | `markdown` (default) / `html` / `pdf` |

```json
{ "schemaId": "1", "format": "markdown" }
```

**Response `200 OK`**
```json
{
  "message": "Documentation generated successfully",
  "format": "markdown",
  "documentation": "# E-Commerce DB\n\n## Overview\n\nThis schema models a standard e-commerce system...\n\n## Tables\n\n### customers\n\n| Column | Type | Constraints | Description |\n|--------|------|-------------|-------------|"
}
```

---

#### `POST /api/export/mermaid`

Converts a stored schema into Mermaid `erDiagram` syntax, ready to embed in Markdown or render in the frontend.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | `string` | Yes | The `_id` of a stored schema |

```json
{ "schemaId": "1" }
```

**Response `200 OK`**
```json
{
  "message": "Mermaid ERD generated successfully",
  "mermaidSyntax": "erDiagram\n  customers {\n    INT customer_id PK\n    VARCHAR email UK\n  }\n  orders {\n    INT order_id PK\n    INT customer_id FK\n    TIMESTAMP order_date\n  }\n  customers ||--o{ orders : \"places\"",
  "schema": {},
  "tables": []
}
```

---

### Gemini AI — ER Diagram — `/api/gemini`

#### `POST /api/gemini/generate`

Sends a natural language description directly to Google Gemini and returns a Mermaid `erDiagram` code block. This bypasses the schema storage pipeline and is ideal for quick diagram generation.

**Requires:** `GEMINI_API_KEY` environment variable.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | `string` | Yes | Description of at least **10 characters** |

```json
{
  "input": "A university system with students, courses, professors, and enrollments. Students enroll in multiple courses taught by professors."
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "mermaidCode": "erDiagram\n  STUDENTS {\n    int student_id PK\n    string name\n    string email\n  }\n  COURSES {\n    int course_id PK\n    string title\n    int professor_id FK\n  }\n  PROFESSORS {\n    int professor_id PK\n    string name\n  }\n  ENROLLMENTS {\n    int enrollment_id PK\n    int student_id FK\n    int course_id FK\n    date enrolled_at\n  }\n  STUDENTS }o--o{ ENROLLMENTS : \"has\"\n  COURSES }o--o{ ENROLLMENTS : \"contains\"\n  PROFESSORS ||--o{ COURSES : \"teaches\""
}
```

**Error Responses**

| Status | Meaning |
|--------|---------|
| `400` | Input is missing or shorter than 10 characters |
| `503` | Gemini service not initialised (check `GEMINI_API_KEY`) |
| `500` | Gemini API returned an error |

---

### Gemini AI — Prompt Enhancement — `/api/gemini/prompt`

#### `POST /api/gemini/prompt/enhance`

Uses Google Gemini to expand and refine a short prompt into a detailed, schema-ready description.

**Requires:** `GEMINI_API_KEY` environment variable.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | Description of at least **5 characters** |

```json
{ "prompt": "task manager app" }
```

**Response `200 OK`**
```json
{
  "success": true,
  "enhancedPrompt": "A task management application where users can create projects and assign tasks to team members. Each project has a name, description, start date, deadline, and status (active/archived). Tasks belong to a project and can be assigned to multiple users. Tasks have a title, description, priority (low/medium/high), status (todo/in-progress/done), and due date. Users have profiles with names, emails, and roles (admin/member)."
}
```

---

### Mermaid Query Generation — `/api/mermaid-query`

#### `POST /api/mermaid-query/generate`

Takes a natural language question about a schema and generates a Mermaid diagram illustrating the relevant subset of the schema.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | `string` | Yes | Natural language question |
| `schema` | `object` | Yes | A Schema object (must include a `tables` array) |

```json
{
  "question": "Show me how orders relate to customers and products",
  "schema": {
    "name": "E-Commerce DB",
    "tables": []
  }
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "mermaidDiagram": "erDiagram\n  customers ||--o{ orders : places\n  orders }o--o{ order_items : contains\n  products ||--o{ order_items : included_in"
}
```

---

#### `POST /api/mermaid-query/examples`

Returns a list of example natural language questions for the given schema, suited to diagram generation.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema` | `object` | Yes | A Schema object (must include a `tables` array) |

**Response `200 OK`**
```json
{
  "success": true,
  "examples": [
    "Show the relationship between users and their orders",
    "Illustrate how products are categorized",
    "Diagram the payment flow"
  ]
}
```

---

## 11. Real-Time Communication (Socket.IO)

The server uses **Socket.IO** (mounted on the same port as the HTTP server) to enable real-time collaborative schema editing. When multiple browser tabs or users are working on the same session, changes made in one tab are reflected in others without a page refresh.

### Server configuration

```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 90000,    // 90 seconds — tolerates long AI API calls
  connectTimeout: 90000
});
```

### Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connection` | Server receives | — | A new client connected |
| `schema-update` | Client sends | `{ schemaId, changes }` | Client signals a schema was modified |
| `schema-updated` | Server broadcasts | `{ schemaId, changes }` | Relays the update to all other connected clients |
| `disconnect` | Server receives | — | A client disconnected |

### Client-side example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// Send an update when the user modifies the schema
socket.emit('schema-update', { schemaId: '1', changes: updatedSchema });

// Listen for updates from other tabs / users
socket.on('schema-updated', ({ schemaId, changes }) => {
  if (schemaId === currentSchemaId) {
    applyChanges(changes);
  }
});
```

---

## 12. Logging System

Logging is provided by **Winston** (`src/utils/logger.js`). Three separate log destinations are maintained:

| File | Level filter | Contents |
|------|-------------|----------|
| `logs/combined.log` | all | Every log message from the application |
| `logs/error.log` | `error` only | Errors and unhandled exceptions |
| `logs/openai-responses.log` | `info` | Full OpenAI request/response pairs with token usage |

The `logs/` directory is created automatically on first run.

### Log format — console (development)

```
2024-01-15T10:30:00.000Z [info]: Generating schema from prompt
{
  "prompt": "e-commerce system..."
}
```

### Log format — `openai-responses.log`

```
2024-01-15T10:30:01.234Z [info]: OpenAI response received
Model: gpt-4
Prompt: e-commerce system with customers...

========== RESPONSE START ==========
{
  "entities": [ ... ]
}
========== RESPONSE END ==========

Token Usage: {
  "prompt_tokens": 320,
  "completion_tokens": 580,
  "total_tokens": 900
}
```

### Controlling log verbosity

Set `LOG_LEVEL` in `.env` to any Winston level: `error`, `warn`, `info`, `http`, `verbose`, `debug`, or `silly`.

When `NODE_ENV` is not `production`, the logger automatically uses `debug` level for verbose development output.

---

## 13. SQL Dialect Support

The `src/services/dialects/` directory contains a dedicated generator for each supported database:

| File | Dialect | Key differences |
|------|---------|-----------------|
| `mysql.generator.js` | MySQL | Backtick identifiers `` ` ``, `ENGINE=InnoDB`, `AUTO_INCREMENT` |
| `postgresql.generator.js` | PostgreSQL | Double-quote identifiers `"..."`, `SERIAL`/`BIGSERIAL` for auto-increment |
| `sqlite.generator.js` | SQLite | `AUTOINCREMENT`, no separate `ALTER TABLE` FK syntax |
| `sqlserver.generator.js` | SQL Server | Bracket identifiers `[...]`, `IDENTITY(1,1)`, `NVARCHAR` |

Each generator receives the same internal schema object and produces DDL tailored to its dialect:

- `CREATE TABLE` statements with appropriate data type mappings
- `PRIMARY KEY`, `UNIQUE`, and `NOT NULL` constraints
- `FOREIGN KEY` / `REFERENCES` clauses
- Indexes on foreign key columns
- Output formatted by **sql-formatter** for readability

---

## 14. Testing

The project uses **Jest** as the test framework and **Supertest** for HTTP integration tests.

### Running tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run a specific test file
npm test -- --testPathPattern=schema.controller

# Run tests in watch mode (re-run on file change)
npm test -- --watch
```

### Test file conventions

Test files should be placed next to the files they test or in a `__tests__` directory, and named `*.test.js` or `*.spec.js`.

---

## 15. Troubleshooting

### Server won't start

| Symptom | Likely Cause | Solution |
|---------|-------------|---------|
| `Error: listen EADDRINUSE :::4000` | Port 4000 is already in use | Change `PORT` in `.env`, or stop the other process using that port |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm install` |
| `.env` config not loading | `.env` file is missing or in the wrong directory | Ensure `.env` is in the project root (same level as `package.json`) |

### AI API errors

| Symptom | Likely Cause | Solution |
|---------|-------------|---------|
| `401 Unauthorized` from OpenAI | Invalid or missing `OPENAI_API_KEY` | Check the key value in `.env` and verify it at [platform.openai.com](https://platform.openai.com/) |
| `503 Service Unavailable` on `/api/gemini/*` | `GEMINI_API_KEY` not set or invalid | Add `GEMINI_API_KEY` to `.env` and restart the server |
| `JSON_PARSE_ERROR` on `/api/schema/generate` | OpenAI returned a malformed response | Try simplifying the prompt |
| `TIMEOUT_ERROR` | OpenAI/Gemini call took longer than 90 seconds | Simplify the prompt, or increase `req.setTimeout` in the controller |

### Schema not found after server restart

Data is stored **in memory only** and does not persist across restarts. To retain schemas, implement a persistent store (e.g., MongoDB or PostgreSQL) and replace the `Schema`/`Session` model implementations.

### Socket.IO connection issues

| Symptom | Solution |
|---------|---------|
| Frontend cannot connect to Socket.IO | Ensure `FRONTEND_URL` in `.env` matches the exact origin of the frontend (protocol + host + port) |
| Frequent disconnects during AI operations | Increase `pingTimeout` and `connectTimeout` in `server.js` if AI calls regularly take longer than 90 seconds |

---

## License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.
