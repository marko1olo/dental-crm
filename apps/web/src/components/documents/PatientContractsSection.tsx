import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import {
	type PatientContractsSectionProps,
	type ContractFilterType,
	PatientContractsHeader,
	PatientContractsFilterTabs,
	PatientContractsList,
} from "./patientContracts/index";

export type { PatientContractsSectionProps };

export const PatientContractsSection: React.FC<PatientContractsSectionProps> = ({
	patient,
	contracts = [],
	clinicProfileDraft,
	onCreateContract,
	onOpenContract,
	onPrintBlankContract,
}) => {
	const [activeFilter, setActiveFilter] = useState<ContractFilterType>("all");

	// biome-ignore lint/suspicious/noExplicitAny: patient extraction
	const pAny = (patient || {}) as any;
	const admin = pAny.administrativeProfile || {};
	const hasPassport = Boolean(admin.passport?.series && admin.passport?.number);

	const paidContracts = useMemo(() => {
		return contracts.filter(
			(d) =>
				d.kind === "paid_medical_services_contract" ||
				d.kind === ("contract" as any),
		);
	}, [contracts]);

	const filteredContracts = useMemo(() => {
		if (activeFilter === "all") return paidContracts;
		return paidContracts.filter((c) => c.status === activeFilter);
	}, [paidContracts, activeFilter]);

	const handlePrintBlank = () => {
		if (onPrintBlankContract) {
			onPrintBlankContract();
			return;
		}
		void printBlankMedicalContract(
			patient
				? {
						id: patient.id,
						fullName: patient.fullName,
						phone: patient.phone,
						email: patient.email,
						birthDate: patient.birthDate,
						administrativeProfile: patient.administrativeProfile,
					}
				: null,
			clinicProfileDraft,
		);
	};

	return (
		<div
			className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5 space-y-4"
			data-testid="patient-contracts-section"
		>
			<PatientContractsHeader
				onPrintBlank={handlePrintBlank}
				onCreateContract={onCreateContract}
			/>

			{!hasPassport && (
				<div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
						<span>
							Паспортные данные пациента не внесены в систему. Для оформления вы можете распечатать бланк со строками «________» под ручную подпись.
						</span>
					</div>
				</div>
			)}

			<PatientContractsFilterTabs
				activeFilter={activeFilter}
				setActiveFilter={setActiveFilter}
				paidContracts={paidContracts}
			/>

			<PatientContractsList
				contracts={filteredContracts}
				onOpenContract={onOpenContract}
			/>
		</div>
	);
};

PatientContractsSection.displayName = "PatientContractsSection";
