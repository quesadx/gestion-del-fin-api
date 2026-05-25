import { describe, expect, test } from '@jest/globals';
import { resolveProfessionSuggestion } from '../../src/ai/profession-resolver';

describe('resolveProfessionSuggestion', () => {
  const professions = [
    {
      id: 1,
      name: 'Mechanic',
      description: 'Repairs engines and machinery in the field',
    },
    {
      id: 2,
      name: 'Cartographer',
      description: 'Maps terrain and plans safe routes for expeditions',
    },
    {
      id: 3,
      name: 'Medic',
      description: 'Provides medical support and triage',
    },
  ];

  test('matches a profession by normalized name', () => {
    const result = resolveProfessionSuggestion('mÉdIc', professions);

    expect(result?.id).toBe(3);
    expect(result?.name).toBe('Medic');
  });

  test('matches a profession by description overlap when the name is not repeated', () => {
    const result = resolveProfessionSuggestion('maps routes expedition planning', professions);

    expect(result?.id).toBe(2);
    expect(result?.name).toBe('Cartographer');
  });

  test('falls back to the first catalog item when there is no useful match', () => {
    const result = resolveProfessionSuggestion('unknown suggestion', professions);

    expect(result?.id).toBe(1);
    expect(result?.name).toBe('Mechanic');
  });
});
