import { PERIO_SITE_KEYS } from "./types.js";
/**
 * WHO 6-Sextant PSR / CPITN Screening definitions:
 * S1: 17..14 (Upper Right Posterior)
 * S2: 13..23 (Upper Anterior)
 * S3: 24..27 (Upper Left Posterior)
 * S4: 37..34 (Lower Left Posterior)
 * S5: 33..43 (Lower Anterior)
 * S6: 44..47 (Lower Right Posterior)
 */
export const PSR_SEXTANTS = [
    { name: "S1", label: "Верхний правый дистальный (17-14)", teeth: [17, 16, 15, 14] },
    { name: "S2", label: "Верхний фронтальный (13-23)", teeth: [13, 12, 11, 21, 22, 23] },
    { name: "S3", label: "Верхний левый дистальный (24-27)", teeth: [24, 25, 26, 27] },
    { name: "S4", label: "Нижний левый дистальный (37-34)", teeth: [37, 36, 35, 34] },
    { name: "S5", label: "Нижний фронтальный (33-43)", teeth: [33, 32, 31, 41, 42, 43] },
    { name: "S6", label: "Нижний правый дистальный (44-47)", teeth: [44, 45, 46, 47] },
];
/**
 * Calculates PSR / CPITN screening codes per sextant:
 * - Code 0: Colored band completely visible, no calculus, no bleeding (PD <= 3mm)
 * - Code 1: Colored band completely visible, bleeding on probing present (PD <= 3mm, BOP+)
 * - Code 2: Colored band completely visible, supra/subgingival calculus or overhang present
 * - Code 3: Colored band partially submerged (PD 4-5 mm)
 * - Code 4: Colored band completely submerged inside pocket (PD >= 6 mm)
 * - Asterisk (*): Furcation involvement (>= Class I) or pathological mobility (>= Degree II)
 */
export function calculatePsrSextants(teeth) {
    const results = {};
    const toothMap = new Map();
    for (const t of teeth) {
        toothMap.set(t.toothNumber, t);
    }
    for (const sextant of PSR_SEXTANTS) {
        let maxCode = 0;
        let hasAsterisk = false;
        let maxPd = 0;
        let validTeeth = 0;
        for (const toothNum of sextant.teeth) {
            const t = toothMap.get(toothNum);
            if (!t || t.isMissing)
                continue;
            validTeeth++;
            if ((t.mobility && t.mobility >= 2) || (t.furcation && t.furcation >= 1)) {
                hasAsterisk = true;
            }
            for (const siteKey of PERIO_SITE_KEYS) {
                const site = t[siteKey];
                if (!site)
                    continue;
                const pd = site.probingDepthMm ?? 0;
                if (pd > maxPd)
                    maxPd = pd;
                if (pd >= 6) {
                    if (maxCode < 4)
                        maxCode = 4;
                }
                else if (pd >= 4) {
                    if (maxCode < 3)
                        maxCode = 3;
                }
                else if (site.calculus) {
                    if (maxCode < 2)
                        maxCode = 2;
                }
                else if (site.bleedingOnProbing) {
                    if (maxCode < 1)
                        maxCode = 1;
                }
            }
        }
        results[sextant.name] = {
            code: maxCode,
            asterisk: hasAsterisk,
            highestPocketDepthMm: maxPd,
            teethCount: validTeeth,
        };
    }
    return results;
}
/**
 * Formats PSR sextants into standard clinical string:
 * S1: 4* | S2: 1 | S3: 3 | S4: 2 | S5: 1 | S6: 4*
 */
export function formatPsrSextantsSummary(psr) {
    const order = ["S1", "S2", "S3", "S4", "S5", "S6"];
    return order
        .map((sKey) => {
        const res = psr[sKey];
        if (!res || res.teethCount === 0)
            return `${sKey}: —`;
        return `${sKey}: ${res.code}${res.asterisk ? "*" : ""}`;
    })
        .join(" | ");
}
