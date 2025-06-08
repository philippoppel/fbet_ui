// src/app/api/generate-ai-bet/utils.ts

export interface ParsedAIBet {
  title: string;
  question: string;
  description: string;
  options: string[];
  wildcard_prompt?: string;
}

export function extractAIFieldsFromServer(text: string): Partial<ParsedAIBet> {
  const sections = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/(?=^Titel:|^Frage:|^Beschreibung:|^Optionen:|^Wildcard:)/gm)
    .map((s) => s.trim())
    .filter(Boolean);

  let title = '';
  let question = '';
  let description = '';
  let options: string[] = [];
  let wildcard_prompt = '';

  for (const section of sections) {
    const lowerSection = section.toLowerCase();
    if (lowerSection.startsWith('titel:')) {
      title = section.substring('Titel:'.length).trim().replace(/^"|"$/g, '');
    } else if (lowerSection.startsWith('frage:')) {
      question = section
        .substring('Frage:'.length)
        .trim()
        .replace(/^"|"$/g, '');
    } else if (lowerSection.startsWith('beschreibung:')) {
      description = section.substring('Beschreibung:'.length).trim();
    } else if (lowerSection.startsWith('optionen:')) {
      const optionLines = section
        .substring('Optionen:'.length)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) =>
          line
            .replace(/^(\[|\*|\-|\d+\.|[A-Z]\))?\s*/, '')
            .replace(/\]$/, '')
            .trim()
        );
      options = optionLines;
    } else if (lowerSection.startsWith('wildcard:')) {
      wildcard_prompt = section.substring('Wildcard:'.length).trim();
    }
  }

  return {
    title,
    question: question || title,
    description,
    options,
    wildcard_prompt,
  };
}
