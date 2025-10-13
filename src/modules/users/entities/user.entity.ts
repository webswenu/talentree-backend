import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.WORKER,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations (will be added as we create other entities)
  // @OneToOne(() => Company, company => company.user)
  // company: Company;

  // @OneToMany(() => SelectionProcess, process => process.createdBy)
  // createdProcesses: SelectionProcess[];

  // @OneToMany(() => Report, report => report.uploadedBy)
  // uploadedReports: Report[];

  // @OneToMany(() => AuditLog, log => log.user)
  // auditLogs: AuditLog[];

  // @ManyToMany(() => Permission, permission => permission.users)
  // @JoinTable({ name: 'user_permissions' })
  // permissions: Permission[];

  // @ManyToMany(() => SelectionProcess, process => process.evaluators)
  // evaluatedProcesses: SelectionProcess[];
}
