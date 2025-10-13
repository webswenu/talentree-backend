import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestResponsesService } from './test-responses.service';
import { TestResponsesController } from './test-responses.controller';
import { TestResponse } from './entities/test-response.entity';
import { TestAnswer } from './entities/test-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TestResponse, TestAnswer])],
  controllers: [TestResponsesController],
  providers: [TestResponsesService],
  exports: [TestResponsesService],
})
export class TestResponsesModule {}
