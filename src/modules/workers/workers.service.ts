import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './entities/worker.entity';
import { WorkerProcess } from './entities/worker-process.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ApplyToProcessDto } from './dto/apply-to-process.dto';
import { UpdateWorkerProcessStatusDto } from './dto/update-worker-process-status.dto';
import { WorkerStatus } from '../../common/enums/worker-status.enum';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(WorkerProcess)
    private readonly workerProcessRepository: Repository<WorkerProcess>,
  ) {}

  async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    const existingWorker = await this.workerRepository.findOne({
      where: [{ rut: createWorkerDto.rut }, { email: createWorkerDto.email }],
    });

    if (existingWorker) {
      throw new BadRequestException('Trabajador con este RUT o email ya existe');
    }

    const worker = this.workerRepository.create(createWorkerDto);
    return this.workerRepository.save(worker);
  }

  async findAll(): Promise<Worker[]> {
    return this.workerRepository.find({
      relations: ['user', 'workerProcesses'],
      order: { createdAt: 'DESC' },
    });
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
      throw new NotFoundException(`Trabajador con email ${email} no encontrado`);
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

  // WorkerProcess operations
  async applyToProcess(applyDto: ApplyToProcessDto): Promise<WorkerProcess> {
    const existingApplication = await this.workerProcessRepository.findOne({
      where: {
        worker: { id: applyDto.workerId },
        process: { id: applyDto.processId },
      },
    });

    if (existingApplication) {
      throw new BadRequestException('El trabajador ya está aplicado a este proceso');
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
      throw new NotFoundException(`WorkerProcess con ID ${workerProcessId} no encontrado`);
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
}
