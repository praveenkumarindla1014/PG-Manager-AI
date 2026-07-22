# 🚀 PG Manager™ AI — Autonomous PG & Hostel Management System

An **AI-First PG (Paying Guest) and Hostel Management System** built with **React, Node.js, Express, MongoDB, Socket.IO, and OpenAI GPT-4o**.

PG Manager™ automates 24/7 property operations, inmate check-ins, rent collection, complaint resolution, maintenance predictions, and food nutrition analysis using OpenAI function calling, Vision API, Web Speech-to-Text, and RAG (Retrieval Augmented Generation).

---

## 🌟 Key AI Features (35 Built-in Features)

- **AI Smart Receptionist**: Natural language vacancy & room search (*"I need an AC room under ₹7000"*).
- **AI Voice Assistant**: Web Speech API integration for hands-free voice input.
- **AI Virtual Manager**: Role-tailored assistant for Owners & Tenants with session memory.
- **AI Complaint Analyzer & Sentiment**: Auto-categorization, priority scoring, mood emojis, repair time estimation & master ticket duplicate grouping.
- **AI Emergency Red Alert System**: Instant full-screen overlay & WebSocket alert triggers for Gas Leaks, Fire, Security, or Medical emergencies.
- **AI Rent & Occupancy Predictor**: Forecasts tenant payment behavior & room vacancy trends.
- **AI Maintenance Predictor**: Predicts AC/Plumbing failure probabilities and repair costs.
- **AI Aadhaar OCR Scanner**: Auto-extracts Name, DOB, Gender, and Address from document images.
- **AI Face Verification**: OpenAI Vision API comparison for ID photo vs Selfie verification.
- **AI Knowledge Base (RAG)**: Answers tenant queries directly from uploaded PG Policy documents without hallucinating.
- **AI Multi-Language Support**: Natural conversation & translation in **English, Hindi, Telugu, Tamil, and Kannada**.
- **AI Weekly Menu & Nutrition**: Calculates calories, protein, carbs, and fat per meal with healthy recommendations across Monday-Sunday menu tabs.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), React Router v6, Lucide React Icons, Socket.IO Client, Vanilla CSS (Glassmorphism & Crisp Theme).
- **Backend**: Node.js, Express.js, Socket.IO, Mongoose (MongoDB), Node-Cron, Multer.
- **AI Services**: OpenAI API (GPT-4o, Tool Calls / Function Calling, Text Embeddings 3, Vision API).
- **Database**: MongoDB (Local or Atlas).

---

## 📁 Project Structure

```
pg_management_system/
├── backend/
│   ├── middleware/        # Auth middleware (protect, isOwner, isTenant)
│   ├── models/            # 13 Mongoose Database Models
│   ├── routes/            # Express API Routes (AI, Rooms, Tenants, Payments, Complaints, Menu, etc.)
│   ├── services/          # AI Core Engine & Feature Services (chatEngine, predictionEngine, ocrService, ragService)
│   ├── seed.js            # Database Seed Script
│   └── server.js          # Express & Socket.IO Entry Point
├── frontend/
│   ├── public/            # Static assets & brand icons (build_icon.png, images/)
│   ├── src/
│   │   ├── components/    # Layout, AIChatPanel, VoiceInput, EmergencyAlert
│   │   ├── context/       # AuthContext for JWT authentication
│   │   ├── pages/         # LandingPage, OwnerDashboard, TenantDashboard, Rooms, Tenants, Menu, etc.
│   │   ├── App.jsx        # App routes & main layout
│   │   └── index.css      # Custom UI theme & animations
└── README.md
```

---

## 🚀 Quick Setup & Installation

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/praveenkumarindla1014/PG-Manager-AI.git
cd PG-Manager-AI

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pg_management_system
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o
```

### 3. Seed Database & Start Applications
```bash
# Seed Sample PG Data
cd backend
node seed.js

# Start Backend Server (Port 5000)
npm run dev

# Start Frontend App (Port 5173 - in a separate terminal)
cd ../frontend
npm run dev
```

> **Demo Credentials:**
> - **Owner**: `owner@smartpg.com` / `owner123`
> - **Tenant**: `priya@test.com` / `tenant123`

---

## 📄 License
Distributed under the MIT License.
