# DENTE CRM — demon backlog (Lead Security + Full-Stack)
# Format: [ ] prio | what | where | proof
# [~] in progress + agent id | [x] done + commit hash

[x] P0 | safeLocalStorage helper created | apps/web/src/lib/safeLocalStorage.ts | file exists UTF-8
[~] P0 | SettingsPricesTab: catalog-import → POST /catalog + staffMutationHeaders, no raw localStorage admin secret | apps/web/src/components/settings/SettingsPricesTab.tsx | typecheck web + no localStorage.getItem dente_clinic_token
[~] P0 | SettingsProfileTab: remove raw localStorage staff/clinic token reads; use safeLocalStorage + denteRequestHeaders | apps/web/src/components/settings/SettingsProfileTab.tsx | rg shows no bare localStorage
[ ] P0 | SettingsStaffTab: confirm no bare localStorage.getItem("dente_clinic_token"); staff* via denteAdminSecretRequestHeaders | apps/web/src/components/settings/SettingsStaffTab.tsx | rg + typecheck
[ ] P0 | SettingsAccessTab: same auth header discipline | apps/web/src/components/settings/SettingsAccessTab.tsx | rg + typecheck
[ ] P1 | denteRequestHeaders: staff token via safeLocalStorage try/catch | apps/web/src/lib/denteRequestHeaders.ts | no bare localStorage
[ ] P1 | Sweep remaining bare localStorage in settings/* and auth paths | apps/web/src | rg localStorage.getItem without try
[ ] P1 | Zod strict on settings staff/catalog routes | apps/api/src/routes/settings.ts | 400 on bad body proof test
[ ] P2 | Integration tests schedule / intake / payroll | apps/api/src/tests | npm run test slice green
[ ] P2 | Commit safeLocalStorage + PricesTab fix alone | git | commit hash on main
[ ] P2 | Commit ProfileTab fix alone | git | commit hash
[ ] P1 | Wire safeLocalStorage into apiAuthFetch readToken (already try/catch — align keys) | apps/web/src/lib/apiAuthFetch.ts | import shared keys
[ ] P1 | Find UNVERIFIED in direction/packets related to settings auth | .agents | list + verify
[ ] P2 | TODO/FIXME in settings components | apps/web/src/components/settings | rg and fix or ticket
[ ] P2 | Push main after each green commit | origin main | git status clean for touched files

# replenish sources when empty:
# - UNVERIFIED markers
# - compiler warnings
# - orphan modules
# - generators never run
