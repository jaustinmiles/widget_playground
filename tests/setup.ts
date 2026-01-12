import { beforeAll, afterEach } from 'vitest';

// Wait for custom elements to be defined before running tests
beforeAll(async () => {
  // Import widgets to ensure they're registered
  // await import('../src/widgets');
});

// Clean up DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
});
