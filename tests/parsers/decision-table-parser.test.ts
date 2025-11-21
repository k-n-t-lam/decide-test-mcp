import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { decisionTableParser } from '../../src/parsers/decision-table-parser.js';

describe('DecisionTableParser', () => {
  const testDir = '/tmp/decision-table-tests';

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseCSV', () => {
    it('should parse valid CSV decision table', async () => {
      const csvContent = `id,name,email,password,action,expected result
TC001,Valid Login,test@example.com,password123,Click Login,Dashboard shown
TC002,Invalid Password,test@example.com,wrong,Click Login,Error shown`;

      const csvPath = path.join(testDir, 'login.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath, 'csv');

      expect(result.feature).toBe('Login');
      expect(result.test_cases).toHaveLength(2);
      expect(result.test_cases[0]?.id).toBe('TC001');
      expect(result.test_cases[0]?.name).toBe('Valid Login');
      expect(result.test_cases[0]?.conditions.email).toBe('test@example.com');
      expect(result.test_cases[0]?.actions).toContain('Click Login');
      expect(result.test_cases[0]?.expected_results).toContain('Dashboard shown');
    });

    it('should handle CSV without explicit IDs', async () => {
      const csvContent = `name,status,expected
Login Success,active,Dashboard
Login Failure,inactive,Error`;

      const csvPath = path.join(testDir, 'test.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);

      expect(result.test_cases).toHaveLength(2);
      expect(result.test_cases[0]?.id).toBe('TC001');
      expect(result.test_cases[1]?.id).toBe('TC002');
    });

    it('should parse special columns correctly', async () => {
      const csvContent = `id,name,description,email,priority,tags,action,expected result
TC001,Login,Test login flow,user@test.com,high,"smoke, critical",Click Login,Success`;

      const csvPath = path.join(testDir, 'priority.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      const testCase = result.test_cases[0];

      expect(testCase?.priority).toBe('high');
      expect(testCase?.tags).toEqual(['smoke', 'critical']);
      expect(testCase?.description).toBe('Test login flow');
      expect(testCase?.conditions.email).toBe('user@test.com');
    });
  });

  describe('parseJSON', () => {
    it('should parse DecisionTable format JSON', async () => {
      const jsonContent = {
        feature: 'User Authentication',
        test_cases: [
          {
            id: 'TC001',
            name: 'Valid credentials',
            description: 'User can login with valid credentials',
            conditions: { username: 'user1', password: 'pass123' },
            actions: ['Fill username', 'Fill password', 'Click login'],
            expected_results: ['Dashboard loads'],
            priority: 'high',
            tags: ['smoke'],
          },
        ],
      };

      const jsonPath = path.join(testDir, 'table.json');
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent));

      const result = await decisionTableParser.parse(jsonPath, 'json');

      expect(result.feature).toBe('User Authentication');
      expect(result.test_cases).toHaveLength(1);
      expect(result.test_cases[0]?.id).toBe('TC001');
    });

    it('should parse simplified rules format JSON', async () => {
      const jsonContent = {
        feature: 'Payment Processing',
        rules: [
          {
            id: 'PAY001',
            name: 'Valid payment',
            description: 'Process valid payment',
            conditions: { amount: 100, cardValid: true },
            actions: ['Enter amount', 'Submit'],
            expected: ['Payment successful'],
            priority: 'high',
          },
        ],
      };

      const jsonPath = path.join(testDir, 'rules.json');
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent));

      const result = await decisionTableParser.parse(jsonPath);

      expect(result.feature).toBe('Payment Processing');
      expect(result.test_cases).toHaveLength(1);
      expect(result.test_cases[0]?.name).toBe('Valid payment');
    });

    it('should throw on invalid JSON format', async () => {
      const jsonContent = { invalid: 'format' };

      const jsonPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent));

      await expect(decisionTableParser.parse(jsonPath)).rejects.toThrow(
        'Invalid JSON format'
      );
    });
  });

  describe('parseMarkdown', () => {
    it('should parse markdown table format', async () => {
      const mdContent = `# Login Feature

User login functionality

| ID | Name | Email | Expected |
|----|------|-------|----------|
| TC001 | Valid Login | test@example.com | Dashboard |
| TC002 | Invalid | invalid@test.com | Error |`;

      const mdPath = path.join(testDir, 'table.md');
      await fs.writeFile(mdPath, mdContent);

      const result = await decisionTableParser.parse(mdPath, 'markdown');

      expect(result.feature).toBe('Table');
      expect(result.description).toContain('User login functionality');
      expect(result.test_cases).toHaveLength(2);
    });
  });

  describe('format detection', () => {
    it('should auto-detect CSV format', async () => {
      const csvContent = 'id,name\nTC001,Test';

      const csvPath = path.join(testDir, 'auto.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      expect(result.feature).toBe('Auto');
    });

    it('should auto-detect JSON format', async () => {
      const jsonContent = { feature: 'Test', test_cases: [] };

      const jsonPath = path.join(testDir, 'auto.json');
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent));

      const result = await decisionTableParser.parse(jsonPath);
      expect(result.feature).toBe('Test');
    });

    it('should throw on unknown extension', async () => {
      const txtPath = path.join(testDir, 'table.txt');
      await fs.writeFile(txtPath, 'some content');

      await expect(decisionTableParser.parse(txtPath)).rejects.toThrow(
        'Cannot detect format from extension'
      );
    });
  });

  describe('value parsing', () => {
    it('should parse boolean values from CSV', async () => {
      const csvContent = `name,enabled,disabled
Test,true,false`;

      const csvPath = path.join(testDir, 'booleans.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      const conditions = result.test_cases[0]?.conditions;

      expect(conditions?.enabled).toBe(true);
      expect(conditions?.disabled).toBe(false);
    });

    it('should parse numeric values', async () => {
      const csvContent = `name,count,price
Test,42,99.99`;

      const csvPath = path.join(testDir, 'numbers.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      const conditions = result.test_cases[0]?.conditions;

      expect(conditions?.count).toBe(42);
      expect(conditions?.price).toBe(99.99);
    });
  });

  describe('edge cases', () => {
    it('should handle empty CSV gracefully', async () => {
      const csvPath = path.join(testDir, 'empty.csv');
      await fs.writeFile(csvPath, '');

      const result = await decisionTableParser.parse(csvPath);
      expect(result.test_cases).toEqual([]);
    });

    it('should skip empty lines in CSV', async () => {
      const csvContent = `name,expected

Test,Result

Another,Success`;

      const csvPath = path.join(testDir, 'sparse.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      expect(result.test_cases.length).toBeGreaterThan(0);
    });

    it('should generate feature name from file path', async () => {
      const csvContent = 'name,expected\nTest,Result';

      const csvPath = path.join(testDir, 'user-authentication-decision-table.csv');
      await fs.writeFile(csvPath, csvContent);

      const result = await decisionTableParser.parse(csvPath);
      expect(result.feature).toBe('User Authentication');
    });
  });
});
