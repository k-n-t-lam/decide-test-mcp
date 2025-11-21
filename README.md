# Decide Test MCP

**Claude-driven testing workflow** that generates test cases from decision
tables, provides intelligent guidance for test planning, and generates
executable test code.

## Features

- 🤖 **Claude-Driven Test Planning**: Works with Claude via MCP for intelligent test guidance
- 📊 **Decision Table Parsing**: Supports CSV, JSON, and Markdown formats
- 🎭 **Playwright Integration**: Generates executable Playwright tests
- 🔌 **API Testing**: Creates API test suites with proper authentication
- 🔧 **MCP Server**: Integrates seamlessly with Claude Code
- 📝 **TypeScript Support**: Generates type-safe test code
- 💰 **Zero Cost**: No external API keys required

## Installation

### As MCP Server (for Claude Code)

1. **Build the package**:

```bash
pnpm install
pnpm build
```

1. **Add to Claude Code MCP config** (`~/.claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "decide-test": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

1. **Restart Claude Code**

### As Standalone Package

```bash
pnpm install
pnpm build
```

## Usage

### Via Claude Code

Once the MCP server is installed, you can use it in Claude Code:

```text
Generate test cases from the decision table at docs/examples/decision-tables/login-decision-table.csv
```

Claude Code will:

1. Parse the decision table
2. Explore each test case with AI agents
3. Generate Playwright test code
4. Save to `tests/e2e/generated/`

### Programmatic Usage

```typescript
import {
  decisionTableParser,
  WebAgent,
  testCodeGenerator
} from 'decide-test-mcp';

// 1. Parse decision table
const table = await decisionTableParser.parse(
  'docs/examples/decision-tables/login-decision-table.csv'
);

// 2. Get guidance for test planning (you provide the steps)
const webAgent = new WebAgent();
const testSteps = [];

for (const testCase of table.test_cases) {
  // Get guidance (example steps and recommendations)
  const guidance = webAgent.getExplorationGuidance({
    url: 'http://localhost:3000',
    test_case: testCase,
    objective: testCase.name,
  });

  console.log(guidance.suggested_approach);
  console.log('Example steps:', guidance.example_steps);

  // You define the actual test steps based on guidance
  const steps = [
    { action: 'navigate', target: 'http://localhost:3000/login', description: 'Go to login' },
    { action: 'fill', selector: 'input[name="email"]', value: 'test@example.com', description: 'Enter email' },
    { action: 'click', selector: 'button[type="submit"]', description: 'Click login' },
  ];

  testSteps.push({
    test_case_id: testCase.id,
    type: 'web',
    steps,
  });
}

// 3. Generate test code
const generated = await testCodeGenerator.generate({
  test_cases: table.test_cases,
  steps: testSteps,
  framework: 'playwright',
  output_path: 'tests/e2e/generated/',
  language: 'typescript',
});

console.log(`Generated ${generated.files_generated.length} test files`);
```

## MCP Tools

### 1. parse_decision_table

Parse a decision table and generate test case specifications.

**Example**:

```json
{
  "table_path": "docs/examples/decision-tables/login-decision-table.csv",
  "format": "csv"
}
```

### 2. get_web_test_guidance

Get guidance and example steps for planning web tests. Claude uses this to understand what test steps to create.

**Example**:

```json
{
  "url": "http://localhost:3000",
  "test_case": {...},
  "objective": "Login with valid credentials"
}
```

**Returns**: Suggested approach, example steps, and guidance for Claude to plan the actual test steps.

### 3. execute_web_test

Execute predefined web test steps using Playwright.

**Example**:

```json
{
  "url": "http://localhost:3000",
  "test_case": {...},
  "objective": "Login with valid credentials",
  "steps": [
    { "action": "navigate", "target": "http://localhost:3000/login", "description": "Go to login" },
    { "action": "fill", "selector": "input[name='email']", "value": "test@example.com", "description": "Enter email" },
    { "action": "click", "selector": "button[type='submit']", "description": "Click login" }
  ],
  "headless": true,
  "screenshot_dir": "./screenshots"
}
```

### 4. get_api_test_guidance

Get guidance and example steps for planning API tests.

**Example**:

```json
{
  "base_url": "http://localhost:3000/api",
  "test_case": {...},
  "objective": "Create trip via API",
  "auth": {
    "type": "bearer",
    "credentials": {"token": "..."}
  }
}
```

**Returns**: Suggested approach, example API steps, and guidance for Claude to plan the actual API test steps.

### 5. execute_api_test

Execute predefined API test steps.

**Example**:

```json
{
  "base_url": "http://localhost:3000/api",
  "test_case": {...},
  "objective": "Create trip via API",
  "steps": [
    { "method": "POST", "endpoint": "/auth/login", "body": {...}, "expected_status": 200 },
    { "method": "POST", "endpoint": "/trips", "body": {...}, "expected_status": 201 }
  ],
  "auth": {
    "type": "bearer"
  }
}
```

### 6. generate_test_code

Generate executable test code from test cases and steps.

**Example**:

```json
{
  "test_cases": [...],
  "steps": [...],
  "framework": "playwright",
  "output_path": "tests/e2e/generated/",
  "language": "typescript"
}
```

### 7. run_generated_tests

Execute generated tests and return results.

**Example**:

```json
{
  "test_path": "tests/e2e/generated/login.spec.ts",
  "framework": "playwright",
  "reporter": "list"
}
```

## Decision Table Formats

### CSV Format

```csv
Email,Password,Action,Expected Result,Priority
valid@example.com,ValidPass123,Click Login,Login successful,high
invalid@example.com,ValidPass123,Click Login,Show error message,medium
```

### JSON Format

```json
{
  "feature": "User Login",
  "rules": [
    {
      "id": "TC001",
      "conditions": {
        "email": "valid",
        "password": "valid"
      },
      "actions": ["click_login"],
      "expected": ["redirect_to_dashboard"]
    }
  ]
}
```

### Markdown Format

```markdown
# User Login

| Email | Password | Action | Expected Result |
|-------|----------|--------|----------------|
| valid | valid | Click Login | Login successful |
| invalid | valid | Click Login | Show error |
```

## Examples

See `docs/examples/decision-tables/` for complete examples:

- `login-decision-table.csv` - User authentication tests
- `trip-creation-decision-table.json` - Trip creation with tier limits
- `collaboration-decision-table.md` - Collaboration & permissions

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```

## Architecture

```text
┌─────────────────────────────────────┐
│         MCP Server                  │
│  (Model Context Protocol)           │
└─────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌──────┐ ┌──────────┐
│ Parser │ │Agents│ │Generator │
└────────┘ └──────┘ └──────────┘
```

## Troubleshooting

### MCP Server Not Appearing in Claude Code

1. Check MCP config path is correct
2. Verify Node.js is accessible
3. Check server logs: `~/.claude-code/logs/mcp-ai-testing.log`
4. Restart Claude Code

### Test Execution Failing

1. Check application is running at specified URL
2. Review test steps for correctness
3. Try with `headless: false` to see browser in action
4. Check selector specificity

### Test Generation Issues

1. Ensure test cases and steps are complete
2. Check output directory permissions
3. Review generated code for syntax errors

## License

MIT

## Support

For issues and questions:

- Documentation: `docs/AI_TESTING_WORKFLOW.md`
