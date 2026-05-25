export type ProfessionRecord = {
  id: number;
  name: string;
  description: string | null;
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenizeText(value: string): string[] {
  return normalizeText(value).match(/[a-z0-9]+/g) ?? [];
}

export function resolveProfessionSuggestion(
  category: string,
  professions: ProfessionRecord[],
): ProfessionRecord | null {
  if (professions.length === 0) {
    return null;
  }

  const normalizedSuggestion = normalizeText(category);
  const suggestionTokens = new Set(tokenizeText(category));

  const exact = professions.find(
    (profession) => normalizeText(profession.name) === normalizedSuggestion,
  );
  if (exact) return exact;

  const nameMatch = professions.find((profession) => {
    const normalizedName = normalizeText(profession.name);
    return (
      normalizedName.includes(normalizedSuggestion) || normalizedSuggestion.includes(normalizedName)
    );
  });
  if (nameMatch) return nameMatch;

  let bestMatch: ProfessionRecord | null = null;
  let bestScore = 0;

  for (const profession of professions) {
    const professionTokens = new Set(
      tokenizeText(`${profession.name} ${profession.description ?? ''}`),
    );
    let score = 0;

    for (const token of suggestionTokens) {
      if (professionTokens.has(token)) {
        score += 2;
        continue;
      }

      for (const professionToken of professionTokens) {
        if (token.length < 3 || professionToken.length < 3) {
          continue;
        }

        if (token.includes(professionToken) || professionToken.includes(token)) {
          score += 0.5;
          break;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = profession;
    }
  }

  return bestMatch ?? professions[0] ?? null;
}
