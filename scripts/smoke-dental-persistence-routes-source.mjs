import { readFileSync } from "node:fs";

const odontogramRoutes = readFileSync("apps/api/src/routes/odontogram.ts", "utf8");
const financeFamilyRoutes = readFileSync("apps/api/src/routes/finance_family.ts", "utf8");
const odontogramModule = readFileSync("apps/web/src/components/odontogram/OdontogramModule.tsx", "utf8");
const treatmentEstimator = readFileSync("apps/web/src/components/odontogram/TreatmentEstimator.tsx", "utf8");
const invoiceSplitModal = readFileSync("apps/web/src/pages/InvoiceSplitPaymentModal.tsx", "utf8");
const financialDashboard = readFileSync("apps/web/src/pages/FinancialDashboard.tsx", "utf8");
const thermalReceipt = readFileSync("apps/web/src/pages/ThermalReceiptSimulator.tsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireIn(source, needle, message) {
  assert(source.includes(needle), message);
}

function forbidIn(source, needle, message) {
  assert(!source.includes(needle), message);
}

requireIn(odontogramRoutes, "requireResolvedOrganizationId(request, reply, \"tooth states read\")", "Tooth-state reads must require tenant auth.");
requireIn(odontogramRoutes, "requireResolvedStaffOrAdminOrganizationId(request, reply, \"tooth states update\")", "Tooth-state writes must require staff/admin tenant auth.");
requireIn(odontogramRoutes, "ensurePatientInOrganization(patientId, organizationId)", "Odontogram routes must verify the patient belongs to the tenant.");
requireIn(odontogramRoutes, "wsBroker.broadcastToPatient(organizationId, patientId", "Odontogram websocket updates must stay tenant/patient scoped.");
requireIn(odontogramRoutes, "await db.transaction(async (tx) =>", "Treatment-plan upserts must be atomic.");
requireIn(odontogramRoutes, "await tx.delete(treatmentPlanItemsNew).where(eq(treatmentPlanItemsNew.planId, savedPlanId))", "Treatment-plan item replacement must be inside the transaction.");
requireIn(odontogramRoutes, "TreatmentPlanValidationError", "Treatment-plan route must keep validation error contract.");

requireIn(financeFamilyRoutes, "requireResolvedOrganizationId(req, reply, \"family finance read\")", "Family-wallet reads must require tenant auth.");
requireIn(financeFamilyRoutes, "requireResolvedStaffOrAdminOrganizationId(req, reply, \"family finance payment\")", "Family-wallet payments must require staff/admin tenant auth.");
requireIn(financeFamilyRoutes, "eq(patients.organizationId, organizationId)", "Family-wallet patient lookup must be tenant scoped.");
requireIn(financeFamilyRoutes, "db.transaction(async (tx) =>", "Family-wallet payment must be transactional.");
requireIn(financeFamilyRoutes, "wsBroker.broadcastToOrganization(organizationId", "Family-wallet websocket updates must be organization scoped.");

requireIn(odontogramModule, "fetch(`/api/patients/${patientId}/tooth-states`,", "Odontogram UI must load tooth states from the API.");
requireIn(odontogramModule, "denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' })", "Odontogram UI writes must send tenant/session headers.");
requireIn(treatmentEstimator, "fetch(`/api/patients/${patientId}/treatment-plans`,", "Treatment estimator must load saved plans from the API.");
requireIn(treatmentEstimator, "denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' })", "Treatment estimator writes must send tenant/session headers.");
requireIn(invoiceSplitModal, "denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' })", "Split-payment modal writes must send tenant/session headers.");
requireIn(invoiceSplitModal, "denteAdminSecretRequestHeaders()", "Split-payment modal reads must send tenant/session headers.");

forbidIn(financialDashboard, "demo-invoice-id", "Financial dashboard must not fabricate demo invoices for empty tenants.");
forbidIn(financialDashboard, "для теста", "Financial dashboard must not label production invoice UI as a test fixture.");
forbidIn(financialDashboard, "assuming we have patients", "Financial dashboard must not depend on assumed fixture patients.");
forbidIn(thermalReceipt, "????", "Receipt simulator must not render mojibake/question-mark text.");
requireIn(thermalReceipt, "Кассовый чек №", "Receipt simulator must render readable Russian receipt copy.");
requireIn(thermalReceipt, "Спасибо за оплату", "Receipt simulator footer must be readable Russian.");

console.log(JSON.stringify({
  ok: true,
  odontogramTenantScoped: true,
  treatmentPlanAtomic: true,
  familyWalletTenantScoped: true,
  visibleFinanceCopyReadable: true
}, null, 2));
