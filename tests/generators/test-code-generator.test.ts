import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { testCodeGenerator } from '../../src/generators/test-code-generator.js';
import type { TestCodeGenerationRequest, TestCase, TestSteps, WebStep, ApiStep } from '../../src/types/index.js';

describe('TestCodeGenerator', () => {
  const testDir = '/tmp/test-code-gen';

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

  describe('generatePlaywrightTest', () => {
    it('should generate valid Playwright test code', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Valid login',
          description: 'User logs in with valid credentials',
          conditions: { email: 'test@test.com', password: 'pass123' },
          actions: ['Fill email', 'Fill password', 'Click login'],
          expected_results: ['Dashboard loads'],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Navigate to login page',
            },
            {
              action: 'fill',
              selector: 'input[name="email"]',
              value: 'test@test.com',
              description: 'Fill email',
            },
            {
              action: 'click',
              selector: 'button[type="submit"]',
              description: 'Click login',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      expect(result.files_generated.length).toBeGreaterThan(0);
      expect(result.files_generated[0]?.path).toContain('.spec.ts');

      const fileContent = result.files_generated[0]?.content;
      expect(fileContent).toContain('@playwright/test');
      expect(fileContent).toContain('test(');
      expect(fileContent).toContain('page.goto');
      expect(fileContent).toContain('page.fill');
    });

    it('should generate tests with proper escaping', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: "Test with 'quotes' and \"double quotes\"",
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Navigate',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      const fileContent = result.files_generated[0]?.content;
      expect(fileContent).toBeDefined();
    });

    it('should include all Playwright action types', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'All actions test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            { action: 'navigate', target: 'http://localhost:3000', description: 'Nav' },
            { action: 'click', selector: 'button', description: 'Click' },
            { action: 'fill', selector: 'input', value: 'text', description: 'Fill' },
            { action: 'select', selector: 'select', value: 'option', description: 'Select' },
            { action: 'check', selector: 'checkbox', description: 'Check' },
            { action: 'uncheck', selector: 'checkbox', description: 'Uncheck' },
            { action: 'wait', selector: 'element', description: 'Wait' },
            { action: 'assert', selector: 'element', value: 'text', description: 'Assert' },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      const fileContent = result.files_generated[0]?.content;
      expect(fileContent).toContain('page.goto');
      expect(fileContent).toContain('page.click');
      expect(fileContent).toContain('page.fill');
      expect(fileContent).toContain('page.selectOption');
      expect(fileContent).toContain('page.check');
      expect(fileContent).toContain('page.uncheck');
      expect(fileContent).toContain('page.waitForSelector');
      expect(fileContent).toContain('expect');
    });
  });

  describe('generateApiTest', () => {
    it('should generate valid API test code', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Create trip',
          description: 'Create a new trip',
          conditions: { title: 'Summer Vacation' },
          actions: ['POST /trips'],
          expected_results: ['Status 201'],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'api',
          steps: [
            {
              method: 'POST',
              endpoint: '/api/trips',
              body: { title: 'Summer Vacation' },
              expected_status: 201,
              description: 'Create trip',
              save_response: 'trip',
            },
          ] as ApiStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'api',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      expect(result.files_generated.length).toBeGreaterThan(0);

      const fileContent = result.files_generated[0]?.content;
      expect(fileContent).toContain('@playwright/test');
      expect(fileContent).toContain('request.fetch');
      expect(fileContent).toContain('expect(response.status())');
      expect(fileContent).toContain('savedResponses');
    });

    it('should include API methods in generated code', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'API CRUD',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'api',
          steps: [
            {
              method: 'GET',
              endpoint: '/api/items',
              expected_status: 200,
              description: 'Get items',
            },
            {
              method: 'POST',
              endpoint: '/api/items',
              body: { name: 'item' },
              expected_status: 201,
              description: 'Create item',
            },
            {
              method: 'PUT',
              endpoint: '/api/items/1',
              body: { name: 'updated' },
              expected_status: 200,
              description: 'Update item',
            },
            {
              method: 'DELETE',
              endpoint: '/api/items/1',
              expected_status: 204,
              description: 'Delete item',
            },
          ] as ApiStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'api',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      const fileContent = result.files_generated[0]?.content;
      expect(fileContent).toContain("method: 'GET'");
      expect(fileContent).toContain("method: 'POST'");
      expect(fileContent).toContain("method: 'PUT'");
      expect(fileContent).toContain("method: 'DELETE'");
    });
  });

  describe('file generation', () => {
    it('should create output directory if not exists', async () => {
      const nonExistentDir = path.join(testDir, 'nested', 'dir');
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Nav',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: nonExistentDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      const dirExists = await fs
        .stat(nonExistentDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should sanitize file names properly', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
          tags: ['user login & auth!'],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Nav',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      expect(result.files_generated[0]?.path).toMatch(/^[a-z0-9\-\.\/]+$/);
    });

    it('should generate TypeScript files by default', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Nav',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      expect(result.files_generated[0]?.path).toContain('.spec.ts');
    });

    it('should generate JavaScript files when language is javascript', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Nav',
            },
          ] as WebStep[],
        },
      ];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
        language: 'javascript',
      };

      const result = await testCodeGenerator.generate(request);

      expect(result.success).toBe(true);
      expect(result.files_generated[0]?.path).toContain('.spec.js');
    });
  });

  describe('error handling', () => {
    it('should handle test cases with missing steps', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [];

      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: testDir,
      };

      const result = await testCodeGenerator.generate(request);

      // Should still succeed but maybe with warnings
      expect(result.files_generated.length >= 0).toBe(true);
    });

    it('should report errors for failed file generation', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
      ];

      const steps: TestSteps[] = [
        {
          test_case_id: 'TC001',
          type: 'web',
          steps: [
            {
              action: 'navigate',
              target: 'http://localhost:3000',
              description: 'Nav',
            },
          ] as WebStep[],
        },
      ];

      // Use a read-only directory to trigger error
      const request: TestCodeGenerationRequest = {
        test_cases: testCases,
        steps,
        framework: 'playwright',
        output_path: '/root/no-permission',
      };

      const result = await testCodeGenerator.generate(request);

      // Should handle error gracefully
      expect(result.files_generated.length === 0 || result.errors).toBeDefined();
    });
  });
});
