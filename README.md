# 📚 Library Management System

A complete, production-ready full-stack Library Management System built with React.js, Node.js/Express, and PostgreSQL.

![Library Management System](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend API | `https://your-api.onrender.com` |
| Swagger Docs | `https://your-api.onrender.com/api/docs` |

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | Admin@123 |
| Librarian | librarian@library.com | Librarian@123 |
| Student | student@library.com | Student@123 |

---

## ✨ Features

### 🔐 Authentication
- JWT-based authentication
- Role-based access control (Admin / Librarian / Student)
- bcrypt password hashing
- Protected routes

### 📖 Book Management
- Add, edit, delete books
- Search by title, author, ISBN
- Filter by category
- Pagination
- Book cover images
- Quantity & availability tracking

### 👥 User Management
- Create, update, delete users
- Role assignment
- Student ID support
- Active/inactive status

### 🔄 Borrowing System
- Borrow books with due dates
- Return books
- Overdue tracking
- Fine calculation ($0.50/day)
- Borrow history

### 📊 Reports & Analytics
- Dashboard statistics
- Monthly borrow trends (Chart.js)
- Most borrowed books
- Most active users
- Overdue report
- Category distribution

---

## 🏗️ Tech Stack

**Frontend:** React.js, Tailwind CSS, Axios, React Router DOM, Chart.js, React Hot Toast  
**Backend:** Node.js, Express.js, JWT, bcryptjs, Winston, Morgan  
**Database:** PostgreSQL  
**Documentation:** Swagger/OpenAPI  
**Deployment:** Vercel (frontend), Render (backend), Supabase/Neon (database)

---

## 📁 Folder Structure

```
library-management-system/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # PostgreSQL schema
│   │   ├── seed.sql            # Sample data
│   │   ├── migrate.js          # Migration script
│   │   └── seed.js             # Seed script
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # PostgreSQL connection pool
│   │   │   └── swagger.js      # Swagger configuration
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, error handling, validation
│   │   ├── models/             # (query helpers)
│   │   ├── routes/             # Express routes + Swagger docs
│   │   ├── utils/              # Logger, JWT, response helpers
│   │   ├── validators/         # express-validator rules
│   │   └── server.js           # App entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── common/         # Reusable UI components
    │   │   ├── layout/         # Sidebar, Header, Layout
    │   │   └── books/          # Book-specific components
    │   ├── context/
    │   │   └── AuthContext.js  # Global auth state
    │   ├── pages/              # All page components
    │   ├── services/           # Axios API service modules
    │   └── utils/              # Helper functions
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/library-management-system.git
cd library-management-system
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE library_db;"

# Run migration (creates tables)
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 4. Start Backend
```bash
npm run dev
# API running at http://localhost:5000
# Swagger docs at http://localhost:5000/api/docs
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:5000/api
```

### 6. Start Frontend
```bash
npm start
# App running at http://localhost:3000
```

---

## 🌍 Deployment Guide

### Database — Supabase (Free)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **Settings → Database → Connection string**
3. Copy the connection string (URI format)
4. Run schema: Go to **SQL Editor** → paste `database/schema.sql` → Run
5. Run seed: paste `database/seed.sql` → Run

### Database — Neon (Alternative)
1. Go to [neon.tech](https://neon.tech) → New Project
2. Copy the connection string
3. Use the Neon SQL editor to run schema.sql and seed.sql

### Backend — Render
1. Push backend to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo, set root directory to `backend`
4. **Build command:** `npm install`
5. **Start command:** `npm start`
6. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<your-supabase-connection-string>
   DB_SSL=true
   JWT_SECRET=<strong-random-secret>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-app.vercel.app
   FINE_PER_DAY=0.50
   ```

### Frontend — Vercel
1. Push frontend to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo, set root directory to `frontend`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-api.onrender.com/api
   ```
5. Deploy!

---

## 📖 API Documentation

Swagger UI is available at: `http://localhost:5000/api/docs`

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register user | Public |
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Get profile | JWT |
| GET | /api/books | List books | Public |
| POST | /api/books | Create book | Admin/Librarian |
| PUT | /api/books/:id | Update book | Admin/Librarian |
| DELETE | /api/books/:id | Delete book | Admin |
| GET | /api/categories | List categories | Public |
| POST | /api/borrow | Borrow book | JWT |
| PUT | /api/borrow/:id/return | Return book | Admin/Librarian |
| GET | /api/borrow/overdue | Overdue records | Admin/Librarian |
| GET | /api/reports/dashboard | Dashboard stats | Admin/Librarian |
| GET | /api/users | List users | Admin/Librarian |

---

## 🔒 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/library_db
DB_SSL=false
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
FINE_PER_DAY=0.50
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=Library Management System
```

---

## 🧪 Testing the API

Using the Swagger UI at `/api/docs`:
1. Click **POST /api/auth/login**
2. Use `admin@library.com` / `Admin@123`
3. Copy the token from the response
4. Click **Authorize** (top right) → paste `Bearer <token>`
5. Now all protected endpoints are accessible

---

## 📝 License

MIT License — free to use for educational and commercial purposes.
