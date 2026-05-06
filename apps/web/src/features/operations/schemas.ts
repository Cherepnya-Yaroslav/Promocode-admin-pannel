import { z, type RefinementCtx } from 'zod';

export const discountTypeOptions = ['PERCENT', 'FIXED'] as const;
export const currencyOptions = ['USD', 'EUR', 'GBP'] as const;

function isPositiveNumberString(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isNonNegativeNumberString(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

const optionalMoneyString = z
  .string()
  .trim()
  .refine(
    (value: string) => value === '' || isNonNegativeNumberString(value),
    'Enter a non-negative amount.'
  );

const optionalIntegerString = z
  .string()
  .trim()
  .refine(
    (value: string) => value === '' || isPositiveIntegerString(value),
    'Enter a whole number greater than zero.'
  );

const localDateTimeString = z
  .string()
  .trim()
  .min(1, 'Select a date and time.')
  .refine(
    (value: string) => !Number.isNaN(new Date(value).getTime()),
    'Enter a valid date.'
  );

const promocodeFormShape = {
  code: z.string().trim().min(1, 'Code is required.').max(32, 'Code is too long.'),
  description: z.string().trim().min(1, 'Description is required.').max(120),
  discountType: z.enum(discountTypeOptions),
  discountValue: z
    .string()
    .trim()
    .min(1, 'Discount value is required.')
    .refine(isPositiveNumberString, 'Enter a positive amount.'),
  maxDiscountAmount: optionalMoneyString,
  minOrderAmount: optionalMoneyString,
  totalUsageLimit: optionalIntegerString,
  perUserUsageLimit: optionalIntegerString,
  dateFrom: localDateTimeString,
  dateTo: localDateTimeString,
  isActive: z.boolean()
};

const createPromocodeBaseSchema = z.object(promocodeFormShape);

function validatePromocodeWindowAndLimits(
  value: {
    code?: string;
    description: string;
    discountType?: 'PERCENT' | 'FIXED';
    discountValue: string;
    maxDiscountAmount: string;
    minOrderAmount: string;
    totalUsageLimit: string;
    perUserUsageLimit: string;
    dateFrom: string;
    dateTo: string;
    isActive: boolean;
  },
  context: RefinementCtx
): void {
    if (new Date(value.dateTo).getTime() <= new Date(value.dateFrom).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date.',
        path: ['dateTo']
      });
    }

    if (
      value.discountType === 'PERCENT' &&
      Number(value.discountValue) > 100
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percent discount cannot exceed 100.',
        path: ['discountValue']
      });
    }

    if (
      value.totalUsageLimit !== '' &&
      value.perUserUsageLimit !== '' &&
      Number(value.perUserUsageLimit) > Number(value.totalUsageLimit)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Per-user limit cannot exceed total usage limit.',
        path: ['perUserUsageLimit']
      });
    }
}

export const createPromocodeSchema = createPromocodeBaseSchema.superRefine(
  validatePromocodeWindowAndLimits
);

export const updatePromocodeSchema = createPromocodeBaseSchema
  .omit({ code: true, discountType: true })
  .superRefine(validatePromocodeWindowAndLimits);

export const createOrderSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .refine(isPositiveNumberString, 'Order amount must be greater than zero.'),
  currency: z.enum(currencyOptions)
});

export const applyPromocodeSchema = z.object({
  code: z.string().trim().min(1, 'Promocode is required.')
});

export type CreatePromocodeFormValues = z.infer<typeof createPromocodeSchema>;
export type UpdatePromocodeFormValues = z.infer<typeof updatePromocodeSchema>;
export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
export type ApplyPromocodeFormValues = z.infer<typeof applyPromocodeSchema>;
