import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { InstitutionSettingsResponseDto } from './dto/institution-settings-response.dto';
import {
  ExecuteSchoolYearPreparationDto,
  ExecuteSchoolYearPreparationResponseDto,
  SchoolYearPreparationPreviewDto,
  SchoolYearPreparationPreviewResponseDto,
} from './dto/school-year-preparation.dto';
import { UpdateInstitutionSettingsDto } from './dto/update-institution-settings.dto';
import { InstitutionService } from './institution.service';

@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get('settings')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
    UserRole.STUDENT,
  )
  getSettings(): Promise<InstitutionSettingsResponseDto> {
    return this.institutionService.getSettings();
  }

  @Put('settings')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  updateSettings(
    @Body() dto: UpdateInstitutionSettingsDto,
  ): Promise<InstitutionSettingsResponseDto> {
    return this.institutionService.updateSettings(dto);
  }

  @Post('school-year/preparation/preview')
  @Roles(UserRole.DIRECTOR)
  previewSchoolYearPreparation(
    @Body() dto: SchoolYearPreparationPreviewDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<SchoolYearPreparationPreviewResponseDto> {
    return this.institutionService.previewSchoolYearPreparation(dto, authUser);
  }

  @Post('school-year/preparation')
  @Roles(UserRole.DIRECTOR)
  executeSchoolYearPreparation(
    @Body() dto: ExecuteSchoolYearPreparationDto,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<ExecuteSchoolYearPreparationResponseDto> {
    return this.institutionService.executeSchoolYearPreparation(dto, authUser);
  }
}
