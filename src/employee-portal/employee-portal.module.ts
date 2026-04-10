import { Module } from '@nestjs/common';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeePortalController } from './employee-portal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService],
})
export class EmployeePortalModule {}
