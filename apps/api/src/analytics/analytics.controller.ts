import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsListResponseDto } from './dto/analytics-list-response.dto';
import { PromoUsageAnalyticsRowDto } from './dto/promo-usage-analytics-row.dto';
import { PromoUsagesAnalyticsQueryDto } from './dto/promo-usages-analytics-query.dto';
import { PromocodeAnalyticsRowDto } from './dto/promocode-analytics-row.dto';
import { PromocodesAnalyticsQueryDto } from './dto/promocodes-analytics-query.dto';
import { UserAnalyticsRowDto } from './dto/user-analytics-row.dto';
import { UsersAnalyticsQueryDto } from './dto/users-analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@ApiExtraModels(
  AnalyticsListResponseDto,
  UserAnalyticsRowDto,
  PromocodeAnalyticsRowDto,
  PromoUsageAnalyticsRowDto
)
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Read user analytics from ClickHouse only',
    description:
      'Returns server-side paginated user exposure rows with whitelisted sorting, date filtering, and Redis query caching.'
  })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AnalyticsListResponseDto) },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(UserAnalyticsRowDto) }
            }
          }
        }
      ]
    }
  })
  async getUsersAnalytics(
    @Query() queryDto: UsersAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<UserAnalyticsRowDto>> {
    return this.analyticsService.getUsersAnalytics(queryDto);
  }

  @Get('promocodes')
  @ApiOperation({
    summary: 'Read promocode analytics from ClickHouse only',
    description:
      'Returns analytical promocode performance rows with server-side filters, including state and usage filters, backed only by ClickHouse.'
  })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AnalyticsListResponseDto) },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(PromocodeAnalyticsRowDto) }
            }
          }
        }
      ]
    }
  })
  async getPromocodesAnalytics(
    @Query() queryDto: PromocodesAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<PromocodeAnalyticsRowDto>> {
    return this.analyticsService.getPromocodesAnalytics(queryDto);
  }

  @Get('promo-usages')
  @ApiOperation({
    summary: 'Read promo usage ledger rows from ClickHouse only',
    description:
      'Returns the audit-style promo usage ledger with server-side filtering for codes, users, discount type, currency, and discount amount ranges.'
  })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AnalyticsListResponseDto) },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(PromoUsageAnalyticsRowDto) }
            }
          }
        }
      ]
    }
  })
  async getPromoUsagesAnalytics(
    @Query() queryDto: PromoUsagesAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<PromoUsageAnalyticsRowDto>> {
    return this.analyticsService.getPromoUsagesAnalytics(queryDto);
  }
}
