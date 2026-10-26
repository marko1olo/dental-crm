import React from "react";
import type { DocumentKind } from "@dental/shared";
import { Zap } from "lucide-react";
import { DocumentQuickRoleScenarios } from "../../DocumentQuickRoleScenarios";

export interface DocumentScenariosAccordionProps {
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	handleDirectPrintPrimaryIntake: () => void;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	setIsClinicalVisitOpen: (open: boolean) => void;
	setIsTaxAccountingOpen: (open: boolean) => void;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	setIsSickLeaveElnOpen?: ((open: boolean) => void) | undefined;
	onSelectDocumentKind?: ((kind: DocumentKind) => void) | undefined;
}

export const DocumentScenariosAccordion: React.FC<DocumentScenariosAccordionProps> = React.memo(
	function DocumentScenariosAccordion({
		setIsPrimaryIntakeOpen,
		handleDirectPrintPrimaryIntake,
		setIsSurgicalPackageOpen,
		setIsClinicalVisitOpen,
		setIsTaxAccountingOpen,
		setIsSanpinRegistryOpen,
		setIsSickLeaveElnOpen,
		onSelectDocumentKind,
	}) {
		return (
			<details className="document-scenarios-accordion group" data-testid="document-scenarios-accordion">
				<summary className="document-scenarios-summary">
					<div className="flex items-center gap-2">
						<Zap size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Быстрые сценарии оформления документов
						</span>
					</div>
					<span className="document-scenarios-summary-badge">
						7 сценариев
					</span>
				</summary>
				<div className="document-scenarios-accordion-content">
					<DocumentQuickRoleScenarios
						onOpenPrimaryIntake={() => setIsPrimaryIntakeOpen(true)}
						onPrintPrimaryIntake={handleDirectPrintPrimaryIntake}
						onOpenSurgicalPackage={() => setIsSurgicalPackageOpen(true)}
						onOpenClinicalVisit={() => setIsClinicalVisitOpen(true)}
						onOpenTaxAccounting={() => setIsTaxAccountingOpen(true)}
						onOpenSanpinRegistry={() => setIsSanpinRegistryOpen(true)}
						onOpenSickLeaveEln={() => setIsSickLeaveElnOpen?.(true)}
						onSelectCompletedAct={() => onSelectDocumentKind?.("completed_works_act")}
						onSelectAttendanceCert={() => onSelectDocumentKind?.("visit_attendance_certificate")}
					/>
				</div>
			</details>
		);
	},
);

DocumentScenariosAccordion.displayName = "DocumentScenariosAccordion";
