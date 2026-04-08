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
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AttendanceService } from './attendance.service';
import { AttendanceCorrectionLogResponseDto } from './dto/attendance-correction-response.dto';
import {
  AttendanceAlertsResponseDto,
  AttendanceOfflineContextResponseDto,
  AttendanceOfflineSyncResponseDto,
  AttendanceRegularizationResponseDto,
  MonthlyAttendanceReportResponseDto,
  AttendanceRecordResponseDto,
  DailyAttendanceResponseDto,
  MyAttendanceHistoryResponseDto,
} from './dto/attendance-response.dto';
import { CreateAttendanceByScanDto } from './dto/create-attendance-by-scan.dto';
import { CreateAttendanceManualDto } from './dto/create-attendance-manual.dto';
import { QueryAttendanceAlertsDto } from './dto/query-attendance-alerts.dto';
import { QueryAttendanceExportDto } from './dto/query-attendance-export.dto';
import { QueryAttendanceOfflineContextDto } from './dto/query-attendance-offline-context.dto';
import { QueryAttendanceRegularizationDto } from './dto/query-attendance-regularization.dto';
import { QueryDailyAttendanceDto } from './dto/query-daily-attendance.dto';
import { QueryMonthlyAttendanceReportDto } from './dto/query-monthly-attendance-report.dto';
import { QueryMyAttendanceHistoryDto } from './dto/query-my-attendance-history.dto';
import { SyncOfflineAttendanceBatchDto } from './dto/sync-offline-attendance.dto';
import { UpsertAttendanceDayStatusDto } from './dto/upsert-attendance-day-status.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  registerByScan(
    @Body() dto: CreateAttendanceByScanDto,
    @AuthUser() recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.registerByScan(dto, recordedBy);
  }

  @Post('manual')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  registerManual(
    @Body() dto: CreateAttendanceManualDto,
    @AuthUser() recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.registerManual(dto, recordedBy);
  }

  @Get('offline/context')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  getOfflineContext(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAttendanceOfflineContextDto,
  ): Promise<AttendanceOfflineContextResponseDto> {
    return this.attendanceService.getOfflineContext(authUser, query);
  }

  @Post('offline/sync')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  syncOfflineAttendance(
    @Body() dto: SyncOfflineAttendanceBatchDto,
    @AuthUser() recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceOfflineSyncResponseDto> {
    return this.attendanceService.syncOfflineAttendance(dto, recordedBy);
  }

  @Get('daily')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
  )
  getDailyAttendance(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryDailyAttendanceDto,
  ): Promise<DailyAttendanceResponseDto> {
    return this.attendanceService.getDailyAttendance(authUser, query);
  }

  @Get('alerts')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
  )
  getAttendanceAlerts(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAttendanceAlertsDto,
  ): Promise<AttendanceAlertsResponseDto> {
    return this.attendanceService.getAttendanceAlerts(authUser, query);
  }

  @Get('regularization')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  getAttendanceRegularization(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAttendanceRegularizationDto,
  ): Promise<AttendanceRegularizationResponseDto> {
    return this.attendanceService.getAttendanceRegularization(authUser, query);
  }

  @Get('export')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  async exportAttendance(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAttendanceExportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.attendanceService.exportAttendance(authUser, query);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');

    return new StreamableFile(file.buffer);
  }

  @Get('reports/monthly')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  getMonthlyAttendanceReport(
    @Query() query: QueryMonthlyAttendanceReportDto,
  ): Promise<MonthlyAttendanceReportResponseDto> {
    return this.attendanceService.getMonthlyAttendanceReport(query);
  }

  @Get('me/history')
  @Roles(UserRole.STUDENT)
  getMyAttendanceHistory(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryMyAttendanceHistoryDto,
  ): Promise<MyAttendanceHistoryResponseDto> {
    return this.attendanceService.getMyAttendanceHistory(authUser, query);
  }

  @Post('day-status')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  upsertAttendanceDayStatus(
    @Body() dto: UpsertAttendanceDayStatusDto,
    @AuthUser() recordedBy: AuthenticatedRequestUser,
  ) {
    return this.attendanceService.upsertAttendanceDayStatus(dto, recordedBy);
  }

  @Delete('day-status/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  resolveAttendanceDayStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() resolvedBy: AuthenticatedRequestUser,
  ) {
    return this.attendanceService.resolveAttendanceDayStatus(id, resolvedBy);
  }

  @Patch('records/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  correctAttendanceRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAttendanceRecordDto,
    @AuthUser() correctedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.correctAttendanceRecord(id, dto, correctedBy);
  }

  @Get('records/:id/corrections')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.AUXILIARY)
  getAttendanceCorrectionHistory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<AttendanceCorrectionLogResponseDto[]> {
    return this.attendanceService.getAttendanceCorrectionHistory(id, authUser);
  }
}
