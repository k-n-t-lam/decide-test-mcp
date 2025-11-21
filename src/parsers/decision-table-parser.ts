import * as fs from 'fs/promises';
import * as path from 'path';
import Papa from 'papaparse';
import { marked } from 'marked';
import type {
  DecisionTable,
  DecisionTableFormat,
  TestCase,
} from '../types/index.js';

/**
 * Parse a decision table from CSV, JSON, or Markdown format
 */
export class DecisionTableParser {
  /**
   * Parse decision table from file
   */
  async parse(tablePath: string, format?: DecisionTableFormat): Promise<DecisionTable> {
    const fileContent = await fs.readFile(tablePath, 'utf-8');
    const detectedFormat = format || this.detectFormat(tablePath);

    switch (detectedFormat) {
      case 'csv':
        return this.parseCSV(fileContent, tablePath);
      case 'json':
        return this.parseJSON(fileContent, tablePath);
      case 'markdown':
        return this.parseMarkdown(fileContent, tablePath);
      default:
        throw new Error(`Unsupported format: ${detectedFormat}`);
    }
  }

  /**
   * Detect format from file extension
   */
  private detectFormat(filePath: string): DecisionTableFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.csv':
        return 'csv';
      case '.json':
        return 'json';
      case '.md':
      case '.markdown':
        return 'markdown';
      default:
        throw new Error(`Cannot detect format from extension: ${ext}`);
    }
  }

  /**
   * Parse CSV format decision table
   */
  private async parseCSV(content: string, filePath: string): Promise<DecisionTable> {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const testCases = this.convertRowsToTestCases(results.data as any[]);
            const featureName = this.extractFeatureName(filePath);

            resolve({
              feature: featureName,
              test_cases: testCases,
              metadata: {
                source: filePath,
                format: 'csv',
                row_count: results.data.length,
              },
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  /**
   * Parse JSON format decision table
   */
  private parseJSON(content: string, filePath: string): DecisionTable {
    const data = JSON.parse(content);

    // Support both formats:
    // 1. Direct DecisionTable format
    // 2. Simplified rules format
    if (data.feature && data.test_cases) {
      return data as DecisionTable;
    }

    if (data.feature && data.rules) {
      const testCases = data.rules.map((rule: any, index: number) => ({
        id: rule.id || `TC${String(index + 1).padStart(3, '0')}`,
        name: rule.name || this.generateTestName(rule.conditions, rule.expected),
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions || [],
        expected_results: rule.expected || [],
        priority: rule.priority || 'medium',
        tags: rule.tags || [],
      }));

      return {
        feature: data.feature,
        description: data.description,
        test_cases: testCases,
        metadata: {
          source: filePath,
          format: 'json',
        },
      };
    }

    throw new Error('Invalid JSON format. Expected "feature" and "test_cases" or "rules"');
  }

  /**
   * Parse Markdown format decision table
   */
  private async parseMarkdown(content: string, filePath: string): Promise<DecisionTable> {
    const tokens = marked.lexer(content);

    let featureName = this.extractFeatureName(filePath);
    let description: string | undefined;
    const testCases: TestCase[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      // Extract feature name from first heading
      if (token.type === 'heading' && 'depth' in token && 'text' in token && token.depth === 1 && !featureName) {
        featureName = token.text as string;
      }

      // Extract description from paragraphs
      if (token.type === 'paragraph' && !description && 'text' in token) {
        description = token.text as string;
      }

      // Extract test cases from tables
      if (token.type === 'table') {
        const tableTestCases = this.parseMarkdownTable(token);
        testCases.push(...tableTestCases);
      }
    }

    return {
      feature: featureName,
      description,
      test_cases: testCases,
      metadata: {
        source: filePath,
        format: 'markdown',
      },
    };
  }

  /**
   * Parse markdown table token into test cases
   */
  private parseMarkdownTable(tableToken: any): TestCase[] {
    const headers = tableToken.header.map((h: any) => h.text.toLowerCase().trim());
    const rows = tableToken.rows;

    return rows.map((row: any[], index: number) => {
      const rowData: Record<string, string> = {};
      headers.forEach((header: string, i: number) => {
        rowData[header] = row[i]?.text || '';
      });

      return this.convertRowToTestCase(rowData, index);
    });
  }

  /**
   * Convert CSV/Table rows to test cases
   */
  private convertRowsToTestCases(rows: any[]): TestCase[] {
    return rows.map((row, index) => this.convertRowToTestCase(row, index));
  }

  /**
   * Convert a single row to a test case
   */
  private convertRowToTestCase(row: Record<string, string>, index: number): TestCase {
    // Identify special columns
    const specialColumns = new Set([
      'id',
      'test id',
      'test_id',
      'name',
      'test name',
      'test_name',
      'description',
      'action',
      'actions',
      'expected result',
      'expected_result',
      'expected',
      'priority',
      'tags',
    ]);

    // Extract metadata with proper access
    const id = row['id'] || row['test id'] || row['test_id'] || `TC${String(index + 1).padStart(3, '0')}`;
    const expectedResult = row['expected result'] || row['expected_result'] || row['expected'] || '';
    const name =
      row['name'] ||
      row['test name'] ||
      row['test_name'] ||
      this.generateTestName(row, expectedResult);
    const description = row['description'] || '';
    const priority = (row['priority']?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium';
    const tags = row['tags'] ? row['tags'].split(',').map((t) => t.trim()) : [];

    // Extract actions
    const actions =
      row['action'] ||
      row['actions'] ||
      '';
    const actionsList = actions.split(',').map((a: string) => a.trim()).filter(Boolean);

    // Extract expected results
    const expected =
      row['expected result'] ||
      row['expected_result'] ||
      row['expected'] ||
      '';
    const expectedList = expected.split(',').map((e: string) => e.trim()).filter(Boolean);

    // Remaining columns are conditions
    const conditions: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      const normalizedKey = key.toLowerCase().trim();
      if (!specialColumns.has(normalizedKey) && row[key]) {
        conditions[key] = this.parseValue(row[key]);
      }
    });

    return {
      id,
      name,
      description,
      conditions,
      actions: actionsList,
      expected_results: expectedList,
      priority,
      tags,
    };
  }

  /**
   * Parse a value to appropriate type
   */
  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
    return value;
  }

  /**
   * Generate test name from conditions and expected results
   */
  private generateTestName(conditions: Record<string, any>, expected: string): string {
    const conditionSummary = Object.entries(conditions)
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    if (expected) {
      return `${conditionSummary} → ${expected}`;
    }

    return conditionSummary;
  }

  /**
   * Extract feature name from file path
   */
  private extractFeatureName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName
      .replace(/-decision-table$/, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

// Export singleton instance
export const decisionTableParser = new DecisionTableParser();
