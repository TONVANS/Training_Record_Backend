import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmployeesModule } from './employees/employees.module';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ConfigModule } from '@nestjs/config';
import { SyncModule } from './sync/sync.module';
import { ReportsModule } from './reports/reports.module';
import { EmployeePortalModule } from './employee-portal/employee-portal.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    CronModule,
    PrismaModule,
    EmployeesModule,
    CategoriesModule,
    CoursesModule,
    EnrollmentsModule,
    AuthModule,
    DashboardModule,
    SyncModule,
    ReportsModule,
    EmployeePortalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
