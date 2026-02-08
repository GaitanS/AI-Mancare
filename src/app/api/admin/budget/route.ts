import { NextRequest, NextResponse } from 'next/server';
import { getDashboardBudget, getBudgetStats } from '@/lib/ai/budget-tracker';

// GET /api/admin/budget - Budget stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // 'dashboard' for summary, or specific dates

    if (period === 'dashboard' || !period) {
      const dashboard = await getDashboardBudget();
      return NextResponse.json(dashboard);
    }

    // Custom date range
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const operation = searchParams.get('operation') || undefined;

    // Safe date parsing - reject invalid dates
    const parseDate = (str: string | null): Date | undefined => {
      if (!str) return undefined;
      const d = new Date(str);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const stats = await getBudgetStats({
      startDate: parseDate(startDateStr),
      endDate: parseDate(endDateStr),
      operation,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching budget stats:', error);
    return NextResponse.json({ error: 'Failed to fetch budget stats' }, { status: 500 });
  }
}
