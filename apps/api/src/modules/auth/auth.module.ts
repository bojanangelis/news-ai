import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const privateKey = config.get<string>('jwt.privateKey');
        const publicKey = config.get<string>('jwt.publicKey');
        const useRsa = !!privateKey && !!publicKey;
        return {
          ...(useRsa
            ? { privateKey, publicKey, signOptions: { algorithm: 'RS256' as const }, verifyOptions: { algorithms: ['RS256' as const] } }
            : { secret: config.get<string>('jwt.secret') ?? 'dev-secret-change-in-production' }),
          signOptions: {
            ...(useRsa ? { algorithm: 'RS256' as const } : {}),
            expiresIn: config.get<number>('jwt.accessTokenTtl') ?? 900,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Apply JWT guard globally
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
