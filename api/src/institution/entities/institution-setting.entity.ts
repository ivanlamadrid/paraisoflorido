import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentShift } from '../../common/enums/student-shift.enum';

@Entity({ name: 'institution_settings' })
export class InstitutionSetting {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'school_name', type: 'varchar', length: 160 })
  schoolName: string;

  @Column({ name: 'active_school_year', type: 'smallint' })
  activeSchoolYear: number;

  @Column({ name: 'initial_student_password_hash', type: 'text' })
  initialStudentPasswordHash: string;

  @Column({
    name: 'enabled_turns',
    type: 'varchar',
    array: true,
    length: 20,
  })
  enabledTurns: StudentShift[];

  @Column({
    name: 'enabled_grades',
    type: 'smallint',
    array: true,
  })
  enabledGrades: number[];

  @Column({
    name: 'sections_by_grade',
    type: 'jsonb',
  })
  sectionsByGrade: Record<string, string[]>;

  @Column({
    name: 'initial_student_password_updated_at',
    type: 'timestamptz',
    nullable: true,
  })
  initialStudentPasswordUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
