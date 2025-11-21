# Claude Code Guidelines - AI-First Testing Workflow

Official Claude configuration file for this MCP Server project. Claude reads
and follows these guidelines during all development tasks.

## Project Overview

An MCP (Model Context Protocol) server that provides Claude with tools for
AI-driven test generation and execution. The workflow generates test cases from
decision tables, provides intelligent guidance for test planning, and generates
executable test code.

**Key Focus**: Building a robust, well-tested MCP server following TypeScript
best practices with comprehensive error handling and security.

## Key Features

- Claude-Driven Test Planning: Works with Claude via MCP for intelligent test guidance
- Decision Table Parsing: Supports CSV, JSON, and Markdown formats
- Playwright Integration: Generates executable Playwright tests
- API Testing: Creates API test suites with proper authentication
- MCP Server: Integrates seamlessly with Claude Code
- TypeScript Support: Generates type-safe test code
- Zero Cost: No external API keys required

## Project Structure

```text
.
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── agents/               # Web and API agents for test guidance
│   ├── generators/           # Test code generation
│   ├── parsers/              # Decision table parsing
│   └── types/                # TypeScript type definitions
├── docs/
│   ├── examples/             # Decision table examples
│   └── AI_TESTING_WORKFLOW.md # Detailed documentation
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## Installation & Development

### Setup

```bash
pnpm install
pnpm build
pnpm dev
pnpm test
```

### MCP Server Setup for Claude Code

1. Build the package: `pnpm build`

1. Add to ~/.claude-code/mcp.json:

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

1. Restart Claude Code

## MCP Tools Available

- parse_decision_table: Parse decision tables from CSV, JSON, or Markdown
- get_web_test_guidance: Get guidance for planning web tests
- execute_web_test: Execute web tests using Playwright
- get_api_test_guidance: Get guidance for planning API tests
- execute_api_test: Execute API tests with authentication
- generate_test_code: Generate executable test code
- run_generated_tests: Execute generated tests

## IMPORTANT: Coding Standards

### TypeScript Requirements (STRICT ENFORCEMENT)

- **MUST** use `strict: true` in tsconfig.json
- **YOU MUST** never use `any` types - use proper type definitions
- Prefer interfaces over types for object shapes
- Use generics for reusable components
- Export public APIs with clear type signatures
- **YOU MUST** add JSDoc comments for all public functions and classes with @param and @returns
- Run `pnpm build` to verify no TypeScript errors before finishing

### Code Organization

- Keep files focused on single responsibility
- Max file size: 300 lines (consider splitting if larger)
- Group related functionality in directories
- Use barrel exports (index.ts) for cleaner imports
- Follow file naming: camelCase for files (agents/web-agent.ts)

### Async/Await Patterns

- Always use async/await over Promise chains
- Add try/catch blocks with meaningful error messages
- Handle rejection cases explicitly
- Avoid fire-and-forget promises without awaits
- Use Promise.all() for parallel operations where safe

### Error Handling (IMPORTANT)

- **YOU MUST** throw descriptive errors with context (include operation name and relevant data)
- Log errors with operation context using console.error() or logger
- **IMPORTANT**: Never silently fail - always report problems
- Validate inputs at function boundaries before processing
- **STRICT**: Return error objects OR throw, never both patterns in same function
- Provide helpful error messages that guide users toward solutions

### Testing Requirements (MUST FOLLOW)

- **YOU MUST** write unit tests for all public APIs before committing
- Use Vitest for testing framework
- Mock external dependencies (Playwright, HTTP clients)
- Aim for >80% code coverage minimum
- **YOU MUST** run `pnpm test` before committing - do not skip
- Include both happy path and error scenarios
- Test error handling paths thoroughly

### Security Standards (CRITICAL)

- **YOU MUST NEVER** commit secrets, credentials, or API keys
- Use environment variables for all sensitive data
- **IMPORTANT**: Validate all external inputs at function boundaries
- Sanitize user-provided selectors before passing to Playwright
- **STRICT**: No arbitrary code execution from user input (eval, Function constructor)
- Review third-party dependencies before adding - check for security issues
- Keep dependencies up to date - run `pnpm outdated` regularly

## Development Guidelines

- Follow TypeScript strict mode
- Use async/await for asynchronous operations
- Proper error handling with meaningful messages
- JSDoc comments for public APIs
- Unit tests required before committing
- Run `pnpm test` before pushing changes

## Project Conventions

### Naming Conventions

- Functions: camelCase (parseDecisionTable, executeWebTest)
- Classes: PascalCase (WebAgent, ApiAgent)
- Constants: UPPER_SNAKE_CASE (MAX_RETRIES, DEFAULT_TIMEOUT)
- Private methods: _camelCase prefix (_validateInput)
- Files: kebab-case (web-agent.ts, test-code-generator.ts)

### Commit Message Format

```text
<type>: <subject>

<body>

<footer>
```

Types: feat, fix, refactor, test, docs, chore
Subject: Present tense, lowercase, no period
Example: `feat: add retry logic to web test execution`

### Import/Export Patterns

- Use ES6 imports/exports
- Group imports: types, then external, then internal
- Use barrel exports for module APIs
- Avoid circular dependencies
- Use absolute paths from src/ root

## Common Claude Workflows

### Generate Tests from Decision Table

```text
Generate test cases from the decision table at docs/examples/decision-tables/login-decision-table.csv
```

Claude will parse, plan, and generate executable tests.

### Fix TypeScript Errors

```text
Fix all TypeScript errors shown in the diagnostics. Run pnpm build to verify.
```

### Add New Test Tool

```text
Add a new MCP tool called 'verify_test_results' that validates test execution results.
```

## Do's and Don'ts

### Do

- Add types before writing implementation
- Write tests alongside code
- Keep error messages helpful and specific
- Validate user inputs early
- Use environment variables for configuration
- Document breaking changes
- Review generated code before committing

### Don't

- Use `any` type without justification
- Commit without running tests
- Ignore TypeScript errors
- Add secrets to code
- Make functions larger than 40 lines without refactoring
- Skip error handling
- Assume input validity

## Troubleshooting

- MCP not appearing: Check ~/.claude-code/mcp.json and restart Claude Code
- Test execution issues: Verify app is running at specified URL
- Selector problems: Use headless: false to debug in browser
- Check logs: ~/.claude-code/logs/mcp-ai-testing.log
- TypeScript errors: Run `pnpm build` to see full error output

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/)
- [Project Documentation](docs/AI_TESTING_WORKFLOW.md)
- [Main README](README.md)
