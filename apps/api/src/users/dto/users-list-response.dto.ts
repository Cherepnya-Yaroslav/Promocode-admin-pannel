import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UsersListResponseDto {
  @ApiProperty({
    type: UserResponseDto,
    isArray: true
  })
  items!: UserResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalCount!: number;
}
