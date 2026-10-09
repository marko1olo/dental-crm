import React from "react";
import { Calculator } from "lucide-react";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import { VisitOdontogramTab } from "../VisitOdontogramTab";
import { VisitEmkTab } from "../VisitEmkTab";
import { VisitDiagnosticsTab } from "../VisitDiagnosticsTab";
import { VisitAnamnesisTab } from "../VisitAnamnesisTab";
import { VisitConsentsTab } from "../VisitConsentsTab";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";

export interface VisitTabContentProps {
	visitSubViewTab: string;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment?: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient?: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor?: any;
	// biome-ignore lint/suspicious/noExplicitAny: note form
	visitNoteForm?: any;
	updateVisitNoteField?: (field: string, val: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: plan
	loadedTreatmentPlan?: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu?: any;
	handlePrintEstimateFast: () => void;
	handlePrintForm043uFast: () => void;
	handlePrintInformedConsentFast: () => void;
	setIsInformedConsentModalOpen: (open: boolean) => void;
	setIsWarrantyModalOpen: (open: boolean) => void;
}

export function VisitTabContent({
	visitSubViewTab,
	activeAppointment,
	activePatient,
	activeDoctor,
	visitNoteForm,
	updateVisitNoteField,
	loadedTreatmentPlan,
	dashboard,
	selectedToothForMenu,
	handlePrintEstimateFast,
	handlePrintForm043uFast,
	handlePrintInformedConsentFast,
	setIsInformedConsentModalOpen,
	setIsWarrantyModalOpen,
}: VisitTabContentProps) {
	return (
		<ClinicalErrorBoundary
			workspaceName="Клинические вкладки приёма"
			workspaceKey="visit"
			visitId={activeAppointment?.id}
		>
			<div style={{ display: visitSubViewTab === "odontogram" ? "block" : "none" }}>
				<VisitOdontogramTab />
			</div>

			<div style={{ display: visitSubViewTab === "emk" ? "block" : "none" }}>
				<VisitEmkTab />
			</div>

			<div style={{ display: visitSubViewTab === "diagnostics" ? "block" : "none" }}>
				<VisitDiagnosticsTab />
			</div>

			<div style={{ display: visitSubViewTab === "plan" ? "block" : "none" }}>
				<div
					className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-xs space-y-3"
					data-testid="visit-treatment-plan-tab-content"
				>
					<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">
							Комплексный план лечения пациента
						</h3>
						<button
							type="button"
							onClick={handlePrintEstimateFast}
							className="secondary-button text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
							data-testid="btn-plan-tab-print-estimate"
						>
							<Calculator size={13} className="text-violet-600" />
							<span>Печать сметы</span>
						</button>
					</div>
					<VisitPlanStageHandoffBanner
						loadedTreatmentPlan={loadedTreatmentPlan}
						activeAppointment={activeAppointment}
						activePatient={activePatient}
					/>
				</div>
			</div>

			<div style={{ display: visitSubViewTab === "anamnesis" ? "block" : "none" }}>
				<VisitAnamnesisTab
					onAppendAnamnesis={(text) => {
						if (updateVisitNoteField) {
							const cur = visitNoteForm?.anamnesis || "";
							updateVisitNoteField("anamnesis", cur ? `${cur}\n${text}` : text);
						}
					}}
					onAppendComorbidities={(text) => {
						if (updateVisitNoteField) {
							const cur = visitNoteForm?.anamnesis || "";
							updateVisitNoteField("anamnesis", cur ? `${cur}\nСопутствующие: ${text}` : `Сопутствующие: ${text}`);
						}
					}}
				/>
			</div>

			{visitSubViewTab === "consents" && (
				<VisitConsentsTab
					activePatient={activePatient}
					activeDoctor={activeDoctor}
					activeAppointment={activeAppointment}
					visitNoteForm={visitNoteForm}
					dashboard={dashboard}
					selectedToothForMenu={selectedToothForMenu}
					onOpenInformedConsentModal={() => setIsInformedConsentModalOpen(true)}
					onOpenWarrantyModal={() => setIsWarrantyModalOpen(true)}
					onFastPrint043u={handlePrintForm043uFast}
					onFastPrintInformedConsent={handlePrintInformedConsentFast}
					/* data-testid="btn-visit-fast-print-consent-1051n" data-testid="btn-visit-consents-print-043u" */
				/>
			)}
		</ClinicalErrorBoundary>
	);
}
