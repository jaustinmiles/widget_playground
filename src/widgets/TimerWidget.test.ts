import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerWidget } from './TimerWidget.js';

describe('TimerWidget', () => {
  let widget: TimerWidget;

  beforeEach(() => {
    vi.useFakeTimers();
    widget = document.createElement('timer-widget') as TimerWidget;
    document.body.appendChild(widget);
    // Trigger initial render (requestAnimationFrame is mocked by fake timers)
    vi.advanceTimersToNextTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
    widget.remove();
  });

  describe('registration', () => {
    it('should be registered as custom element', () => {
      expect(customElements.get('timer-widget')).toBeDefined();
    });

    it('should have correct tag', () => {
      expect(TimerWidget.tag).toBe('timer-widget');
    });

    it('should have widget metadata', () => {
      expect(TimerWidget.widgetMeta).toBeDefined();
      expect(TimerWidget.widgetMeta?.name).toBe('Timer');
      expect(TimerWidget.widgetMeta?.category).toBe('Utility');
    });
  });

  describe('default properties', () => {
    it('should have default duration of 60 seconds', () => {
      expect(widget.getProperty('duration')).toBe(60);
    });

    it('should have default mode of countdown', () => {
      expect(widget.getProperty('mode')).toBe('countdown');
    });

    it('should have empty label by default', () => {
      expect(widget.getProperty('label')).toBe('');
    });

    it('should not auto-start by default', () => {
      expect(widget.getProperty('autoStart')).toBe(false);
    });
  });

  describe('rendering', () => {
    it('should render time display', () => {
      const display = widget.shadowRoot?.querySelector('.display');
      expect(display).not.toBeNull();
      expect(display?.textContent).toBe('01:00'); // 60 seconds default
    });

    it('should render start button when idle', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start');
      expect(startBtn).not.toBeNull();
      expect(startBtn?.textContent).toBe('Start');
    });

    it('should render reset button', () => {
      const resetBtn = widget.shadowRoot?.querySelector('.reset');
      expect(resetBtn).not.toBeNull();
      expect(resetBtn?.textContent).toBe('Reset');
    });

    it('should render mode toggle', () => {
      const modeToggle = widget.shadowRoot?.querySelector('.mode-toggle');
      expect(modeToggle).not.toBeNull();
      expect(modeToggle?.textContent).toContain('Countdown');
    });

    it('should render label when set', () => {
      widget.setProperty('label', 'Test Timer');
      vi.advanceTimersToNextTimer(); // Re-render
      const label = widget.shadowRoot?.querySelector('.label');
      expect(label).not.toBeNull();
      expect(label?.textContent).toBe('Test Timer');
    });

    it('should have idle class initially', () => {
      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.classList.contains('idle')).toBe(true);
    });
  });

  describe('countdown mode', () => {
    it('should display initial duration', () => {
      widget.setProperty('duration', 120); // 2 minutes
      vi.advanceTimersToNextTimer();
      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('02:00');
    });

    it('should count down when started', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();

      // Advance 1 second (timer interval is 100ms, so 10 ticks)
      vi.advanceTimersByTime(1000);
      vi.advanceTimersToNextTimer(); // Ensure render completes

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('00:59');
    });

    it('should show pause button when running', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      const pauseBtn = widget.shadowRoot?.querySelector('.pause');
      expect(pauseBtn).not.toBeNull();
      expect(pauseBtn?.textContent).toBe('Pause');
    });

    it('should pause when pause button clicked', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(1000);

      const pauseBtn = widget.shadowRoot?.querySelector('.pause') as HTMLButtonElement;
      pauseBtn?.click();
      vi.advanceTimersToNextTimer();

      const beforeTime = widget.shadowRoot?.querySelector('.display')?.textContent;
      vi.advanceTimersByTime(2000);
      const afterTime = widget.shadowRoot?.querySelector('.display')?.textContent;

      expect(beforeTime).toBe(afterTime); // Time should not change when paused
    });

    it('should show Resume after pausing', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      const pauseBtn = widget.shadowRoot?.querySelector('.pause') as HTMLButtonElement;
      pauseBtn?.click();
      vi.advanceTimersToNextTimer();

      const resumeBtn = widget.shadowRoot?.querySelector('.start');
      expect(resumeBtn?.textContent).toBe('Resume');
    });

    it('should reset to initial duration', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(5000);

      const resetBtn = widget.shadowRoot?.querySelector('.reset') as HTMLButtonElement;
      resetBtn?.click();
      vi.advanceTimersToNextTimer();

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('01:00');
    });

    it('should emit timer-finished event when complete', () => {
      widget.setProperty('duration', 2); // 2 seconds
      vi.advanceTimersToNextTimer();

      let finished = false;
      widget.addEventListener('timer-finished', () => {
        finished = true;
      });

      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(2500);

      expect(finished).toBe(true);
    });

    it('should show finished state when complete', () => {
      widget.setProperty('duration', 1);
      vi.advanceTimersToNextTimer();

      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(1500);

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.classList.contains('finished')).toBe(true);
    });
  });

  describe('stopwatch mode', () => {
    beforeEach(() => {
      widget.setProperty('mode', 'stopwatch');
      vi.advanceTimersToNextTimer();
    });

    it('should start at 00:00', () => {
      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('00:00');
    });

    it('should count up when started', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(5100);

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('00:05');
    });

    it('should show mode toggle text', () => {
      const modeToggle = widget.shadowRoot?.querySelector('.mode-toggle');
      expect(modeToggle?.textContent).toContain('Stopwatch');
    });
  });

  describe('mode toggle', () => {
    it('should toggle from countdown to stopwatch', () => {
      const modeToggle = widget.shadowRoot?.querySelector('.mode-toggle') as HTMLElement;
      modeToggle?.click();
      vi.advanceTimersToNextTimer();

      expect(widget.getProperty('mode')).toBe('stopwatch');
    });

    it('should toggle from stopwatch to countdown', () => {
      widget.setProperty('mode', 'stopwatch');
      vi.advanceTimersToNextTimer();

      const modeToggle = widget.shadowRoot?.querySelector('.mode-toggle') as HTMLElement;
      modeToggle?.click();
      vi.advanceTimersToNextTimer();

      expect(widget.getProperty('mode')).toBe('countdown');
    });

    it('should reset timer when toggling mode', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      vi.advanceTimersByTime(5000);

      const modeToggle = widget.shadowRoot?.querySelector('.mode-toggle') as HTMLElement;
      modeToggle?.click();
      vi.advanceTimersToNextTimer();

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.textContent).toBe('00:00'); // Reset to stopwatch initial
    });
  });

  describe('display states', () => {
    it('should have running class when running', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.classList.contains('running')).toBe(true);
    });

    it('should have paused class when paused', () => {
      const startBtn = widget.shadowRoot?.querySelector('.start') as HTMLButtonElement;
      startBtn?.click();
      vi.advanceTimersToNextTimer();

      const pauseBtn = widget.shadowRoot?.querySelector('.pause') as HTMLButtonElement;
      pauseBtn?.click();
      vi.advanceTimersToNextTimer();

      const display = widget.shadowRoot?.querySelector('.display');
      expect(display?.classList.contains('paused')).toBe(true);
    });
  });
});
