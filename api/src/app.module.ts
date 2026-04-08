import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModule } from './attendance/attendance.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { HealthModule } from './health/health.module';
import { InstitutionModule } from './institution/institution.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        APP_ORIGIN: Joi.string().required(),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
        INITIAL_STUDENT_PASSWORD: Joi.string().min(8).required(),
        SCHOOL_NAME: Joi.string().default('Colegio Paraiso Florido 3082'),
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildTypeOrmOptions({
          nodeEnv: config.get<string>('NODE_ENV') ?? 'development',
          host: config.get<string>('DB_HOST') ?? '',
          port: config.get<number>('DB_PORT') ?? 5432,
          username: config.get<string>('DB_USER') ?? '',
          password: config.get<string>('DB_PASSWORD') ?? '',
          database: config.get<string>('DB_NAME') ?? '',
        }),
    }),

    InstitutionModule,
    AttendanceModule,
    AnnouncementsModule,
    UsersModule,
    StudentsModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
