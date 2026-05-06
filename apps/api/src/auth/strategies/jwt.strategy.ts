import { InjectModel } from '@nestjs/mongoose';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model } from 'mongoose';
import { AppConfigService } from '../../config/app-config.service';
import { User, type UserDocument } from '../../database/schemas/user.schema';
import { CurrentUserDto } from '../dto/current-user.dto';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    appConfigService: AppConfigService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwtSecret
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userModel.findById(payload.sub).exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized.');
    }

    return CurrentUserDto.fromUserDocument(user);
  }
}
