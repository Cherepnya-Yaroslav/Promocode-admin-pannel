import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import {
  PromoCode,
  type PromoCodeDocument
} from '../database/schemas/promocode.schema';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { ListPromocodesQueryDto } from './dto/list-promocodes-query.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { PromocodesListResponseDto } from './dto/promocodes-list-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';

@Injectable()
export class PromocodesService {
  constructor(
    @InjectModel(PromoCode.name)
    private readonly promoCodeModel: Model<PromoCodeDocument>,
    private readonly analyticsSyncService: AnalyticsSyncService,
    private readonly analyticsCacheService: AnalyticsCacheService
  ) {}

  async listPromocodes(
    queryDto: ListPromocodesQueryDto
  ): Promise<PromocodesListResponseDto> {
    const filter = this.buildListFilter(queryDto);
    const page = queryDto.page;
    const pageSize = queryDto.pageSize;

    const [items, totalCount] = await Promise.all([
      this.promoCodeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.promoCodeModel.countDocuments(filter)
    ]);

    return {
      items: items.map((item) =>
        PromocodeResponseDto.fromPromocodeDocument(item)
      ),
      page,
      pageSize,
      totalCount
    };
  }

  async createPromocode(
    createPromocodeDto: CreatePromocodeDto
  ): Promise<PromocodeResponseDto> {
    this.validateDiscountConfiguration(
      createPromocodeDto.discountType,
      createPromocodeDto.discountValue
    );
    this.validateDateWindow(
      createPromocodeDto.dateFrom,
      createPromocodeDto.dateTo
    );
    this.validateUsageLimits(
      createPromocodeDto.totalUsageLimit,
      createPromocodeDto.perUserUsageLimit
    );

    const normalizedCode = createPromocodeDto.code.trim().toUpperCase();
    const existingPromocode = await this.promoCodeModel
      .findOne({ code: normalizedCode })
      .exec();

    if (existingPromocode) {
      throw new ConflictException(
        'Promocode with this code already exists.'
      );
    }

    const promocode = await this.promoCodeModel.create({
      code: normalizedCode,
      description: createPromocodeDto.description.trim(),
      discountType: createPromocodeDto.discountType,
      discountValue: createPromocodeDto.discountValue,
      maxDiscountAmount: createPromocodeDto.maxDiscountAmount,
      minOrderAmount: createPromocodeDto.minOrderAmount,
      totalUsageLimit: createPromocodeDto.totalUsageLimit,
      perUserUsageLimit: createPromocodeDto.perUserUsageLimit,
      dateFrom: new Date(createPromocodeDto.dateFrom),
      dateTo: new Date(createPromocodeDto.dateTo),
      isActive: createPromocodeDto.isActive ?? true
    });

    await this.analyticsSyncService.syncPromocode(promocode._id.toString());
    await this.analyticsCacheService.invalidatePromocodesAnalytics();

    return PromocodeResponseDto.fromPromocodeDocument(promocode);
  }

  async getPromocodeById(id: string): Promise<PromocodeResponseDto> {
    const promocode = await this.promoCodeModel.findById(id).exec();

    if (!promocode) {
      throw new NotFoundException(`Promocode ${id} was not found.`);
    }

    return PromocodeResponseDto.fromPromocodeDocument(promocode);
  }

  async updatePromocode(
    id: string,
    updatePromocodeDto: UpdatePromocodeDto
  ): Promise<PromocodeResponseDto> {
    const promocode = await this.promoCodeModel.findById(id).exec();

    if (!promocode) {
      throw new NotFoundException(`Promocode ${id} was not found.`);
    }

    const nextDateFrom = updatePromocodeDto.dateFrom ?? promocode.dateFrom.toISOString();
    const nextDateTo = updatePromocodeDto.dateTo ?? promocode.dateTo.toISOString();
    const nextDiscountValue =
      updatePromocodeDto.discountValue ?? promocode.discountValue;

    this.validateDiscountConfiguration(
      promocode.discountType,
      nextDiscountValue
    );
    this.validateDateWindow(nextDateFrom, nextDateTo);
    this.validateUsageLimits(
      updatePromocodeDto.totalUsageLimit ?? promocode.totalUsageLimit,
      updatePromocodeDto.perUserUsageLimit ?? promocode.perUserUsageLimit
    );

    if (updatePromocodeDto.description !== undefined) {
      promocode.description = updatePromocodeDto.description.trim();
    }

    if (updatePromocodeDto.discountValue !== undefined) {
      promocode.discountValue = updatePromocodeDto.discountValue;
    }

    if (updatePromocodeDto.maxDiscountAmount !== undefined) {
      promocode.maxDiscountAmount = updatePromocodeDto.maxDiscountAmount;
    }

    if (updatePromocodeDto.minOrderAmount !== undefined) {
      promocode.minOrderAmount = updatePromocodeDto.minOrderAmount;
    }

    if (updatePromocodeDto.totalUsageLimit !== undefined) {
      promocode.totalUsageLimit = updatePromocodeDto.totalUsageLimit;
    }

    if (updatePromocodeDto.perUserUsageLimit !== undefined) {
      promocode.perUserUsageLimit = updatePromocodeDto.perUserUsageLimit;
    }

    if (updatePromocodeDto.dateFrom !== undefined) {
      promocode.dateFrom = new Date(updatePromocodeDto.dateFrom);
    }

    if (updatePromocodeDto.dateTo !== undefined) {
      promocode.dateTo = new Date(updatePromocodeDto.dateTo);
    }

    if (updatePromocodeDto.isActive !== undefined) {
      promocode.isActive = updatePromocodeDto.isActive;
    }

    await promocode.save();
    await this.analyticsSyncService.syncPromocode(promocode._id.toString());
    await this.analyticsCacheService.invalidatePromocodesAnalytics();

    return PromocodeResponseDto.fromPromocodeDocument(promocode);
  }

  async deactivatePromocode(id: string): Promise<PromocodeResponseDto> {
    const promocode = await this.promoCodeModel.findById(id).exec();

    if (!promocode) {
      throw new NotFoundException(`Promocode ${id} was not found.`);
    }

    promocode.isActive = false;

    await promocode.save();
    await this.analyticsSyncService.syncPromocode(promocode._id.toString());
    await this.analyticsCacheService.invalidatePromocodesAnalytics();

    return PromocodeResponseDto.fromPromocodeDocument(promocode);
  }

  private validateDateWindow(dateFrom: string, dateTo: string): void {
    const dateFromValue = new Date(dateFrom);
    const dateToValue = new Date(dateTo);

    if (dateToValue <= dateFromValue) {
      throw new BadRequestException(
        'Promocode dateTo must be later than dateFrom.'
      );
    }
  }

  private validateDiscountConfiguration(
    discountType: PromoCodeDocument['discountType'],
    discountValue: number
  ): void {
    if (discountType === 'PERCENT' && discountValue > 100) {
      throw new BadRequestException(
        'Percent-based promocodes cannot exceed 100 percent discount.'
      );
    }
  }

  private validateUsageLimits(
    totalUsageLimit?: number,
    perUserUsageLimit?: number
  ): void {
    if (
      totalUsageLimit !== undefined &&
      perUserUsageLimit !== undefined &&
      perUserUsageLimit > totalUsageLimit
    ) {
      throw new BadRequestException(
        'Promocode per-user usage limit cannot exceed total usage limit.'
      );
    }
  }

  private buildListFilter(
    queryDto: ListPromocodesQueryDto
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (queryDto.isActive !== undefined) {
      filter.isActive = queryDto.isActive;
    }

    if (queryDto.search) {
      const searchRegex = new RegExp(
        this.escapeRegex(queryDto.search),
        'i'
      );

      filter.$or = [{ code: searchRegex }, { description: searchRegex }];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
