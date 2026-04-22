// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express'; // ✅ เพิ่ม
import { join } from 'path'; // ✅ เพิ่ม
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ✅ ປ່ຽນ generic type ໃຫ້ເປັນ NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // ========== SECURITY ==========
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // ✅ ອະນຸຍາດໃຫ້ frontend ໂຫລດໄຟລ໌ໄດ້
    }),
  );

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // ========== STATIC FILES ==========
  // ✅ Serve uploads folder — ເຂົ້າເຖິງໄດ້ທີ່ http://localhost:3000/uploads/...
  app.useStaticAssets(join(process.cwd(), '..', 'uploads'), {
    prefix: '/uploads',
  });
  logger.log(`📂 Static path: ${join(process.cwd(), '..', 'uploads')}`);
  logger.log(`📂 CWD: ${process.cwd()}`);

  // ========== GLOBAL CONFIGURATION ==========
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ========== SWAGGER DOCUMENTATION ==========
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Training & Development System API')
    .setDescription(
      `
      Complete REST API for Training & Development Management System
      
      ## Features
      - **Authentication**: JWT-based authentication with role-based access control
      - **Employee Management**: Profile management and course viewing
      - **Training Programs**: Manage categories, courses, and materials
      - **Enrollment System**: Assign courses and track progress
      - **Dashboard & Analytics**: Real-time metrics and upcoming courses
      
      ## Location Logic
      - **ONLINE**: location stores the meeting link
      - **ONSITE + DOMESTIC**: location stores the venue name
      - **ONSITE + INTERNATIONAL**: country stores the country name
      
      ## Roles
      - **ADMIN**: Full access to all features
      - **EMPLOYEE**: Limited access to personal profile and enrolled courses
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and registration')
    .addTag('Employee Management', 'Employee profiles and course viewing')
    .addTag(
      'Training Management',
      'Training categories, courses, and materials',
    )
    .addTag('Enrollment Management', 'Course assignments and status tracking')
    .addTag(
      'Dashboard & Analytics',
      'Metrics, statistics, and upcoming courses',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ========== START SERVER ==========
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`📁 Static files: http://localhost:${port}/uploads`); // ✅ ເພີ່ມ log
  logger.log(`🔒 Environment: ${configService.get<string>('NODE_ENV')}`);
}

bootstrap();
