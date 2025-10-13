import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReportType } from '../../../common/enums/report-type.enum';
import { User } from '../../users/entities/user.entity';
import { SelectionProcess } from '../../processes/entities/selection-process.entity';
import { Worker } from '../../workers/entities/worker.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'jsonb', nullable: true })
  content: Record<string, any>;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ type: 'date', nullable: true })
  generatedDate: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => SelectionProcess, { eager: true, nullable: true })
  @JoinColumn({ name: 'process_id' })
  process: SelectionProcess;

  @ManyToOne(() => Worker, { eager: true, nullable: true })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
