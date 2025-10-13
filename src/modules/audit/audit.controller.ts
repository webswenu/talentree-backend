import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuditAction } from '../../common/enums/audit-action.enum';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @Roles(UserRole.ADMIN_TALENTREE)
  create(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditService.create(createAuditLogDto);
  }

  @Get()
  @Roles(UserRole.ADMIN_TALENTREE)
  findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.findAll({
      userId,
      action,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN_TALENTREE)
  findByUser(@Query('userId') userId: string) {
    return this.auditService.findByUser(userId);
  }

  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN_TALENTREE)
  findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  @Get('action/:action')
  @Roles(UserRole.ADMIN_TALENTREE)
  findByAction(@Query('action') action: AuditAction) {
    return this.auditService.findByAction(action);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN_TALENTREE)
  getStats() {
    return this.auditService.getStats();
  }
}
