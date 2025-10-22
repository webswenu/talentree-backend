import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly usersService: UsersService,
  ) {}

  async create(createReportDto: CreateReportDto, userId: string): Promise<Report> {
    const { processId, workerId, ...reportData } = createReportDto;

    // Verificar que el usuario existe
    const user = await this.usersService.findOne(userId);

    const report = this.reportRepository.create({
      ...reportData,
      createdBy: user,
      process: processId ? ({ id: processId } as any) : null,
      worker: workerId ? ({ id: workerId } as any) : null,
      generatedDate: createReportDto.generatedDate
        ? new Date(createReportDto.generatedDate)
        : new Date(),
    });

    return this.reportRepository.save(report);
  }

  async findAll(): Promise<Report[]> {
    return this.reportRepository.find({
      relations: ['createdBy', 'process', 'worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['createdBy', 'process', 'worker'],
    });

    if (!report) {
      throw new NotFoundException(`Report con ID ${id} no encontrado`);
    }

    return report;
  }

  async findByType(type: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { type: type as any },
      relations: ['createdBy', 'process', 'worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProcess(processId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { process: { id: processId } },
      relations: ['createdBy', 'worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByWorker(workerId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { worker: { id: workerId } },
      relations: ['createdBy', 'process'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateReportDto: UpdateReportDto): Promise<Report> {
    const report = await this.findOne(id);

    const { processId, workerId, ...reportData } = updateReportDto;

    Object.assign(report, reportData);

    if (processId !== undefined) {
      report.process = processId ? ({ id: processId } as any) : null;
    }

    if (workerId !== undefined) {
      report.worker = workerId ? ({ id: workerId } as any) : null;
    }

    return this.reportRepository.save(report);
  }

  async remove(id: string): Promise<void> {
    const report = await this.findOne(id);
    await this.reportRepository.remove(report);
  }
}
