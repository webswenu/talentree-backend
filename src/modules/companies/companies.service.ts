import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly usersService: UsersService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const { userId, ...companyData } = createCompanyDto;

    // Verificar que el usuario existe
    const user = await this.usersService.findOne(userId);

    // Verificar que el RUT no esté duplicado
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

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
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

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
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
}
