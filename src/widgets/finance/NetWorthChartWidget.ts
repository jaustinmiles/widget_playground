/**
 * Net Worth Chart Widget
 *
 * ECharts line chart showing net worth projection over time.
 * Reactively updates when any finance data changes.
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore, calculateProjection, formatCurrency } from '../../finance/index.js';
import type { ECharts, EChartsOption } from 'echarts';
import * as echarts from 'echarts';

const CHART_STYLES = `
  .chart-widget {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .title {
    font-weight: 600;
    color: #1e293b;
  }

  .final-value {
    font-size: 14px;
    font-weight: 600;
  }

  .final-value.positive {
    color: #059669;
  }

  .final-value.negative {
    color: #dc2626;
  }

  .chart-container {
    flex: 1;
    min-height: 200px;
  }

  .summary {
    display: flex;
    justify-content: space-around;
    padding: 12px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
  }

  .summary-item {
    text-align: center;
  }

  .summary-label {
    color: #64748b;
    margin-bottom: 2px;
  }

  .summary-value {
    font-weight: 600;
    color: #1e293b;
  }

  .summary-value.positive {
    color: #059669;
  }

  .summary-value.negative {
    color: #dc2626;
  }

  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #94a3b8;
    gap: 8px;
  }

  .no-data-icon {
    font-size: 32px;
  }
`;

export class NetWorthChartWidget extends BaseWidget {
  static tag = 'net-worth-chart-widget';
  static properties = {
    monthsAhead: { type: 'number' as const, default: 24 },
  };
  static styles = CHART_STYLES;

  private chart: ECharts | null = null;
  private projectionResult: ReturnType<typeof calculateProjection> | null = null;

  protected onInit(): void {
    // Subscribe to all state changes
    financeStore.addEventListener('state-changed', () => {
      this.updateProjection();
    });

    // Initial projection
    this.updateProjection();
  }

  protected onConnect(): void {
    // Initialize chart after Shadow DOM is ready
    setTimeout(() => {
      this.initChart();
    }, 0);
  }

  protected onDisconnect(): void {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }

  private initChart(): void {
    const container = this.shadowRoot?.querySelector('.chart-container') as HTMLElement;
    if (!container) return;

    this.chart = echarts.init(container);
    this.updateChart();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    resizeObserver.observe(container);
  }

  private updateProjection(): void {
    const state = financeStore.getState();
    const monthsAhead = this.getProperty<number>('monthsAhead') || 24;

    this.projectionResult = calculateProjection({
      assets: state.assets,
      liabilities: state.liabilities,
      income: state.income,
      bills: state.bills,
      quitDate: state.quitDate,
      monthsAhead,
    });

    this.updateChart();
    this.requestRender();
  }

  private updateChart(): void {
    if (!this.chart || !this.projectionResult) return;

    const { points } = this.projectionResult;
    const state = financeStore.getState();
    const quitDate = state.quitDate;

    const dates = points.map(p => {
      return p.date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
    });

    const netWorthData = points.map(p => Math.round(p.netWorth));
    const assetsData = points.map(p => Math.round(p.totalAssets));
    const liabilitiesData = points.map(p => Math.round(p.totalLiabilities));

    // Find quit date index for marking on chart
    let quitDateIndex = -1;
    if (quitDate) {
      quitDateIndex = points.findIndex(p => p.date >= quitDate);
    }

    const markLineData: { xAxis: number; label: { formatter: string }; lineStyle: { color: string; type: 'dashed' } }[] = [];
    if (quitDateIndex > 0) {
      markLineData.push({
        xAxis: quitDateIndex,
        label: { formatter: 'Quit Date' },
        lineStyle: { color: '#d97706', type: 'dashed' as const },
      });
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = params as Array<{ name: string; seriesName: string; value: number; color: string }>;
          let html = `<strong>${p[0].name}</strong><br/>`;
          p.forEach(item => {
            html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${formatCurrency(item.value)}<br/>`;
          });
          return html;
        },
      },
      legend: {
        data: ['Net Worth', 'Assets', 'Liabilities'],
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 60,
        right: 20,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontSize: 10,
          interval: Math.floor(points.length / 6),
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => {
            if (Math.abs(value) >= 1000000) {
              return `$${(value / 1000000).toFixed(1)}M`;
            }
            if (Math.abs(value) >= 1000) {
              return `$${(value / 1000).toFixed(0)}K`;
            }
            return `$${value}`;
          },
        },
      },
      series: [
        {
          name: 'Net Worth',
          type: 'line',
          data: netWorthData,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
          },
          markLine: markLineData.length > 0 ? {
            symbol: 'none',
            data: markLineData,
          } : undefined,
        },
        {
          name: 'Assets',
          type: 'line',
          data: assetsData,
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#059669' },
        },
        {
          name: 'Liabilities',
          type: 'line',
          data: liabilitiesData,
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#dc2626' },
        },
      ],
    };

    this.chart.setOption(option);
  }

  private hasData(): boolean {
    const state = financeStore.getState();
    return state.assets.length > 0 ||
      state.liabilities.length > 0 ||
      state.income.salary > 0 ||
      state.bills.length > 0;
  }

  protected render(): string {
    const result = this.projectionResult;
    const hasData = this.hasData();

    if (!hasData) {
      return `
        <div class="chart-widget">
          <div class="header">
            <span class="title">Net Worth Projection</span>
          </div>
          <div class="no-data">
            <div class="no-data-icon">📊</div>
            <div>Add assets, liabilities, income, or bills to see projection</div>
          </div>
        </div>
      `;
    }

    const finalNetWorth = result?.finalNetWorth || 0;
    const isPositive = finalNetWorth >= 0;

    return `
      <div class="chart-widget">
        <div class="header">
          <span class="title">Net Worth Projection</span>
          <span class="final-value ${isPositive ? 'positive' : 'negative'}">
            ${formatCurrency(finalNetWorth)} in 2 years
          </span>
        </div>
        <div class="chart-container"></div>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Income</div>
            <div class="summary-value positive">${formatCurrency(result?.totalIncomeEarned || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Expenses</div>
            <div class="summary-value negative">${formatCurrency(result?.totalExpensesPaid || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Net Change</div>
            <div class="summary-value ${(result?.totalIncomeEarned || 0) - (result?.totalExpensesPaid || 0) >= 0 ? 'positive' : 'negative'}">
              ${formatCurrency((result?.totalIncomeEarned || 0) - (result?.totalExpensesPaid || 0))}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

widgetRegistry.register(NetWorthChartWidget, {
  name: 'Net Worth Chart',
  category: 'Finance',
  description: 'Projected net worth over time',
});
