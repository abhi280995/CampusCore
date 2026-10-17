/**
 * Security and sanitization utilities.
 * Protects against XSS, formula injection (CSV/Excel injection),
 * and object prototype pollution.
 */

// Block prototype pollution property names
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strips script tags, HTML special characters, and trims input.
 */
export function sanitizeText(input: any): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();

  // Remove potential null bytes
  str = str.replace(/\0/g, '');

  // Neutralize basic script / tag injection
  str = str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return str;
}

/**
 * Prevents CSV/Excel formula injection (attacks where cells begin with =, +, -, @).
 * If a cell starts with formula characters, prepend an apostrophe to neutralize it.
 */
export function sanitizeSpreadsheetCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();

  // If the cell begins with dangerous formula triggers in spreadsheet readers
  if (/^[=+@\-\t\r]/.test(str)) {
    // Neutralize by stripping or prefixing with a quote
    str = `'${str}`;
  }

  return sanitizeText(str);
}

/**
 * Safe object key check against prototype pollution.
 */
export function isSafeKey(key: string): boolean {
  return !FORBIDDEN_KEYS.has(key);
}

/**
 * Safely parse numbers without NaN or prototype exploit vulnerabilities.
 */
export function safeNumber(val: any, fallback = 0, min = 0, max = 10000): number {
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}
