# FF3-third-theme-never-judged

START 2026-07-29 — inventorying per-theme rule coverage across apps/web/src/styles/ for data-theme="dark" («Ночь») vs data-theme="night" («Тепло»); will fix gaps with tokens only, will NOT rename the inverted theme values.

DONE 2026-07-29 — commit 42c3ccc60: 12 of 84 dark-only selectors closed with tokens in main.css + contrast-fixes.css; five «Тепло» contrast failures measured (1.12–2.99:1) and fixed to 4.59–15.88:1; node scripts/check-css-tokens.mjs exit 0; theme rename NOT done (reported to lead as a separate packet).
