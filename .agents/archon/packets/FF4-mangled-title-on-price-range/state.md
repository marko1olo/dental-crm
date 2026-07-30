START: reproducing mangled title on price range in apps/api/src/pricelist/analyzer.ts
DONE: reported defect did NOT reproduce (already fixed+tested); found and fixed the slash form «12000/18000» which also silently dropped the lower price bound. Commits 68d41f863, ebee6a7af.
