const fs = require('fs');
let p = 'C:/Clinic_MVP/dental-crm/apps/api/src/db/imagingQuery.ts';
let code = fs.readFileSync(p, 'utf8');

// remove duplicate and
code = code.replace(/import \{ desc, and \} from "drizzle-orm";/, 'import { desc } from "drizzle-orm";');

// fix undefined
code = code.replace(/\] = await db\.insert\(imagingViewerSessions\)\.values\(\{([^]*?)\}\)\.returning\(\);/g, '] = await db.insert(imagingViewerSessions).values({$1}).returning();\n  if (!newSession) throw new Error("Failed to insert session");');
code = code.replace(/\] = await db\.update\(imagingViewerSessions\)\.set\(\{([^]*?)\}\)\.where\([^]*?\)\.returning\(\);/g, '] = await db.update(imagingViewerSessions).set({$1}).where(eq(imagingViewerSessions.id, existing.id)).returning();\n    if (!updated) throw new Error("Failed to update session");');

code = code.replace(/\] = await db\.insert\(dicomWorkbenchBundles\)\.values\(\{([^]*?)\}\)\.returning\(\);/g, '] = await db.insert(dicomWorkbenchBundles).values({$1}).returning();\n  if (!newBundle) throw new Error("Failed to insert bundle");');
code = code.replace(/\] = await db\.update\(dicomWorkbenchBundles\)\.set\(\{([^]*?)\}\)\.where\([^]*?\)\.returning\(\);/g, '] = await db.update(dicomWorkbenchBundles).set({$1}).where(eq(dicomWorkbenchBundles.id, existing.id)).returning();\n    if (!updated) throw new Error("Failed to update bundle");');

fs.writeFileSync(p, code);
console.log('Fixed imagingQuery.ts');
