import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SelectionProcess } from './entities/selection-process.entity';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto, AssignEvaluatorsDto } from './dto/update-process.dto';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProcessStatus } from '../../common/enums/process-status.enum';

@Injectable()
export class ProcessesService {
  constructor(
    @InjectRepository(SelectionProcess)
    private readonly processRepository: Repository<SelectionProcess>,
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createProcessDto: CreateProcessDto,
    userId: string,
  ): Promise<SelectionProcess> {
    const { companyId, ...processData } = createProcessDto;

    // Verificar que la empresa existe
    const company = await this.companiesService.findOne(companyId);

    // Verificar que el usuario existe
    const user = await this.usersService.findOne(userId);

    // Verificar que el código no esté duplicado
    const existingProcess = await this.processRepository.findOne({
      where: { code: processData.code },
    });

    if (existingProcess) {
      throw new ConflictException('El código del proceso ya está registrado');
    }

    const process = this.processRepository.create({
      ...processData,
      company,
      createdBy: user,
    });

    return this.processRepository.save(process);
  }

  async findAll(): Promise<SelectionProcess[]> {
    return this.processRepository.find({
      relations: ['company', 'createdBy', 'evaluators'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyId: string): Promise<SelectionProcess[]> {
    return this.processRepository.find({
      where: { company: { id: companyId } },
      relations: ['company', 'createdBy', 'evaluators'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SelectionProcess> {
    const process = await this.processRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy', 'evaluators'],
    });

    if (!process) {
      throw new NotFoundException(`Proceso con ID ${id} no encontrado`);
    }

    return process;
  }

  async update(
    id: string,
    updateProcessDto: UpdateProcessDto,
  ): Promise<SelectionProcess> {
    const process = await this.findOne(id);
    Object.assign(process, updateProcessDto);
    return this.processRepository.save(process);
  }

  async remove(id: string): Promise<void> {
    const process = await this.findOne(id);
    await this.processRepository.remove(process);
  }

  async assignEvaluators(
    id: string,
    assignEvaluatorsDto: AssignEvaluatorsDto,
  ): Promise<SelectionProcess> {
    const process = await this.findOne(id);

    // Verificar que todos los usuarios existen y son evaluadores
    const validEvaluators = [];
    for (const evaluatorId of assignEvaluatorsDto.evaluatorIds) {
      const user = await this.usersService.findOne(evaluatorId);
      if (user.role !== UserRole.EVALUATOR) {
        throw new ConflictException(
          `Usuario ${user.email} no es un evaluador válido`,
        );
      }
      validEvaluators.push(user);
    }

    process.evaluators = validEvaluators;
    return this.processRepository.save(process);
  }

  async getEvaluators(id: string): Promise<User[]> {
    const process = await this.findOne(id);
    return process.evaluators || [];
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
  }> {
    const total = await this.processRepository.count();

    // Count por status
    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ProcessStatus)) {
      byStatus[status] = await this.processRepository.count({
        where: { status },
      });
    }

    // Procesos por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const processes = await this.processRepository
      .createQueryBuilder('process')
      .select('DATE_TRUNC(\'month\', process.created_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('process.created_at >= :startDate', { startDate: sixMonthsAgo })
      .groupBy('DATE_TRUNC(\'month\', process.created_at)')
      .orderBy('month', 'ASC')
      .getRawMany();

    const byMonth = processes.map((p) => ({
      month: new Date(p.month).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      }),
      count: parseInt(p.count),
    }));

    return {
      total,
      byStatus,
      byMonth,
    };
  }
}
