import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SelectionProcess } from './entities/selection-process.entity';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto, AssignEvaluatorsDto } from './dto/update-process.dto';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';

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

    // Verificar que todos los usuarios son evaluadores
    const evaluators = await this.usersService.findAll();
    const validEvaluators = evaluators.filter(
      (user) =>
        assignEvaluatorsDto.evaluatorIds.includes(user.id) &&
        user.role === UserRole.EVALUATOR,
    );

    if (validEvaluators.length !== assignEvaluatorsDto.evaluatorIds.length) {
      throw new ConflictException(
        'Algunos usuarios no son evaluadores válidos',
      );
    }

    process.evaluators = validEvaluators;
    return this.processRepository.save(process);
  }

  async getEvaluators(id: string): Promise<any[]> {
    const process = await this.findOne(id);
    return process.evaluators || [];
  }
}
