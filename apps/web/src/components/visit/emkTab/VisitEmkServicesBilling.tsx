import React, { lazy, Suspense } from "react";
import { Award, Tag } from "lucide-react";
import { EmkServicesSection } from "../emk/EmkServicesSection";
import { EgiszMultipleDiagnosesWidget } from "../EgiszMultipleDiagnosesWidget";
import { Icd10ClinicalSelector } from "../../diagnostics/Icd10ClinicalSelector";
import type { VisitEmkServicesBillingProps } from "./types";

const OrthopedicsChairsidePanel = lazy(() =>
	import("../../orthopedics/OrthopedicsChairsidePanel").then((m) => ({
		default: m.OrthopedicsChairsidePanel,
	})),
);

export function VisitEmkServicesBilling({
	openVisitId,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activePatient,
	dashboard,
	effectiveActiveTooth,
}: VisitEmkServicesBillingProps) {
	return (
		<div className="space-y-4 w-full min-w-0" data-testid="emk-treatment-section">
			<Suspense fallback={null}>
				<details
					className="group border-t border-[var(--line)] pt-2 bg-transparent"
					data-testid="emk-orthopedics-details"
				>
					<summary className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
						<span className="flex items-center gap-1.5">
							<Award size={14} className="text-amber-500" />
							<span>Ортопедический протокол и заказ в лабораторию (ЗТЛ)</span>
						</span>
					</summary>
					<div className="pt-2">
						<OrthopedicsChairsidePanel
							patientId={activePatient?.id}
							activeToothFdi={effectiveActiveTooth}
							isLocked={isLocked}
						/>
					</div>
				</details>
			</Suspense>

			<EmkServicesSection
				visitId={openVisitId}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
				activePatient={activePatient}
				activeDoctorName={dashboard?.activeDoctor?.fullName}
				clinicLegalName={dashboard?.activeDoctor?.clinicName || "ООО «ДЕНТЕ»"}
			/>

			<div className="pt-2" data-testid="egisz-multiple-diagnoses-container">
				<EgiszMultipleDiagnosesWidget />
				<details
					className="group border-t border-[var(--line)] mt-3 pt-2 bg-transparent"
					data-testid="emk-icd10-selector-details"
				>
					<summary className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
						<span className="flex items-center gap-1.5">
							<Tag size={14} className="text-emerald-500" />
							<span>Клинический классификатор МКБ-10 (Стоматология)</span>
						</span>
					</summary>
					<div className="pt-2">
						<Icd10ClinicalSelector
							selectedTooth={effectiveActiveTooth}
							onSelect={(item, tooth) => {
								const toothSuffix = tooth ? ` (зуб ${tooth})` : "";
								updateVisitNoteField("diagnosis", `${item.code} ${item.titleRu}${toothSuffix}`);
							}}
						/>
					</div>
				</details>
			</div>
		</div>
	);
}
