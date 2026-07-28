START GG2-middle-risk-tier-invisible: dead `riskLevel === "medium"` comparison in ShiftView.tsx vs contract enum low|watch|high; typing PatientCockpit props; adding regression guard test.

DONE 20608de77 — comparison now `"watch"` (server sends `watch`, confirmed at apps/api/src/sampleData.ts:1917-1927), `PatientCockpit` props typed from `Dashboard`, `as keyof typeof` cast dropped; guard test apps/web/src/tests/shiftViewHumanText.test.ts passes 6/6 and was shown to redden on every regression it claims to catch.
