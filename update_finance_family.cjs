const fs = require('fs');
let c = fs.readFileSync('apps/api/src/routes/finance_family.ts', 'utf8');

c = c.replace(
	'import { and, eq, isNull, or } from "drizzle-orm";',
	'import { and, eq, isNull, or, ilike, desc } from "drizzle-orm";'
);

const insertIdx = c.indexOf('// GET /api/finance/family/:familyGroupId');
if(insertIdx > -1) {
	const newRoute = `\\t// GET /api/finance/family - search families
\\tapp.get("/api/finance/family", async (req, reply) => {
\\t\\tconst organizationId = await requireResolvedOrganizationId(
\\t\\t\\treq,
\\t\\t\\treply,
\\t\\t\\t"family finance read"
\\t\\t);
\\t\\tif (!organizationId) return;

\\t\\tconst { search } = req.query as { search?: string };
\\t\\tconst whereClause = search
\\t\\t\\t? and(
\\t\\t\\t\\t\\teq(familyGroups.organizationId, organizationId),
\\t\\t\\t\\t\\tilike(familyGroups.name, \`%\${search}%\`)
\\t\\t\\t  )
\\t\\t\\t: eq(familyGroups.organizationId, organizationId);

\\t\\tconst families = await db
\\t\\t\\t.select()
\\t\\t\\t.from(familyGroups)
\\t\\t\\t.where(whereClause)
\\t\\t\\t.orderBy(desc(familyGroups.createdAt))
\\t\\t\\t.limit(20);

\\t\\treturn families;
\\t});

`;
	const unescapedBlock = newRoute.replace(/\\\\t/g, '\\t');
	c = c.slice(0, insertIdx) + unescapedBlock + c.slice(insertIdx);
	fs.writeFileSync('apps/api/src/routes/finance_family.ts', c, 'utf8');
	console.log('Route added!');
} else {
	console.log('Not found');
}
