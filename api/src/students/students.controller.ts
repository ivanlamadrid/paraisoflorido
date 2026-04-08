import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentFollowUpsOverviewDto } from './dto/query-student-follow-ups-overview.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import {
  CreateStudentFollowUpDto,
  UpdateStudentFollowUpDto,
} from './dto/student-follow-up.dto';
import {
  CreateStudentContactDto,
  StudentContactResponseDto,
  UpdateStudentContactDto,
} from './dto/student-contact.dto';
import {
  StudentConsentResponseDto,
  StudentDetailResponseDto,
  StudentFollowUpOverviewResponseDto,
  StudentFollowUpResponseDto,
  StudentResponseDto,
} from './dto/student-response.dto';
import { UpdateStudentConsentDto } from './dto/update-student-consent.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentSituationDto } from './dto/update-student-situation.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  createStudent(
    @Body() dto: CreateStudentDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.createStudent(dto, authUser);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  listStudents(@Query() query: QueryStudentsDto): Promise<{
    items: StudentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.studentsService.listStudents(query);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  getMyStudentProfile(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentResponseDto> {
    return this.studentsService.getStudentProfile(authUser);
  }

  @Get('me/profile')
  @Roles(UserRole.STUDENT)
  getMyInstitutionalProfile(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.getMyInstitutionalProfile(authUser);
  }

  @Get('follow-ups/overview')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  getStudentFollowUpsOverview(
    @Query() query: QueryStudentFollowUpsOverviewDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpOverviewResponseDto> {
    return this.studentsService.getStudentFollowUpsOverview(query, authUser);
  }

  @Get('code/:code')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  findByCode(@Param('code') code: string): Promise<StudentResponseDto> {
    return this.studentsService.findByCode(code);
  }

  @Get(':id/profile')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
  )
  getStudentInstitutionalProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.getStudentInstitutionalProfile(id, authUser);
  }

  @Patch(':id/profile')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateStudentProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.updateStudent(id, dto, authUser);
  }

  @Patch(':id/situation')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateStudentSituation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentSituationDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.updateStudentSituation(id, dto, authUser);
  }

  @Patch(':id/consent')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateStudentConsent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentConsentDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentConsentResponseDto | null> {
    return this.studentsService.updateStudentConsent(id, dto, authUser);
  }

  @Get(':id/contacts')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
  )
  getStudentContacts(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    return this.studentsService.getStudentContacts(id, authUser);
  }

  @Post(':id/contacts')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  createStudentContact(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateStudentContactDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    return this.studentsService.createStudentContact(id, dto, authUser);
  }

  @Patch(':id/contacts/:contactId')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateStudentContact(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @Body() dto: UpdateStudentContactDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    return this.studentsService.updateStudentContact(
      id,
      contactId,
      dto,
      authUser,
    );
  }

  @Delete(':id/contacts/:contactId')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  deactivateStudentContact(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    return this.studentsService.deactivateStudentContact(
      id,
      contactId,
      authUser,
    );
  }

  @Get(':id/follow-ups')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  getStudentFollowUps(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    return this.studentsService.getStudentFollowUps(id, authUser);
  }

  @Post(':id/follow-ups')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  createStudentFollowUp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateStudentFollowUpDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    return this.studentsService.createStudentFollowUp(id, dto, authUser);
  }

  @Patch(':id/follow-ups/:followUpId')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  updateStudentFollowUp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('followUpId', new ParseUUIDPipe()) followUpId: string,
    @Body() dto: UpdateStudentFollowUpDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    return this.studentsService.updateStudentFollowUp(
      id,
      followUpId,
      dto,
      authUser,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
  )
  getStudentDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.getStudentDetail(id, authUser);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.updateStudent(id, dto, authUser);
  }
}
