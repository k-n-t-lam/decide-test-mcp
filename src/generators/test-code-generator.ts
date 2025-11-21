import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  TestCodeGenerationRequest,
  TestCodeGenerationResult,
  TestCase,
  TestSteps,
  WebStep,
  ApiStep,
  GeneratedFile,
} from '../types/index.js';

/**
 * Generate executable test code from test cases and steps
 */
export class TestCodeGenerator {
  /**
   * Generate test code
   */
  async generate(
    request: TestCodeGenerationRequest
  ): Promise<TestCodeGenerationResult> {
    const generatedFiles: GeneratedFile[] = [];
    const errors: string[] = [];

    try {
      // Create output directory
      await fs.mkdir(request.output_path, { recursive: true });

      // Group test cases by feature or file
      const groupedTests = this.groupTestCases(request.test_cases, request.steps);

      // Generate files for each group
      for (const [groupName, tests] of Object.entries(groupedTests)) {
        try {
          const file = await this.generateTestFile(
            groupName,
            tests,
            request.framework,
            request.language || 'typescript',
            request.style || 'standard',
            request.output_path
          );
          generatedFiles.push(file);
        } catch (error) {
          errors.push(
            `Failed to generate ${groupName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      return {
        files_generated: generatedFiles,
        total_tests: request.test_cases.length,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        files_generated: [],
        total_tests: 0,
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Group test cases by feature or logical grouping
   */
  private groupTestCases(
    testCases: TestCase[],
    steps: TestSteps[]
  ): Record<string, Array<{ testCase: TestCase; steps: TestSteps }>> {
    const groups: Record<string, Array<{ testCase: TestCase; steps: TestSteps }>> = {};

    for (const testCase of testCases) {
      // Find corresponding steps
      const testSteps = steps.find((s) => s.test_case_id === testCase.id);
      if (!testSteps) {
        console.warn(`No steps found for test case ${testCase.id}`);
        continue;
      }

      // Group by first tag or use "general"
      const groupName = testCase.tags?.[0] || 'general';

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push({ testCase, steps: testSteps });
    }

    return groups;
  }

  /**
   * Generate a test file
   */
  private async generateTestFile(
    groupName: string,
    tests: Array<{ testCase: TestCase; steps: TestSteps }>,
    framework: string,
    language: string,
    _style: string,
    outputPath: string
  ): Promise<GeneratedFile> {
    let content = '';

    if (framework === 'playwright' || framework === 'both') {
      content = this.generatePlaywrightTest(groupName, tests, language);
    } else if (framework === 'api') {
      content = this.generateApiTest(groupName, tests, language);
    }

    const fileName = `${this.sanitizeFileName(groupName)}.spec.${language === 'typescript' ? 'ts' : 'js'}`;
    const filePath = path.join(outputPath, fileName);

    await fs.writeFile(filePath, content, 'utf-8');

    return {
      path: filePath,
      content,
      test_count: tests.length,
      framework: framework as any,
    };
  }

  /**
   * Generate Playwright test code
   */
  private generatePlaywrightTest(
    groupName: string,
    tests: Array<{ testCase: TestCase; steps: TestSteps }>,
    _language: string
  ): string {
    const imports = `import { test, expect } from '@playwright/test';\n\n`;

    const testSuite = `test.describe('${this.escapeString(groupName)}', () => {
${tests.map((t) => this.generatePlaywrightTestCase(t)).join('\n\n')}
});
`;

    return imports + testSuite;
  }

  /**
   * Generate a single Playwright test case
   */
  private generatePlaywrightTestCase(test: {
    testCase: TestCase;
    steps: TestSteps;
  }): string {
    const { testCase, steps } = test;

    const testName = this.escapeString(testCase.name);
    const testSteps = (steps.steps as WebStep[])
      .map((step, index) => this.generatePlaywrightStep(step, index))
      .join('\n    ');

    return `  test('${testName}', async ({ page }) => {
    // ${testCase.description || testCase.name}
${testSteps}
  });`;
  }

  /**
   * Generate a single Playwright step
   */
  private generatePlaywrightStep(step: WebStep, index: number): string {
    const comment = `// ${step.description}`;

    switch (step.action) {
      case 'navigate':
        return `${comment}\n    await page.goto('${step.target}');`;

      case 'click':
        return `${comment}\n    await page.click('${step.selector}');`;

      case 'fill':
        return `${comment}\n    await page.fill('${step.selector}', '${this.escapeString(String(step.value))}');`;

      case 'select':
        return `${comment}\n    await page.selectOption('${step.selector}', '${this.escapeString(String(step.value))}');`;

      case 'check':
        return `${comment}\n    await page.check('${step.selector}');`;

      case 'uncheck':
        return `${comment}\n    await page.uncheck('${step.selector}');`;

      case 'wait':
        if (step.selector) {
          return `${comment}\n    await page.waitForSelector('${step.selector}', { state: 'visible' });`;
        } else if (step.value) {
          return `${comment}\n    await page.waitForTimeout(${step.value});`;
        } else {
          return `${comment}\n    await page.waitForLoadState('domcontentloaded');`;
        }

      case 'assert':
        if (step.value !== undefined) {
          return `${comment}\n    await expect(page.locator('${step.selector}')).toContainText('${this.escapeString(String(step.value))}');`;
        } else {
          return `${comment}\n    await expect(page.locator('${step.selector}')).toBeVisible();`;
        }

      case 'screenshot':
        return `${comment}\n    await page.screenshot({ path: 'screenshots/step-${index + 1}.png' });`;

      default:
        return `${comment}\n    // TODO: Implement ${step.action}`;
    }
  }

  /**
   * Generate API test code
   */
  private generateApiTest(
    groupName: string,
    tests: Array<{ testCase: TestCase; steps: TestSteps }>,
    _language: string
  ): string {
    const imports = `import { test, expect } from '@playwright/test';\n\n`;

    const setupCode = `let savedResponses: Record<string, any> = {};\n\n`;

    const testSuite = `test.describe('${this.escapeString(groupName)} API', () => {
${tests.map((t) => this.generateApiTestCase(t)).join('\n\n')}
});
`;

    return imports + setupCode + testSuite;
  }

  /**
   * Generate a single API test case
   */
  private generateApiTestCase(test: { testCase: TestCase; steps: TestSteps }): string {
    const { testCase, steps } = test;

    const testName = this.escapeString(testCase.name);
    const testSteps = (steps.steps as ApiStep[])
      .map((step) => this.generateApiStep(step))
      .join('\n\n    ');

    return `  test('${testName}', async ({ request }) => {
    // ${testCase.description || testCase.name}
    ${testSteps}
  });`;
  }

  /**
   * Generate a single API step
   */
  private generateApiStep(step: ApiStep): string {
    const comment = `// ${step.description}`;

    let requestOptions = `{
      method: '${step.method}',`;

    if (step.headers && Object.keys(step.headers).length > 0) {
      requestOptions += `\n      headers: ${JSON.stringify(step.headers, null, 6).replace(/\n/g, '\n      ')},`;
    }

    if (step.body) {
      requestOptions += `\n      data: ${JSON.stringify(step.body, null, 6).replace(/\n/g, '\n      ')},`;
    }

    requestOptions += `\n    }`;

    let code = `${comment}
    const response = await request.fetch('${step.endpoint}', ${requestOptions});
    expect(response.status()).toBe(${step.expected_status || 200});`;

    if (step.save_response) {
      code += `\n    const ${step.save_response} = await response.json();`;
      code += `\n    savedResponses['${step.save_response}'] = ${step.save_response};`;
    }

    if (step.expected_body) {
      code += `\n    const body = await response.json();`;
      code += `\n    expect(body).toMatchObject(${JSON.stringify(step.expected_body, null, 2).replace(/\n/g, '\n    ')});`;
    }

    return code;
  }

  /**
   * Sanitize file name
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Escape string for code generation
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }
}

// Export singleton
export const testCodeGenerator = new TestCodeGenerator();
