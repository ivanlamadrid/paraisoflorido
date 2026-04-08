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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementAdminDetailResponseDto,
  AnnouncementAdminListResponseDto,
  AnnouncementDetailResponseDto,
  AnnouncementFeedResponseDto,
  AnnouncementReadResponseDto,
  AnnouncementUnreadCountResponseDto,
} from './dto/announcement-response.dto';
import { QueryAdminAnnouncementsDto } from './dto/query-admin-announcements.dto';
import { QueryAnnouncementFeedDto } from './dto/query-announcement-feed.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @AuthUser() createdBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    return this.announcementsService.createAnnouncement(dto, createdBy);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  updateAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @AuthUser() updatedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    return this.announcementsService.updateAnnouncement(id, dto, updatedBy);
  }

  @Post(':id/publish')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  publishAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() publishedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    return this.announcementsService.publishAnnouncement(id, publishedBy);
  }

  @Post(':id/archive')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  archiveAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() archivedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    return this.announcementsService.archiveAnnouncement(id, archivedBy);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  deleteAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() deletedBy: AuthenticatedRequestUser,
  ): Promise<{ id: string; message: string }> {
    return this.announcementsService.deleteAnnouncement(id, deletedBy);
  }

  @Get('admin')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  getAdminAnnouncements(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAdminAnnouncementsDto,
  ): Promise<AnnouncementAdminListResponseDto> {
    return this.announcementsService.getAdminAnnouncements(query, authUser);
  }

  @Get('admin/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR)
  getAdminAnnouncementById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    return this.announcementsService.getAdminAnnouncementById(id, authUser);
  }

  @Get('feed')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
    UserRole.STUDENT,
  )
  getFeed(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Query() query: QueryAnnouncementFeedDto,
  ): Promise<AnnouncementFeedResponseDto> {
    return this.announcementsService.getFeed(authUser, query);
  }

  @Get('feed/unread-count')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
    UserRole.STUDENT,
  )
  getUnreadCount(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementUnreadCountResponseDto> {
    return this.announcementsService.getUnreadCount(authUser);
  }

  @Get(':id')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
    UserRole.STUDENT,
  )
  getAnnouncementDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementDetailResponseDto> {
    return this.announcementsService.getAnnouncementDetail(id, authUser);
  }

  @Post(':id/read')
  @Roles(
    UserRole.DIRECTOR,
    UserRole.SECRETARY,
    UserRole.AUXILIARY,
    UserRole.TUTOR,
    UserRole.STUDENT,
  )
  markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementReadResponseDto> {
    return this.announcementsService.markAsRead(id, authUser);
  }
}
