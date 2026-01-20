/**
 * Quit Date Widget
 *
 * 2-year range slider to set when income stops (quit job date).
 * Position 0 = no quit date (null)
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore } from '../../finance/index.js';

const QUIT_DATE_STYLES = `
  .quit-date-widget {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    padding: 16px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .title {
    font-weight: 600;
    color: #1e293b;
  }

  .clear-btn {
    padding: 4px 8px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    color: #64748b;
    font-size: 11px;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: #e2e8f0;
  }

  .slider-container {
    margin-bottom: 16px;
  }

  .slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: #e2e8f0;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 11px;
    color: #64748b;
  }

  .display {
    text-align: center;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .display-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }

  .display-value {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }

  .display-value.no-date {
    color: #059669;
  }

  .display-value.has-date {
    color: #d97706;
  }

  .months-away {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
  }

  .info {
    margin-top: 12px;
    padding: 12px;
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-radius: 6px;
    font-size: 12px;
    color: #92400e;
  }
`;

export class QuitDateWidget extends BaseWidget {
  static tag = 'quit-date-widget';
  static properties = {};
  static styles = QUIT_DATE_STYLES;

  private quitDate: Date | null = null;
  private sliderValue = 0; // 0 = no quit date, 1-24 = months from now

  protected onInit(): void {
    this.quitDate = financeStore.getQuitDate();
    this.sliderValue = this.dateToSliderValue(this.quitDate);

    financeStore.addEventListener('quit-date-changed', (e) => {
      this.quitDate = (e as CustomEvent).detail;
      this.sliderValue = this.dateToSliderValue(this.quitDate);
      this.requestRender();
    });
  }

  private dateToSliderValue(date: Date | null): number {
    if (!date) return 0;

    const now = new Date();
    const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 +
      (date.getMonth() - now.getMonth());

    return Math.max(0, Math.min(24, monthsDiff));
  }

  private sliderValueToDate(value: number): Date | null {
    if (value === 0) return null;

    const date = new Date();
    date.setMonth(date.getMonth() + value);
    return date;
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'No quit date set';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  }

  private getMonthsAwayText(): string {
    if (this.sliderValue === 0) return 'Income continues indefinitely';
    if (this.sliderValue === 1) return 'In 1 month';
    return `In ${this.sliderValue} months`;
  }

  private handleSliderChange(value: number): void {
    this.sliderValue = value;
    const date = this.sliderValueToDate(value);
    financeStore.setQuitDate(date);
  }

  private handleClear(): void {
    financeStore.setQuitDate(null);
  }

  protected render(): string {
    const displayValue = this.formatDate(this.quitDate);
    const hasDate = this.quitDate !== null;

    return `
      <div class="quit-date-widget">
        <div class="header">
          <span class="title">Quit Date Projection</span>
          ${hasDate ? `<button class="clear-btn" data-action="clear">Clear</button>` : ''}
        </div>

        <div class="slider-container">
          <input
            type="range"
            class="slider"
            min="0"
            max="24"
            value="${this.sliderValue}"
            data-action="slider"
          />
          <div class="labels">
            <span>Now</span>
            <span>6 mo</span>
            <span>12 mo</span>
            <span>18 mo</span>
            <span>24 mo</span>
          </div>
        </div>

        <div class="display">
          <div class="display-label">Income stops</div>
          <div class="display-value ${hasDate ? 'has-date' : 'no-date'}">${displayValue}</div>
          <div class="months-away">${this.getMonthsAwayText()}</div>
        </div>

        <div class="info">
          Slide to simulate when you might stop receiving income (e.g., quitting your job).
          The net worth projection will account for this.
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.shadowRoot?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.action === 'slider') {
        this.handleSliderChange(parseInt(target.value, 10));
      }
    });

    this.shadowRoot?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'clear') {
        this.handleClear();
      }
    });
  }
}

widgetRegistry.register(QuitDateWidget, {
  name: 'Quit Date',
  category: 'Finance',
  description: 'Set when income stops',
});
