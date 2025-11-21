import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiAgent } from '../../src/agents/api-agent.js';
import type { ApiExplorationRequest } from '../../src/types/index.js';

describe('ApiAgent', () => {
  let agent: ApiAgent;

  beforeEach(() => {
    agent = new ApiAgent();
  });

  describe('getExplorationGuidance', () => {
    it('should return guidance structure for API exploration', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Create trip',
          description: 'Create a new trip',
          conditions: { title: 'Summer Vacation', duration: 7 },
          actions: ['POST /trips', 'Save trip ID'],
          expected_results: ['Status 201', 'Trip ID returned'],
        },
        objective: 'Create a new trip via API',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance).toHaveProperty('test_case');
      expect(guidance).toHaveProperty('objective');
      expect(guidance).toHaveProperty('base_url');
      expect(guidance).toHaveProperty('suggested_approach');
      expect(guidance).toHaveProperty('example_steps');
      expect(guidance.base_url).toBe('http://localhost:3000');
      expect(Array.isArray(guidance.example_steps)).toBe(true);
    });

    it('should include authentication info when provided', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Get user',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Get user data',
        auth: {
          type: 'bearer',
          credentials: { token: 'test-token' },
        },
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance.suggested_approach).toContain('Authentication');
      expect(guidance.suggested_approach).toContain('bearer');
    });

    it('should not include auth info when auth type is none', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Get public data',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Get public data',
        auth: { type: 'none' },
      };

      const guidance = agent.getExplorationGuidance(request);

      // Should not have extra auth setup
      expect(guidance.example_steps.filter((s) => s.method === 'POST').length).toBe(0);
    });

    it('should generate create examples for create objectives', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Create trip',
          conditions: { title: 'Test' },
          actions: [],
          expected_results: [],
        },
        objective: 'Create a trip',
      };

      const guidance = agent.getExplorationGuidance(request);

      const postSteps = guidance.example_steps.filter((s) => s.method === 'POST');
      expect(postSteps.length).toBeGreaterThan(0);
      expect(postSteps[0]?.endpoint).toContain('trip');
    });

    it('should generate get examples for fetch objectives', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Get users',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Fetch all users',
      };

      const guidance = agent.getExplorationGuidance(request);

      const getSteps = guidance.example_steps.filter((s) => s.method === 'GET');
      expect(getSteps.length).toBeGreaterThan(0);
    });

    it('should generate update examples for update objectives', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Update trip',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Update trip details',
      };

      const guidance = agent.getExplorationGuidance(request);

      const putSteps = guidance.example_steps.filter((s) => s.method === 'PUT');
      expect(putSteps.length).toBeGreaterThan(0);
    });

    it('should generate delete examples for delete objectives', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Delete trip',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Delete a trip',
      };

      const guidance = agent.getExplorationGuidance(request);

      const deleteSteps = guidance.example_steps.filter((s) => s.method === 'DELETE');
      expect(deleteSteps.length).toBeGreaterThan(0);
    });

    it('should include suggested approach text', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Test API',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(typeof guidance.suggested_approach).toBe('string');
      expect(guidance.suggested_approach.length).toBeGreaterThan(0);
      expect(guidance.suggested_approach).toContain('Objective');
    });

    it('should include correct response format in guidance', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Test',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance.suggested_approach).toContain('method');
      expect(guidance.suggested_approach).toContain('endpoint');
    });

    it('should add login step when bearer auth required', () => {
      const request: ApiExplorationRequest = {
        base_url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Get protected resource',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Get protected data',
        auth: {
          type: 'bearer',
          credentials: { email: 'test@test.com' },
        },
      };

      const guidance = agent.getExplorationGuidance(request);

      const loginSteps = guidance.example_steps.filter(
        (s) => 'endpoint' in s && s.endpoint.includes('login')
      );
      expect(loginSteps.length).toBeGreaterThan(0);
    });
  });

  describe('resource name extraction', () => {
    it('should extract resource names from objectives', () => {
      const objectives = [
        { obj: 'Create a trip', expected: 'trips' },
        { obj: 'Get user data', expected: 'users' },
        { obj: 'Update activity', expected: 'activitys' },
        { obj: 'Delete budget', expected: 'budgets' },
      ];

      for (const { obj, expected } of objectives) {
        const request: ApiExplorationRequest = {
          base_url: 'http://localhost:3000',
          test_case: {
            id: 'TC001',
            name: 'Test',
            conditions: {},
            actions: [],
            expected_results: [],
          },
          objective: obj,
        };

        const guidance = agent.getExplorationGuidance(request);
        const endpoints = guidance.example_steps
          .filter((s) => 'endpoint' in s)
          .map((s) => (s as any).endpoint);

        expect(endpoints.some((e) => e.includes(expected))).toBe(true);
      }
    });
  });
});
