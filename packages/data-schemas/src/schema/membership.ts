import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMembershipPlan extends Document {
  _id: Types.ObjectId;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number; // in cents
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  benefits: string[];
  creditAllowance: number; // credits per period, 0 for unlimited
  discountMultiplier: number; // multiplier for API costs (e.g., 0.8 = 20% off)
  enabled: boolean;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const membershipPlanSchema: Schema<IMembershipPlan> = new Schema(
  {
    tier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    benefits: {
      type: [String],
      default: [],
    },
    creditAllowance: {
      type: Number,
      default: 0,
    },
    discountMultiplier: {
      type: Number,
      default: 1.0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

membershipPlanSchema.index({ tier: 1, tenantId: 1 }, { unique: true });

export default membershipPlanSchema;
