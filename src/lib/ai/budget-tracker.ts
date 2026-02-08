/**
 * AI Budget Tracker - Monitors API costs across all AI operations
 */

import prisma from '@/lib/db';

// Pricing per 1M tokens (in cents) - OpenRouter pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-2.5-flash': { input: 15, output: 60 },
  'google/gemini-2.0-flash': { input: 10, output: 40 },
  'google/gemini-pro': { input: 50, output: 150 },
  'anthropic/claude-3.5-sonnet': { input: 300, output: 1500 },
  'openai/gpt-4o-mini': { input: 15, output: 60 },
  'openai/gpt-4o': { input: 250, output: 1000 },
};

// Daily budget limits in cents per operation
const DAILY_LIMITS: Record<string, number> = {
  recipe_generation: 200,    // $2.00/day
  image_generation: 100,     // $1.00/day
  semantic_search: 50,       // $0.50/day
  pdf_processing: 150,       // $1.50/day
};

interface TrackUsageParams {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  duration: number;  // ms
  recipeId?: string;
  processRunId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Calculate cost in cents for a given model and token usage
 */
function calculateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  if (inputTokens < 0 || outputTokens < 0) {
    console.warn('[BUDGET] Negative token count detected', { inputTokens, outputTokens });
    return 0;
  }
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['google/gemini-2.5-flash'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const total = inputCost + outputCost;
  return total > 0 ? Math.ceil(total) : 0;
}

/**
 * Track an AI API call's cost
 */
export async function trackAiUsage(params: TrackUsageParams): Promise<void> {
  try {
    const totalTokens = params.inputTokens + params.outputTokens;
    const estimatedCostCents = calculateCostCents(params.model, params.inputTokens, params.outputTokens);

    await prisma.aiBudget.create({
      data: {
        operation: params.operation,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens,
        estimatedCostCents,
        duration: params.duration,
        recipeId: params.recipeId || null,
        processRunId: params.processRunId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[BUDGET] Failed to track AI usage:', error);
  }
}

interface BudgetStatsParams {
  startDate?: Date;
  endDate?: Date;
  operation?: string;
}

/**
 * Get aggregated budget stats for a period
 */
export async function getBudgetStats(params: BudgetStatsParams = {}) {
  const where: Record<string, unknown> = {};

  if (params.operation) where.operation = params.operation;
  if (params.startDate || params.endDate) {
    where.createdAt = {
      ...(params.startDate ? { gte: params.startDate } : {}),
      ...(params.endDate ? { lte: params.endDate } : {}),
    };
  }

  const [entries, aggregation] = await Promise.all([
    prisma.aiBudget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.aiBudget.aggregate({
      where,
      _sum: {
        totalTokens: true,
        estimatedCostCents: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: true,
      _avg: {
        duration: true,
      },
    }),
  ]);

  // Group by operation
  const byOperation: Record<string, { calls: number; totalCostCents: number; totalTokens: number }> = {};
  for (const entry of entries) {
    if (!byOperation[entry.operation]) {
      byOperation[entry.operation] = { calls: 0, totalCostCents: 0, totalTokens: 0 };
    }
    byOperation[entry.operation].calls++;
    byOperation[entry.operation].totalCostCents += entry.estimatedCostCents;
    byOperation[entry.operation].totalTokens += entry.totalTokens;
  }

  return {
    totalCalls: aggregation._count,
    totalCostCents: aggregation._sum.estimatedCostCents || 0,
    totalTokens: aggregation._sum.totalTokens || 0,
    avgDurationMs: Math.round(aggregation._avg.duration || 0),
    byOperation,
    recentEntries: entries.slice(0, 20),
  };
}

/**
 * Check if daily budget limit is exceeded for an operation
 * Returns true if over budget
 */
export async function checkBudgetLimit(operation: string): Promise<boolean> {
  const limit = DAILY_LIMITS[operation];
  if (!limit) return false; // No limit configured

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const todaySpend = await prisma.aiBudget.aggregate({
    where: {
      operation,
      createdAt: { gte: today },
    },
    _sum: {
      estimatedCostCents: true,
    },
  });

  const spent = todaySpend._sum.estimatedCostCents || 0;
  if (spent >= limit) {
    console.warn(`[BUDGET] Daily limit exceeded for ${operation}: ${spent}c / ${limit}c`);
    return true;
  }

  return false;
}

/**
 * Get budget summary for dashboard (today, this week, this month)
 */
export async function getDashboardBudget() {
  const now = new Date();

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getUTCDay();
  weekStart.setUTCDate(weekStart.getUTCDate() - ((dayOfWeek + 6) % 7)); // Monday

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [todayStats, weekStats, monthStats] = await Promise.all([
    getBudgetStats({ startDate: todayStart }),
    getBudgetStats({ startDate: weekStart }),
    getBudgetStats({ startDate: monthStart }),
  ]);

  return {
    today: { costCents: todayStats.totalCostCents, calls: todayStats.totalCalls },
    week: { costCents: weekStats.totalCostCents, calls: weekStats.totalCalls },
    month: { costCents: monthStats.totalCostCents, calls: monthStats.totalCalls },
  };
}
