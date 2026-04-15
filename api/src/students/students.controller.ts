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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentExportDto } from './dto/query-student-export.dto';
import { QueryStudentFollowUpsOverviewDto } from './dto/query-student-follow-ups-overview.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import {
  ImportStudentsDto,
  StudentImportPreviewResponseDto,
  StudentImportResultResponseDto,
} from './dto/student-import.dto';
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

type StudentImportFile = {
  buffer: Buffer;
  originalname: string;
};

function isStudentImportFile(value: unknown): value is StudentImportFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Buffer.isBuffer(candidate.buffer) &&
    typeof candidate.originalname === 'string'
  );
}

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

  @Post('import/preview')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  previewStudentsImport(
    @UploadedFile() file: unknown,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentImportPreviewResponseDto> {
    return this.studentsService.previewStudentsImport(
      isStudentImportFile(file)
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
          }
        : undefined,
      authUser,
    );
  }

  @Post('import')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  importStudents(
    @Body() dto: ImportStudentsDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<StudentImportResultResponseDto> {
    return this.studentsService.importStudents(dto, authUser);
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

  @Get('export')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  async exportStudents(
    @Query() query: QueryStudentExportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.studentsService.exportStudents(query);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');

    return new StreamableFile(file.buffer);
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
