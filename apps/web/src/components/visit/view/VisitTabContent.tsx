import type { Dashboard } from "@dental/shared";
import { Calculator, Tablet } from "lucide-react";
import { useState } from "react";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import { TreatmentPlanPresenterModal } from "../../treatment-plans/TreatmentPlanPresenterModal";
import { VisitAnamnesisTab } from "../VisitAnamnesisTab";
import { VisitConsentsTab } from "../VisitConsentsTab";
import { VisitDiagnosticsTab } from "../VisitDiagnosticsTab";
import { VisitEmkTab } from "../VisitEmkTab";
import { VisitOdontogramTab } from "../VisitOdontogramTab";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";
import type {
	VisitAppointmentEntity,
	VisitDoctorEntity,
	VisitLoadedTreatmentPlan,
	VisitNoteFormExtended,
	VisitPatientEntity,
} from "./types";

export interface VisitTabContentProps {
	visitSubViewTab: string;
	activeAppointment?: VisitAppointmentEntity | null | undefined;
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	visitNoteForm?: VisitNoteFormExtended | null | undefined;
	updateVisitNoteField?: ((field: string, val: string) => void) | undefined;
	loadedTreatmentPlan?: VisitLoadedTreatmentPlan | null | undefined;
	dashboard?: Dashboard | null | undefined;
	selectedToothForMenu?: { code: string; label?: string } | null | undefined;
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
	const [isPresenterModalOpen, setIsPresenterModalOpen] = useState(false);

	return (
		<ClinicalErrorBoundary
			workspaceName="Клинические вкладки приёма"
			workspaceKey="visit"
			visitId={activeAppointment?.id ?? ""}
		>
			<div
				style={{ display: visitSubViewTab === "odontogram" ? "block" : "none" }}
			>
				<VisitOdontogramTab
					activePatient={activePatient as any}
					activeAppointment={activeAppointment as any}
					dashboard={dashboard}
				/>
			</div>

			<div style={{ display: visitSubViewTab === "emk" ? "block" : "none" }}>
				<VisitEmkTab
					dashboard={dashboard}
					activePatient={activePatient}
					visitNoteForm={visitNoteForm || {}}
					updateVisitNoteField={updateVisitNoteField || (() => {})}
					openVisitId={activeAppointment?.id}
				/>
			</div>

			<div
				style={{
					display: visitSubViewTab === "diagnostics" ? "block" : "none",
				}}
			>
				<VisitDiagnosticsTab />
			</div>

			<div style={{ display: visitSubViewTab === "plan" ? "block" : "none" }}>
				<div
					className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-xs space-y-3"
					data-testid="visit-treatment-plan-tab-content"
				>
					<div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--line)] flex-wrap">
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">
							Комплексный план лечения пациента
						</h3>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									if (typeof window !== "undefined") {
										window.dispatchEvent(
											new CustomEvent("dente-open-treatment-plan-presenter", {
												detail: {
													patientId: activePatient?.id,
													planId: loadedTreatmentPlan?.id,
												},
											}),
										);
									}
									setIsPresenterModalOpen(true);
								}}
								className="secondary-button text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
								data-testid="btn-open-treatment-presenter-from-visit"
							>
								<Tablet size={13} className="text-[var(--teal)]" />
								<span>Презентация вариантов (3-Tier)</span>
							</button>
							<button
								type="button"
								onClick={handlePrintEstimateFast}
								className="secondary-button text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
								data-testid="btn-plan-tab-print-estimate"
							>
								<Calculator size={13} className="text-[var(--teal)]" />
								<span>Печать сметы</span>
							</button>
						</div>
					</div>
					<VisitPlanStageHandoffBanner
						loadedTreatmentPlan={loadedTreatmentPlan}
						activeAppointment={activeAppointment}
						activePatient={activePatient}
					/>
				</div>
				{isPresenterModalOpen && (
					<TreatmentPlanPresenterModal
						isOpen={isPresenterModalOpen}
						onClose={() => setIsPresenterModalOpen(false)}
						patientId={activePatient?.id}
						patientName={activePatient?.fullName || activePatient?.name}
						doctorFullName={activeDoctor?.fullName || activeDoctor?.name}
					/>
				)}
			</div>

			<div
				style={{ display: visitSubViewTab === "anamnesis" ? "block" : "none" }}
			>
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
							updateVisitNoteField(
								"anamnesis",
								cur
									? `${cur}\nСопутствующие: ${text}`
									: `Сопутствующие: ${text}`,
							);
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
