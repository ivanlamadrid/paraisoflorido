import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionModule } from '../institution/institution.module';
import { PasswordChangeLog } from './entities/password-change-log.entity';
import { PasswordResetLog } from './entities/password-reset-log.entity';
import { TutorAssignment } from './entities/tutor-assignment.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    InstitutionModule,
    TypeOrmModule.forFeature([
      User,
      PasswordChangeLog,
      PasswordResetLog,
      TutorAssignment,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
