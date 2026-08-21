import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type DentalPrescriptionDrugPreset,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
} from "@dental/shared";
import { Check, FileText, Pill, Plus, Printer, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";

export interface PrescriptionModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: {
		fullName?: string | null;
		birthDate?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
	} | null;
	diary: DiaryState;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
}) => {
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
	const [customSeriesNumber, setCustomSeriesNumber] = useState<string>("");

	useEffect(() => {
		if (!isOpen) return;
		// Auto-detect recommended drugs for this diagnosis
		const icd = (diary.diagnosisIcd10 || "K02.1").toUpperCase();
		const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		if (matching.length > 0) {
			setSelectedDrugIds(matching.slice(0, 3).map((d) => d.id));
		} else {
			setSelectedDrugIds(["nimesulide_100"]);
		}
		setCustomSeriesNumber(
			`РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
		);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary.diagnosisIcd10, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1990-01-01";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "043/у";
	const docName = doctorName || "Врач-стоматолог";
	const clinic = clinicName || 'ООО "Денте Клиник"';

	const toggleDrug = (id: string) => {
		setSelectedDrugIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 3) {
				// 107-1/u allows max 3 drugs
				return [...prev.slice(1), id];
			}
			return [...prev, id];
		});
	};

	const prescriptionPayload = generatePrescriptionPayloadFromSoap({
		clinic: {
			fullName: clinic,
		},
		patient: {
			fullName: patientName,
			birthDate: patientBirth,
			medicalCardNumber: patientCard,
		},
		doctor: {
			fullName: docName,
			specialty: doctorSpecialty || "Врач-стоматолог",
		},
		diagnosisIcd10: diary.diagnosisIcd10 || "K02.1",
		treatmentText: diary.treatmentDescription,
		explicitDrugIds: selectedDrugIds.length > 0 ? selectedDrugIds : ["nimesulide_100"],
		customSeriesNumber,
	});

	const printHtml = renderForm107_1uHtml(prescriptionPayload);

	const handlePrint = () => {
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc =
			printFrame.contentWindow?.document ||
			printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
				}, 1000);
			}, 250);
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			data-testid="prescription-modal"
		>
			<div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] border border-[var(--line)] text-[var(--teal)]">
							<Pill className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink)]">
								Рецептурный бланк (Форма № 107-1/у)
							</h2>
							<p className="text-xs text-[var(--muted)]">
								Приказ Минздрава России № 1094н · {patientName} (
								{diary.diagnosisIcd10 || "Диагноз не указан"})
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left: Drug Selector Catalog */}
					<div className="w-full lg:w-1/2 p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									Выбор препаратов (максимум 3 на бланк):
								</span>
								<span className="text-xs font-semibold text-[var(--teal)]">
									Выбрано: {selectedDrugIds.length} / 3
								</span>
							</div>

							<div className="flex flex-col gap-2">
								{DENTAL_PRESCRIPTION_DRUG_CATALOG.map((drug) => {
									const isSelected = selectedDrugIds.includes(drug.id);
									return (
										<button
											key={drug.id}
											type="button"
											onClick={() => toggleDrug(drug.id)}
											className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`drug-item-${drug.id}`}
										>
											<div className="flex flex-col gap-0.5 min-w-0 pr-2">
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold text-[var(--ink)]">
														{drug.tradeNameRu}
													</span>
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] font-medium text-[var(--muted)]">
														{drug.categoryLabel}
													</span>
												</div>
												<span className="text-[11px] font-mono italic text-[var(--teal)]">
													{drug.latinRp}
												</span>
												<span className="text-[11px] text-[var(--muted)] line-clamp-1">
													{drug.signaRu}
												</span>
											</div>
											<div
												className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border ${
													isSelected
														? "bg-[var(--teal-fill,var(--teal))] border-[var(--teal)] text-[var(--on-teal,#ffffff)]"
														: "border-[var(--line)]"
												}`}
											>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* Right: Live Print Preview */}
					<div className="w-full lg:w-1/2 p-5 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Предпросмотр бланка (Формат А5):
							</span>
							<span className="text-xs text-[var(--muted)]">
								{customSeriesNumber}
							</span>
						</div>

						<div className="p-4 rounded-xl border border-[var(--line)] bg-white text-slate-900 text-xs shadow-inner font-serif leading-relaxed flex flex-col gap-3">
							<div className="border-b border-slate-300 pb-2 text-[10px] text-slate-600 flex justify-between">
								<div>
									<div className="font-bold text-slate-900 uppercase">
										{clinic}
									</div>
									<div>Штамп медицинской организации</div>
								</div>
								<div className="text-right">
									<div>Форма № 107-1/у</div>
									<div>Приказ МЗ РФ № 1094н</div>
								</div>
							</div>

							<div className="text-center">
								<div className="font-bold text-sm tracking-wider uppercase">
									РЕЦЕПТ
								</div>
								<div className="text-[10px] text-slate-500">
									Серия: {customSeriesNumber} от{" "}
									{new Date().toLocaleDateString("ru-RU")}
								</div>
							</div>

							<div className="border-b border-slate-200 pb-2 flex flex-col gap-0.5 text-[11px]">
								<div>
									Ф.И.О. пациента: <strong>{patientName}</strong>
								</div>
								<div>
									Дата рождения: <strong>{patientBirth}</strong> · Карта:{" "}
									<strong>{patientCard}</strong>
								</div>
								<div>
									Врач: <strong>{docName}</strong> (
									{doctorSpecialty || "Врач-стоматолог"})
								</div>
							</div>

							{/* Prescriptions */}
							<div className="flex flex-col gap-2 min-h-[100px] py-1">
								{prescriptionPayload.items.map((item, idx) => (
									<div key={item.id} className="font-serif">
										<div className="font-bold italic">
											{idx + 1}. {item.latinName}
										</div>
										<div className="ml-4 italic text-[11px]">
											{item.dispenseLatin}
										</div>
										<div className="ml-4 text-[11px] font-sans text-slate-700">
											{item.signaRussian}
										</div>
									</div>
								))}
							</div>

							<div className="border-t border-slate-300 pt-2 text-[10px] flex justify-between items-end text-slate-500">
								<div>
									<div>
										Срок действия: <u>60 дней</u>
									</div>
									<div className="mt-4">Подпись врача: ______________</div>
								</div>
								<div className="w-12 h-12 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-bold text-[9px]">
									М.П.
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
					<span className="text-xs text-[var(--muted)]">
						Рецепт готов к печати на термопринтере или листе А5 / А4.
					</span>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] whitespace-nowrap shrink-0 transition-colors"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:opacity-90 text-[var(--on-teal,#ffffff)] shadow-md transition-opacity"
							data-testid="print-prescription-btn"
						>
							<Printer className="w-4 h-4" />
							Печать рецепта (107-1/у)
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
