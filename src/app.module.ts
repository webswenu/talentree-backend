import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { TestsModule } from './modules/tests/tests.module';
import { WorkersModule } from './modules/workers/workers.module';
import { TestResponsesModule } from './modules/test-responses/test-responses.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const rawTtl = config.get<string>('CACHE_TTL_MS');
        const ttl = Number(rawTtl);
        const validTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : undefined;

        const rawMax = config.get<string>('CACHE_MAX');
        const max = Math.max(1, Number(rawMax) || 1000);

        return {
          ...(validTtl ? { ttl: validTtl } : {}),
          max,
        };
      },
    }),

    AuthModule,
    UsersModule,
    CompaniesModule,
    ProcessesModule,
    TestsModule,
    WorkersModule,
    TestResponsesModule,
    ReportsModule,
    AuditModule,
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
