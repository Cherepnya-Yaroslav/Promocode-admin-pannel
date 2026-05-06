import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserDto } from './current-user.dto';

export class AuthResponseDto {
  @ApiProperty({ type: CurrentUserDto })
  user!: CurrentUserDto;

  @ApiProperty()
  accessToken!: string;
}
