const ligatures: Record<string, string> = {
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB00": "ff",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
};

export function fixLigatures(text: string): string {
  return text.replace(
    /[\uFB00\uFB01\uFB02\uFB03\uFB04]/g,
    (match) => ligatures[match] ?? match,
  );
}

export function stripJunkCharacters(text: string): string {
  return Array.from(text)
    .filter((character) => {
      if (character === "\n" || character === "\r" || character === "\t") {
        return true;
      }

      return !/\p{C}/u.test(character);
    })
    .join("");
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n");
}

export function cleanPdfText(text: string, stripWhitespace: boolean): string {
  const cleaned = stripJunkCharacters(fixLigatures(text))
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  if (!stripWhitespace) {
    return cleaned;
  }

  return normalizeWhitespace(cleaned);
}
