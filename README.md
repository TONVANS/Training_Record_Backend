// README.md
# Training & Development System - Backend

A complete, production-ready NestJS backend for managing employee training programs, course enrollments, and analytics.

## 🚀 Features

- **JWT Authentication** with role-based access control (ADMIN, EMPLOYEE)
- **Employee Management & Portal** - Profile management, personal course tracking, and custom certificate uploads
- **Training Programs** - Detailed courses (trainers, organizers), flexible locations, and rich materials (multiple file/link uploads)
- **Smart Enrollment** - Prevent duplicates, track status, bulk operations
- **Analytics & Reporting** - Real-time metrics and configurable training reports (monthly, quarterly, yearly)
- **Data Synchronization** - Built-in sync capabilities with external HR databases (Departments, Divisions, Employees)
- **Location Flexibility** - Support for Online, Onsite Domestic, and International training
- **Complete API Documentation** - Auto-generated Swagger/OpenAPI docs

## 🛠️ Tech Stack

- **Framework:** NestJS (Latest)
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Authentication:** JWT + bcrypt
- **Validation:** class-validator, class-transformer
- **Documentation:** Swagger/OpenAPI
- **Security:** helmet, CORS

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## 🔧 Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd training-backend

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/training_dev?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="1d"

# Application
PORT=3000
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:3001"

# API
API_PREFIX="api/v1"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 4. Start the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at:
- **API:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/docs

## 🔑 Default Login Credentials

After seeding the database:

**Admin Account:**
- Employee Code: `ADMIN001`
- Password: `admin123`

**Employee Account:**
- Employee Code: `EMP001`
- Password: `employee123`

**Note:** ລະບົບໃຊ້ລະຫັດພະນັກງານ (Employee Code) ແທນ Email ໃນການເຂົ້າສູ່ລະບົບ

## 📁 Project Structure

```
training-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding script
│   └── migrations/            # Migration files
├── src/
│   ├── auth/                  # Authentication module
│   ├── categories/            # Training categories
│   ├── common/                # Shared utilities
│   ├── courses/               # Training programs & courses
│   ├── cron/                  # Scheduled jobs (cron tasks)
│   ├── dashboard/             # Analytics & metrics
│   ├── employee-portal/       # Employee self-service features
│   ├── employees/             # Employee & organization management
│   ├── enrollments/           # Course assignments & statuses
│   ├── prisma/                # Prisma ORM service integration
│   ├── reports/               # Configurable training reports
│   ├── sync/                  # External data synchronization
│   ├── app.module.ts          # Root module
│   └── main.ts                # Application entry point
└── package.json
```

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new employee
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/change-password` - Change password (Logged in user)
- `POST /api/v1/auth/reset-password` - Reset password (Admin)

### Employee Management

**User Self-Service Endpoints:**
- `GET /api/v1/employees/profile` - Get current user profile
- `PUT /api/v1/employees/profile` - Update current user profile
- `GET /api/v1/employees/my-courses` - Get courses enrolled by the current user (categorized by status)

**Admin Endpoints:**
- `GET /api/v1/employees/summary` - Get organizational structure summary (Admin only)
- `GET /api/v1/employees` - Get all employees with optional filters (Admin only)
  - Query params: `department_id`, `division_id`, `unit_id`, `position_id`
- `GET /api/v1/employees/:id` - Get employee by ID with full details (Admin only)
- `PUT /api/v1/employees/:id` - Update employee profile or organizational assignment (Admin only)
- `GET /employees/training-state` - ດຶງຂໍ້ມູນພະນັກງານທັງໝົດ ພ້ອມກັບຈຳນວນຫຼັກສູດທີ່ເຄີຍເຂົ້າຮ່ວມ (ນັບຈາກ enrollments)
- `GET /employees/:id/courses` - ດຶງລາຍລະອຽດຂອງຫຼັກສູດທັງໝົດທີ່ພະນັກງານຄົນນັ້ນເຄີຍເຂົ້າຮ່ວມ.

### Training Management
- `POST /api/v1/training/categories` - Create category (Admin)
- `GET /api/v1/training/categories` - List categories
- `POST /api/v1/training/courses` - Create course (Admin)
- `GET /api/v1/training/courses` - List courses (with filters)
- `GET /api/v1/training/courses/:id` - Get course details
- `PUT /api/v1/training/courses/:id` - Update course (Admin)
- `DELETE /api/v1/training/courses/:id` - Delete course (Admin)
- `POST /api/v1/training/courses/:id/materials` - Add materials (Supports multi-file and URLs) (Admin)
- `GET /api/v1/training/courses/:id/materials` - Get materials
- `GET /api/v1/training/materials/:materialId/download` - Stream/download material
- `DELETE /api/v1/training/courses/:courseId/materials/:materialId` - Delete specific material (Admin)

### Enrollment Management
- `POST /api/v1/enrollments` - Enroll employee (Admin)
- `POST /api/v1/enrollments/bulk` - Bulk enrollment (Admin)
- `GET /api/v1/enrollments` - List enrollments (Admin)
- `GET /api/v1/enrollments/:id` - Get enrollment details
- `PATCH /api/v1/enrollments/:id/status` - Update status (Admin)
- `DELETE /api/v1/enrollments/:id` - Delete enrollment (Admin)

### Employee Portal
- `GET /api/v1/employee-portal/courses` - Get available courses for logged-in employee (filtered by access)
- `GET /api/v1/employee-portal/enrollments` - Get employee's enrollments
- `GET /api/v1/employee-portal/profile` - Get employee's profile
- `GET /api/v1/employee-portal/certificates` - Get all user certificates
- `POST /api/v1/employee-portal/enrollments/:id/certificate` - Upload completion certificate
- `GET /api/v1/employee-portal/enrollments/:id/certificate/file` - Stream the certificate file

### Dashboard, Reports & Analytics
- `GET /api/v1/dashboard/metrics` - Get dashboard metrics
- `GET /api/v1/dashboard/upcoming` - Get upcoming courses
- `GET /api/v1/dashboard/top-courses` - Get top performing courses
- `GET /api/v1/dashboard/department-stats` - Get department statistics
- `GET /api/v1/reports/training` - Get training execution reports (monthly, quarterly, half-year, yearly)

### Data Synchronization
- `POST /api/v1/sync/all` - Sync all master data and employees
- `POST /api/v1/sync/departments` - Sync department master data
- `POST /api/v1/sync/employees/all` - Sync employee data from external DB

## 🎯 Location Logic

The system supports three types of training formats:

### 1. **ONLINE Training**
```json
{
  "format": "ONLINE",
  "location": "https://zoom.us/j/123456789"
}
```

### 2. **ONSITE DOMESTIC Training**
```json
{
  "format": "ONSITE",
  "location_type": "DOMESTIC",
  "location": "Grand Conference Center, Downtown"
}
```

### 3. **ONSITE INTERNATIONAL Training**
```json
{
  "format": "ONSITE",
  "location_type": "INTERNATIONAL",
  "country": "Singapore"
}
```

## 🏢 Employee Organization Management

The Employee Organization module manages the organizational hierarchy and employee assignments within the system.

### Organizational Structure
The system supports a multi-level organizational hierarchy:
- **Department** (ຝ່າຍ/ກົມ) - Top-level organizational unit
- **Division** (ພະແນກ) - Sub-unit under Department
- **Unit** (ໜ່ວຍງານ) - Sub-unit under Division
- **Position** (ຊື່ຕຳແໜ່ງ) - Job position
- **Position Code** (ລະຫັດຕຳແໜ່ງ) - Position classification (e.g., Member, Manager)

### Key Features
- Assign employees to departments, divisions, units, and positions
- Query employees by organizational unit
- View organizational structure overview
- Track employee hierarchy and reporting relationships

### Sample API Requests

**Get organizational summary:**
```bash
GET /api/v1/employee-organization/summary
```

**Assign employee to organizational units:**
```bash
PUT /api/v1/employee-organization/:employeeId
{
  "department_id": 1,
  "division_id": 2,
  "unit_id": 3,
  "position_id": 10,
  "pos_code_id": 5
}
```

**Get employees by department:**
```bash
GET /api/v1/employee-organization/department/:departmentId
```

**Get employees with org filters:**
```bash
GET /api/v1/employee-organization/all?departmentId=1&divisionId=2
```

## 🔐 Role-Based Access Control

### ADMIN Role
- Full access to all endpoints
- Create, update, delete courses and categories
- Manage enrollments
- Manage employee organizational assignments
- View all analytics

### EMPLOYEE Role
- View personal profile and courses
- View training catalog
- View personal organizational information
- Limited dashboard access

## 📊 Database Schema Highlights

- **Employee**: User accounts with structural affiliation, roles, and Technical/Administrative categorization (`SpecialSubject`)
- **TrainingCategory**: Course categories
- **Course**: Training programs with flexible location fields, trainers, institutions, and organizers included
- **CourseMaterial**: Supports PDF files, Office documents, Images, or direct URL links
- **Enrollment**: Employee-Course assignments with status tracking and completion certificate uploads

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables for Production

Ensure these are set:
- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Secure database connection string
- Proper CORS configuration

## 📚 Additional Commands

```bash
# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio (GUI)
npm run prisma:seed        # Seed database

# Development
npm run start              # Start application
npm run start:dev          # Start with hot reload
npm run start:debug        # Start in debug mode

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier
```

## 🛡️ Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Role-based access control
- ✅ Input validation on all endpoints
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ SQL injection prevention (Prisma)

## 📝 Development Notes

### Adding New Features

1. Create module using NestJS CLI:
   ```bash
   nest g module feature-name
   nest g service feature-name
   nest g controller feature-name
   ```

2. Update Prisma schema if needed
3. Generate migration: `npm run prisma:migrate`
4. Update DTOs with validation
5. Add Swagger documentation

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

## 🤝 Contributing

1. Follow NestJS best practices
2. Use TypeScript strict mode
3. Add Swagger documentation for all endpoints
4. Write unit tests for services
5. Validate all inputs with DTOs

## 📄 License

MIT License

## 👥 Support

For issues or questions, please create an issue in the repository.

---

Built with ❤️ using NestJS, Prisma, and PostgreSQL