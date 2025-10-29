import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from './entities/worker.entity';
import { WorkerProcess } from './entities/worker-process.entity';
import { SelectionProcess } from '../processes/entities/selection-process.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ApplyToProcessDto } from './dto/apply-to-process.dto';
import { UpdateWorkerProcessStatusDto } from './dto/update-worker-process-status.dto';
import { WorkerFilterDto } from './dto/worker-filter.dto';
import { WorkerStatus } from '../../common/enums/worker-status.enum';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { paginate } from '../../common/helpers/pagination.helper';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(WorkerProcess)
    private readonly workerProcessRepository: Repository<WorkerProcess>,
    @InjectRepository(SelectionProcess)
    private readonly processRepository: Repository<SelectionProcess>,
  ) {}

  async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    const existingWorker = await this.workerRepository.findOne({
      where: [{ rut: createWorkerDto.rut }, { email: createWorkerDto.email }],
    });

    if (existingWorker) {
      throw new BadRequestException(
        'Trabajador con este RUT o email ya existe',
      );
    }

    const worker = this.workerRepository.create(createWorkerDto);
    return this.workerRepository.save(worker);
  }

  async findAll(filters?: WorkerFilterDto): Promise<PaginatedResult<Worker>> {
    const queryBuilder = this.workerRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.user', 'user')
      .leftJoinAndSelect('worker.workerProcesses', 'workerProcesses');

    if (filters?.status) {
      queryBuilder.andWhere('worker.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(worker.firstName ILIKE :search OR worker.lastName ILIKE :search OR worker.rut ILIKE :search OR worker.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder.orderBy('worker.createdAt', 'DESC');

    return paginate(this.workerRepository, filters || {}, queryBuilder);
  }

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({
      where: { id },
      relations: ['user', 'workerProcesses', 'workerProcesses.process'],
    });

    if (!worker) {
      throw new NotFoundException(`Trabajador con ID ${id} no encontrado`);
    }

    return worker;
  }

  async findByEmail(email: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({
      where: { email },
      relations: ['user', 'workerProcesses'],
    });

    if (!worker) {
      throw new NotFoundException(
        `Trabajador con email ${email} no encontrado`,
      );
    }

    return worker;
  }

  async update(id: string, updateWorkerDto: UpdateWorkerDto): Promise<Worker> {
    const worker = await this.findOne(id);

    if (updateWorkerDto.rut && updateWorkerDto.rut !== worker.rut) {
      const existingWorker = await this.workerRepository.findOne({
        where: { rut: updateWorkerDto.rut },
      });
      if (existingWorker) {
        throw new BadRequestException('RUT ya está en uso');
      }
    }

    if (updateWorkerDto.email && updateWorkerDto.email !== worker.email) {
      const existingWorker = await this.workerRepository.findOne({
        where: { email: updateWorkerDto.email },
      });
      if (existingWorker) {
        throw new BadRequestException('Email ya está en uso');
      }
    }

    Object.assign(worker, updateWorkerDto);
    return this.workerRepository.save(worker);
  }

  async remove(id: string): Promise<void> {
    const worker = await this.findOne(id);
    await this.workerRepository.remove(worker);
  }

  async applyToProcess(applyDto: ApplyToProcessDto): Promise<WorkerProcess> {
    const existingApplication = await this.workerProcessRepository.findOne({
      where: {
        worker: { id: applyDto.workerId },
        process: { id: applyDto.processId },
      },
    });

    if (existingApplication) {
      throw new BadRequestException(
        'El trabajador ya está aplicado a este proceso',
      );
    }

    const workerProcess = this.workerProcessRepository.create({
      worker: { id: applyDto.workerId } as Worker,
      process: { id: applyDto.processId } as any,
      status: WorkerStatus.PENDING,
      appliedAt: new Date(),
      notes: applyDto.notes,
    });

    return this.workerProcessRepository.save(workerProcess);
  }

  async getWorkerProcesses(workerId: string): Promise<WorkerProcess[]> {
    return this.workerProcessRepository.find({
      where: { worker: { id: workerId } },
      relations: ['process', 'testResponses'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProcessWorkers(processId: string): Promise<WorkerProcess[]> {
    return this.workerProcessRepository.find({
      where: { process: { id: processId } },
      relations: ['worker', 'testResponses'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateWorkerProcessStatus(
    workerProcessId: string,
    updateDto: UpdateWorkerProcessStatusDto,
  ): Promise<WorkerProcess> {
    const workerProcess = await this.workerProcessRepository.findOne({
      where: { id: workerProcessId },
      relations: ['worker', 'process'],
    });

    if (!workerProcess) {
      throw new NotFoundException(
        `WorkerProcess con ID ${workerProcessId} no encontrado`,
      );
    }

    Object.assign(workerProcess, updateDto);
    workerProcess.evaluatedAt = new Date();

    return this.workerProcessRepository.save(workerProcess);
  }

  async getWorkerProcessById(id: string): Promise<WorkerProcess> {
    const workerProcess = await this.workerProcessRepository.findOne({
      where: { id },
      relations: ['worker', 'process', 'testResponses'],
    });

    if (!workerProcess) {
      throw new NotFoundException(`WorkerProcess con ID ${id} no encontrado`);
    }

    return workerProcess;
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }> {
    const total = await this.workerRepository.count();

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(WorkerStatus)) {
      byStatus[status] = await this.workerProcessRepository.count({
        where: { status },
      });
    }

    return {
      total,
      byStatus,
    };
  }

  async uploadCV(workerId: string, file: Express.Multer.File): Promise<Worker> {
    const worker = await this.findOne(workerId);

    if (worker.cvUrl) {
      const oldCvPath = path.join(process.cwd(), worker.cvUrl);
      if (fs.existsSync(oldCvPath)) {
        fs.unlinkSync(oldCvPath);
      }
    }

    const cvUrl = `uploads/cvs/${file.filename}`;
    worker.cvUrl = cvUrl;

    return this.workerRepository.save(worker);
  }

  async deleteCV(workerId: string): Promise<Worker> {
    const worker = await this.findOne(workerId);

    if (!worker.cvUrl) {
      throw new BadRequestException('El trabajador no tiene un CV cargado');
    }

    const cvPath = path.join(process.cwd(), worker.cvUrl);
    if (fs.existsSync(cvPath)) {
      fs.unlinkSync(cvPath);
    }

    worker.cvUrl = null;
    return this.workerRepository.save(worker);
  }

  async getCVPath(workerId: string): Promise<string> {
    const worker = await this.findOne(workerId);

    if (!worker.cvUrl) {
      throw new NotFoundException('El trabajador no tiene un CV cargado');
    }

    const cvPath = path.join(process.cwd(), worker.cvUrl);
    if (!fs.existsSync(cvPath)) {
      throw new NotFoundException('El archivo CV no existe en el servidor');
    }

    return cvPath;
  }

  async getDashboardStats(workerId: string) {
    await this.findOne(workerId);

    const totalAplicaciones = await this.workerProcessRepository.count({
      where: { worker: { id: workerId } },
    });

    const enProceso = await this.workerProcessRepository.count({
      where: {
        worker: { id: workerId },
        status: WorkerStatus.IN_PROCESS,
      },
    });

    const finalizadas = await this.workerProcessRepository.count({
      where: {
        worker: { id: workerId },
        status: In([
          WorkerStatus.APPROVED,
          WorkerStatus.REJECTED,
          WorkerStatus.HIRED,
        ]),
      },
    });

    const processIdsApplied = await this.workerProcessRepository
      .createQueryBuilder('wp')
      .select('wp.process_id', 'processId')
      .where('wp.worker_id = :workerId', { workerId })
      .getRawMany();

    const appliedProcessIds = processIdsApplied.map((p) => p.processId);

    const totalActive = await this.processRepository.count({
      where: { status: ProcessStatus.ACTIVE },
    });

    let disponibles: number;

    if (appliedProcessIds.length > 0) {
      const appliedActive = await this.processRepository
        .createQueryBuilder('process')
        .where('process.status = :status', { status: ProcessStatus.ACTIVE })
        .andWhere('process.id IN (:...ids)', { ids: appliedProcessIds })
        .getCount();

      disponibles = totalActive - appliedActive;
    } else {
      disponibles = totalActive;
    }

    return {
      aplicadas: totalAplicaciones,
      enProceso,
      finalizadas,
      disponibles,
    };
  }
}
