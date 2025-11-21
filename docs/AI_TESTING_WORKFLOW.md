# AI-First Testing Workflow

Complete guide to the AI-driven test generation and execution workflow.

## Overview

The AI-First Testing Workflow is a Claude-powered approach to test development
that leverages decision tables and AI agents to:

1. Parse test specifications from decision tables
2. Generate guidance for test planning
3. Create executable test code
4. Execute and report on test results

This workflow replaces traditional manual test writing with an intelligent, AI-assisted process.

## Workflow Architecture

### Complete End-to-End Flow

```text
Claude Code (with MCP)
       ↓
MCP Server (AI Testing Tools)
    ┌──┴──────────────────────┐
    │                          │
parse_decision_table    get_web/api_test_guidance
    │                          │
    ↓                          ↓
Decision Table ────→ Parser ─→ Test Case Specs ─→ AI Agents
                                                      │
                                                      ↓
                                         Claude Plans Test Steps
                                                      │
                                    ┌─────────────────┴────────────────┐
                                    │                                  │
                            generate_test_code             execute_web/api_test
                                    │                                  │
                                    ↓                                  ↓
                            Executable Test Code ←───→ Test Execution
                                                           │
                                                           ↓
                                                    Results & Reporting
```

### Supported Decision Table Formats

- **CSV**: Simple tabular format (recommended for quick tests)
- **JSON**: Structured format for complex scenarios
- **Markdown**: Readable table format for documentation

### MCP Tools Overview

The MCP Server exposes 7 tools to Claude Code:

1. **parse_decision_table** - Parse CSV/JSON/Markdown decision tables
2. **get_web_test_guidance** - Generate web testing guidance
3. **get_api_test_guidance** - Generate API testing guidance
4. **generate_test_code** - Create executable Playwright or API tests
5. **execute_web_test** - Run web tests with Playwright
6. **execute_api_test** - Run API tests with authentication
7. **run_generated_tests** - Execute previously generated test files

## Core Components

### 1. Decision Table Parser

**Purpose**: Parse test specifications from various formats

**Supported Formats**:

- CSV: Simple, tabular format
- JSON: Structured, rule-based format
- Markdown: Readable table format

**Input**: Path to decision table file
**Output**: Structured test case objects

**Example**:

```typescript
const parser = decisionTableParser;
const testCases = await parser.parse('path/to/table.csv');
// Returns: { test_cases: [...], metadata: {...} }
```

### 2. Web Agent

**Purpose**: Provide guidance for planning web tests

**Capabilities**:

- Analyze web application flows
- Suggest test approaches
- Generate example test steps
- Validate selector strategies

**Input**: URL, test case, objective
**Output**: Guidance object with suggested approach and example steps

**Example**:

```typescript
const webAgent = new WebAgent();
const guidance = webAgent.getExplorationGuidance({
  url: 'http://localhost:3000',
  test_case: { /* test case */ },
  objective: 'Login with valid credentials'
});
```

### 3. API Agent

**Purpose**: Provide guidance for planning API tests

**Capabilities**:

- Analyze API endpoints
- Suggest authentication strategies
- Generate example API calls
- Validate request/response formats

**Input**: Base URL, test case, objective, auth config
**Output**: Guidance object with suggested approach and example steps

**Example**:

```typescript
const apiAgent = new ApiAgent();
const guidance = apiAgent.getExplorationGuidance({
  base_url: 'http://localhost:3000/api',
  test_case: { /* test case */ },
  objective: 'Create resource via API',
  auth: { type: 'bearer', credentials: { token: '...' } }
});
```

### 4. Test Code Generator

**Purpose**: Generate executable test code from test cases and steps

**Frameworks**: Playwright, API (fetch/axios)

**Languages**: TypeScript, JavaScript

**Styles**: Standard, Page Object Model, Screenplay Pattern

**Example**:

```typescript
const generated = await testCodeGenerator.generate({
  test_cases: [...],
  steps: [...],
  framework: 'playwright',
  language: 'typescript',
  output_path: 'tests/e2e/generated/'
});
```

## Quick Start Example

This example shows how to use the complete workflow from decision table to test execution:

```bash
# 1. Create a decision table
cat > tests/login.csv << EOF
email,password,action,expected result,priority
valid@test.com,password123,Click Login,Dashboard loads,high
invalid@test.com,password123,Click Login,Error shown,medium
EOF

# 2. Parse and generate tests
node --input-type=module << 'JS'
import { decisionTableParser } from './src/parsers/decision-table-parser.js';
import { testCodeGenerator } from './src/generators/test-code-generator.js';

const table = await decisionTableParser.parse('tests/login.csv');
const steps = table.test_cases.map(tc => ({
  test_case_id: tc.id,
  type: 'web',
  steps: [
    { action: 'navigate', target: 'http://localhost:3000/login', description: 'Go to login' },
    { action: 'fill', selector: 'input[type=email]', value: tc.conditions.email, description: 'Enter email' }
  ]
}));

const result = await testCodeGenerator.generate({
  test_cases: table.test_cases,
  steps,
  framework: 'playwright',
  output_path: 'tests/generated'
});

console.log('Generated tests:', result.files_generated);
JS

# 3. Run the tests
npx playwright test tests/generated/
```

## Typical Workflow Steps

### Step 1: Prepare Decision Table

Create a decision table specifying test cases:

```csv
Email,Password,Expected,Priority
valid@test.com,ValidPass123,Success,high
invalid@test.com,ValidPass123,Error,medium
valid@test.com,WrongPass,Error,medium
```

### Step 2: Parse Test Cases

```typescript
const table = await decisionTableParser.parse('tests/login.csv');
console.log(table.test_cases); // Array of test case objects
```

### Step 3: Get Guidance from Agents

For each test case, request guidance:

```typescript
const webAgent = new WebAgent();
for (const testCase of table.test_cases) {
  const guidance = webAgent.getExplorationGuidance({
    url: 'http://localhost:3000',
    test_case: testCase,
    objective: testCase.name
  });
  console.log(guidance.suggested_approach);
  console.log(guidance.example_steps);
}
```

### Step 4: Plan Test Steps

Claude uses the guidance to plan actual test steps:

```typescript
const testSteps = {
  test_case_id: 'TC001',
  type: 'web',
  steps: [
    {
      action: 'navigate',
      target: 'http://localhost:3000/login',
      description: 'Go to login page'
    },
    {
      action: 'fill',
      selector: 'input[name="email"]',
      value: 'valid@test.com',
      description: 'Enter email'
    },
    {
      action: 'fill',
      selector: 'input[name="password"]',
      value: 'ValidPass123',
      description: 'Enter password'
    },
    {
      action: 'click',
      selector: 'button[type="submit"]',
      description: 'Click login button'
    }
  ]
};
```

### Step 5: Generate Test Code

```typescript
const generated = await testCodeGenerator.generate({
  test_cases: table.test_cases,
  steps: [testSteps],
  framework: 'playwright',
  language: 'typescript',
  output_path: 'tests/e2e/generated/'
});
```

### Step 6: Execute Tests

```typescript
// Using Playwright directly
await exec('npx playwright test tests/e2e/generated/');
```

## Code Generation and Review

### Reviewing Generated Test Code

Before executing generated tests, review for:

**Selectors**:

- [ ] Selectors are specific and unique
- [ ] Use data-testid attributes when available
- [ ] Fallback to stable selectors (avoid class names that change)
- [ ] Handle dynamic content with appropriate waits

**Test Structure**:

- [ ] Each test is independent
- [ ] Setup and teardown are clear
- [ ] No hardcoded delays (use proper waits)
- [ ] Assertions are specific and meaningful

**Error Handling**:

- [ ] Error cases have proper assertions
- [ ] Error messages are captured
- [ ] Cleanup happens even on failures

**Example Review**:

```typescript
// ❌ Before Review - Issues
test('login success', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('.btn'); // Too vague
  await page.waitForTimeout(3000); // Hardcoded wait
  expect(page).toHaveTitle('Dashboard'); // Missing await
});

// ✅ After Review - Fixed
test('login success', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard'); // Event-based wait
  await expect(page).toHaveTitle('Dashboard');
});
```

## Debugging and Logging

### Debugging Failed Tests

When tests fail, enable debugging:

```typescript
// Add logging to understand test flow
test('login', async ({ page }) => {
  console.log('Starting login test');

  await page.goto('http://localhost:3000/login');
  console.log('Navigated to login page');

  const emailInput = page.locator('input[name="email"]');
  await emailInput.fill('test@example.com');
  console.log('Filled email field');

  const loginBtn = page.locator('button[type="submit"]');
  await loginBtn.click();
  console.log('Clicked login button');

  // Run with: PWDEBUG=1 npx playwright test
});
```

### Running Tests with Debugging

```bash
# Run with browser visible
npx playwright test --headed

# Run single test
npx playwright test --grep "login"

# Debug mode (step through)
PWDEBUG=1 npx playwright test

# Show trace
npx playwright test --trace on
```

### Common Debugging Patterns

**Element Not Found**:

```typescript
// Add screenshot to see actual page state
test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  // If selector fails, take screenshot
  try {
    await page.click('button[type="submit"]');
  } catch (e) {
    await page.screenshot({ path: 'debug.png' });
    throw e;
  }
});
```

**Timeout Issues**:

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  // Set for this test only
  test.setTimeout(60000);

  // Or set for specific action
  await page.click('button', { timeout: 10000 });
});
```

## Best Practices

### Decision Table Design

1. **Be Specific**: Clear, unambiguous test conditions
2. **Cover Edge Cases**: Include success, failure, and boundary cases
3. **Prioritize**: Mark high-impact tests with higher priority
4. **Use Categories**: Group related tests together
5. **Document Objectives**: Clear expected outcomes

### Test Step Planning

1. **Be Explicit**: Each step should be atomic and clear
2. **Use Selectors**: Specific CSS selectors or ARIA attributes
3. **Add Waits**: Handle async operations with proper waits
4. **Error Handling**: Plan for error scenarios
5. **Cleanup**: Include teardown steps

### Code Generation

1. **Review Generated Code**: Always review before execution
2. **Add Custom Logic**: Enhance generated code with custom assertions
3. **Handle Dynamics**: Update hardcoded values for dynamic content
4. **Environment Config**: Use environment variables for URLs/credentials
5. **Error Messages**: Add meaningful error messages for debugging

## API Testing Patterns

### Authentication Strategies

**Bearer Token**:

```typescript
auth: {
  type: 'bearer',
  credentials: { token: 'your-token-here' }
}
```

**Basic Auth**:

```typescript
auth: {
  type: 'basic',
  credentials: { username: 'user', password: 'pass' }
}
```

### Common API Test Patterns

```typescript
const steps = [
  {
    method: 'POST',
    endpoint: '/users',
    body: { email: 'test@example.com', password: 'pass' },
    expected_status: 201
  },
  {
    method: 'POST',
    endpoint: '/auth/login',
    body: { email: 'test@example.com', password: 'pass' },
    expected_status: 200
  },
  {
    method: 'GET',
    endpoint: '/users/me',
    expected_status: 200
  }
];
```

## Web Testing Patterns

### Selector Strategies

**By Name**:

```typescript
selector: 'input[name="email"]'
```

**By ID**:

```typescript
selector: '#login-button'
```

**By Text**:

```typescript
selector: 'button:has-text("Login")'
```

### Common Web Test Actions

```typescript
const steps = [
  { action: 'navigate', target: 'http://localhost:3000/login' },
  { action: 'fill', selector: 'input[name="email"]', value: 'test@example.com' },
  { action: 'fill', selector: 'input[name="password"]', value: 'password' },
  { action: 'click', selector: 'button[type="submit"]' },
  { action: 'wait', selector: '.dashboard', timeout: 5000 },
  { action: 'assert', selector: '.success-message', visible: true }
];
```

## Test Maintenance and Updates

### Maintaining Tests Over Time

As your application evolves, tests need updates:

**When Selectors Break**:

```bash
# Find tests with broken selectors
npx playwright test --headed  # Visually inspect failures

# Update the decision table with new selectors
# Then regenerate tests
node generate-tests.js
```

**Version Control for Decision Tables**:

```bash
# Store decision tables in git
git add docs/examples/*.csv docs/examples/*.json

# Track changes to test specifications
git log docs/examples/login-decision-table.csv
```

**Updating Test Expectations**:

```csv
# Old decision table
email,password,expected result
valid@test.com,pass123,Dashboard loads

# Updated with new requirement
email,password,expected result,notes
valid@test.com,pass123,Welcome screen shown,Changed from Dashboard
```

### Regular Maintenance Tasks

**Weekly**:

- Review failing test runs
- Update broken selectors
- Check for flaky tests

**Monthly**:

- Audit decision table coverage
- Update example tests
- Review test performance

**Quarterly**:

- Refactor common test patterns
- Update documentation
- Plan new test scenarios

## MCP Server Integration

### Setting Up as Claude Code MCP Server

First, build the package:

```bash
pnpm build
```

Next, configure Claude Code by creating or updating `~/.claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "ai-testing": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

Then, restart Claude Code to load the MCP server.

Finally, use in Claude Code:

```text
Generate tests from the decision table at /path/to/login.csv
```

Claude will use the available MCP tools:

- `parse_decision_table` - Parse decision tables
- `get_web_test_guidance` - Get web testing guidance
- `get_api_test_guidance` - Get API testing guidance
- `generate_test_code` - Generate executable tests
- `execute_web_test` - Run web tests with Playwright
- `execute_api_test` - Run API tests

### Example Claude Workflow

```text
User: Parse the login test decision table and generate Playwright tests

Claude uses MCP:
1. parse_decision_table("/docs/examples/login-decision-table.csv")
   → Returns parsed test cases
2. get_web_test_guidance(url, test_cases)
   → Returns guidance for planning
3. [Claude plans test steps]
4. generate_test_code(test_cases, steps, framework="playwright")
   → Returns generated test files
```

## Troubleshooting

### Parser Issues

**Problem**: Decision table not parsing correctly

**Solutions**:

- Check file format (CSV headers, JSON structure, Markdown table syntax)
- Verify file encoding (UTF-8)
- Ensure no special characters in field names
- Validate required columns exist

### Agent Guidance Issues

**Problem**: Guidance not helpful or incomplete

**Solutions**:

- Provide more detailed test case descriptions
- Ensure objective is clear and specific
- Check application is running and accessible
- Verify correct URL is provided

### Code Generation Issues

**Problem**: Generated code has syntax errors

**Solutions**:

- Review input test steps for completeness
- Ensure selectors are valid CSS
- Check framework compatibility
- Validate output path permissions

### Execution Issues

**Problem**: Tests fail with "Element not found"

**Solutions**:

- Verify selectors match current application
- Check application is running on correct port
- Add proper waits before assertions
- Use headless: false to debug visually

**Problem**: Tests timeout

**Solutions**:

- Increase timeout values
- Check network connectivity
- Verify application performance
- Check for async operations not waiting

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Run AI-Generated Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build
      - run: npx playwright install

      - name: Generate and Run Tests
        run: npx playwright test tests/e2e/generated/

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Decision Table Testing](https://en.wikipedia.org/wiki/Decision_table)

## Support

For issues, questions, or feedback:

- Check the troubleshooting section above
- Review example decision tables
- Consult the main README
