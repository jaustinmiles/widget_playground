/**
 * Timer Widget
 *
 * A countdown/stopwatch timer with start, pause, and reset controls.
 * Great for yoga sessions, meditation, or any timed activities.
 */

import { BaseWidget, widget } from '../core/widget/index.js';

const TIMER_STYLES = `
  .timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .display {
    font-size: 48px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    color: #1e293b;
    margin-bottom: 16px;
  }

  .display.running {
    color: #059669;
  }

  .display.paused {
    color: #d97706;
  }

  .display.finished {
    color: #dc2626;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .label {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 16px;
    text-align: center;
  }

  .controls {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  button:hover {
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  .start {
    background: #059669;
    color: white;
  }

  .start:hover {
    background: #047857;
  }

  .pause {
    background: #d97706;
    color: white;
  }

  .pause:hover {
    background: #b45309;
  }

  .reset {
    background: #e2e8f0;
    color: #475569;
  }

  .reset:hover {
    background: #cbd5e1;
  }

  .mode-toggle {
    margin-top: 12px;
    font-size: 12px;
    color: #94a3b8;
    cursor: pointer;
  }

  .mode-toggle:hover {
    color: #64748b;
  }
`;

type TimerMode = 'countdown' | 'stopwatch';
type TimerState = 'idle' | 'running' | 'paused' | 'finished';

@widget({ name: 'Timer', category: 'Utility', description: 'Countdown or stopwatch timer' })
export class TimerWidget extends BaseWidget {
  static tag = 'timer-widget';
  static properties = {
    duration: { type: 'number' as const, default: 60 },
    mode: { type: 'string' as const, default: 'countdown' },
    label: { type: 'string' as const, default: '' },
    autoStart: { type: 'boolean' as const, default: false },
  };
  static styles = TIMER_STYLES;

  private timerState: TimerState = 'idle';
  private elapsed = 0;
  private intervalId: number | null = null;
  private lastTick = 0;

  protected onInit(): void {
    if (this.getProperty<boolean>('autoStart')) {
      this.start();
    }
  }

  protected onDisconnect(): void {
    this.stop();
  }

  private get mode(): TimerMode {
    return (this.getProperty<string>('mode') as TimerMode) || 'countdown';
  }

  private get duration(): number {
    return (this.getProperty<number>('duration') || 60) * 1000; // Convert to ms
  }

  private get remaining(): number {
    if (this.mode === 'stopwatch') {
      return this.elapsed;
    }
    return Math.max(0, this.duration - this.elapsed);
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private start(): void {
    if (this.timerState === 'running') return;

    if (this.timerState === 'finished') {
      this.reset();
    }

    this.timerState = 'running';
    this.lastTick = Date.now();

    this.intervalId = window.setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTick;
      this.lastTick = now;
      this.elapsed += delta;

      if (this.mode === 'countdown' && this.remaining <= 0) {
        this.finish();
      } else {
        this.requestRender();
      }
    }, 100);

    this.requestRender();
  }

  private pause(): void {
    if (this.timerState !== 'running') return;

    this.timerState = 'paused';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.requestRender();
  }

  private reset(): void {
    this.stop();
    this.elapsed = 0;
    this.timerState = 'idle';
    this.requestRender();
  }

  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private finish(): void {
    this.stop();
    this.timerState = 'finished';
    this.emit('timer-finished', { elapsed: this.elapsed });
    this.requestRender();
  }

  private toggleMode(): void {
    const newMode = this.mode === 'countdown' ? 'stopwatch' : 'countdown';
    this.setProperty('mode', newMode);
    this.reset();
  }

  protected render(): string {
    const label = this.getProperty<string>('label');
    const displayClass = this.timerState;

    return `
      <div class="timer">
        ${label ? `<div class="label">${label}</div>` : ''}
        <div class="display ${displayClass}">${this.formatTime(this.remaining)}</div>
        <div class="controls">
          ${this.timerState === 'running'
            ? `<button class="pause" data-action="pause">Pause</button>`
            : `<button class="start" data-action="start">${this.timerState === 'paused' ? 'Resume' : 'Start'}</button>`
          }
          <button class="reset" data-action="reset">Reset</button>
        </div>
        <div class="mode-toggle" data-action="toggle-mode">
          Mode: ${this.mode === 'countdown' ? 'Countdown' : 'Stopwatch'}
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Event delegation for buttons
    this.shadowRoot?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      switch (action) {
        case 'start':
          this.start();
          break;
        case 'pause':
          this.pause();
          break;
        case 'reset':
          this.reset();
          break;
        case 'toggle-mode':
          this.toggleMode();
          break;
      }
    });
  }
}
