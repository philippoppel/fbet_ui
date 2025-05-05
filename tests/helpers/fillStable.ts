// helpers/fillStable.ts
import { Locator, expect } from '@playwright/test';

/**
 * Füllt ein Input-Feld robust – auch wenn React nachträglich re-hydriert.
 * 1. wartet auf sichtbares & editierbares Element
 * 2. versucht bis zu 3-mal zu füllen, falls Hydration den Wert wieder löscht
 */
export async function fillStable(
  locator: Locator,
  value: string,
  maxTries = 3
) {
  await locator.waitFor({ state: 'visible' });
  await expect(locator).toBeEditable();

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    await locator.fill(value, { noWaitAfter: true });

    // Statt einmaliger Prüfung: pollt 800 ms lang, ob der Wert bleibt
    try {
      await expect
        .poll(() => locator.inputValue(), { timeout: 800 })
        .toBe(value);
      return; // geschafft
    } catch {
      if (attempt === maxTries) throw new Error('Hydration stole the value 😭');
      // kleines Delay, dann nochmal – jetzt ist Hydration meist vorbei
      await locator.page().waitForTimeout(50 * attempt);
    }
  }
}
