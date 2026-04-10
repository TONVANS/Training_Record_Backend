import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollments.service';
import { EnrollmentController } from './enrollments.controller';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentsModule {}
