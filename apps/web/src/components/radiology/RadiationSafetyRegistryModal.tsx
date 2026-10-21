import type React from "react";
import { RadiationSafetyFooter } from "./RadiationSafetyFooter.js";
import { RadiationSafetyHeader } from "./RadiationSafetyHeader.js";
import { RadiationSafetyTable } from "./RadiationSafetyTable.js";
import { RadiationSafetyTelemetryBar } from "./RadiationSafetyTelemetryBar.js";
import { RadiationSafetyToolbar } from "./RadiationSafetyToolbar.js";
import {
	exportRadiationDoseCsv,
	printRadiationDoseSanpin,
} from "./radiationSafetyExports.js";
import type { RadiationSafetyRegistryModalProps } from "./radiationSafetyTypes.js";
import { useRadiationSafetyRegistry } from "./useRadiationSafetyRegistry.js";

export * from "./RadiationSafetyFooter.js";
export * from "./RadiationSafetyHeader.js";
export * from "./RadiationSafetyTable.js";
export * from "./RadiationSafetyTelemetryBar.js";
export * from "./RadiationSafetyToolbar.js";
export * from "./radiationSafetyTypes.js";
export * from "./useRadiationSafetyRegistry.js";

export const DOSE_REGISTRY_TESTIDS = {
	modal: 'data-testid="radiation-safety-registry-modal"',
	studiesCount: 'data-testid="metric-studies-count"',
	totalDose: 'data-testid="metric-total-dose"',
	safetyStatus: 'data-testid="metric-safety-status"',
	addRvg: 'data-testid="btn-add-rvg-dose"',
	exportCsv: 'data-testid="btn-export-csv"',
	printSanpin: 'data-testid="btn-print-sanpin-form"',
	table: 'data-testid="dose-records-table"',
} as const;

export const RadiationSafetyRegistryModal: React.FC<
	RadiationSafetyRegistryModalProps
> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientCardNumber = "МК-2026",
	patientBirthDate = "—",
	initialRecords = [],
}) => {
	const { currentYear, records, doseAssessment, handleAddStudy } =
		useRadiationSafetyRegistry(initialRecords);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
			data-testid="radiation-safety-registry-modal"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
				<RadiationSafetyHeader
					patientName={patientName}
					patientCardNumber={patientCardNumber}
					currentYear={currentYear}
					onClose={onClose}
				/>
				<RadiationSafetyTelemetryBar
					currentYear={currentYear}
					recordsCount={records.length}
					totalDoseMsv={doseAssessment.totalDoseMsv}
					totalDoseMicrosv={doseAssessment.totalDoseMicrosv}
				/>
				<RadiationSafetyToolbar
					onAddStudy={handleAddStudy}
					onExportCsv={() =>
						exportRadiationDoseCsv(
							records,
							patientName,
							patientCardNumber,
							currentYear,
						)
					}
					onPrintSanpin={() =>
						printRadiationDoseSanpin(
							records,
							patientName,
							patientCardNumber,
							patientBirthDate,
							currentYear,
						)
					}
				/>
				<div
					className="flex-1 overflow-auto p-5"
					data-testid="dose-records-table"
				>
					<RadiationSafetyTable records={records} />
				</div>
				<RadiationSafetyFooter onClose={onClose} />
			</div>
		</div>
	);
};
