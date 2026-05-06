import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ResourceIdParamDto {
  @ApiProperty({
    example: '6818bbca2464de601cb98bd5'
  })
  @IsMongoId()
  id!: string;
}
