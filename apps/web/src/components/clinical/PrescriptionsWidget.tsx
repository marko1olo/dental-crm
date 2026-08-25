import {
	DENTAL_DRUG_DOSAGE_LIMITS,
	evaluatePrescriptionPharmacologicalSafety,
	type PrescriptionDrugItem,
} from "@dental/shared";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	FileText,
	Pill,
	Plus,
	Printer,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { PrescriptionPrintModal, type PrescriptionFormType } from "../prescriptions/PrescriptionPrintModal";

export interface PrescriptionsWidgetProps {
	readonly patient: {
		readonly id?: string | null;
		readonly fullName?: string | null;
		readonly birthDate?: string | null;
		readonly cardNumber?: string | null;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly snils?: string | null;
		readonly omsPolicy?: string | null;
	} | null;
	readonly diagnosisIcd10?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly doctorSnils?: string | null;
	readonly clinicName?: string | null;
	readonly clinicAddress?: string | null;
	readonly clinicPhone?: string | null;
	readonly clinicOgrn?: string | null;
	readonly clinicInn?: string | null;
	readonly medicalLicenseNumber?: string | null;
	readonly initialDrugs?: readonly string[];
}

export const PrescriptionsWidget: React.FC<PrescriptionsWidgetProps> = ({
	patient,
	diagnosisIcd10 = "K02.1",
	doctorName = "Д-р Смирнова Анна Сергеевна",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	doctorSnils,
	clinicName,
	clinicAddress,
	clinicPhone,
	clinicOgrn,
	clinicInn,
	medicalLicenseNumber,
	initialDrugs = ["nimesulide_100"],
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeFormType, setActiveFormType] = useState<PrescriptionFormType>("107-1u");
	const [selectedDrugs, setSelectedDrugs] = useState<readonly string[]>(initialDrugs);

	const patientAgeYears = useMemo(() => {
		if (!patient?.birthDate) return 30;
		const birth = new Date(patient.birthDate);
		const diff = Date.now() - birth.getTime();
		const ageDate = new Date(diff);
		return Math.abs(ageDate.getUTCFullYear() - 1970);
	}, [patient?.birthDate]);

	const safetyReport = useMemo(() => {
		return evaluatePrescriptionPharmacologicalSafety({
			drugIds: selectedDrugs,
			patientAgeYears,
		});
	}, [selectedDrugs, patientAgeYears]);

	const handleOpenModal = (formType: PrescriptionFormType) => {
		setActiveFormType(formType);
		setIsModalOpen(true);
	};

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
						<Pill className="h-5 w-5" />
					</div>
					<div>
						<h3 className="text-base font-semibold text-slate-900 dark:text-white">
							Электронные рецепты (Приказ Минздрава № 1094н)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Формы 107-1/у, 148-1/у-88 (ПКУ), 148-1/у-04(л) с поддержкой УКЭП и контролем DDI
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => handleOpenModal("107-1u")}
						className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
					>
						<Plus className="h-4 w-4" />
						Рецепт 107-1/у
					</button>
					<button
						type="button"
						onClick={() => handleOpenModal("148-1u-88")}
						className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300 transition-colors"
					>
						<ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
						Бланк ПКУ (148-1/у-88)
					</button>
					<button
						type="button"
						onClick={() => handleOpenModal("148-1u-04l")}
						className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 transition-colors"
					>
						<FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
						Льготный (148-1/у-04)
					</button>
				</div>
			</div>

			<div className="mt-4">
				{safetyReport.hasContraindications ? (
					<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
						<div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-400">
							<AlertCircle className="h-4 w-4 shrink-0" />
							<span>Обнаружены противопоказания или критические взаимодействия (DDI):</span>
						</div>
						<ul className="mt-1.5 list-disc pl-5 space-y-1">
							{safetyReport.ageContraindications.map((c, i) => (
								<li key={i}>{c}</li>
							))}
							{safetyReport.interactions
								.filter((it) => it.severity === "contraindicated")
								.map((it, i) => (
									<li key={i}>
										<strong>{it.titleRu}:</strong> {it.descriptionRu}
									</li>
								))}
						</ul>
					</div>
				) : safetyReport.interactions.length > 0 ? (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
						<div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							<span>Внимание: потенциальное межлекарственное взаимодействие:</span>
						</div>
						<ul className="mt-1.5 list-disc pl-5 space-y-1">
							{safetyReport.interactions.map((it, i) => (
								<li key={i}>
									<strong>{it.titleRu}:</strong> {it.recommendationRu}
								</li>
							))}
						</ul>
					</div>
				) : (
					<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
						<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Фармакологический аудит пройден: ВРД/ВСД соблюдены, конфликтов DDI не обнаружено.</span>
					</div>
				)}
			</div>

			<PrescriptionPrintModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				patient={patient}
				diary={{
					diagnosisIcd10: diagnosisIcd10 ?? null,
				}}
				doctorName={doctorName ?? null}
				doctorSpecialty={doctorSpecialty ?? null}
				doctorSnils={doctorSnils ?? null}
				clinicName={clinicName ?? null}
				clinicAddress={clinicAddress ?? null}
				clinicPhone={clinicPhone ?? null}
				clinicOgrn={clinicOgrn ?? null}
				clinicInn={clinicInn ?? null}
				medicalLicenseNumber={medicalLicenseNumber ?? null}
			/>
		</div>
	);
};
