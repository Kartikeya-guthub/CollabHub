# CollabHub Deployment Guide

This guide provides step-by-step instructions for deploying the entire CollabHub stack for completely free using top-tier cloud providers.

## Architecture Overview
1. **Frontend**: Vercel (Next.js)
2. **Backend**: Render (Node.js Web Service)
3. **Database**: Neon (Serverless Postgres)
4. **WebSockets (Pub/Sub)**: Upstash (Serverless Redis)
5. **Code Execution**: RapidAPI Judge0 (Free) OR AWS EC2 (Piston Docker)

---

## 1. Database (Neon Postgres)
You have already completed this step! 
1. Create a free project at [Neon.tech](https://neon.tech/).
2. Copy the Postgres connection string.
3. This string will be your `DATABASE_URL` environment variable for the backend.

## 2. WebSockets & Real-Time Sync (Upstash Redis)
You have already completed this step!
1. Create a free Redis database at [Upstash](https://upstash.com/).
2. Go to **Connect to your database** -> Select **Node (node-redis)**.
3. Copy the URL starting with `rediss://...`.
4. This string will be your `REDIS_URL` environment variable for the backend.

## 3. Code Execution (Piston vs Judge0)
Because Render free instances do not support privileged Docker containers, you have two options for the backend code execution:

### Option A: Use Judge0 (Easiest)
1. Go to [RapidAPI - Judge0](https://rapidapi.com/judge0-official/api/judge0-ce).
2. Subscribe to the free tier (Basic).
3. Copy your `X-RapidAPI-Key`.
4. This key will be your `JUDGE0_KEY` environment variable. Our backend will automatically detect this and run code via Judge0 instead of Piston.

### Option B: Host Piston on AWS (Full Control)

This repository includes a highly secure `piston-deployment` bundle that automatically configures an Nginx reverse proxy in front of Piston to strictly enforce API key authentication. This prevents anyone on the internet from abusing your execution engine!

1. Create a free **AWS EC2 t2.micro** or **t3.micro** instance running Ubuntu 24.04.
2. Under the instance's Security Group, add an Inbound Rule for **Custom TCP**, Port **2000**, Source **0.0.0.0/0** (or restrict to your Render IPs for max security).
3. SSH into the instance and run:
   ```bash
   sudo apt-get update
   sudo apt-get install docker.io docker-compose -y
   ```
4. Copy the `piston-deployment/` directory from this repository to your AWS server.
5. On the AWS server, start the secure deployment bundle with a strong API key of your choice:
   ```bash
   cd piston-deployment
   PISTON_API_KEY=your_super_secret_key_123 sudo -E docker-compose up -d
   ```
6. Copy the EC2 instance's Public IPv4 address.
7. Set your backend environment variables on Render:
   - `PISTON_URL`: `http://<EC2_PUBLIC_IP>:2000`
   - `PISTON_API_KEY`: `your_super_secret_key_123`

---

## 4. Backend Deployment (Render)
1. Push the entire CollabHub repository to GitHub.
2. Create a free account at [Render.com](https://render.com/).
3. Create a new **Web Service** and connect your GitHub repository.
4. **Root Directory**: `server`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run migrate:up && npm start`
7. Expand the **Environment Variables** section and add the following:
   - `PORT`: `4000`
   - `DATABASE_URL`: *(Your Neon DB string)*
   - `JWT_SECRET`: *(A random 32-character string)*
   - `REDIS_URL`: *(Your Upstash rediss:// string)*
   - `GROQ_API_KEY`: *(Your Groq AI key)*
   - `NVIDIA_API_KEY`: *(Your Nvidia AI key)*
   - `JUDGE0_KEY`: *(Your RapidAPI key, if using Option A)*
   - `PISTON_URL`: *(Your AWS IP, if using Option B)*
8. Click **Deploy**. Once it's live, copy the Render URL (e.g., `https://collabhub-backend.onrender.com`).

---

## 5. Frontend Deployment (Vercel)
1. Go to [Vercel.com](https://vercel.com/) and create a new Project.
2. Import the exact same GitHub repository.
3. Set the **Root Directory** to `client`.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_API_URL`: *(Your Render Backend URL from Step 4)*
5. Click **Deploy**.

---

## 6. Security & Cost Guardrails
This stack uses cloud providers that charge for excess usage. To ensure you never receive an unexpected bill, you must set up the following guardrails:

### AWS Billing Alarms (CRITICAL)
If you are using the AWS EC2 Piston option, you **must** configure billing alarms:
1. Open the AWS Billing Dashboard.
2. Under **Billing Preferences**, enable **Receive Free Tier Usage Alerts**.
3. Go to **CloudWatch** -> **Alarms** and create a billing alarm to trigger an email if your estimated charges exceed `$1.00`.

### Master Kill Switch
If your application is ever targeted by a spam attack or if you need to perform emergency maintenance, you can instantly shut down all code execution globally:
1. Go to your Render Backend dashboard.
2. Add a new environment variable: `CODE_EXECUTION_ENABLED=false`.
3. The server will restart and all code executions will immediately return a `503 Service Unavailable` error, stopping any resource consumption.

## Final Result
You now have a fully deployed, highly-scalable collaborative IDE! The frontend is served on the global Vercel Edge network, your Node.js backend handles HTTP and WebSockets on Render, Redis syncs your WebSocket messages across the world, Neon manages your persistent room data, and AI features run on Groq/Nvidia.
