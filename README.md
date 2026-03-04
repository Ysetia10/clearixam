# CleariXam

**Live Production App**: https://clearixam.vercel.app

Premium SaaS-grade performance analytics platform for UPSC aspirants.

## 🎯 Overview

CleariXam is a production-ready full-stack performance analytics system designed for UPSC aspirants. It provides comprehensive mock test tracking, subject-level analytics, performance trends, intelligent insights, and data management features to help students optimize their preparation.

## 🚀 Live Deployment

- **Frontend**: https://clearixam.vercel.app (Vercel)
- **Backend**: https://clearixam-backend.onrender.com (Render)
- **Database**: PostgreSQL on Render (Singapore region)

## 🛠️ Tech Stack

### Backend
- **Framework**: Spring Boot 3.2.4
- **Language**: Kotlin 1.9.23
- **Database**: PostgreSQL 16 with optimized indexes
- **Authentication**: JWT with rate limiting (5 attempts/min)
- **PDF Generation**: OpenPDF
- **Build Tool**: Gradle 8.5
- **Deployment**: Render (Docker container)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (optimized production build)
- **UI Library**: Material-UI (MUI) with custom theme
- **State Management**: React Query for server state
- **Animations**: Framer Motion
- **Code Splitting**: React.lazy for route-based splitting
- **Deployment**: Vercel

## Project Structure

```
clearixam/
├── backend/          # Spring Boot + Kotlin backend
│   ├── src/main/kotlin/com/clearixam/
│   │   ├── controller/      # REST API endpoints
│   │   ├── service/         # Business logic
│   │   ├── repository/      # Data access
│   │   ├── entity/          # Domain models
│   │   ├── dto/             # Data transfer objects
│   │   ├── security/        # Auth & security
│   │   └── analytics/       # Analytics engine
│   └── database_indexes.sql # Performance indexes
├── frontend/         # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/           # Route components
│   │   ├── components/      # Reusable components
│   │   ├── api/             # API client
│   │   ├── context/         # React context
│   │   └── utils/           # Utilities
└── docs/             # Documentation

## ✨ Core Features

### Analytics & Insights
- ✅ Mock test tracking and management with pagination
- ✅ Subject-level performance analytics with trend visualization
- ✅ Moving average calculations (last 3 mocks)
- ✅ Weak subject detection (<60% accuracy)
- ✅ Cutoff probability prediction (4-tier system: 25/50/70/85)
- ✅ Performance trend visualization with Chart.js
- ✅ Risk indicators (LOW/MEDIUM/HIGH)
- ✅ Consistency scoring based on standard deviation
- ✅ Improvement rate tracking
- ✅ Intelligent performance insights
- ✅ Goal setting and progress tracking with days remaining
- ✅ Attempt strategy recommendations

### Premium Features
- ✅ **PDF Report Export** - Professional performance reports with charts
- ✅ **Data Backup & Import** - Full data export/import in JSON format
- ✅ **Account Settings** - Comprehensive user data management
- ✅ **Dark Mode** - System-aware theme switching
- ✅ **Skeleton Loaders** - Premium loading states for all components
- ✅ **Page Transitions** - Smooth animations with Framer Motion
- ✅ **Error Boundary** - Graceful error handling with fallback UI
- ✅ **Code Splitting** - Optimized bundle size with lazy loading

### Security & Performance
- ✅ JWT authentication with 24-hour token expiration
- ✅ Login rate limiting (5 attempts per minute per IP)
- ✅ Database indexes for query optimization
- ✅ React Query caching (30s stale time)
- ✅ Error logging system with session storage
- ✅ CORS configuration for cross-origin requests
- ✅ Secure password validation (8+ chars, letter + number required)
- ✅ Production-ready CORS filter with highest precedence

## 🚀 Getting Started

### Prerequisites
- **JDK 21** or higher
- **Node.js 18+** and npm
- **PostgreSQL 16+**
- **Gradle 8.5** (included via wrapper)

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd clearixam
```

#### 2. Set Up PostgreSQL Database
```bash
# Create database
createdb clearixam

# Apply performance indexes (recommended)
psql -d clearixam -f backend/database_indexes.sql
```

#### 3. Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clearixam
SPRING_DATASOURCE_USERNAME=your_username
SPRING_DATASOURCE_PASSWORD=your_password
JWT_SECRET=your-256-bit-secret-key-change-in-production
JWT_EXPIRATION=86400000
PORT=8080
```

**Frontend** - Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8080
```

#### 4. Start Backend
```bash
cd backend
./gradlew bootRun
```
Backend runs on: **http://localhost:8080**

#### 5. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: **http://localhost:5173**

### Using Docker Compose

```bash
docker-compose up
```

This starts both backend and frontend services with PostgreSQL.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (email, password)
- `POST /api/auth/login` - Login with rate limiting (5 attempts/min)

### Mock Tests
- `GET /api/mocks` - List mocks with pagination (10 per page)
- `POST /api/mocks` - Create new mock test
- `GET /api/mocks/{id}` - Get mock details
- `DELETE /api/mocks/{id}` - Delete mock test

### Analytics
- `GET /api/analytics/overview` - Performance overview with insights
- `GET /api/analytics/trend` - Performance trend over time
- `GET /api/analytics/subjects` - Subject-wise analytics with trends

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create new goal
- `DELETE /api/goals/{id}` - Delete goal

### Reports & Backup
- `GET /api/reports/performance` - Download PDF performance report
- `GET /api/backup/export` - Export all data as JSON
- `POST /api/backup/import` - Import data from JSON (with overwrite option)

### Health Check
- `GET /health` - Application health status

## 🏗️ Architecture

### Backend Architecture
- **Controller Layer**: REST API endpoints with Jakarta validation
- **Service Layer**: Business logic and analytics calculations
- **Repository Layer**: Data access with Spring Data JPA
- **Security Layer**: JWT authentication, CORS filter, and rate limiting
- **DTO Pattern**: Separate request/response objects for clean API contracts

### Frontend Architecture
- **Component-based**: Reusable React components with TypeScript
- **State Management**: React Query for server state, Context API for theme
- **Routing**: React Router v6 with code splitting
- **Styling**: Material-UI with custom theme and responsive design
- **Error Handling**: Error boundary with fallback UI and error logging

### Analytics Engine
The analytics engine calculates:
- **Moving Average**: Last 3 mock tests
- **Improvement Rate**: Percentage change in recent performance
- **Weak Subjects**: Subjects with <60% accuracy
- **Probability Scoring**: 4-tier system (25/50/70/85) based on gap from cutoff
- **Risk Assessment**: LOW/MEDIUM/HIGH based on cutoff gap
- **Consistency Score**: Based on standard deviation of scores
- **Goal Progress**: Days remaining and target tracking
- **Attempt Strategy**: Recommendations based on performance patterns

## ⚡ Performance Optimizations

1. **Database Indexes**: Optimized queries on `user_id`, `test_date`, `subject_name`
2. **React Query Caching**: 30-second stale time reduces unnecessary API calls
3. **Code Splitting**: Lazy loading for Dashboard, AddMock, SubjectAnalytics, AccountSettings
4. **Skeleton Loaders**: Improved perceived performance during data loading
5. **Bundle Optimization**: Vite build with tree-shaking and manual chunks
6. **Connection Pooling**: HikariCP with optimized pool size (5 max, 2 min idle)
7. **Pagination**: Mock list paginated at 10 items per page

### Production Build Stats
- **Total Bundle Size**: ~306 KB gzipped
- **Largest Chunk**: Chart vendor (~105 KB gzipped)
- **Initial Load**: < 2 seconds on 3G
- **Lighthouse Score**: 85+ performance

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based authentication with 24-hour expiration
2. **Rate Limiting**: IP-based rate limiting (5 login attempts per minute)
3. **Password Validation**: Enforced strong passwords (8+ chars, letter + number)
4. **CORS Configuration**: Dedicated CORS filter with highest precedence
5. **Error Logging**: Comprehensive error tracking with session storage
6. **SQL Injection Prevention**: Parameterized queries via JPA
7. **XSS Prevention**: React's built-in XSS protection
8. **Secure Headers**: CORS, Content-Type validation

### Allowed Origins (Production)
- `http://localhost:5173` (local development)
- `http://localhost:3000` (alternative local)
- `https://clearixam.vercel.app` (production frontend)

## 🧪 Testing

### Backend Tests
```bash
cd backend
./gradlew test
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### E2E Tests (Coming Soon)
- User registration and login flow
- Mock test creation and deletion
- Analytics dashboard interaction
- Data export and import

## 📦 Production Deployment

### Backend (Render)
The backend is deployed on Render using Docker:

```bash
# Build
cd backend
./gradlew clean build -x test

# Docker build (from repository root)
docker build -f backend/Dockerfile -t clearixam-backend .

# Run
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=<db_url> \
  -e SPRING_DATASOURCE_USERNAME=<db_user> \
  -e SPRING_DATASOURCE_PASSWORD=<db_pass> \
  -e JWT_SECRET=<secret> \
  clearixam-backend
```

### Frontend (Vercel)
The frontend is deployed on Vercel:

```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```

### Environment Variables (Production)

**Backend (Render)**:
```env
SPRING_DATASOURCE_URL=<postgres_external_url>
SPRING_DATASOURCE_USERNAME=<db_username>
SPRING_DATASOURCE_PASSWORD=<db_password>
JWT_SECRET=<256-bit-secret>
JWT_EXPIRATION=86400000
PORT=8080
```

**Frontend (Vercel)**:
```env
VITE_API_BASE_URL=https://clearixam-backend.onrender.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep commits atomic and well-described

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: [Your contact information]

## 🗺️ Roadmap

See [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) for detailed roadmap and planned features.

### Immediate Next Steps
1. Production monitoring setup (error tracking, uptime monitoring)
2. Toast notifications for user actions
3. Mobile responsiveness testing and optimization
4. Unit and integration tests
5. User feedback collection system

---

**Version**: 1.0.0  
**Status**: ✅ Live in Production  
**Last Updated**: March 2026  
**Frontend**: https://clearixam.vercel.app  
**Backend**: https://clearixam-backend.onrender.com
