import mongoose, { Schema, Document, Types } from 'mongoose';

// @ts-ignore
export interface ITransaction extends Document {
  user: Types.ObjectId;
  conversationId?: string;
  tokenType: 'prompt' | 'completion' | 'credits' | 'recharge' | 'refund';
  model?: string;
  context?: 'default' | 'partial' | 'auto_retry' | 'manual_recharge' | 'refund' | 'ad_reward';
  valueKey?: string;
  rate?: number;
  rawAmount?: number;
  tokenValue?: number;
  inputTokens?: number;
  writeTokens?: number;
  readTokens?: number;
  messageId?: string;
  /** External payment reference for recharge transactions */
  paymentId?: string;
  /** Admin user id for manual recharge */
  adminId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}

const transactionSchema: Schema<ITransaction> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    conversationId: {
      type: String,
      ref: 'Conversation',
      index: true,
    },
    tokenType: {
      type: String,
      enum: ['prompt', 'completion', 'credits', 'recharge', 'refund'],
      required: true,
    },
    model: {
      type: String,
      index: true,
    },
    context: {
      type: String,
      enum: ['default', 'partial', 'auto_retry', 'manual_recharge', 'refund', 'ad_reward'],
    },
    valueKey: {
      type: String,
    },
    rate: Number,
    rawAmount: Number,
    tokenValue: Number,
    inputTokens: { type: Number },
    writeTokens: { type: Number },
    readTokens: { type: Number },
    messageId: { type: String },
    paymentId: { type: String },
    adminId: { type: String },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export default transactionSchema;
