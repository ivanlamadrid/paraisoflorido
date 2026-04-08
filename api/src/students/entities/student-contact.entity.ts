import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';

@Entity({ name: 'student_contacts' })
@Index('IDX_student_contacts_student_id_is_active', ['studentId', 'isActive'])
@Index('IDX_student_contacts_student_id_is_primary', ['studentId', 'isPrimary'])
export class StudentContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName: string;

  @Column({ name: 'relationship', type: 'varchar', length: 80 })
  relationship: string;

  @Column({ name: 'phone_primary', type: 'varchar', length: 30 })
  phonePrimary: string;

  @Column({
    name: 'phone_secondary',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phoneSecondary: string | null;

  @Column({ name: 'email', type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_emergency_contact', type: 'boolean', default: false })
  isEmergencyContact: boolean;

  @Column({
    name: 'is_authorized_to_coordinate',
    type: 'boolean',
    default: false,
  })
  isAuthorizedToCoordinate: boolean;

  @Column({
    name: 'is_authorized_to_pick_up',
    type: 'boolean',
    default: false,
  })
  isAuthorizedToPickUp: boolean;

  @Column({ name: 'notes', type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.contacts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}
