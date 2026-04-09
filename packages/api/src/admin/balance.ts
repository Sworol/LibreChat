import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

/** Dependencies for admin balance handlers */
export interface AdminBalanceDeps {
  /** Find a user's balance record */
  findBalanceByUser: (userId: string) => Promise<{ tokenCredits: number } | null>;
  /** Create a transaction and update balance */
  createTransaction: (txData: {
    user: string;
    tokenType: 'recharge' | 'refund';
    context: string;
    rawAmount: number;
    adminId: string;
    balance?: { enabled?: boolean };
  }) => Promise<{ balance: number } | undefined>;
  /** Get transaction history */
  getTransactions: (filter: Record<string, unknown>) => Promise<unknown[]>;
}

export function createAdminBalanceHandlers(deps: AdminBalanceDeps) {
  const { findBalanceByUser, createTransaction, getTransactions } = deps;

  /**
   * POST /admin/balance/add
   * Admin manually adds credits to a user
   */
  async function addCreditsAdmin(req: ServerRequest, res: Response) {
    try {
      const { userId, amount, reason } = req.body as {
        userId: string;
        amount: number;
        reason?: string;
      };

      if (!userId || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid userId or amount' });
      }

      const adminId = req.user.id;

      const result = await createTransaction({
        user: userId,
        tokenType: 'recharge',
        context: reason || 'manual_recharge',
        rawAmount: amount,
        adminId,
        balance: { enabled: true },
      });

      if (!result) {
        return res.status(500).json({ error: 'Failed to add credits' });
      }

      logger.info(`[AdminBalance] Admin ${adminId} added ${amount} credits to user ${userId}`);

      return res.status(200).json({
        success: true,
        balance: result.balance,
        message: `Added ${amount} credits to user`,
      });
    } catch (error) {
      logger.error('[AdminBalance] addCreditsAdmin error:', error);
      return res.status(500).json({ error: 'Failed to add credits' });
    }
  }

  /**
   * GET /admin/balance/:userId
   * Get a specific user's balance
   */
  async function getUserBalanceAdmin(req: ServerRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const balance = await findBalanceByUser(userId);

      return res.status(200).json({
        userId,
        balance: balance?.tokenCredits ?? 0,
      });
    } catch (error) {
      logger.error('[AdminBalance] getUserBalanceAdmin error:', error);
      return res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  /**
   * GET /admin/balance/:userId/transactions
   * Get transaction history for a user
   */
  async function getUserTransactionsAdmin(req: ServerRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const transactions = await getTransactions({
        user: userId,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });

      return res.status(200).json({ transactions });
    } catch (error) {
      logger.error('[AdminBalance] getUserTransactionsAdmin error:', error);
      return res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  return {
    addCreditsAdmin,
    getUserBalanceAdmin,
    getUserTransactionsAdmin,
  };
}
