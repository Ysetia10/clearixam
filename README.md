# CleariXam

Full-stack performance analytics platform for UPSC aspirants.

## Overview

CleariXam is a production-grade full-stack performance analytics system designed for UPSC aspirants. It provides comprehensive mock test tracking, subject-level analytics, performance trends, and intelligent insights to help students optimize their preparation.

## Tech Stack

### Backend
- Spring Boot 3.2.4
- Kotlin 1.9.23
- PostgreSQL
- JWT Authentication
- Gradle

### Frontend
- React 18
- TypeScript
- Vite
- React Router

## Project Structure

```
clearixam/
├── backend/          # Spring Boot + Kotlin backend
├── frontend/         # React + TypeScript frontend
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```

## Features

- JWT-based authentication
- Mock test tracking and management
- Subject-level performance analytics
- Moving average calculations
- Weak subject detection
- Cutoff probability prediction
- Performance trend visualization
- Risk indicators and insights

## Getting Started

### Prerequisites
- JDK 17+
- Node.js 18+
- PostgreSQL 16+
- Docker (optional)

### Local Development

1. Clone the repository
2. Set up environment variables (copy `.env.example` to `.env`)
3. Start PostgreSQL
4. Run backend: `cd backend && ./gradlew bootRun`
5. Run frontend: `cd frontend && npm install && npm run dev`

### Using Docker

```bash
docker-compose up
```

## Architecture

This project follows clean architecture principles with:
- Layered backend architecture (Controller → Service → Repository)
- DTO separation for request/response
- Comprehensive validation and exception handling
- API documentation with Swagger
- Type-safe frontend with TypeScript

## License

Proprietary
