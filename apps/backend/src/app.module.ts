import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [AppController],
})
export class AppModule {}
