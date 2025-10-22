import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto, AssignEvaluatorsDto } from './dto/update-process.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('processes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @Roles(UserRole.ADMIN_TALENTREE)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProcessDto: CreateProcessDto, @Request() req) {
    return this.processesService.create(createProcessDto, req.user.id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN_TALENTREE)
  getStats() {
    return this.processesService.getStats();
  }

  @Get()
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY, UserRole.EVALUATOR)
  findAll(@Query('companyId') companyId?: string) {
    if (companyId) {
      return this.processesService.findByCompany(companyId);
    }
    return this.processesService.findAll();
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN_TALENTREE,
    UserRole.COMPANY,
    UserRole.EVALUATOR,
    UserRole.WORKER,
  )
  findOne(@Param('id') id: string) {
    return this.processesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN_TALENTREE)
  update(@Param('id') id: string, @Body() updateProcessDto: UpdateProcessDto) {
    return this.processesService.update(id, updateProcessDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_TALENTREE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.processesService.remove(id);
  }

  @Post(':id/evaluators')
  @Roles(UserRole.ADMIN_TALENTREE)
  assignEvaluators(
    @Param('id') id: string,
    @Body() assignEvaluatorsDto: AssignEvaluatorsDto,
  ) {
    return this.processesService.assignEvaluators(id, assignEvaluatorsDto);
  }

  @Get(':id/evaluators')
  @Roles(UserRole.ADMIN_TALENTREE, UserRole.COMPANY)
  getEvaluators(@Param('id') id: string) {
    return this.processesService.getEvaluators(id);
  }
}
