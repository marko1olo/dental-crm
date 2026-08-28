import React, { useState, useMemo } from "react";
import {
	Pill,
	X,
	Printer,
	Check,
	Clock,
} from "lucide-react";
import {
	DENTAL_MEDICATIONS_CATALOG,
	type DentalMedicationPreset,
} from "./prescriptionPresets";
import {
	generateForm107Prescription,
	type Form107PrescriptionDocument,
} from "./prescriptionEngine";
import "./medicalPrescription.css";

export interface MedicalPrescriptionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
}

export const MedicalPrescriptionModal: React.FC<MedicalPrescriptionModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	patientBirthDate = "1988-06-14",
	medicalCardNumber = "043/у-2026/891",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-эндодонтист",
	clinicName = "ООО «Денте Стоматология»",
}) => {
	const [selectedIds, setSelectedIds] = useState<readonly string[]>([
		"nimesil_100",
		"chlorhexidine_005",
	]);
	const [validityDays, setValidityDays] = useState<15 | 60 | 365>(60);

	const prescriptionDoc: Form107PrescriptionDocument = useMemo(() => {
		return generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-2026-5169",
			dateIso: "2026-08-22",
			validityDays,
			clinicName,
			clinicOgrn: "1207700123456",
			clinicAddress: "г. Москва, Клинический пер., д. 7",
			patientFullName: patientName,
			patientBirthDate,
			patientMedicalCardNumber: medicalCardNumber,
			doctorFullName: doctorName,
			doctorSpecialty,
			selectedMedicationIds: selectedIds,
		});
	}, [validityDays, clinicName, patientName, patientBirthDate, medicalCardNumber, doctorName, doctorSpecialty, selectedIds]);

	if (!isOpen) return null;

	const toggleMedication = (id: string) => {
		setSelectedIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 3) {
				return [...prev.slice(1), id];
			}
			return [...prev, id];
		});
	};

	return (
		<div className="rx-modal-overlay" data-testid="medical-prescription-modal">
			<div className="rx-modal-container">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<Pill className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
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
						className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col md:flex-row gap-5 flex-1">
					{/* Left Column: Medication Selector */}
					<div className="flex-1 flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
								Препараты ({selectedIds.length}/3 на бланк):
							</span>
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5 text-teal-600" />
								<select
									value={validityDays}
									onChange={(e) => setValidityDays(Number(e.target.value) as 15 | 60 | 365)}
									className="text-xs font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg px-2 py-1"
								>
									<option value={15}>15 дней</option>
									<option value={60}>60 дней</option>
									<option value={365}>1 год</option>
								</select>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							{DENTAL_MEDICATIONS_CATALOG.map((med) => {
								const isSelected = selectedIds.includes(med.id);
								return (
									<button
										key={med.id}
										type="button"
										onClick={() => toggleMedication(med.id)}
										className={"min-h-[56px] w-full flex items-start justify-between p-3 rounded-xl border text-left overflow-hidden transition-all " + (
											isSelected
												? "bg-[var(--teal-surface,#f0fdfa)] border-teal-600 text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-teal-500"
												: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:border-teal-500 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										)}
									>
										<div className="flex flex-col gap-1 min-w-0 pr-3 overflow-hidden">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
													{med.tradeNameRu}
												</span>
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] font-medium text-[var(--muted,#64748b)] shrink-0">
													{med.categoryLabelRu}
												</span>
											</div>
											<span className="text-[11px] font-mono italic font-semibold text-teal-600 dark:text-teal-400 truncate">
												{med.latinRp}
											</span>
											<span className="text-[11px] text-[var(--muted,#64748b)] leading-tight truncate">
												{med.signaRu}
											</span>
										</div>
										<div
											className={"flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border transition-colors " + (
												isSelected
													? "bg-teal-600 border-teal-600 text-white"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]"
											)}
										>
											{isSelected && <Check className="w-3.5 h-3.5" />}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Right Column: Live Form 107-1/u Sheet Preview (Strictly White Paper in all themes) */}
					<div
						className="w-full md:w-80 p-4 rounded-xl border border-slate-300 shadow-lg flex flex-col gap-3 font-serif text-xs text-slate-950"
						style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
					>
						<div className="border border-dashed border-slate-400 p-2 rounded text-[10px] text-center text-slate-700">
							{prescriptionDoc.header.clinicName}<br />
							ОГРН: {prescriptionDoc.header.clinicOgrn}<br />
							{prescriptionDoc.header.clinicAddress}
						</div>
						<div className="text-center font-bold text-sm tracking-wider uppercase text-slate-950">
							Рецепт (Форма 107-1/у)
						</div>
						<div className="text-[11px] flex flex-col gap-1 border-b border-slate-300 pb-2 text-slate-900">
							<div>Пациент: <span className="font-bold text-slate-950">{prescriptionDoc.patient.fullName}</span></div>
							<div>Д/Р: {prescriptionDoc.patient.birthDate} • Медкарта: {prescriptionDoc.patient.cardNum}</div>
							<div>Врач: {prescriptionDoc.doctor.fullName}</div>
						</div>
						<div className="flex flex-col gap-2 flex-1">
							{prescriptionDoc.items.map((item) => (
								<div key={item.itemNumber} className="flex flex-col gap-0.5">
									<div className="font-bold italic text-teal-800">
										{item.itemNumber}. {item.latinRp}
									</div>
									<div className="italic text-[10px] text-slate-700 pl-2">
										{item.dispenseLatin}
									</div>
									<div className="text-[10px] pl-2 font-sans text-slate-900">
										{item.signaRu}
									</div>
								</div>
							))}
						</div>
						<div className="pt-2 border-t border-slate-300 text-[10px] text-slate-700 font-sans">
							Срок действия: {prescriptionDoc.header.validityPeriodLabelRu}
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<div className="text-xs text-[var(--muted,#64748b)] leading-tight">
						Соответствует приказу Минздрава России от 24.11.2021 № 1094н
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] sm:border-transparent transition-colors text-center"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать рецепта (Форма 107-1/у)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
