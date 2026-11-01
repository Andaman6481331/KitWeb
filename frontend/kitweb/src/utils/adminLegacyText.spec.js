import { describe, it, expect } from 'vitest';
import { legacyText } from './adminLegacyText';

describe('legacyText', () => {
    const en = legacyText('en');
    const th = legacyText('th');

    it('has the same keys in both languages, none empty', () => {
        expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
        for (const t of [en, th]) {
            for (const [key, value] of Object.entries(t)) {
                if (typeof value === 'function') expect(String(value(2)), key).not.toBe('');
                else if (typeof value === 'object') for (const [k, v] of Object.entries(value)) expect(v, `${key}.${k}`).toBeTruthy();
                else expect(value, key).toBeTruthy();
            }
        }
    });

    it('names every record status in both languages', () => {
        expect(Object.keys(th.recordStatus).sort()).toEqual(['archived', 'confirmed', 'merged', 'unverified']);
        expect(Object.keys(en.recordStatus).sort()).toEqual(Object.keys(th.recordStatus).sort());
    });

    it('says the history is read-only', () => {
        expect(en.readOnly).toMatch(/read-only/i);
    });
});
