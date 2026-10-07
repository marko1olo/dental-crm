/**
 * PrescriptionForm107Modal.tsx
 *
 * Каноническое модальное окно выписки и печати рецептурного бланка
 * формы № 107-1/у (Приказ Минздрава России от 24.11.2021 № 1094н).
 *
 * Статутные требования:
 * - Латинское наименование МНН (Rp.: <MNN> <дозировка>).
 * - Лекарственная форма и фасовка (D.t.d. N ...).
 * - Способ применения (Signa на русском/национальном языке без неопределенных формулировок).
 * - Штамп медорганизации, личная печать врача, штамп «Для рецептов».
 *
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React, { useMemo, useState } from "react";
import {
	X,
	Printer,
	Download,
	Pill,
	Plus,
	Trash2,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import type { Patient } from "@dental/shared";
import {
	validateForm107PrescriptionInput,
	generatePrescriptionForm107Html,
	type PrescriptionForm107Input,
	type PrescriptionPrescribedDrug,
	type PrescriptionClinicInfo,
} from "./prescriptionPrintEngine";

export interface PrescriptionForm107ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly initialMedications?: PrescriptionPrescribedDrug[];
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}

export const PrescriptionForm107Modal: React.FC<PrescriptionForm107ModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	initialMedications = [
		{
			mnnLatin: "Amoxicillini",
			dosage: "500 мг",
			formAndDispenseLatin: "D.t.d. N 20 in tab.",
			signaRu: "Внутрь по 1 таблетке 3 раза в день через 8 ч, курс 7 дней.",
			tradeNameRu: "Флемоксин Солютаб",
		},
		{
			mnnLatin: "Ibuprofeni",
			dosage: "400 мг",
			formAndDispenseLatin: "D.t.d. N 10 in tab.",
			signaRu: "Внутрь по 1 таблетке при выраженных болях, не более 3 раз в день.",
		},
	],
	onPrint,
	onDownloadPdf,
}) => {
	const [medications, setMedications] =
		useState<PrescriptionPrescribedDrug[]>(initialMedications);
	const [validityDays, setValidityDays] = useState<15 | 30 | 60 | 365>(60);
	const [isPrinting, setIsPrinting] = useState(false);

	const todayIso = useMemo(() => new Date().toISOString().split("T")[0] || "2026-03-15", []);

	const clinic: PrescriptionClinicInfo = useMemo(() => {
		const draft = clinicProfileDraft || {};
		return {
			legalName: String(
				draft.legalName ||
				draft.clinicName ||
				'ООО "Стоматологическая клиника ДЕНТЕ"',
			),
			address: String(
				draft.legalAddress ||
				draft.address ||
				"127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			),
			phone: draft.phone ? String(draft.phone) : "+7 (495) 123-45-67",
			inn: String(draft.inn || "7710984521"),
			ogrn: String(draft.ogrn || "1217700456123"),
			licenseNumber: String(
				draft.medicalLicenseNumber ||
				draft.licenseNumber ||
				"ЛО41-01137-77/00645892",
			),
		};
	}, [clinicProfileDraft]);

	const rxInput: PrescriptionForm107Input = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: patient card extraction
		const pAny = (patient || {}) as any;
		return {
			seriesNumber: `77-АБ № ${Math.floor(100000 + Math.random() * 900000)}`,
			dateIso: todayIso,
			validityDays,
			clinic,
			patient: {
				fullName: patient?.fullName || "Пациент клиники",
				birthDate: patient?.birthDate || "1990-01-01",
				cardNumber: String(pAny.medicalCardNumber || pAny.cardNumber || "МК-2026/043"),
			},
			doctor: {
				fullName: doctorFullName || "Лечащий врач-стоматолог",
				specialty: "Врач-стоматолог-терапевт",
			},
			medications,
		};
	}, [patient, doctorFullName, clinic, todayIso, validityDays, medications]);

	const validation = useMemo(
		() => validateForm107PrescriptionInput(rxInput),
		[rxInput],
	);

	const handleAddMedication = () => {
		if (medications.length >= 3) return;
		setMedications([
			...medications,
			{
				mnnLatin: "Chlorhexidini",
				dosage: "0.05% 100 мл",
				formAndDispenseLatin: "D.t.d. N 1 in flac.",
				signaRu: "Ротовые ванночки по 15 мл 3 раза в день после еды, 5 дней.",
			},
		]);
	};

	const handleRemoveMedication = (idx: number) => {
		setMedications(medications.filter((_, i) => i !== idx));
	};

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (onPrint) {
				onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		} finally {
			setIsPrinting(false);
		}
	};

	const handleDownloadPdf = () => {
		if (onDownloadPdf) {
			onDownloadPdf();
			return;
		}
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="prescription-form-107-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Рецептурный бланк формы 107-1/у"
		>
			<div className="relative w-full max-w-[880px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<Pill size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">
								Рецепт на лекарственные препараты (Форма № 107-1/у)
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								Приказ Минздрава России от 24.11.2021 № 1094н · Срок: {validityDays} дней
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							disabled={isPrinting}
							className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
							data-testid="prescription-print-btn"
							title="Печать рецепта"
						>
							<Printer size={14} />
							<span>Печать рецепта</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadPdf}
							className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
							data-testid="prescription-pdf-btn"
							title="Сохранить в PDF"
						>
							<Download size={14} />
							<span>PDF</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="prescription-close-btn"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Medications List Editor */}
				<div className="p-4 border-b border-[var(--line)] bg-[var(--paper)] space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-[12px] font-bold text-[var(--ink)]">
							Назначенные препараты (не более 3 на одном бланке 107-1/у):
						</span>
						{medications.length < 3 && (
							<button
								type="button"
								onClick={handleAddMedication}
								className="secondary-button h-7 px-2 text-[11.5px] inline-flex items-center gap-1"
								data-testid="prescription-add-drug-btn"
							>
								<Plus size={13} />
								<span>Добавить препарат</span>
							</button>
						)}
					</div>

					{medications.map((med, idx) => (
						<div
							key={idx}
							className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] grid grid-cols-1 sm:grid-cols-12 gap-2 text-[12px] items-center"
						>
							<div className="sm:col-span-4">
								<span className="text-[var(--muted)] text-[11px] block">МНН (латынь):</span>
								<input
									type="text"
									value={med.mnnLatin}
									onChange={(e) => {
										const next = [...medications];
										next[idx] = { ...med, mnnLatin: e.target.value };
										setMedications(next);
									}}
									className="w-full h-7 px-2 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
							</div>

							<div className="sm:col-span-2">
								<span className="text-[var(--muted)] text-[11px] block">Дозировка:</span>
								<input
									type="text"
									value={med.dosage}
									onChange={(e) => {
										const next = [...medications];
										next[idx] = { ...med, dosage: e.target.value };
										setMedications(next);
									}}
									className="w-full h-7 px-2 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
							</div>

							<div className="sm:col-span-5">
								<span className="text-[var(--muted)] text-[11px] block">Способ применения (Signa):</span>
								<input
									type="text"
									value={med.signaRu}
									onChange={(e) => {
										const next = [...medications];
										next[idx] = { ...med, signaRu: e.target.value };
										setMedications(next);
									}}
									className="w-full h-7 px-2 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
							</div>

							<div className="sm:col-span-1 flex justify-end">
								{medications.length > 1 && (
									<button
										type="button"
										onClick={() => handleRemoveMedication(idx)}
										className="p-1 text-[var(--muted)] hover:text-rose-500 rounded cursor-pointer"
										title="Удалить препарат"
									>
										<Trash2 size={15} />
									</button>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Preview Layout */}
				<main className="p-4 max-h-[50vh] overflow-y-auto bg-[var(--paper-soft)]">
					<div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[12.5px] leading-relaxed font-serif space-y-3">
						<div className="text-center font-bold">
							<p>Министерство здравоохранения РФ</p>
							<p className="text-[14px]">РЕЦЕПТУРНЫЙ БЛАНК (Форма № 107-1/у)</p>
							<p className="text-[11px] text-[var(--muted)]">Серия {rxInput.seriesNumber}</p>
						</div>

						<div className="border-t border-b border-[var(--line)] py-2 text-[12px] space-y-1">
							<p><strong>Пациент:</strong> {rxInput.patient.fullName}</p>
							<p><strong>Лечащий врач:</strong> {rxInput.doctor.fullName}</p>
							<p><strong>Срок действия рецепта:</strong> {rxInput.validityDays} дней</p>
						</div>

						<div className="space-y-3 py-2 font-mono">
							{medications.map((m, i) => (
								<div key={i} className="pl-4 border-l-2 border-[var(--teal)]">
									<p className="font-bold">Rp.: {m.mnnLatin} {m.dosage}</p>
									<p>{m.formAndDispenseLatin}</p>
									<p className="font-sans text-[12px] text-[var(--ink)]">S.: {m.signaRu}</p>
								</div>
							))}
						</div>

						<div className="pt-4 border-t border-[var(--line)] flex justify-between text-[11px] text-[var(--muted)]">
							<div>М.П. Лечащего врача</div>
							<div>«Для рецептов»</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

PrescriptionForm107Modal.displayName = "PrescriptionForm107Modal";
