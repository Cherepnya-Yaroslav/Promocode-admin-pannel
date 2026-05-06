import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceIdParamDto } from '../common/dto/resource-id-param.dto';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { ListPromocodesQueryDto } from './dto/list-promocodes-query.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { PromocodesListResponseDto } from './dto/promocodes-list-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

@ApiTags('promocodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'spring'
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiOkResponse({ type: PromocodesListResponseDto })
  async listPromocodes(
    @Query() queryDto: ListPromocodesQueryDto
  ): Promise<PromocodesListResponseDto> {
    return this.promocodesService.listPromocodes(queryDto);
  }

  @Post()
  @ApiCreatedResponse({ type: PromocodeResponseDto })
  async createPromocode(
    @Body() createPromocodeDto: CreatePromocodeDto
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.createPromocode(createPromocodeDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: PromocodeResponseDto })
  async getPromocodeById(
    @Param() params: ResourceIdParamDto
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.getPromocodeById(params.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PromocodeResponseDto })
  async updatePromocode(
    @Param() params: ResourceIdParamDto,
    @Body() updatePromocodeDto: UpdatePromocodeDto
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.updatePromocode(
      params.id,
      updatePromocodeDto
    );
  }

  @Post(':id/deactivate')
  @ApiOkResponse({ type: PromocodeResponseDto })
  async deactivatePromocode(
    @Param() params: ResourceIdParamDto
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.deactivatePromocode(params.id);
  }
}
