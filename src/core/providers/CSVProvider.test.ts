import { describe, it, expect, beforeEach } from 'vitest';
import { CSVProvider } from './CSVProvider.js';

describe('CSVProvider', () => {
  const sampleCSV = `name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago`;

  const sampleCSVNoHeaders = `Alice,30,New York
Bob,25,Los Angeles`;

  let provider: CSVProvider;

  beforeEach(() => {
    provider = new CSVProvider({
      id: 'test-csv',
      type: 'csv',
      name: 'Test CSV',
      options: { content: sampleCSV },
    });
  });

  describe('fetch', () => {
    it('should parse CSV content with headers', async () => {
      const result = await provider.fetch();

      expect(result.data.headers).toEqual(['name', 'age', 'city']);
      expect(result.data.rowCount).toBe(3);
      expect(result.data.rows[0]).toEqual({
        name: 'Alice',
        age: 30,
        city: 'New York',
      });
    });

    it('should parse CSV without headers', async () => {
      const noHeaderProvider = new CSVProvider({
        id: 'no-header',
        type: 'csv',
        name: 'No Headers',
        options: { content: sampleCSVNoHeaders, headers: false },
      });

      const result = await noHeaderProvider.fetch();

      expect(result.data.headers).toEqual(['column_1', 'column_2', 'column_3']);
      expect(result.data.rowCount).toBe(2);
    });

    it('should handle custom delimiter', async () => {
      const tabCSV = `name\tage\tcity
Alice\t30\tNew York`;

      const tabProvider = new CSVProvider({
        id: 'tab-csv',
        type: 'csv',
        name: 'Tab CSV',
        options: { content: tabCSV, delimiter: '\t' },
      });

      const result = await tabProvider.fetch();
      expect(result.data.headers).toEqual(['name', 'age', 'city']);
    });

    it('should handle quoted values', async () => {
      const quotedCSV = `name,description
"Alice","A ""great"" person"
"Bob","Lives in LA, CA"`;

      const quotedProvider = new CSVProvider({
        id: 'quoted',
        type: 'csv',
        name: 'Quoted',
        options: { content: quotedCSV },
      });

      const result = await quotedProvider.fetch();
      expect(result.data.rows[0].description).toBe('A "great" person');
      expect(result.data.rows[1].description).toBe('Lives in LA, CA');
    });

    it('should update status correctly', async () => {
      expect(provider.state.status).toBe('idle');

      await provider.fetch();

      expect(provider.state.status).toBe('ready');
      expect(provider.isReady).toBe(true);
    });

    it('should set data after fetch', async () => {
      expect(provider.data).toBeNull();

      await provider.fetch();

      expect(provider.data).not.toBeNull();
      expect(provider.data?.rowCount).toBe(3);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await provider.fetch();
    });

    it('should return all data with no params', async () => {
      const result = await provider.query();
      expect(result.data.rowCount).toBe(3);
    });

    it('should filter rows', async () => {
      const result = await provider.query({
        filter: row => (row.age as number) > 28,
      });

      expect(result.data.rowCount).toBe(2);
      expect(result.data.rows.map(r => r.name)).toEqual(['Alice', 'Charlie']);
    });

    it('should limit results', async () => {
      const result = await provider.query({ limit: 2 });
      expect(result.data.rowCount).toBe(2);
    });

    it('should offset results', async () => {
      const result = await provider.query({ offset: 1 });
      expect(result.data.rowCount).toBe(2);
      expect(result.data.rows[0].name).toBe('Bob');
    });

    it('should select specific columns', async () => {
      const result = await provider.query({ columns: ['name', 'city'] });

      expect(result.data.headers).toEqual(['name', 'city']);
      expect(Object.keys(result.data.rows[0])).toEqual(['name', 'city']);
    });

    it('should combine filter, limit, and offset', async () => {
      const result = await provider.query({
        filter: row => (row.age as number) >= 25,
        offset: 1,
        limit: 1,
      });

      expect(result.data.rowCount).toBe(1);
      expect(result.data.rows[0].name).toBe('Bob');
    });
  });

  describe('helper methods', () => {
    beforeEach(async () => {
      await provider.fetch();
    });

    it('should get column values', () => {
      const ages = provider.getColumn('age');
      expect(ages).toEqual([30, 25, 35]);
    });

    it('should get unique values', () => {
      const csvWithDupes = `status
active
inactive
active
pending`;

      const dupeProvider = new CSVProvider({
        id: 'dupes',
        type: 'csv',
        name: 'Dupes',
        options: { content: csvWithDupes },
      });

      dupeProvider.fetch().then(() => {
        const unique = dupeProvider.getUniqueValues('status');
        expect(unique).toEqual(['active', 'inactive', 'pending']);
      });
    });
  });

  describe('value parsing', () => {
    it('should parse numbers', async () => {
      const result = await provider.fetch();
      expect(typeof result.data.rows[0].age).toBe('number');
    });

    it('should parse booleans', async () => {
      const boolCSV = `name,active
Alice,true
Bob,false`;

      const boolProvider = new CSVProvider({
        id: 'bool',
        type: 'csv',
        name: 'Bool',
        options: { content: boolCSV },
      });

      const result = await boolProvider.fetch();
      expect(result.data.rows[0].active).toBe(true);
      expect(result.data.rows[1].active).toBe(false);
    });

    it('should parse null values', async () => {
      const nullCSV = `name,value
Alice,null
Bob,`;

      const nullProvider = new CSVProvider({
        id: 'null',
        type: 'csv',
        name: 'Null',
        options: { content: nullCSV },
      });

      const result = await nullProvider.fetch();
      expect(result.data.rows[0].value).toBeNull();
      expect(result.data.rows[1].value).toBeNull();
    });
  });

  describe('events', () => {
    it('should emit data-update event', async () => {
      let eventFired = false;
      provider.addEventListener('data-update', () => {
        eventFired = true;
      });

      await provider.fetch();
      expect(eventFired).toBe(true);
    });

    it('should emit status-change event', async () => {
      const statuses: string[] = [];
      provider.addEventListener('status-change', (e) => {
        const detail = (e as CustomEvent).detail;
        statuses.push(detail.detail.newStatus);
      });

      await provider.fetch();
      expect(statuses).toContain('loading');
      expect(statuses).toContain('ready');
    });
  });
});
