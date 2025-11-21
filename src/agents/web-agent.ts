import { chromium, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  WebExplorationRequest,
  ExplorationResult,
  WebStep,
} from '../types/index.js';

/**
 * Web exploration agent using Playwright
 * Executes predefined test steps (no AI generation)
 */
export class WebAgent {
  private browser: Browser | null = null;

  /**
   * Execute web test steps
   */
  async execute(request: WebExplorationRequest & { steps: WebStep[] }): Promise<ExplorationResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: request.headless ?? true,
      });

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Execute provided steps
      await this.executeSteps(page, request.steps, request.screenshot_dir);

      // Collect screenshots
      if (request.screenshot_dir) {
        const files = await fs.readdir(request.screenshot_dir);
        screenshots.push(
          ...files.filter((f) => f.endsWith('.png')).map((f) => path.join(request.screenshot_dir!, f))
        );
      }

      await context.close();
      await this.browser.close();
      this.browser = null;

      return {
        test_case_id: request.test_case.id,
        steps: request.steps,
        success: true,
        duration_ms: Date.now() - startTime,
        screenshots,
      };
    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      return {
        test_case_id: request.test_case.id,
        steps: request.steps,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
        screenshots,
      };
    }
  }

  /**
   * Get exploration guidance for Claude
   * Returns structured information to help Claude plan test steps
   */
  getExplorationGuidance(request: WebExplorationRequest): {
    test_case: typeof request.test_case;
    objective: string;
    url: string;
    suggested_approach: string;
    example_steps: WebStep[];
  } {
    const { test_case, objective, url } = request;

    // Generate example steps based on common patterns
    const exampleSteps = this.generateExampleSteps(test_case, objective, url);

    return {
      test_case,
      objective,
      url,
      suggested_approach: this.buildGuidancePrompt(test_case, objective, url),
      example_steps: exampleSteps,
    };
  }

  /**
   * Build guidance prompt for Claude
   */
  private buildGuidancePrompt(testCase: any, objective: string, url: string): string {
    return `Based on this test case, here's the recommended approach:

**Objective**: ${objective}

**Test Case**: ${testCase.name}

**Conditions**:
${Object.entries(testCase.conditions)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

**Actions**:
${testCase.actions.map((a: string) => `- ${a}`).join('\n')}

**Expected Results**:
${testCase.expected_results.map((e: string) => `- ${e}`).join('\n')}

**Suggested Test Steps**:
1. Navigate to the appropriate page (${url})
2. Perform the necessary actions based on conditions
3. Verify the expected results

Please provide specific test steps in this format:
- action: "navigate" | "click" | "fill" | "select" | "check" | "wait" | "assert"
- selector: CSS selector (for interactive elements)
- value: value to use (for fill/select actions)
- description: human-readable description`;
  }

  /**
   * Generate example steps based on common patterns
   */
  private generateExampleSteps(testCase: any, objective: string, url: string): WebStep[] {
    const steps: WebStep[] = [];

    // Always start with navigation
    steps.push({
      action: 'navigate',
      target: url,
      description: `Navigate to ${url}`,
    });

    // Add common patterns based on objective
    const objectiveLower = objective.toLowerCase();

    if (objectiveLower.includes('login')) {
      steps.push(
        {
          action: 'fill',
          selector: 'input[name="email"], input[type="email"]',
          value: 'test@example.com',
          description: 'Fill email input',
        },
        {
          action: 'fill',
          selector: 'input[name="password"], input[type="password"]',
          value: 'password123',
          description: 'Fill password input',
        },
        {
          action: 'click',
          selector: 'button[type="submit"], button:has-text("Login")',
          description: 'Click login button',
        },
        {
          action: 'wait',
          selector: 'h1, [data-testid="dashboard"]',
          description: 'Wait for dashboard to load',
        }
      );
    } else if (objectiveLower.includes('create')) {
      steps.push(
        {
          action: 'click',
          selector: 'button:has-text("Create"), a:has-text("Create")',
          description: 'Click create button',
        },
        {
          action: 'wait',
          selector: 'form, [role="dialog"]',
          description: 'Wait for form to appear',
        }
      );
    }

    // Add assertion at the end
    if (testCase.expected_results.length > 0) {
      steps.push({
        action: 'assert',
        selector: 'body',
        value: testCase.expected_results[0],
        description: `Verify: ${testCase.expected_results[0]}`,
      });
    }

    return steps;
  }

  /**
   * Execute test steps on the page
   */
  private async executeSteps(
    page: Page,
    steps: WebStep[],
    screenshotDir?: string
  ): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;

      try {
        await this.executeStep(page, step);

        // Take screenshot after each step if dir provided
        if (screenshotDir) {
          await fs.mkdir(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, `step-${i + 1}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }
      } catch (error) {
        // Take error screenshot
        if (screenshotDir && step && step.screenshot_on_failure !== false) {
          await fs.mkdir(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, `step-${i + 1}-error.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
        }

        throw new Error(`Step ${i + 1} failed: ${step?.description || 'unknown'}\n${error}`);
      }
    }
  }

  /**
   * Execute a single test step
   */
  private async executeStep(page: Page, step: WebStep): Promise<void> {
    const timeout = step.timeout ?? 30000;

    switch (step.action) {
      case 'navigate':
        if (!step.target) {
          throw new Error('Navigate action requires target URL');
        }
        await page.goto(step.target, { timeout, waitUntil: 'domcontentloaded' });
        break;

      case 'click':
        if (!step.selector) {
          throw new Error('Click action requires selector');
        }
        await page.click(step.selector, { timeout });
        break;

      case 'fill':
        if (!step.selector || step.value === undefined) {
          throw new Error('Fill action requires selector and value');
        }
        await page.fill(step.selector, String(step.value), { timeout });
        break;

      case 'select':
        if (!step.selector || step.value === undefined) {
          throw new Error('Select action requires selector and value');
        }
        await page.selectOption(step.selector, String(step.value), { timeout });
        break;

      case 'check':
        if (!step.selector) {
          throw new Error('Check action requires selector');
        }
        await page.check(step.selector, { timeout });
        break;

      case 'uncheck':
        if (!step.selector) {
          throw new Error('Uncheck action requires selector');
        }
        await page.uncheck(step.selector, { timeout });
        break;

      case 'wait':
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout, state: 'visible' });
        } else if (step.value) {
          await page.waitForTimeout(Number(step.value));
        } else {
          await page.waitForLoadState('domcontentloaded', { timeout });
        }
        break;

      case 'assert':
        if (!step.selector) {
          throw new Error('Assert action requires selector');
        }
        const element = page.locator(step.selector).first();
        const isVisible = await element.isVisible();
        if (!isVisible) {
          throw new Error(`Assertion failed: ${step.description}`);
        }
        if (step.value !== undefined) {
          const text = await element.textContent();
          if (!text?.includes(String(step.value))) {
            throw new Error(
              `Assertion failed: Expected text to contain "${step.value}", got "${text}"`
            );
          }
        }
        break;

      case 'screenshot':
        // Screenshot is handled externally
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
