import type {
  ApiExplorationRequest,
  ExplorationResult,
  ApiStep,
} from '../types/index.js';

/**
 * API exploration agent
 * Executes predefined API test steps (no AI generation)
 */
export class ApiAgent {
  /**
   * Execute API test steps
   */
  async execute(request: ApiExplorationRequest & { steps: ApiStep[] }): Promise<ExplorationResult> {
    const startTime = Date.now();

    try {
      // Validate steps by making actual requests
      await this.validateSteps(request.steps, request.base_url, request.auth);

      return {
        test_case_id: request.test_case.id,
        steps: request.steps,
        success: true,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        test_case_id: request.test_case.id,
        steps: request.steps,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Get exploration guidance for Claude
   * Returns structured information to help Claude plan API test steps
   */
  getExplorationGuidance(request: ApiExplorationRequest): {
    test_case: typeof request.test_case;
    objective: string;
    base_url: string;
    suggested_approach: string;
    example_steps: ApiStep[];
  } {
    const { test_case, objective, base_url } = request;

    // Generate example steps based on common patterns
    const exampleSteps = this.generateExampleSteps(test_case, objective, base_url, request.auth);

    return {
      test_case,
      objective,
      base_url,
      suggested_approach: this.buildGuidancePrompt(test_case, objective, base_url, request.auth),
      example_steps: exampleSteps,
    };
  }

  /**
   * Build guidance prompt for Claude
   */
  private buildGuidancePrompt(
    testCase: any,
    objective: string,
    baseUrl: string,
    auth?: ApiExplorationRequest['auth']
  ): string {
    let authInfo = '';
    if (auth && auth.type !== 'none') {
      authInfo = `\n**Authentication**: ${auth.type}`;
      if (auth.credentials) {
        authInfo += `\nCredentials available: ${Object.keys(auth.credentials).join(', ')}`;
      }
    }

    return `Based on this test case, here's the recommended approach for API testing:

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

**Base URL**: ${baseUrl}${authInfo}

**Suggested API Test Steps**:
1. Authenticate if needed (save the auth token/session)
2. Make necessary API calls in correct order
3. Use saved responses from previous steps (e.g., {{authToken}}, {{tripId}})
4. Verify expected status codes
5. Validate response bodies match expected results

Please provide specific API test steps in this format:
- method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
- endpoint: API endpoint path (e.g., "/api/trips")
- headers: Request headers (optional)
- body: Request body (optional)
- expected_status: Expected HTTP status code
- description: Human-readable description
- save_response: Variable name to save response (optional)

Use {{variableName}} to reference saved responses from previous steps.`;
  }

  /**
   * Generate example steps based on common patterns
   */
  private generateExampleSteps(
    testCase: any,
    objective: string,
    _baseUrl: string,
    auth?: ApiExplorationRequest['auth']
  ): ApiStep[] {
    const steps: ApiStep[] = [];
    const objectiveLower = objective.toLowerCase();

    // If auth is required, add login step
    if (auth && auth.type !== 'none') {
      steps.push({
        method: 'POST',
        endpoint: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
        expected_status: 200,
        description: 'Login to get authentication token',
        save_response: 'authResponse',
      });
    }

    // Add steps based on objective
    if (objectiveLower.includes('create')) {
      const resourceName = this.extractResourceName(objective);
      steps.push({
        method: 'POST',
        endpoint: `/api/${resourceName}`,
        headers: {
          'Content-Type': 'application/json',
          ...(auth && auth.type === 'bearer' ? { 'Authorization': 'Bearer {{authResponse.token}}' } : {}),
        },
        body: {
          // Example body based on conditions
          ...testCase.conditions,
        },
        expected_status: 201,
        description: `Create ${resourceName}`,
        save_response: `created${resourceName}`,
      });
    } else if (objectiveLower.includes('get') || objectiveLower.includes('fetch')) {
      const resourceName = this.extractResourceName(objective);
      steps.push({
        method: 'GET',
        endpoint: `/api/${resourceName}`,
        headers: {
          ...(auth && auth.type === 'bearer' ? { 'Authorization': 'Bearer {{authResponse.token}}' } : {}),
        },
        expected_status: 200,
        description: `Get ${resourceName}`,
      });
    } else if (objectiveLower.includes('update')) {
      const resourceName = this.extractResourceName(objective);
      steps.push({
        method: 'PUT',
        endpoint: `/api/${resourceName}/{{id}}`,
        headers: {
          'Content-Type': 'application/json',
          ...(auth && auth.type === 'bearer' ? { 'Authorization': 'Bearer {{authResponse.token}}' } : {}),
        },
        body: {
          ...testCase.conditions,
        },
        expected_status: 200,
        description: `Update ${resourceName}`,
      });
    } else if (objectiveLower.includes('delete')) {
      const resourceName = this.extractResourceName(objective);
      steps.push({
        method: 'DELETE',
        endpoint: `/api/${resourceName}/{{id}}`,
        headers: {
          ...(auth && auth.type === 'bearer' ? { 'Authorization': 'Bearer {{authResponse.token}}' } : {}),
        },
        expected_status: 204,
        description: `Delete ${resourceName}`,
      });
    }

    return steps;
  }

  /**
   * Extract resource name from objective
   */
  private extractResourceName(objective: string): string {
    const match = objective.match(/\b(trip|user|activity|budget|comment|collaboration)s?\b/i);
    return match ? match[1]!.toLowerCase() + 's' : 'resources';
  }

  /**
   * Validate steps by making actual API requests
   */
  private async validateSteps(
    steps: ApiStep[],
    baseUrl: string,
    auth?: ApiExplorationRequest['auth']
  ): Promise<void> {
    const savedResponses: Record<string, any> = {};

    // If auth provided, add it to saved responses
    if (auth?.credentials) {
      Object.assign(savedResponses, auth.credentials);
    }

    for (const step of steps) {
      try {
        const url = `${baseUrl}${step.endpoint}`;

        // Replace variables in headers and body
        const headers = this.replaceVariables(step.headers || {}, savedResponses);
        const body = this.replaceVariables(step.body, savedResponses);

        // Make request
        const response = await fetch(url, {
          method: step.method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Verify status code
        if (step.expected_status && response.status !== step.expected_status) {
          console.warn(
            `Step "${step.description}" expected status ${step.expected_status}, got ${response.status}`
          );
        }

        // Save response if requested
        if (step.save_response) {
          const responseData = await response.json() as Record<string, any>;
          savedResponses[step.save_response] = responseData;

          // Also try to extract common fields
          if (responseData['token']) savedResponses['token'] = responseData['token'];
          if (responseData['id']) savedResponses['id'] = responseData['id'];
        }
      } catch (error) {
        console.warn(`Failed to validate step "${step.description}":`, error);
        // Don't throw - validation is best-effort
      }
    }
  }

  /**
   * Replace {{variables}} in object with actual values
   */
  private replaceVariables<T>(obj: T, variables: Record<string, any>): T {
    if (!obj) return obj;

    const jsonStr = JSON.stringify(obj);
    let replaced = jsonStr;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      replaced = replaced.replace(regex, JSON.stringify(value));
    }

    return JSON.parse(replaced);
  }
}
