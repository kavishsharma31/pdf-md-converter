import type { ConvertOptions } from "./types";

const pageMarkerPattern = /^@@PDF_MD_PAGE:(\d+)@@$/;
const sentenceEndingPattern = /[.,;:]$/;
const markdownHeadingPattern = /^#{1,6}\s+/;
const numberedSectionPattern = /^\d+(?:\.\d+)*[.)]\s+\S+/;

const smallTitleWords = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const sentenceVerbPattern =
  /\b(am|are|be|been|being|can|could|did|do|does|had|has|have|is|may|might|must|shall|should|was|were|will|would)\b/i;

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function hasLetters(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

function isAllCapsHeading(text: string, words: string[]): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");

  return (
    text.length <= 60 &&
    words.length <= 8 &&
    letters.length >= 2 &&
    letters === letters.toUpperCase()
  );
}

function isTitleCaseHeading(text: string, words: string[]): boolean {
  if (text.length > 60 || words.length > 8) {
    return false;
  }

  const meaningfulWords = words.filter((word) => {
    const cleaned = word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();

    return cleaned.length > 0 && !smallTitleWords.has(cleaned);
  });

  return (
    meaningfulWords.length > 0 &&
    meaningfulWords.every((word) => /^[A-Z][A-Za-z0-9'\u2019()-]*$/.test(word))
  );
}

function isVeryShortTitleLike(text: string, words: string[]): boolean {
  return (
    text.length < 35 &&
    words.length <= 5 &&
    /^[A-Z0-9]/.test(text) &&
    !sentenceVerbPattern.test(text)
  );
}

export function detectHeading(line: string): string | null {
  const text = line.trim();
  const words = getWords(text);

  if (
    text.length < 3 ||
    text.length > 80 ||
    words.length >= 12 ||
    !hasLetters(text) ||
    sentenceEndingPattern.test(text) ||
    markdownHeadingPattern.test(text)
  ) {
    return null;
  }

  if (numberedSectionPattern.test(text)) {
    return `## ${text}`;
  }

  if (isAllCapsHeading(text, words)) {
    return `## ${text}`;
  }

  if (isTitleCaseHeading(text, words)) {
    return `## ${text}`;
  }

  if (isVeryShortTitleLike(text, words)) {
    return `### ${text}`;
  }

  return null;
}

export function structureAsMarkdown(
  text: string,
  options: ConvertOptions,
): string {
  const output: string[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    const pageMarker = trimmedLine.match(pageMarkerPattern);

    if (pageMarker) {
      if (options.addPageMarkers) {
        if (output.length > 0 && output[output.length - 1] !== "") {
          output.push("");
        }

        output.push(`<!-- page ${pageMarker[1]} -->`, "");
      }

      continue;
    }

    if (trimmedLine.length === 0) {
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.push("");
      }

      continue;
    }

    const heading = options.preserveHeadings
      ? detectHeading(trimmedLine)
      : null;

    output.push(heading ?? trimmedLine);
  }

  return `${output.join("\n").trim()}\n`;
}

function formatYamlValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value.replace(/\s+/g, " ").trim());
  }

  return JSON.stringify(String(value));
}

export function addYamlFrontmatter(
  markdown: string,
  metadata: Record<string, unknown>,
): string {
  const entries = Object.entries(metadata)
    .map(([key, value]) => [key, formatYamlValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  if (entries.length === 0) {
    return `${markdown.trim()}\n`;
  }

  const yaml = entries.map(([key, value]) => `${key}: ${value}`).join("\n");

  return `---\n${yaml}\n---\n\n${markdown.trim()}\n`;
}
