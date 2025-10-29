import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyFilterDto } from './dto/company-filter.dto';
import { SelectionProcess } from '../processes/entities/selection-process.entity';
import { WorkerProcess } from '../workers/entities/worker-process.entity';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { WorkerStatus } from '../../common/enums/worker-status.enum';
import { UsersService } from '../users/users.service';
import { paginate } from '../../common/helpers/pagination.helper';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(SelectionProcess)
    private readonly processRepository: Repository<SelectionProcess>,
    @InjectRepository(WorkerProcess)
    private readonly workerProcessRepository: Repository<WorkerProcess>,
    private readonly usersService: UsersService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const { userId, ...companyData } = createCompanyDto;

    const user = await this.usersService.findOne(userId);

    const existingCompany = await this.companyRepository.findOne({
      where: { rut: companyData.rut },
    });

    if (existingCompany) {
      throw new ConflictException('El RUT ya está registrado');
    }

    const company = this.companyRepository.create({
      ...companyData,
      user,
      contractStartDate: new Date(),
    });

    return this.companyRepository.save(company);
  }

  async findAll(filters?: CompanyFilterDto): Promise<PaginatedResult<Company>> {
    const queryBuilder = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.user', 'user');

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('company.active = :active', {
        active: filters.active,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.rut ILIKE :search OR company.businessName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder.orderBy('company.createdAt', 'DESC');

    return paginate(this.companyRepository, filters || {}, queryBuilder);
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }

  async findByUserId(userId: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const total = await this.companyRepository.count();
    const active = await this.companyRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }

  async getDashboardStats(companyId: string) {
    await this.findOne(companyId);

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const procesosActivos = await this.processRepository.count({
      where: {
        company: { id: companyId },
        status: ProcessStatus.ACTIVE,
      },
    });

    const procesosActivosMesAnterior = await this.processRepository.count({
      where: {
        company: { id: companyId },
        status: ProcessStatus.ACTIVE,
        createdAt: LessThan(oneMonthAgo),
      },
    });

    const procesosActivosNuevos = procesosActivos - procesosActivosMesAnterior;

    const candidatosTotales = await this.workerProcessRepository
      .createQueryBuilder('wp')
      .innerJoin('wp.process', 'process')
      .where('process.company_id = :companyId', { companyId })
      .getCount();

    const candidatosSemanaAnterior = await this.workerProcessRepository
      .createQueryBuilder('wp')
      .innerJoin('wp.process', 'process')
      .where('process.company_id = :companyId', { companyId })
      .andWhere('wp.created_at < :oneWeekAgo', { oneWeekAgo })
      .getCount();

    const candidatosNuevos = candidatosTotales - candidatosSemanaAnterior;

    const candidatosAprobados = await this.workerProcessRepository
      .createQueryBuilder('wp')
      .innerJoin('wp.process', 'process')
      .where('process.company_id = :companyId', { companyId })
      .andWhere('wp.status = :status', { status: WorkerStatus.APPROVED })
      .getCount();

    const tasaAprobacion =
      candidatosTotales > 0
        ? ((candidatosAprobados / candidatosTotales) * 100).toFixed(1)
        : '0.0';

    const procesosCompletados = await this.processRepository.count({
      where: {
        company: { id: companyId },
        status: ProcessStatus.COMPLETED,
        updatedAt: MoreThan(startOfMonth),
      },
    });

    return {
      procesosActivos: {
        total: procesosActivos,
        nuevos: procesosActivosNuevos,
        texto:
          procesosActivosNuevos > 0
            ? `+${procesosActivosNuevos} desde el mes pasado`
            : procesosActivosNuevos < 0
              ? `${procesosActivosNuevos} desde el mes pasado`
              : 'Sin cambios este mes',
      },
      candidatos: {
        total: candidatosTotales,
        nuevos: candidatosNuevos,
        texto:
          candidatosNuevos > 0
            ? `+${candidatosNuevos} esta semana`
            : 'Sin nuevos esta semana',
      },
      candidatosAprobados: {
        total: candidatosAprobados,
        tasaAprobacion: `${tasaAprobacion}% tasa de aprobación`,
      },
      procesosCompletados: {
        total: procesosCompletados,
        texto: 'Este mes',
      },
    };
  }
}
