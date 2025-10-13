import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SelectionProcess } from './entities/selection-process.entity';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SelectionProcess]),
    CompaniesModule,
    UsersModule,
  ],
  controllers: [ProcessesController],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class ProcessesModule {}
