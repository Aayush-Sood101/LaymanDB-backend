# LaymanDB Backend — Complete Technical Explanation

> This document explains **every file, technology, design decision, and data flow** in the LaymanDB backend. Written to help you confidently discuss this project in an interview.

---

## Table of Contents

1. [What Is LaymanDB?](#1-what-is-laymandb)
2. [Technology Stack — Every Library Explained](#2-technology-stack--every-library-explained)
3. [Project Directory Structure](#3-project-directory-structure)
4. [Entry Point: `server.js`](#4-entry-point-serverjs)
5. [Routing System](#5-routing-system)
6. [Controllers — The Request Handlers](#6-controllers--the-request-handlers)
7. [Services — The Brain of the App](#7-services--the-brain-of-the-app)
8. [Models — In-Memory Data Storage](#8-models--in-memory-data-storage)
9. [Utility Layer: Logger](#9-utility-layer-logger)
10. [AI Integration — How OpenAI & Gemini Work Together](#10-ai-integration--how-openai--gemini-work-together)
11. [Complete API Reference](#11-complete-api-reference)
12. [End-to-End Data Flow Walkthrough](#12-end-to-end-data-flow-walkthrough)
13. [Key Design Decisions & Tradeoffs](#13-key-design-decisions--tradeoffs)
14. [Common Interview Questions & Answers](#14-common-interview-questions--answers)

---

## 1. What Is LaymanDB?

LaymanDB is an **AI-powered database design platform**. You type a plain English description like *"I need a database for a hospital with doctors, patients, and appointments"* and the backend:

1. Sends that text to **OpenAI GPT** which extracts structured entities, attributes, and relationships from it.
2. Transforms those extracted entities into a proper **database schema** (tables, columns, primary/foreign keys).
3. Lets the frontend display it as an interactive ER Diagram.
4. Can then generate **ready-to-run SQL scripts** for MySQL, PostgreSQL, SQLite, or SQL Server.
5. Can generate **Mermaid ER diagram syntax** (text-based diagrams you can embed in docs).
6. Can generate **markdown documentation** explaining the entire schema.
7. Can also accept natural language questions *about* the schema and convert them to SQL queries.

**The core value**: a person with no SQL knowledge can describe a database in English and get production-ready SQL out.

---

## 2. Technology Stack — Every Library Explained

### Runtime & Framework

| Library | Version | What It Does |
|---|---|---|
| **Node.js** | 18+ | JavaScript runtime. Runs the backend server. |
| **Express** | 5.x | Web framework. Handles HTTP requests, routing, middleware. |
| **http** (built-in) | — | Node's built-in HTTP module, used to create the server so Socket.IO can attach to it. |

### AI / Machine Learning

| Library | Version | What It Does |
|---|---|---|
| **openai** | 4.35.0 | Official OpenAI SDK. Used to call GPT models (gpt-4o, gpt-3.5-turbo) for entity extraction and prompt optimization. |
| **@google/generative-ai** | 0.24.1 | Official Google Generative AI SDK. Used to call Gemini models (gemini-2.5-flash) for ER diagram generation and prompt enhancement. |
| **natural** | 6.10.0 | NLP (Natural Language Processing) library. Installed but primarily the heavy NLP lifting is done by OpenAI API calls. |

### Real-Time Communication

| Library | Version | What It Does |
|---|---|---|
| **socket.io** | 4.7.4 | Enables WebSocket-based bidirectional communication. Used so that when one user updates a schema, all connected clients see the update in real time without refreshing. |

### HTTP & Security

| Library | Version | What It Does |
|---|---|---|
| **cors** | 2.8.5 | Cross-Origin Resource Sharing middleware. Allows the frontend (running on a different port/domain) to make requests to this backend. Without it, the browser would block all requests. |
| **dotenv** | 16.3.1 | Loads environment variables from the `.env` file into `process.env`. Used to keep API keys and config out of source code. |
| **axios** | 1.11.0 | HTTP client. Used for making outgoing HTTP requests (e.g., to external APIs). |

### SQL & Formatting

| Library | Version | What It Does |
|---|---|---|
| **sql-formatter** | 15.6.6 | Takes raw generated SQL strings and prettifies them — adds proper indentation, uppercase keywords, line breaks. Makes generated SQL human-readable. |

### Database (Caching)

| Library | Version | What It Does |
|---|---|---|
| **redis** | 4.6.12 | Redis client library. Redis is an in-memory key-value store. Currently installed as a dependency but the actual data storage in this project is done via in-memory JavaScript Maps (see Models section). |

### Logging

| Library | Version | What It Does |
|---|---|---|
| **winston** | 3.11.0 | Structured logging library. Writes logs to both the console and log files. Provides log levels (info, warn, error), timestamps, and color-coded console output. |

### Other

| Library | Version | What It Does |
|---|---|---|
| **react-markdown** | 10.1.0 | Listed as dependency (unusual for backend — likely a shared dependency used by a documentation rendering feature). |

### Dev Dependencies

| Library | What It Does |
|---|---|
| **nodemon** | Watches for file changes and automatically restarts the server during development. You use `npm run dev` which runs `nodemon src/server.js`. |
| **jest** | JavaScript testing framework. Used for unit and integration tests. |
| **supertest** | HTTP testing library that works with jest. Lets you test Express routes without starting a real server. |

---

## 3. Project Directory Structure

```
backend/
├── .env                          # Secret API keys and config (NOT committed to git)
├── package.json                  # Dependencies and npm scripts
├── src/
│   ├── server.js                 # App entry point — sets up Express, Socket.IO, starts server
│   ├── routes/
│   │   ├── index.js              # Master router — mounts all sub-routers under /api
│   │   ├── schema.routes.js      # Routes for schema generation and management
│   │   ├── session.routes.js     # Routes for session management
│   │   ├── export.routes.js      # Routes for exporting (SQL, ERD, docs)
│   │   ├── gemini.routes.js      # Routes for Gemini ER diagram generation
│   │   ├── gemini.prompt.routes.js  # Routes for Gemini prompt enhancement
│   │   ├── query.routes.js       # Routes for NL-to-SQL query generation
│   │   └── mermaidQuery.routes.js   # Routes for NL-to-Mermaid diagram generation
│   ├── controllers/
│   │   ├── schema.controller.js  # Handles schema CRUD + prompt optimize/enhance
│   │   ├── session.controller.js # Handles session create/read/save
│   │   ├── export.controller.js  # Handles SQL/ERD/docs/mermaid export
│   │   ├── gemini.controller.js  # Handles Gemini ER diagram requests
│   │   ├── gemini.prompt.controller.js  # Handles Gemini prompt enhancement
│   │   ├── query.controller.js   # Handles NL → SQL query generation
│   │   └── mermaidQuery.controller.js  # Handles NL → Mermaid diagram generation
│   ├── services/
│   │   ├── nlp.service.js        # Core: uses OpenAI to extract entities from plain text
│   │   ├── schemaGenerator.service.js  # Converts extracted entities → schema object
│   │   ├── sqlGenerator.service.js     # Converts schema → SQL strings
│   │   ├── mermaidGenerator.service.js # Converts schema → Mermaid syntax
│   │   ├── mermaidQueryGenerator.service.js  # NL → Mermaid using Gemini
│   │   ├── queryGenerator.service.js   # NL → SQL query using Gemini
│   │   ├── documentation.service.js    # Generates markdown docs from schema
│   │   ├── promptEnhancer.service.js   # Enhances prompts using OpenAI
│   │   ├── geminiService.js            # Gemini ER diagram generation service
│   │   └── geminiPromptEnhancer.service.js  # Gemini-based prompt enhancement
│   │   └── dialects/
│   │       ├── mysql.generator.js      # MySQL-specific SQL syntax
│   │       ├── postgresql.generator.js # PostgreSQL-specific SQL syntax
│   │       ├── sqlite.generator.js     # SQLite-specific SQL syntax
│   │       └── sqlserver.generator.js  # SQL Server-specific SQL syntax
│   ├── models/
│   │   ├── schema.model.js       # In-memory Schema storage class
│   │   └── session.model.js      # In-memory Session storage class
│   └── utils/
│       └── logger.js             # Winston logger configuration
└── logs/                         # Log files written here at runtime
    ├── combined.log
    ├── error.log
    ├── openai-responses.log
    └── json-errors.log
```

---

## 4. Entry Point: `server.js`

This is the **first file that runs** when you do `npm start` or `npm run dev`.

### What it does step by step:

```js
const express = require('express');       // Web framework
const cors = require('cors');             // Allow cross-origin requests
const http = require('http');             // Node's built-in HTTP module
const socketIo = require('socket.io');    // Real-time WebSocket library
const dotenv = require('dotenv');         // Load .env file
```

**Step 1 — Load environment variables:**
```js
dotenv.config();
```
This reads `.env` and puts all key=value pairs into `process.env`. So `process.env.OPENAI_API_KEY`, `process.env.PORT`, etc. become accessible throughout the app.

**Step 2 — Create the Express app and HTTP server:**
```js
const app = express();
const server = http.createServer(app);
```
Express is normally enough for HTTP, but you need a raw `http.Server` so that Socket.IO can be attached to the same port.

**Step 3 — Set request timeouts:**
```js
server.timeout = 180000; // 3 minutes
```
AI API calls can be slow. Without this, the server would close connections that take too long.

**Step 4 — Initialize Socket.IO:**
```js
const io = socketIo(server, {
  cors: { origin: process.env.FRONTEND_URL, ... },
  pingTimeout: 90000,
  connectTimeout: 90000
});
```
Socket.IO is attached to the same HTTP server. When the frontend connects, it gets a persistent WebSocket connection. The `cors` config tells Socket.IO which origins are allowed to connect.

**Step 5 — Apply middleware:**
```js
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```
- `cors()` adds the `Access-Control-Allow-Origin` header to every response, allowing the frontend to receive responses.
- `express.json()` parses incoming `application/json` request bodies. Without this, `req.body` would be undefined.
- `express.urlencoded()` parses form-encoded bodies.
- The `10mb` limit prevents oversized payloads from crashing the server.

**Step 6 — Mount API routes:**
```js
app.use('/api', apiRoutes);
```
All routes are prefixed with `/api`. So a route defined as `/schema/generate` becomes `/api/schema/generate`.

**Step 7 — Health check endpoint:**
```js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
```
Useful for monitoring tools (like Render, Railway, or AWS) to check if the server is alive.

**Step 8 — Socket.IO event handlers:**
```js
io.on('connection', (socket) => {
  socket.on('schema-update', (data) => {
    socket.broadcast.emit('schema-updated', data);
  });
  socket.on('disconnect', () => { ... });
});
```
When a client connects via WebSocket:
- If they emit `schema-update` (meaning they changed a schema), the server rebroadcasts it to **all other** connected clients as `schema-updated`. This enables real-time collaborative editing.
- `socket.broadcast.emit` sends to everyone *except* the sender.

**Step 9 — Start the server:**
```js
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => { logger.info(`Server running on port ${PORT}`); });
```

---

## 5. Routing System

### Architecture Pattern: Modular Routers

Express supports **modular routing** — you create separate Router objects for different feature areas and mount them on the main app.

**`routes/index.js`** is the master router:
```js
router.use('/schema', schemaRoutes);
router.use('/session', sessionRoutes);
router.use('/export', exportRoutes);
router.use('/gemini', geminiRoutes);
router.use('/gemini/prompt', geminiPromptRoutes);
router.use('/query', queryRoutes);
router.use('/mermaid-query', mermaidQueryRoutes);
```

This means the full URL for generating a schema is:
`POST /api/schema/generate`
- `/api` — from `app.use('/api', apiRoutes)` in server.js
- `/schema` — from `router.use('/schema', schemaRoutes)` in index.js
- `/generate` — from `router.post('/generate', ...)` in schema.routes.js

### All Available Routes

| Method | URL | What it does |
|---|---|---|
| `POST` | `/api/schema/generate` | NL text → database schema |
| `POST` | `/api/schema/optimize-prompt` | Improve a vague prompt (via OpenAI) |
| `POST` | `/api/schema/enhance-prompt` | Add detail to a prompt (via OpenAI) |
| `GET` | `/api/schema/templates` | Get predefined schema templates |
| `GET` | `/api/schema/:id` | Get a specific schema by its ID |
| `PUT` | `/api/schema/:id` | Update an existing schema |
| `POST` | `/api/session` | Create a new design session |
| `GET` | `/api/session/:id` | Get a session and its schemas |
| `PUT` | `/api/session/:id/save` | Save schema to session |
| `POST` | `/api/export/sql` | Schema → SQL script |
| `POST` | `/api/export/erd` | Export ER diagram image |
| `POST` | `/api/export/documentation` | Schema → markdown docs |
| `POST` | `/api/export/mermaid` | Schema → Mermaid diagram syntax |
| `POST` | `/api/gemini/generate` | NL text → Mermaid ER diagram (via Gemini) |
| `POST` | `/api/gemini/prompt/enhance` | Enhance prompt (via Gemini) |
| `POST` | `/api/query/generate` | NL question + schema → SQL query |
| `POST` | `/api/query/examples` | Get example questions for a schema |
| `POST` | `/api/mermaid-query/generate` | NL question + schema → Mermaid diagram |
| `POST` | `/api/mermaid-query/examples` | Get example questions for Mermaid |
| `GET` | `/health` | Server health check |

---

## 6. Controllers — The Request Handlers

Controllers sit between routes and services. Their job is to:
1. **Validate** the incoming request data
2. **Call** the appropriate service
3. **Handle errors** gracefully
4. **Return** a proper HTTP response

### `schema.controller.js`

**`generateSchema`** — The main feature endpoint:
1. Extracts `prompt`, `name`, `description` from `req.body`
2. Calls `nlpService.extractEntities(prompt)` — sends the text to OpenAI and gets back structured entities
3. Calls `schemaGeneratorService.generateSchema(extractedEntities, { name, description })` — converts entities to table/column schema
4. Creates a `new Schema(schema)` and saves it to in-memory storage
5. Returns the saved schema with HTTP 201

Has detailed error handling for:
- JSON parse errors (OpenAI sometimes returns malformed JSON)
- Timeout errors
- Schema generation errors
- Save errors

**`optimizePrompt`** — Rewrites a vague prompt into a structured, detailed one:
- Uses `nlpService.optimizePrompt(prompt)` which calls OpenAI with a very specific system prompt instructing it to output entities and relationships in a structured format.

**`enhancePrompt`** — Adds more detail to a prompt while keeping its original meaning:
- Uses `promptEnhancerService.enhancePrompt(prompt)` which calls OpenAI with instructions to make the prompt 1.5-2x more detailed.

**`getTemplates`** — Returns hardcoded template options:
- E-Commerce, Blog/CMS, Inventory Management, CRM
- These are just static objects, not generated by AI

### `gemini.controller.js`

**`generateERDiagram`** — Generates a Mermaid ER diagram directly from a text description:
1. Validates input (minimum 10 characters)
2. Checks if the Gemini service is initialized (has an API key)
3. Calls `geminiService.generateERDiagram(input)`
4. Returns `{ success: true, mermaidCode: "erDiagram ..." }`

This is a simpler, more direct path than the schema route — it goes straight from text to visual diagram without creating an intermediate schema object.

### `export.controller.js`

**`generateSQL`**:
1. Gets `schemaId` and `dialect` from request body
2. Looks up the schema from in-memory storage
3. Calls `sqlGeneratorService.generateSQL(schema, dialect)`
4. Returns the formatted SQL string

**`generateDocumentation`**:
- Gets the schema, calls `documentationService.generateDocumentation(schema, format)`
- Returns markdown/HTML documentation

**`generateMermaidERD`**:
- Gets the schema, calls `mermaidGeneratorService.generateMermaidERD(schema)`
- Returns Mermaid syntax string (not using AI — purely code-based conversion)

### `query.controller.js`

**`generateQuery`** — Natural language question → SQL:
1. Validates `question`, `schema`, and `dialect`
2. Calls `queryGeneratorService.generateQuery(question, schema, dialect)`
3. Returns `{ success: true, sql: "SELECT ...", explanation: "This query..." }`

**`getExampleQuestions`**:
- Generates example questions the user could ask about their schema
- Based on table names and column types — no AI needed

### `mermaidQuery.controller.js`

Same pattern as query.controller but generates **Mermaid ER diagram code** instead of SQL.

---

## 7. Services — The Brain of the App

Services contain the actual business logic. They are called by controllers and do the heavy lifting.

### `nlp.service.js` — Core AI Service (OpenAI)

This is the **most critical service**. It takes plain English text and converts it to structured data.

**How it initializes:**
```js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: new https.Agent({ rejectUnauthorized: false }), // bypass SSL for dev
  timeout: 90000,
  maxRetries: 3
});
```

**`extractEntities(text)`** — The core function:

It calls the OpenAI Chat Completions API with a carefully crafted system prompt that instructs GPT to:
- Identify all entities (tables) mentioned
- For each entity, list its attributes (columns) with data types
- Identify relationships between entities (one-to-many, many-to-many, etc.)
- Mark weak entities and identifying relationships
- Return everything as **valid JSON**

The returned JSON looks like:
```json
{
  "entities": [
    {
      "name": "Doctor",
      "isWeakEntity": false,
      "attributes": [
        { "name": "id", "dataType": "INTEGER", "isPrimaryKey": true },
        { "name": "name", "dataType": "VARCHAR(255)", "isNullable": false }
      ]
    }
  ],
  "relationships": [
    {
      "from": "Doctor",
      "to": "Department",
      "type": "many-to-one",
      "name": "belongsTo"
    }
  ]
}
```

**JSON Sanitization** — Because AI models sometimes return slightly malformed JSON, the service has a `sanitizeJSON()` function that:
- Strips markdown code block markers (` ```json `)
- Fixes unquoted property names
- Removes trailing commas
- Replaces single quotes with double quotes
- As a last resort, uses regex to extract whatever entities/relationships it can

**`optimizePrompt(text)`**:
- Uses `gpt-3.5-turbo-0125` (cheaper model for this task)
- Returns a structured prompt format with ENTITIES, RELATIONSHIPS, and CONSTRAINTS sections
- The system prompt is extremely detailed, including a full example of a library schema

### `schemaGenerator.service.js` — Schema Object Builder

Takes the JSON from `nlp.service.js` and builds a proper schema object.

**`generateSchema(extractedData, options)`**:

For each entity:
1. Calls `transformTableName()` — converts `UserAccount` to `user_account` (snake_case for SQL)
2. Calls `generateColumnsFromAttributes()` — creates column objects with proper types
3. Ensures every table has an `id` (PRIMARY KEY) column if one isn't provided
4. Ensures every table has `created_at` and `updated_at` TIMESTAMP columns
5. Sets X/Y positions for frontend display

**`inferDataType(attributeName)`** — If no data type is specified, guesses based on the column name:
- `email`, `phone`, `url` → `VARCHAR(255)`
- `id`, `count`, `age` → `INTEGER`
- `price`, `amount`, `total` → `DECIMAL(10,2)`
- `date`, `time` → `TIMESTAMP`
- `is_`, `has_`, `can_` (boolean prefixes) → `BOOLEAN`
- `description`, `notes`, `text`, `content` → `TEXT`

**`processIdentifyingRelationships()`**:
- For weak entities (entities that can't exist without a parent), it adds the parent's primary key as a foreign key to the weak entity's table.

**`detectLookupTables()`**:
- If a table has fewer than 3 columns and one of them seems like a status/category field, it marks it as a lookup table (used to generate seed data later).

### `sqlGenerator.service.js` — Multi-Dialect SQL Generator

Takes a schema object and generates a complete SQL script.

**`generateSQL(schema, dialect)`**:

1. Gets the right dialect-specific generator (mysql, postgresql, sqlite, sqlserver)
2. Calls `preprocessSchema()` — handles many-to-many relationships by creating junction tables
3. Generates in order:
   - Header comment (database name, creation date)
   - DROP TABLE statements (so the script can be re-run)
   - CREATE TYPE statements (PostgreSQL enums)
   - CREATE TABLE statements for each table
   - ALTER TABLE for foreign keys (needed separately in some dialects)
   - CREATE INDEX statements
   - CREATE VIEW statements
   - Stored procedures
   - Triggers
   - Seed data INSERTs for lookup tables
   - Footer (COMMIT)
4. Formats the entire output using `sql-formatter`

**`preprocessSchema()`**:
- Detects many-to-many relationships and automatically creates a **junction table**
- For example, if Student and Course have a many-to-many relationship, it creates a `student_course` table with `student_id` and `course_id` foreign keys

### Dialect Generators (`dialects/`)

Each dialect file exports functions that generate dialect-specific SQL syntax:

| Function | Purpose |
|---|---|
| `headerComment(schema)` | Top-of-file comment with database metadata |
| `generateDropStatements(schema)` | `DROP TABLE IF EXISTS` statements |
| `createTableStatement(table, schema)` | Full `CREATE TABLE (...)` statement |
| `createIndexStatements(table, schema)` | `CREATE INDEX` on foreign key columns |
| `addForeignKeyStatement(tableName, fk)` | `ALTER TABLE ADD FOREIGN KEY` |
| `generateSeedData(table)` | `INSERT INTO` for lookup tables |
| `footerComment(schema)` | `COMMIT;` or similar ending |

**Key differences between dialects:**

| Feature | MySQL | PostgreSQL | SQLite | SQL Server |
|---|---|---|---|---|
| Auto-increment | `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS` | `AUTOINCREMENT` | `IDENTITY(1,1)` |
| String type | `VARCHAR(n)` | `VARCHAR(n)` | `TEXT` | `NVARCHAR(n)` |
| Current timestamp | `CURRENT_TIMESTAMP` | `NOW()` | `CURRENT_TIMESTAMP` | `GETDATE()` |
| Backtick quotes | `` `tablename` `` | `"tablename"` | `"tablename"` | `[tablename]` |
| Enum support | `ENUM(...)` | `CREATE TYPE ... AS ENUM` | TEXT + CHECK | User-defined type |

### `mermaidGenerator.service.js` — Code-Based Diagram Generator

This service **does NOT use AI**. It takes a schema object and generates Mermaid syntax purely through code logic.

**`generateMermaidERD(schema)`**:
1. Starts with `erDiagram`
2. For each table, outputs:
   ```
   TableName {
       datatype column_name PK
       datatype column_name FK
   }
   ```
3. For each relationship, outputs cardinality notation:
   - `one-to-many` → `||--o{`
   - `many-to-many` → `}o--o{`
   - `one-to-one` → `||--||`
4. Runs `autoFormatMermaidSyntax()` which fixes common Mermaid syntax issues (removes invalid `required` keywords, fixes indentation, ensures proper newlines).

### `geminiService.js` — Google Gemini ER Diagram Service

Uses Gemini AI to go directly from plain text → Mermaid ER diagram.

**Initialization:**
```js
this.genAI = new GoogleGenerativeAI(this.apiKey);
this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

**`generateERDiagram(textInput)`**:
- Sends the text to Gemini with a system prompt instructing it to output **only** valid Mermaid `erDiagram` syntax
- `temperature: 0.1` — very low, meaning the output will be very predictable/deterministic (not creative)
- `maxOutputTokens: 4096` — allows for large diagrams

**`extractMermaidCode(text)`**:
- Strips the ` ```mermaid ... ``` ` code block that Gemini might wrap the output in
- Validates that the result starts with `erDiagram`

### `queryGenerator.service.js` — NL → SQL Query Generator

Uses Google Gemini to convert a natural language question into a SQL query, given the user's schema as context.

**`generateQuery(question, schema, dialect)`**:
1. Calls `buildSchemaContext(schema)` — creates a plain-text description of all tables and columns
2. Sends this context + the question to Gemini with a prompt like: *"Given this schema, generate a {dialect} SQL query for: {question}"*
3. Extracts the SQL from the response (looks for `SELECT`, `INSERT`, `UPDATE`, or `DELETE`)
4. Also extracts the explanation text that follows the SQL
5. Returns both `sql` and `explanation`

**`generateExampleQuestions(schema)`** — No AI needed:
- Programmatically generates questions like:
  - "Show me all records from {firstTable}"
  - "Show me {table1} with their related {table2}" (for tables with relationships)
  - "Find {table} where {nameColumn} contains a keyword"

### `mermaidQueryGenerator.service.js` — NL → Mermaid Diagram

Same pattern as queryGenerator but uses Gemini to generate a **Mermaid ER diagram** that highlights the tables/relationships relevant to the user's question.

### `promptEnhancer.service.js` — OpenAI Prompt Enhancement

Uses `gpt-3.5-turbo-0125` to make a prompt more detailed.

**What it instructs GPT to do:**
- Keep the original domain/context
- Don't add SQL syntax
- Add more specificity to entities and attributes
- Add expected relationships
- Make the result 1.5-2x longer

This helps users who type short prompts like "hospital database" get a much richer schema.

### `geminiPromptEnhancer.service.js` — Gemini Prompt Enhancement

Same purpose as `promptEnhancer.service.js` but uses **Gemini** instead of OpenAI. This gives the app two AI providers for the same task — useful if one is unavailable.

### `documentation.service.js` — Schema Documentation Generator

Takes a schema object and generates human-readable markdown documentation explaining every table, every column, and every relationship. This helps non-technical stakeholders understand the database design.

---

## 8. Models — In-Memory Data Storage

**Important Note:** The README mentions MongoDB, but the actual code uses **JavaScript Maps** for in-memory storage. There is **no database connection** in the current codebase.

### Why In-Memory Storage?

- Simpler to develop and test
- No external dependency (no MongoDB install needed)
- Data is lost when the server restarts (this is a demo/prototype limitation)

### `schema.model.js`

```js
const schemas = new Map();   // Global in-memory store
let nextId = 1;              // Auto-increment ID counter

class Schema {
  constructor(data) {
    this._id = String(nextId++);   // Auto-assigned ID
    this.name = data.name;
    this.tables = data.tables;     // Array of table objects
    this.relationships = data.relationships;
    // ...
  }

  async save() {
    schemas.set(this._id, this);   // Store in the Map
    return this;
  }

  static async findById(id) {
    return schemas.get(id) || null;
  }

  static async findByIdAndUpdate(id, updates) {
    const schema = schemas.get(id);
    Object.assign(schema, updates);
    schemas.set(id, schema);
    return schema;
  }
}
```

The API mimics what a Mongoose (MongoDB) model would look like — `save()`, `findById()`, `findByIdAndUpdate()`. This means if you ever want to add MongoDB, you just replace this class with a Mongoose model and the controllers don't need to change.

### `session.model.js`

Same pattern. A Session stores:
- `name` — session name
- `prompt` — the original user prompt
- `schemas` — array of schema IDs
- `activeSchemaId` — which schema is currently active

Has a `populate()` method that resolves schema IDs into actual schema objects (mimics Mongoose's `.populate()`).

---

## 9. Utility Layer: Logger

### `utils/logger.js`

Uses **Winston** to create two separate loggers:

**Main Logger (`logger`)**:
```js
winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({ format: colorize() }),  // Colored console output
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})
```

- Logs everything to console (with colors)
- Logs errors to `logs/error.log`
- Logs everything to `logs/combined.log`
- Custom format: `2024-01-15 [info]: Schema generated successfully`

**OpenAI Response Logger (`openaiResponseLogger`)**:
- Separate logger just for OpenAI API responses
- Writes to `logs/openai-responses.log`
- Formats AI responses in a readable way with `====== RESPONSE START ======` markers
- Also logs token usage (to track API costs)

**Why two loggers?** OpenAI responses are large and verbose. Keeping them separate makes the main log cleaner and makes it easier to debug AI issues.

---

## 10. AI Integration — How OpenAI & Gemini Work Together

The app uses **two different AI providers** for different tasks:

### OpenAI (GPT models)

| Task | Model | Why |
|---|---|---|
| Entity extraction (main schema generation) | `gpt-4o` (or configured model) | Needs high accuracy for structured JSON output |
| Prompt optimization | `gpt-3.5-turbo-0125` | Lower cost, text formatting task |
| Prompt enhancement | `gpt-3.5-turbo-0125` | Lower cost, creative expansion task |

**How it calls OpenAI:**
```js
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a database design expert..." },
    { role: "user", content: userPrompt }
  ],
  response_format: { type: "json_object" }  // Forces JSON output
});
const content = response.choices[0].message.content;
```

### Google Gemini

| Task | Model | Why |
|---|---|---|
| ER diagram from text (playground) | `gemini-2.5-flash` | Fast, good at structured output |
| Prompt enhancement (Gemini version) | `gemini-2.5-flash` | Alternative to OpenAI |
| NL → SQL query | `gemini-2.0-flash-exp` | Good at code generation |
| NL → Mermaid diagram | `gemini-2.0-flash-exp` | Good at diagram syntax |

**How it calls Gemini:**
```js
const result = await this.model.generateContent({
  contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
});
const rawText = result.response.text();
```

### Why Both?

1. **Redundancy** — if one provider is down or expensive, the other works
2. **Cost optimization** — Gemini is free tier for some usage
3. **Task specialization** — some models perform better at specific tasks
4. **Experimentation** — testing which provider gives better results

---

## 11. Complete API Reference

### Schema Endpoints

#### `POST /api/schema/generate`
**Body:** `{ "prompt": "Create a hospital database with doctors and patients", "name": "Hospital DB", "description": "..." }`
**Response:** `{ "message": "Schema generated successfully", "schema": { "_id": "1", "tables": [...], "relationships": [...] } }`
**Flow:** prompt → OpenAI entity extraction → schema object creation → save to memory → return

#### `POST /api/schema/optimize-prompt`
**Body:** `{ "prompt": "hospital database" }`
**Response:** `{ "optimizedPrompt": "## ENTITIES\n- Hospital...\n## RELATIONSHIPS\n..." }`

#### `POST /api/schema/enhance-prompt`
**Body:** `{ "prompt": "hospital database" }`
**Response:** `{ "enhancedPrompt": "Create a hospital management database with departments, doctors, patients..." }`

#### `GET /api/schema/templates`
**Response:** `{ "templates": [{ "id": "ecommerce", "name": "E-Commerce", ... }] }`

#### `GET /api/schema/:id`
**Response:** `{ "schema": { "_id": "1", "name": "...", "tables": [...] } }`

#### `PUT /api/schema/:id`
**Body:** `{ "tables": [...], "relationships": [...] }` (partial updates OK)
**Response:** Updated schema

### Export Endpoints

#### `POST /api/export/sql`
**Body:** `{ "schemaId": "1", "dialect": "mysql" }` (dialect: mysql | postgresql | sqlite | sqlserver)
**Response:** `{ "sql": "CREATE TABLE ...", "dialect": "mysql" }`

#### `POST /api/export/mermaid`
**Body:** `{ "schemaId": "1" }`
**Response:** `{ "mermaidSyntax": "erDiagram\n Doctor {\n  int id PK\n..." }`

#### `POST /api/export/documentation`
**Body:** `{ "schemaId": "1", "format": "markdown" }`
**Response:** `{ "documentation": "# Hospital DB\n\n## Tables\n..." }`

### Gemini / AI Endpoints

#### `POST /api/gemini/generate`
**Body:** `{ "input": "A system for managing university courses and student enrollments" }`
**Response:** `{ "success": true, "mermaidCode": "erDiagram\n..." }`

#### `POST /api/gemini/prompt/enhance`
**Body:** `{ "prompt": "school database" }`
**Response:** `{ "success": true, "enhancedPrompt": "Create a school management database..." }`

### Query Endpoints

#### `POST /api/query/generate`
**Body:** `{ "question": "Show me all doctors in cardiology", "schema": { "tables": [...] }, "dialect": "mysql" }`
**Response:** `{ "success": true, "sql": "SELECT * FROM doctors WHERE department = 'cardiology'", "explanation": "This query selects..." }`

#### `POST /api/mermaid-query/generate`
**Body:** `{ "question": "Show me how doctors relate to departments", "schema": { "tables": [...] } }`
**Response:** `{ "success": true, "mermaidCode": "erDiagram\n..." }`

---

## 12. End-to-End Data Flow Walkthrough

### Flow 1: "Generate a Schema from Text"

```
User types: "Create a school database with students, courses, and enrollments"
       ↓
Frontend sends: POST /api/schema/generate { prompt: "..." }
       ↓
server.js receives request → passes to express.json() middleware (parses body)
       ↓
routes/index.js → routes/schema.routes.js → schema.controller.js#generateSchema
       ↓
schema.controller.js calls: nlpService.extractEntities(prompt)
       ↓
nlp.service.js builds system prompt + user prompt → sends to OpenAI API
       ↓
OpenAI returns JSON: { entities: [Student, Course, Enrollment], relationships: [...] }
       ↓
nlp.service.js sanitizes/parses the JSON → returns parsed object
       ↓
schema.controller.js calls: schemaGeneratorService.generateSchema(entities, { name })
       ↓
schemaGenerator.service.js:
  - Converts entity names to snake_case table names
  - Creates column objects from attributes
  - Adds missing id, created_at, updated_at columns
  - Processes relationships → adds foreign key columns
  - Detects weak entities, lookup tables
  - Assigns X/Y positions for visual display
       ↓
Returns schema: { name: "School DB", tables: [...], relationships: [...] }
       ↓
schema.controller.js creates: new Schema(schema)
       ↓
schema.model.js stores it in the JavaScript Map: schemas.set("1", schema)
       ↓
schema.controller.js returns: HTTP 201 { message: "...", schema: { _id: "1", ... } }
       ↓
Frontend receives the schema → renders it as an ER diagram using ReactFlow
```

### Flow 2: "Export as MySQL SQL"

```
User clicks "Export SQL" → selects MySQL
       ↓
Frontend sends: POST /api/export/sql { schemaId: "1", dialect: "mysql" }
       ↓
export.controller.js → looks up schema from memory: Schema.findById("1")
       ↓
Calls: sqlGeneratorService.generateSQL(schema, "mysql")
       ↓
sqlGenerator.service.js:
  - Loads mysql.generator.js
  - preprocessSchema() → creates junction tables for many-to-many
  - Calls mysql.generator.headerComment() → "-- MySQL Script for School DB..."
  - Calls mysql.generator.generateDropStatements() → "DROP TABLE IF EXISTS `students`..."
  - Calls mysql.generator.createTableStatement() for each table → "CREATE TABLE `students` (...)"
  - Calls mysql.generator.createIndexStatements() → "CREATE INDEX idx_..."
  - Joins all parts with "\n\n"
  - Calls sql-formatter → beautifies the SQL
       ↓
Returns formatted SQL string
       ↓
export.controller.js returns: HTTP 200 { sql: "CREATE DATABASE IF NOT EXISTS...", dialect: "mysql" }
       ↓
Frontend shows SQL in code editor, user can copy or download it
```

### Flow 3: "Ask a Question About the Schema"

```
User types: "How many students are enrolled in each course?"
       ↓
Frontend sends: POST /api/query/generate { question: "...", schema: {...}, dialect: "postgresql" }
       ↓
query.controller.js validates inputs → calls queryGeneratorService.generateQuery(...)
       ↓
queryGenerator.service.js:
  - buildSchemaContext(schema) → creates text like:
    "Table: students\n  Columns:\n  - id: INTEGER (PRIMARY KEY)\n  - name: VARCHAR..."
  - Sends context + question to Gemini with prompt:
    "Given this PostgreSQL schema, generate a SQL query for: How many students..."
       ↓
Gemini returns: "SELECT c.name, COUNT(e.student_id) AS enrollment_count
FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.name ORDER BY enrollment_count DESC;

This query joins the courses table with enrollments..."
       ↓
queryGenerator.service.js:
  - Extracts SQL (everything from SELECT/INSERT/UPDATE/DELETE to the semicolon)
  - Extracts explanation (text after the SQL)
       ↓
Returns: { success: true, sql: "SELECT c.name...", explanation: "This query joins..." }
       ↓
Frontend displays SQL with syntax highlighting + explanation text
```

---

## 13. Key Design Decisions & Tradeoffs

### 1. In-Memory Storage Instead of MongoDB

**Decision:** Use JavaScript `Map` objects instead of MongoDB.

**Pros:**
- Zero setup — no database server needed
- Instant reads/writes (no network latency)
- Simpler code

**Cons (tradeoffs):**
- All data is lost when the server restarts
- No persistence across deployments
- Can't scale to multiple server instances
- Not suitable for production

**Interview answer:** "The models use the same async interface as Mongoose, so switching to MongoDB would only require replacing the model classes without changing controllers or services."

### 2. Two AI Providers (OpenAI + Gemini)

**Decision:** Use OpenAI for entity extraction and Gemini for diagram/query generation.

**Why:**
- Redundancy (if one is down)
- Cost optimization (Gemini has free tier)
- Different strengths for different tasks
- The app can work if either is unavailable

### 3. JSON Sanitization in NLP Service

**Decision:** Built a robust JSON fixing system for AI responses.

**Why:** GPT sometimes returns JSON with trailing commas, single quotes, or extra text. Rather than failing, the app tries 4 levels of recovery:
1. Parse as-is
2. Fix common issues (remove markdown, fix quotes, remove trailing commas)
3. Use regex to extract entities/relationships from broken JSON
4. Return empty structure as last resort

### 4. SSL Verification Disabled for OpenAI

**Decision:** `rejectUnauthorized: false` in the HTTPS agent.

**Why:** Corporate networks or certain development environments have SSL certificate issues. This bypasses them.

**Warning:** This should be removed in production — it makes the app vulnerable to man-in-the-middle attacks.

### 5. 3-Minute Server Timeout

**Decision:** `server.timeout = 180000` (3 minutes).

**Why:** GPT-4 can take 30-90 seconds for complex schema generation. Without this, Express would close the connection before the AI responds.

### 6. Socket.IO for Real-Time Updates

**Decision:** Include Socket.IO even though the core features are HTTP-based.

**Why:** Enables collaborative editing — if two users have the same schema open, changes by one user appear in real time for the other without polling. The `schema-update` event broadcasts changes to all other connected clients.

---

## 14. Common Interview Questions & Answers

**Q: What does this project do?**
A: LaymanDB converts natural language descriptions into database schemas. A user types something like "I need a database for a food delivery app" and the system uses GPT-4 to extract entities, relationships, and attributes, then generates a complete database schema with tables, columns, primary keys, and foreign keys. It also generates SQL scripts for multiple database systems.

**Q: What technologies did you use?**
A: Node.js with Express for the server, OpenAI's GPT models and Google Gemini for AI processing, Socket.IO for real-time updates, Winston for structured logging, and sql-formatter for SQL beautification. Data is stored in-memory using JavaScript Maps.

**Q: How does the AI integration work?**
A: For schema generation, I send the user's text to OpenAI with a detailed system prompt that instructs it to identify entities, attributes, and relationships and return them as JSON. I then parse that JSON and transform it into a schema object. For diagram generation, I use Google Gemini which directly outputs Mermaid diagram syntax.

**Q: Why did you choose Express over other frameworks?**
A: Express is mature, well-documented, and has a huge ecosystem. Version 5 was used which includes better async error handling. For a backend that primarily serves as an API gateway to AI services, Express is more than sufficient.

**Q: How do you handle errors from the AI?**
A: Multiple levels. The NLP service has a JSON sanitizer that fixes 4 types of common issues in AI responses. The controllers have specific error codes (JSON_PARSE_ERROR, TIMEOUT_ERROR, NLP_ERROR) so the frontend can show meaningful messages. All errors are logged with full context using Winston.

**Q: How does the SQL generation work?**
A: I have four dialect-specific generator modules (MySQL, PostgreSQL, SQLite, SQL Server) that each export functions for generating dialect-specific SQL statements. The main `sqlGenerator.service.js` orchestrates them by preprocessing the schema (handling many-to-many junction tables), calling each generator function in order, and using `sql-formatter` to prettify the output.

**Q: What is Socket.IO used for?**
A: Real-time schema synchronization. When one user modifies a schema, the change is broadcast to all other clients connected to the same schema. This enables collaborative editing without page refreshes. The backend just rebroadcasts events — it's mostly a message relay.

**Q: What would you improve if you had more time?**
A: First, replace in-memory storage with a real database like MongoDB or PostgreSQL for persistence. Second, add user authentication so schemas are tied to users. Third, add schema version history by storing each save as a separate version. Fourth, add unit tests for all service functions (jest is set up but tests aren't written). Fifth, enable the Redis dependency for caching AI responses to reduce API costs.

**Q: How does the Mermaid diagram generation work?**
A: Two ways. The code-based approach in `mermaidGenerator.service.js` iterates over the schema tables and relationships and generates Mermaid syntax programmatically. The AI-based approach (`geminiService.js`) sends the description to Gemini with a prompt asking it to output valid Mermaid `erDiagram` syntax, then extracts and validates the result.

**Q: What is CORS and why is it needed?**
A: Cross-Origin Resource Sharing. Browsers block JavaScript from making HTTP requests to a different domain/port than the page was served from. The backend runs on port 4000, the frontend on port 3000 — different origins. The `cors` middleware adds the `Access-Control-Allow-Origin` header to every response, telling the browser it's safe to accept the response.

---

*End of EXPLANATION.md — This document covers 100% of the backend codebase in complete detail.*
