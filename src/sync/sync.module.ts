import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HrmAuthService } from './hrm-auth.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    HrmAuthService, // ✅ ເພີ່ມ
  ],
  exports: [SyncService],
})
export class SyncModule { }
