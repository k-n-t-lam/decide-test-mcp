import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebAgent } from '../../src/agents/web-agent.js';
import type { WebExplorationRequest, WebStep } from '../../src/types/index.js';

describe('WebAgent', () => {
  let agent: WebAgent;

  beforeEach(() => {
    agent = new WebAgent();
  });

  describe('getExplorationGuidance', () => {
    it('should return guidance structure for web exploration', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Login test',
          description: 'Test user login',
          conditions: { username: 'user@test.com', password: 'pass123' },
          actions: ['Enter credentials', 'Click login'],
          expected_results: ['Dashboard loads'],
        },
        objective: 'Login with valid credentials',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance).toHaveProperty('test_case');
      expect(guidance).toHaveProperty('objective');
      expect(guidance).toHaveProperty('url');
      expect(guidance).toHaveProperty('suggested_approach');
      expect(guidance).toHaveProperty('example_steps');
      expect(guidance.url).toBe('http://localhost:3000');
      expect(guidance.objective).toBe('Login with valid credentials');
      expect(Array.isArray(guidance.example_steps)).toBe(true);
    });

    it('should generate example steps starting with navigation', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Test objective',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance.example_steps[0]?.action).toBe('navigate');
      expect(guidance.example_steps[0]?.target).toBe('http://localhost:3000');
    });

    it('should generate login-specific example steps', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Login test',
          conditions: { username: 'test@test.com' },
          actions: ['Login'],
          expected_results: ['Dashboard'],
        },
        objective: 'Login with valid credentials',
      };

      const guidance = agent.getExplorationGuidance(request);

      const actions = guidance.example_steps.map((s) => s.action);
      expect(actions).toContain('navigate');
      expect(actions).toContain('fill');
      expect(actions).toContain('click');
    });

    it('should include suggested approach text', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Create test',
          conditions: {},
          actions: ['Create item'],
          expected_results: ['Item created'],
        },
        objective: 'Create a new item',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(typeof guidance.suggested_approach).toBe('string');
      expect(guidance.suggested_approach.length).toBeGreaterThan(0);
      expect(guidance.suggested_approach).toContain('Objective');
      expect(guidance.suggested_approach).toContain('Test Case');
    });

    it('should handle creation objectives', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Create trip',
          conditions: {},
          actions: [],
          expected_results: [],
        },
        objective: 'Create a new trip',
      };

      const guidance = agent.getExplorationGuidance(request);

      const actions = guidance.example_steps.map((s) => s.action);
      expect(actions).toContain('click');
      expect(actions).toContain('wait');
    });
  });

  describe('cleanup', () => {
    it('should not throw when cleaning up with no active browser', async () => {
      await expect(agent.cleanup()).resolves.not.toThrow();
    });
  });

  describe('step generation', () => {
    it('should generate examples with proper descriptions', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: ['Expected result'],
        },
        objective: 'Test objective',
      };

      const guidance = agent.getExplorationGuidance(request);

      expect(guidance.example_steps.every((s) => s.description)).toBe(true);
    });

    it('should include assertion step for test case with expected results', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
        test_case: {
          id: 'TC001',
          name: 'Test',
          conditions: {},
          actions: [],
          expected_results: ['Success message'],
        },
        objective: 'Test',
      };

      const guidance = agent.getExplorationGuidance(request);

      const hasAssertion = guidance.example_steps.some((s) => s.action === 'assert');
      expect(hasAssertion).toBe(true);
    });

    it('should not include assertion step for test case without expected results', () => {
      const request: WebExplorationRequest = {
        url: 'http://localhost:3000',
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

      const hasAssertion = guidance.example_steps.some((s) => s.action === 'assert');
      expect(hasAssertion).toBe(false);
    });
  });
});
