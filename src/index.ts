#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { decisionTableParser } from './parsers/decision-table-parser.js';
import { WebAgent } from './agents/web-agent.js';
import { ApiAgent } from './agents/api-agent.js';
import { testCodeGenerator } from './generators/test-code-generator.js';

import type {
  ParseDecisionTableInput,
  ExploreWebFlowInput,
  ExploreApiFlowInput,
  GenerateTestCodeInput,
  RunGeneratedTestsInput,
} from './types/index.js';

/**
 * AI-First Testing Workflow MCP Server
 * Claude-driven test generation (no GPT-4 dependency)
 */
class AiTestingMcpServer {
  private server: Server;
  private webAgent: WebAgent;
  private apiAgent: ApiAgent;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-testing-workflow',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.webAgent = new WebAgent();
    this.apiAgent = new ApiAgent();

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'parse_decision_table',
          description:
            'Parse a decision table from CSV, JSON, or Markdown format and generate test case specifications',
          inputSchema: {
            type: 'object',
            properties: {
              table_path: {
                type: 'string',
                description: 'Path to the decision table file',
              },
              format: {
                type: 'string',
                enum: ['csv', 'json', 'markdown'],
                description:
                  'Format of the decision table (auto-detected if not specified)',
              },
            },
            required: ['table_path'],
          },
        },
        {
          name: 'get_web_test_guidance',
          description:
            'Get guidance and example steps for planning web tests. Returns structured information to help Claude plan test steps for a web application flow.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Base URL of the web application',
              },
              test_case: {
                type: 'object',
                description: 'Test case to explore',
              },
              objective: {
                type: 'string',
                description:
                  'Testing objective (e.g., "Login with valid credentials")',
              },
            },
            required: ['url', 'test_case', 'objective'],
          },
        },
        {
          name: 'execute_web_test',
          description:
            'Execute predefined web test steps using Playwright. Takes a test case and specific steps to execute.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Base URL of the web application',
              },
              test_case: {
                type: 'object',
                description: 'Test case being executed',
              },
              objective: {
                type: 'string',
                description: 'Testing objective',
              },
              steps: {
                type: 'array',
                description: 'Array of test steps to execute',
                items: { type: 'object' },
              },
              headless: {
                type: 'boolean',
                description: 'Run browser in headless mode (default: true)',
              },
              screenshot_dir: {
                type: 'string',
                description: 'Directory to save screenshots (optional)',
              },
            },
            required: ['url', 'test_case', 'objective', 'steps'],
          },
        },
        {
          name: 'get_api_test_guidance',
          description:
            'Get guidance and example steps for planning API tests. Returns structured information to help Claude plan API test steps.',
          inputSchema: {
            type: 'object',
            properties: {
              base_url: {
                type: 'string',
                description: 'Base URL of the API',
              },
              test_case: {
                type: 'object',
                description: 'Test case to explore',
              },
              objective: {
                type: 'string',
                description: 'Testing objective (e.g., "Create trip via API")',
              },
              auth: {
                type: 'object',
                description: 'Authentication configuration',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['bearer', 'basic', 'cookie', 'none'],
                  },
                  credentials: {
                    type: 'object',
                    description: 'Authentication credentials',
                  },
                },
              },
            },
            required: ['base_url', 'test_case', 'objective'],
          },
        },
        {
          name: 'execute_api_test',
          description:
            'Execute predefined API test steps. Takes a test case and specific API steps to execute.',
          inputSchema: {
            type: 'object',
            properties: {
              base_url: {
                type: 'string',
                description: 'Base URL of the API',
              },
              test_case: {
                type: 'object',
                description: 'Test case being executed',
              },
              objective: {
                type: 'string',
                description: 'Testing objective',
              },
              steps: {
                type: 'array',
                description: 'Array of API test steps to execute',
                items: { type: 'object' },
              },
              auth: {
                type: 'object',
                description: 'Authentication configuration',
              },
            },
            required: ['base_url', 'test_case', 'objective', 'steps'],
          },
        },
        {
          name: 'generate_test_code',
          description:
            'Generate executable test code (Playwright or API tests) from test cases and steps',
          inputSchema: {
            type: 'object',
            properties: {
              test_cases: {
                type: 'array',
                description: 'Array of test cases',
                items: { type: 'object' },
              },
              steps: {
                type: 'array',
                description: 'Array of test steps for each test case',
                items: { type: 'object' },
              },
              framework: {
                type: 'string',
                enum: ['playwright', 'api', 'both'],
                description: 'Test framework to use',
              },
              output_path: {
                type: 'string',
                description: 'Output directory for generated test files',
              },
              language: {
                type: 'string',
                enum: ['typescript', 'javascript'],
                description: 'Programming language (default: typescript)',
              },
              style: {
                type: 'string',
                enum: ['standard', 'page-object', 'screenplay'],
                description: 'Test code style (default: standard)',
              },
            },
            required: ['test_cases', 'steps', 'framework', 'output_path'],
          },
        },
        {
          name: 'run_generated_tests',
          description: 'Execute generated tests and return results',
          inputSchema: {
            type: 'object',
            properties: {
              test_path: {
                type: 'string',
                description: 'Path to the test file to execute',
              },
              framework: {
                type: 'string',
                enum: ['playwright', 'api'],
                description: 'Test framework',
              },
              reporter: {
                type: 'string',
                enum: ['list', 'dot', 'json', 'html'],
                description: 'Test reporter format (default: list)',
              },
            },
            required: ['test_path', 'framework'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'parse_decision_table':
            return await this.handleParseDecisionTable(args as ParseDecisionTableInput);

          case 'get_web_test_guidance':
            return await this.handleGetWebTestGuidance(args as ExploreWebFlowInput);

          case 'execute_web_test':
            return await this.handleExecuteWebTest(args as any);

          case 'get_api_test_guidance':
            return await this.handleGetApiTestGuidance(args as ExploreApiFlowInput);

          case 'execute_api_test':
            return await this.handleExecuteApiTest(args as any);

          case 'generate_test_code':
            return await this.handleGenerateTestCode(args as GenerateTestCodeInput);

          case 'run_generated_tests':
            return await this.handleRunGeneratedTests(args as RunGeneratedTestsInput);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle parse_decision_table tool
   */
  private async handleParseDecisionTable(input: ParseDecisionTableInput) {
    const result = await decisionTableParser.parse(input.table_path, input.format);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_web_test_guidance tool
   * Returns guidance for Claude to plan test steps
   */
  private async handleGetWebTestGuidance(input: ExploreWebFlowInput) {
    const guidance = this.webAgent.getExplorationGuidance(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(guidance, null, 2),
        },
      ],
    };
  }

  /**
   * Handle execute_web_test tool
   * Executes provided test steps
   */
  private async handleExecuteWebTest(input: any) {
    const result = await this.webAgent.execute(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_api_test_guidance tool
   * Returns guidance for Claude to plan API test steps
   */
  private async handleGetApiTestGuidance(input: ExploreApiFlowInput) {
    const guidance = this.apiAgent.getExplorationGuidance(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(guidance, null, 2),
        },
      ],
    };
  }

  /**
   * Handle execute_api_test tool
   * Executes provided API test steps
   */
  private async handleExecuteApiTest(input: any) {
    const result = await this.apiAgent.execute(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle generate_test_code tool
   */
  private async handleGenerateTestCode(input: GenerateTestCodeInput) {
    const result = await testCodeGenerator.generate(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle run_generated_tests tool
   */
  private async handleRunGeneratedTests(_input: RunGeneratedTestsInput) {
    // TODO: Implement test execution
    // This would shell out to Playwright or run tests programmatically

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              passed: 0,
              failed: 0,
              skipped: 0,
              flaky: 0,
              total: 0,
              message: 'Test execution not yet implemented',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.webAgent.cleanup();
    await this.server.close();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AI Testing Workflow MCP server running on stdio');
  }
}

// Start server
const server = new AiTestingMcpServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
