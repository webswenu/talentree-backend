import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ApplyToProcessDto } from './dto/apply-to-process.dto';
import { UpdateWorkerProcessStatusDto } from './dto/update-worker-process-status.dto';
import { WorkerFilterDto } from './dto/worker-filter.dto';
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
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.EVALUATOR)
  getStats() {
    return this.workersService.getStats();
  }

  @Get()
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.GUEST,
  )
  findAll(@Query() filters: WorkerFilterDto) {
    return this.workersService.findAll(filters);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
    UserRole.GUEST,
  )
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

  @Post('apply-to-process')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.WORKER)
  applyToProcess(@Body() applyDto: ApplyToProcessDto) {
    return this.workersService.applyToProcess(applyDto);
  }

  @Get(':workerId/dashboard-stats')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
  )
  getDashboardStats(@Param('workerId') workerId: string) {
    return this.workersService.getDashboardStats(workerId);
  }

  @Get(':workerId/processes')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
  )
  getWorkerProcesses(@Param('workerId') workerId: string) {
    return this.workersService.getWorkerProcesses(workerId);
  }

  @Get('process/:processId/workers')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.GUEST,
  )
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
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
  )
  getWorkerProcessById(@Param('id') id: string) {
    return this.workersService.getWorkerProcessById(id);
  }

  @Post(':id/upload-cv')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.WORKER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `cv-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Solo se permiten archivos PDF'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadCV(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    return this.workersService.uploadCV(id, file);
  }

  @Get(':id/cv')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
  )
  async downloadCV(@Param('id') id: string, @Res() res: Response) {
    const cvPath = await this.workersService.getCVPath(id);
    res.download(cvPath);
  }

  @Delete(':id/cv')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.WORKER)
  deleteCV(@Param('id') id: string) {
    return this.workersService.deleteCV(id);
  }
}
