import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ApplyToProcessDto } from './dto/apply-to-process.dto';
import { UpdateWorkerProcessStatusDto } from './dto/update-worker-process-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('workers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY)
  create(@Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.create(createWorkerDto);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN_TALENTREE)
  getStats() {
    return this.workersService.getStats();
  }

  @Get()
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR)
  findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR, UserRole.WORKER)
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(id);
  }

  @Get('email/:email')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR)
  findByEmail(@Param('email') email: string) {
    return this.workersService.findByEmail(email);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.WORKER)
  update(@Param('id') id: string, @Body() updateWorkerDto: UpdateWorkerDto) {
    return this.workersService.update(id, updateWorkerDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_TALENTREE)
  remove(@Param('id') id: string) {
    return this.workersService.remove(id);
  }

  // WorkerProcess endpoints
  @Post('apply-to-process')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.WORKER)
  applyToProcess(@Body() applyDto: ApplyToProcessDto) {
    return this.workersService.applyToProcess(applyDto);
  }

  @Get(':workerId/processes')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR, UserRole.WORKER)
  getWorkerProcesses(@Param('workerId') workerId: string) {
    return this.workersService.getWorkerProcesses(workerId);
  }

  @Get('process/:processId/workers')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR)
  getProcessWorkers(@Param('processId') processId: string) {
    return this.workersService.getProcessWorkers(processId);
  }

  @Patch('worker-process/:id/status')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR)
  updateWorkerProcessStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkerProcessStatusDto,
  ) {
    return this.workersService.updateWorkerProcessStatus(id, updateDto);
  }

  @Get('worker-process/:id')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR, UserRole.WORKER)
  getWorkerProcessById(@Param('id') id: string) {
    return this.workersService.getWorkerProcessById(id);
  }
}
