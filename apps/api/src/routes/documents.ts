import type { FastifyInstance } from "fastify";
import { register as registerAuditFacts } from "./documents/auditFacts.js";
import { register as registerCreate } from "./documents/create.js";
import { register as registerHtml } from "./documents/html.js";
import { register as registerIssue } from "./documents/issue.js";
import { register as registerNdflCalculator } from "./documents/ndflCalculator.js";
import { register as registerPdf } from "./documents/pdf.js";
import { register as registerSignUkep } from "./documents/signUkep.js";
import { register as registerTaxXml } from "./documents/taxXml.js";
import { register as registerVoid } from "./documents/void.js";

export * from "./documents/shared.js";

export async function registerDocumentRoutes(app: FastifyInstance) {
	await registerCreate(app);
	await registerIssue(app);
	await registerVoid(app);
	await registerTaxXml(app);
	await registerAuditFacts(app);
	await registerPdf(app);
	await registerHtml(app);
	await registerSignUkep(app);
	await registerNdflCalculator(app);
}
