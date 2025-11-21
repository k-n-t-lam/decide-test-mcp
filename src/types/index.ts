import { z } from 'zod';

// ============================================================================
// Decision Table Types
// ============================================================================

export const DecisionTableFormatSchema = z.enum(['csv', 'json', 'markdown']);
export type DecisionTableFormat = z.infer<typeof DecisionTableFormatSchema>;

export const ConditionsSchema = z.record(z.string(), z.any());
export type Conditions = z.infer<typeof ConditionsSchema>;

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  conditions: ConditionsSchema,
  actions: z.array(z.string()),
  expected_results: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  tags: z.array(z.string()).optional().default([]),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const DecisionTableSchema = z.object({
  feature: z.string(),
  description: z.string().optional(),
  test_cases: z.array(TestCaseSchema),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type DecisionTable = z.infer<typeof DecisionTableSchema>;

// ============================================================================
// Test Step Types
// ============================================================================

export const WebActionTypeSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'wait',
  'assert',
  'screenshot',
]);
export type WebActionType = z.infer<typeof WebActionTypeSchema>;

export const WebStepSchema = z.object({
  action: WebActionTypeSchema,
  selector: z.string().optional(),
  target: z.string().optional(),
  value: z.any().optional(),
  description: z.string(),
  timeout: z.number().optional().default(30000),
  screenshot_on_failure: z.boolean().optional().default(true),
});
export type WebStep = Omit<z.infer<typeof WebStepSchema>, 'timeout' | 'screenshot_on_failure'> & {
  timeout?: number;
  screenshot_on_failure?: boolean;
};

export const ApiMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type ApiMethod = z.infer<typeof ApiMethodSchema>;

export const ApiStepSchema = z.object({
  method: ApiMethodSchema,
  endpoint: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  query: z.record(z.string(), z.string()).optional(),
  expected_status: z.number().optional().default(200),
  expected_body: z.any().optional(),
  description: z.string(),
  save_response: z.string().optional(), // Variable name to save response
});
export type ApiStep = z.infer<typeof ApiStepSchema>;

export const TestStepsSchema = z.object({
  test_case_id: z.string(),
  type: z.enum(['web', 'api']),
  steps: z.union([z.array(WebStepSchema), z.array(ApiStepSchema)]),
  setup: z.array(z.any()).optional(),
  teardown: z.array(z.any()).optional(),
});
export type TestSteps = z.infer<typeof TestStepsSchema>;

// ============================================================================
// AI Agent Types
// ============================================================================

export const WebExplorationRequestSchema = z.object({
  url: z.string().url(),
  test_case: TestCaseSchema,
  objective: z.string(),
  max_steps: z.number().optional().default(20),
  timeout: z.number().optional().default(60000),
  headless: z.boolean().optional().default(true),
  screenshot_dir: z.string().optional(),
});
export type WebExplorationRequest = z.infer<typeof WebExplorationRequestSchema>;

export const ApiExplorationRequestSchema = z.object({
  base_url: z.string().url(),
  test_case: TestCaseSchema,
  objective: z.string(),
  auth: z
    .object({
      type: z.enum(['bearer', 'basic', 'cookie', 'none']),
      credentials: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  max_steps: z.number().optional().default(10),
  timeout: z.number().optional().default(30000),
});
export type ApiExplorationRequest = z.infer<typeof ApiExplorationRequestSchema>;

export const ExplorationResultSchema = z.object({
  test_case_id: z.string(),
  steps: z.array(z.union([WebStepSchema, ApiStepSchema])),
  success: z.boolean(),
  error: z.string().optional(),
  duration_ms: z.number(),
  screenshots: z.array(z.string()).optional(),
});
export type ExplorationResult = {
  test_case_id: string;
  steps: Array<WebStep | ApiStep>;
  success: boolean;
  error?: string;
  duration_ms: number;
  screenshots?: string[];
};

// ============================================================================
// Test Generation Types
// ============================================================================

export const TestFrameworkSchema = z.enum(['playwright', 'api', 'both']);
export type TestFramework = z.infer<typeof TestFrameworkSchema>;

export const TestCodeGenerationRequestSchema = z.object({
  test_cases: z.array(TestCaseSchema),
  steps: z.array(TestStepsSchema),
  framework: TestFrameworkSchema,
  output_path: z.string(),
  language: z.enum(['typescript', 'javascript']).optional().default('typescript'),
  style: z
    .enum(['standard', 'page-object', 'screenplay'])
    .optional()
    .default('standard'),
});
export type TestCodeGenerationRequest = z.infer<
  typeof TestCodeGenerationRequestSchema
>;

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  test_count: z.number(),
  framework: TestFrameworkSchema,
});
export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;

export const TestCodeGenerationResultSchema = z.object({
  files_generated: z.array(GeneratedFileSchema),
  total_tests: z.number(),
  success: z.boolean(),
  errors: z.array(z.string()).optional(),
});
export type TestCodeGenerationResult = z.infer<
  typeof TestCodeGenerationResultSchema
>;

// ============================================================================
// MCP Tool Types
// ============================================================================

export const ParseDecisionTableInputSchema = z.object({
  table_path: z.string(),
  format: DecisionTableFormatSchema.optional(),
});
export type ParseDecisionTableInput = z.infer<
  typeof ParseDecisionTableInputSchema
>;

export const ExploreWebFlowInputSchema = WebExplorationRequestSchema;
export type ExploreWebFlowInput = z.infer<typeof ExploreWebFlowInputSchema>;

export const ExploreApiFlowInputSchema = ApiExplorationRequestSchema;
export type ExploreApiFlowInput = z.infer<typeof ExploreApiFlowInputSchema>;

export const GenerateTestCodeInputSchema = TestCodeGenerationRequestSchema;
export type GenerateTestCodeInput = z.infer<typeof GenerateTestCodeInputSchema>;

export const RunGeneratedTestsInputSchema = z.object({
  test_path: z.string(),
  framework: TestFrameworkSchema,
  reporter: z.enum(['list', 'dot', 'json', 'html']).optional().default('list'),
});
export type RunGeneratedTestsInput = z.infer<typeof RunGeneratedTestsInputSchema>;

// ============================================================================
// Test Execution Types
// ============================================================================

export const TestResultSchema = z.object({
  test_name: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'flaky']),
  duration_ms: z.number(),
  error: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const TestExecutionResultSchema = z.object({
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  flaky: z.number(),
  total: z.number(),
  duration_ms: z.number(),
  results: z.array(TestResultSchema),
});
export type TestExecutionResult = z.infer<typeof TestExecutionResultSchema>;
