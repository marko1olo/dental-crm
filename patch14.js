import fs from 'fs';
let content = fs.readFileSync('apps/api/src/tests/routes/clinical.test.ts', 'utf-8');
content = content.replace("import { eq, and } from 'drizzle-orm';", "");
content = content.replace("let app: any;", "let app: import('fastify').FastifyInstance;");
fs.writeFileSync('apps/api/src/tests/routes/clinical.test.ts', content);
