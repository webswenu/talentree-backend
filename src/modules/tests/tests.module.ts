import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { Test } from './entities/test.entity';
import { TestQuestion } from './entities/test-question.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, TestQuestion]),
    UsersModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
