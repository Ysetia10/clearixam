# CleariXam

Premium SaaS-grade performance analytics platform for UPSC aspirants.

## Overview

CleariXam is a production-ready full-stack performance analytics system designed for UPSC aspirants. It provides comprehensive mock test tracking, subject-level analytics, performance trends, intelligent insights, and data management features to help students optimize their preparation.

## Tech Stack

### Backend
- Spring Boot 3.2.4
- Kotlin 1.9.23
- PostgreSQL with optimized indexes
- JWT Authentication with rate limiting
- OpenPDF for report generation
- Gradle

### Frontend
- React 18 with TypeScript
- Vite (optimized build)
- Material-UI (MUI) with custom theme
- React Query for state management
- Framer Motion for animations
- Code splitting with React.lazy

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

## Core Features

### Analytics & Insights
- ✅ Mock test tracking and management
- ✅ Subject-level performance analytics
- ✅ Moving average calculations (last 3 mocks)
- ✅ Weak subject detection (<60% accuracy)
- ✅ Cutoff probability prediction (4-tier system)
- ✅ Performance trend visualization
- ✅ Risk indicators (LOW/MEDIUM/HIGH)
- ✅ Consistency scoring
- ✅ Improvement rate tracking
- ✅ Intelligent performance insights
- ✅ Goal setting and progress tracking
- ✅ Attempt strategy recommendations

### Premium Features
- ✅ **PDF Report Export** - Professional performance reports
- ✅ **Data Backup & Import** - Full data export/import in JSON
- ✅ **Account Settings** - User data management
- ✅ **Dark Mode** - System-aware theme switching
- ✅ **Skeleton Loaders** - Premium loading states
- ✅ **Page Transitions** - Smooth animations
- ✅ **Error Boundary** - Graceful error handling
- ✅ **Code Splitting** - Optimized bundle size

### Security & Performance
- ✅ JWT authentication with 24-hour expiration
- ✅ Login rate limiting (5 attempts/minute)
- ✅ Database indexes for query optimization
- ✅ React Query caching (30s stale time)
- ✅ Error logging system
- ✅ CORS configuration
- ✅ Secure password validation (8+ chars, letter + number)

## Getting Started

### Prerequisites
- JDK 21
- Node.js 18+
- PostgreSQL 16+
- Gradle 8.5

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clearixam
   ```

2. **Set up PostgreSQL**
   ```bash
   createdb clearixam
   ```

3. **Apply database indexes (optional but recommended)**
   ```bash
   psql -d clearixam -f backend/database_indexes.sql
   ```

4. **Start Backend**
   ```bash
   cd backend
   ./gradlew bootRun
   ```
   Backend runs on: http://localhost:8081

5. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on: http://localhost:3000

### Using Docker

```bash
docker-compose up
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (rate limited)

### Mock Tests
- `GET /api/mocks` - List mocks (paginated)
- `POST /api/mocks` - Create mock
- `GET /api/mocks/{id}` - Get mock details
- `DELETE /api/mocks/{id}` - Delete mock

### Analytics
- `GET /api/analytics/overview` - Performance overview
- `GET /api/analytics/trend` - Performance trend
- `GET /api/analytics/subjects` - Subject-wise analytics

### Goals
- `GET /api/goals` - List goals
- `POST /api/goals` - Create goal
- `DELETE /api/goals/{id}` - Delete goal

### Reports & Backup
- `GET /api/reports/performance` - Download PDF report
- `GET /api/backup/export` - Export data (JSON)
- `POST /api/backup/import` - Import data (JSON)

## Architecture

### Backend Architecture
- **Controller Layer**: REST API endpoints with validation
- **Service Layer**: Business logic and analytics calculations
- **Repository Layer**: Data access with Spring Data JPA
- **Security Layer**: JWT authentication and rate limiting
- **DTO Pattern**: Separate request/response objects

### Frontend Architecture
- **Component-based**: Reusable React components
- **State Management**: React Query for server state
- **Routing**: React Router with code splitting
- **Styling**: Material-UI with custom theme
- **Error Handling**: Error boundary and logging

### Analytics Engine
- Moving average calculation
- Improvement rate tracking
- Weak subject detection
- Probability scoring (25/50/70/85 based on gap)
- Risk level assessment
- Consistency scoring (standard deviation)
- Goal progress tracking

## Performance Optimizations

1. **Database Indexes**: Optimized queries for user_id, test_date, subject_name
2. **React Query Caching**: 30-second stale time reduces API calls
3. **Code Splitting**: Lazy loading for heavy pages
4. **Skeleton Loaders**: Perceived performance improvement
5. **Bundle Optimization**: Vite build with tree-shaking

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Rate Limiting**: Prevents brute force attacks
3. **Password Validation**: Strong password requirements
4. **CORS Configuration**: Controlled cross-origin access
5. **Error Logging**: Tracks security incidents

## Testing

### Backend
```bash
cd backend
./gradlew test
```

### Frontend
```bash
cd frontend
npm run test
```

## Deployment

### Backend
```bash
cd backend
./gradlew build
java -jar build/libs/clearixam-0.0.1-SNAPSHOT.jar
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=jdbc:postgresql://localhost:5432/clearixam
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRATION=86400000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8081/api
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Proprietary

## Support

For issues and questions, please open an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅
