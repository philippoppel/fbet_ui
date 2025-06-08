import { describe, it, expect, vi } from 'vitest';

vi.mock('groq-sdk', () => ({ Groq: vi.fn(() => ({})) }));
import { extractAIFieldsFromServer } from './route';

describe('extractAIFieldsFromServer', () => {
  it('parses ai response sections', () => {
    const text = `Titel: Test
Frage: Wer gewinnt?
Beschreibung: Info
Optionen:
1. A
2. B
Wildcard: Ergebnis?`;
    const result = extractAIFieldsFromServer(text);
    expect(result.title).toBe('Test');
    expect(result.question).toBe('Wer gewinnt?');
    expect(result.description).toBe('Info');
    expect(result.options).toEqual(['A', 'B']);
    expect(result.wildcard_prompt).toBe('Ergebnis?');
  });
});
