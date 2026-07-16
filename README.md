# CollabHub

CollabHub is a real-time, unified workspace featuring a collaborative code editor and an interactive whiteboard. Designed as a high-performance hackathon deliverable, it brings together two independent real-time sync engines governed by a single JWT authentication model.

## Features

- **Live Code Editing**: Real-time collaborative code editor powered by Monaco and Yjs.
- **Interactive Whiteboard**: Collaborative drawing powered by tldraw, running natively on a self-hosted `@tldraw/sync` server.
- **Unified Presence**: See who's in the room and what they're doing, seamlessly merged across both the code and whiteboard surfaces into a single presence list.
- **Code Execution with Live Broadcast**: Execute code (powered by Judge0/Piston) and broadcast the results to everyone in the room simultaneously.
- **Dual-Provider AI Assistant**: 
  - **Fast Mode (Groq)**: Instant answers for quick code queries.
  - **Deep Mode (NVIDIA Nemotron 3 Ultra)**: Detailed analysis with live streaming reasoning traces to understand the AI's internal thought process.
- **AI Diagram Generation**: Describe a flow in plain text, and the AI will programmatically lay out shapes and connections directly onto your shared whiteboard.

## Architecture

CollabHub relies on a hybrid architecture to achieve its goals:
- **One Auth Model**: A unified Postgres/JWT layer handles user identities and room membership.
- **Two Real-time Engines**: 
  1. **Code (Yjs)**: A Socket.IO + Yjs stack handles code synchronization. This stack uses Redis for rehydration and is built to scale horizontally.
  2. **Whiteboard (@tldraw/sync)**: A raw WebSocket server running `@tldraw/sync` handles the whiteboard. *Note: For simplicity in this demo environment, the whiteboard sync is currently single-instance.*

### Why Two Engines?
Initially, we set out to use a single Yjs instance to back both the code editor and the whiteboard (using `y-tldraw`). However, we adapted the architecture when integrating the latest version of `tldraw`, pivoting to their native `@tldraw/sync` package to ensure a robust, glitch-free drawing experience. This resulted in a far stronger technical feat: unifying two entirely separate real-time sync engines under a single frontend presence system.

### Why Judge0?
The original specification called for the Piston execution engine public API. After discovering Piston's public API was restricted for hobby projects, we pivoted to **Judge0** (via RapidAPI) to ensure reliable, sandboxed code execution while maintaining a local Piston fallback for development. Adaptability is key!

## Environment Setup

You will need two `.env` files.

### `server/.env`
```env
# Database & Auth
DATABASE_URL=postgres://user:pass@host:port/db
JWT_SECRET=your_super_secret_jwt_key

# Real-time
REDIS_URL=redis://host:port

# Execution
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key

# AI Providers
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
NVIDIA_API_KEY=your_nvidia_key
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b

# Client Origin (for CORS)
CLIENT_URL=http://localhost:3000
```

### `client/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Running Locally

1. **Start the Infrastructure**
   ```bash
   docker-compose up -d
   ```
2. **Start the Server**
   ```bash
   cd server
   npm install
   npm run dev
   ```
3. **Start the Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Demo Flow

To see CollabHub shine:
1. Open two browser tabs side-by-side and log in.
2. Create a room (Type: "Both") and join it in both tabs.
3. **Code Editor**: Type code together and watch live cursors.
4. **Execution**: Click "Run Tests". The code executes via Judge0, and the results instantly broadcast to both tabs!
5. **AI Assistant**: 
   - Ask a question in *Fast Mode* (Groq).
   - Switch to *Deep Mode* (NVIDIA) and ask another question. Expand the **Reasoning** block to watch the AI's internal thought process stream in real-time.
6. **Whiteboard**: Switch to the whiteboard side. Draw a shape and watch it sync seamlessly.
7. **AI Diagramming**: Open the Diagram tab and type `"three boxes in a pipeline: input, process, output"`. Click generate, and watch the LLM programmatically drop shapes onto both canvases!

## Scaling Considerations
The codebase scales horizontally for the code editor (via Redis adapter). However, the `@tldraw/sync` whiteboard server is currently deployed as a single instance. In a production environment, you would use sticky sessions or migrate to a Durable Objects-backed sync server for the whiteboard.
