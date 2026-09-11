/**
 * apps/web/src/components/prescriptions/generator/MedicalPrescriptionModal.tsx
 *
 * DENTE Dental CRM — Prescriptions & Patient Treatment Memo (Order 1094n Form 107-1/u).
 * Consolidates legacy generator into a compact wrapper with 1-click messenger copy.
 */

import type React from "react";
import { useState } from "react";
import { Copy, FileText, Pill, Printer, X } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	DENTAL_MEDICATIONS_CATALOG,
	type DentalMedicationPreset,
} from "./prescriptionPresets";
import {
	PrescriptionPrintModal,
	type PrescriptionPrintModalProps,
} from "../PrescriptionPrintModal";

export {
	PrescriptionPrintModal,
	type PrescriptionPrintModalProps,
};

export interface MedicalPrescriptionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly onInsertToDiary?: ((diaryText: string) => void) | undefined;
}

export interface PatientPrescriptionMemoParams {
	clinicName: string;
	clinicPhone: string;
	patientName: string;
	doctorName: string;
	prescriptionDate?: string | undefined;
	medications: readonly DentalMedicationPreset[];
}

export function formatPatientPrescriptionMemo(
	params: PatientPrescriptionMemoParams,
): string {
	const {
		clinicName,
		clinicPhone,
		patientName,
		doctorName,
		prescriptionDate,
		medications,
	} = params;

	const dateStr = prescriptionDate || new Date().toLocaleDateString("ru-RU");

	const medsList = medications.map((med, idx) => {
		const cleanSigna = med.signaRu
			.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
			.trim();
		return `${idx + 1}. ${med.tradeNameRu} (${med.activeSubstanceRu}, ${med.formRu}):\n   Способ применения: ${cleanSigna}`;
	});

	const lines = [
		`Схема приёма лекарственных препаратов (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата назначения: ${dateStr}`,
		"Назначенные препараты:",
		...medsList,
		`Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
	];

	return lines.join("\n");
}

const normalizeDrugId = (id: string): string => {
	if (id === "amoxiclav_875_125") return "amoxiclav_875";
	if (id === "nimesulide_100") return "nimesil_100";
	if (id === "cholisal_gel") return "holisal_gel";
	return id;
};

export const MedicalPrescriptionModal: React.FC<MedicalPrescriptionModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientBirthDate = "",
	medicalCardNumber = "",
	doctorName = "Лечащий врач",
	doctorSpecialty = "Врач-стоматолог",
	clinicName = "ООО «Денте Стоматология»",
	clinicPhone = "",
	onInsertToDiary,
}) => {
	const [selectedIds, setSelectedIds] = useState<readonly string[]>([
		"nimesil_100",
		"chlorhexidine_005",
		"amoxiclav_875",
	]);

	if (!isOpen) return null;

	const toggleMedication = (id: string) => {
		const normId = normalizeDrugId(id);
		setSelectedIds((prev) => {
			const hasIt = prev.some((item) => normalizeDrugId(item) === normId);
			if (hasIt) {
				return prev.filter((item) => normalizeDrugId(item) !== normId);
			}
			return [...prev, normId];
		});
	};

	const handleCopyPatientPrescriptionMemo = () => {
		const drugs = selectedIds
			.map((id) =>
				DENTAL_MEDICATIONS_CATALOG.find(
					(m) => normalizeDrugId(m.id) === normalizeDrugId(id),
				),
			)
			.filter((d): d is DentalMedicationPreset => Boolean(d));

		if (drugs.length === 0) {
			showToast("Выберите хотя бы один препарат", "warning");
			return;
		}

		const memoText = formatPatientPrescriptionMemo({
			clinicName,
			clinicPhone: clinicPhone || "",
			patientName,
			doctorName,
			prescriptionDate: new Date().toLocaleDateString("ru-RU"),
			medications: drugs,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(memoText).catch(() => {});
		}

		showToast(
			"Схема приёма лекарств скопирована для отправки пациенту в мессенджер",
			"success",
		);
	};

	const handleInsertToDiary = () => {
		const drugs = selectedIds
			.map((id) =>
				DENTAL_MEDICATIONS_CATALOG.find(
					(m) => normalizeDrugId(m.id) === normalizeDrugId(id),
				),
			)
			.filter((d): d is DentalMedicationPreset => Boolean(d));
		const itemsText = drugs
			.map(
				(d, idx) =>
					`${idx + 1}. ${d.latinRp}\n   ${d.dispenseLatin}\n   ${d.signaRu} [${d.tradeNameRu}]`,
			)
			.join("\n");
		const diaryText = `Назначено медикаментозное лечение (рецепт № 107-1/у от ${new Date().toLocaleDateString("ru-RU")}):\n${itemsText}`;
		if (onInsertToDiary) {
			onInsertToDiary(diaryText);
		}
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(diaryText).catch(() => {});
		}
		showToast(
			"Назначения внесены в дневник 043/у (скопировано в буфер)",
			"success",
			3000,
		);
	};

	return (
		<div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" data-testid="medical-prescription-modal">
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<Pill className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink,#0f172a)]">
								Рецептурный бланк Минздрава РФ (Форма № 107-1/у)
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName} • {medicalCardNumber} • Приказ Минздрава № 1094н
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-4 overflow-y-auto flex flex-col gap-3 flex-1">
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Назначенные препараты ({selectedIds.length} выбрано):
					</span>
					<div className="flex flex-col gap-2">
						{DENTAL_MEDICATIONS_CATALOG.map((med) => {
							const normId = normalizeDrugId(med.id);
							const isSelected = selectedIds.some((id) => normalizeDrugId(id) === normId);
							return (
								<button
									key={`${med.id}_${med.formRu}`}
									type="button"
									onClick={() => toggleMedication(med.id)}
									className={
										"min-h-[48px] w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer " +
										(isSelected
											? "bg-[var(--teal-surface,#f0fdfa)] border-teal-600 text-[var(--ink,#0f172a)] shadow-xs"
											: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]")
									}
								>
									<div className="flex flex-col">
										<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
											{med.tradeNameRu}
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">
											{med.signaRu}
										</span>
									</div>
									<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-teal-700 dark:text-teal-300">
										{isSelected ? "Выбрано" : "Добавить"}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Приказ Минздрава России № 1094н
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							data-testid="med-rx-insert-to-diary-btn"
							onClick={handleInsertToDiary}
							className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 cursor-pointer flex items-center gap-2"
						>
							<FileText className="w-4 h-4" />
							<span>Внести в дневник 043/у</span>
						</button>
						<button
							type="button"
							onClick={handleCopyPatientPrescriptionMemo}
							data-testid="med-rx-copy-patient-btn"
							className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 cursor-pointer flex items-center gap-2"
							title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy className="w-4 h-4 text-teal-600 dark:text-teal-400" />
							<span>Скопировать для пациента</span>
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer flex items-center gap-2"
						>
							<Printer className="w-4 h-4" />
							<span>Печать рецепта</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MedicalPrescriptionModal;
