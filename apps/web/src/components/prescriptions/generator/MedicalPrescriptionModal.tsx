import { renderForm107_1uHtml } from "@dental/shared";
import {
	Check,
	Clock,
	Copy,
	FileText,
	Pill,
	Printer,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	type Form107PrescriptionDocument,
	generateForm107Prescription,
} from "./prescriptionEngine";
import {
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
	DENTAL_MEDICATIONS_CATALOG,
	type DentalMedicationPreset,
} from "./prescriptionPresets";
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
	readonly clinicPhone?: string | undefined; // Дефолт: '+7 (495) 123-45-67'
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
		`Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой: ${clinicPhone}.`,
	];

	return lines.join("\n");
}

const normalizeDrugId = (id: string): string => {
	if (id === "amoxiclav_875_125") return "amoxiclav_875";
	if (id === "nimesulide_100") return "nimesil_100";
	if (id === "cholisal_gel") return "holisal_gel";
	return id;
};

const isDrugSelected = (id: string, list: readonly string[]): boolean => {
	const norm = normalizeDrugId(id);
	return list.some((item) => normalizeDrugId(item) === norm);
};

export const MedicalPrescriptionModal: React.FC<
	MedicalPrescriptionModalProps
> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	patientBirthDate = "1988-06-14",
	medicalCardNumber = "043/у-2026/891",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-эндодонтист",
	clinicName = "ООО «Денте Стоматология»",
	clinicPhone = "+7 (495) 123-45-67",
	onInsertToDiary,
}) => {
	const [selectedIds, setSelectedIds] = useState<readonly string[]>([
		"nimesil_100",
		"chlorhexidine_005",
		"amoxiclav_875",
	]);
	const [validityDays, setValidityDays] = useState<15 | 60 | 365>(60);

	const handleInsertToDiary = (overrideIds?: readonly string[]) => {
		const targetIds = overrideIds || selectedIds;
		if (targetIds.length === 0) {
			showToast(
				"Выберите хотя бы один препарат для внесения в дневник",
				"warning",
				3000,
			);
			return;
		}
		const drugs = targetIds
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
			clinicPhone,
			patientName,
			doctorName,
			prescriptionDate: prescriptionDoc.header.dateLabelRu,
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

	const prescriptionDoc: Form107PrescriptionDocument = useMemo(() => {
		return generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-2026-5169",
			dateIso: new Date().toISOString().split("T")[0] || "2026-08-22",
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
	}, [
		validityDays,
		clinicName,
		patientName,
		patientBirthDate,
		medicalCardNumber,
		doctorName,
		doctorSpecialty,
		selectedIds,
	]);

	if (!isOpen) return null;

	const toggleMedication = (id: string) => {
		const normId = normalizeDrugId(id);
		setSelectedIds((prev) => {
			const hasIt = prev.some((item) => normalizeDrugId(item) === normId);
			if (hasIt) {
				return prev.filter((item) => normalizeDrugId(item) !== normId);
			}
			if (prev.length >= 3) {
				return [...prev.slice(1), normId];
			}
			return [...prev, normId];
		});
	};

	const handlePrint = () => {
		// Statutory Form 107-1/u payload for @dental/shared canonical renderer
		const payload = {
			clinicLegalName: clinicName,
			clinicAddress: "г. Москва, Клинический пер., д. 7",
			clinicPhone: clinicPhone || "+7 (495) 123-45-67",
			clinicOgrn: "1207700123456",
			clinicInn: "7701234567",
			medicalLicenseNumber: "ЛО41-01137-77/00345678",
			prescriptionSeriesNumber: prescriptionDoc.header.seriesNumber,
			prescriptionDate: prescriptionDoc.header.dateLabelRu,
			patientFullName: patientName,
			patientBirthDate,
			medicalCardNumber,
			doctorFullName: doctorName,
			doctorSpecialty,
			validityDays,
			withStampAndSignature: true,
			items: prescriptionDoc.items.map((item) => ({
				latinName: item.latinRp,
				dispenseLatin: item.dispenseLatin,
				signaRussian: item.signaRu,
				tradeName: item.tradeNameRu,
			})),
		};

		showToast(
			"Подготовка официального рецептурного бланка (Форма № 107-1/у)...",
			"info",
			2000,
		);

		try {
			const statutoryHtml = renderForm107_1uHtml(payload);
			if (statutoryHtml && typeof document !== "undefined") {
				const iframe = document.createElement("iframe");
				iframe.setAttribute(
					"style",
					"position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;z-index:-1;",
				);
				document.body.appendChild(iframe);

				const frameDoc =
					iframe.contentWindow?.document || iframe.contentDocument;
				if (frameDoc) {
					frameDoc.open();
					frameDoc.write(statutoryHtml);
					frameDoc.close();

					const doPrint = () => {
						try {
							iframe.contentWindow?.focus();
							iframe.contentWindow?.print();
							showToast(
								"Рецептурный бланк отправлен на печать",
								"success",
								3000,
							);
						} catch (e) {
							console.warn(
								"Iframe print invocation error, falling back to window.print():",
								e,
							);
							window.print();
						} finally {
							setTimeout(() => {
								if (document.body.contains(iframe)) {
									document.body.removeChild(iframe);
								}
							}, 2000);
						}
					};

					if (iframe.contentWindow) {
						iframe.contentWindow.onload = doPrint;
						// Fallback in case onload does not fire for doc.write
						setTimeout(doPrint, 250);
					} else {
						doPrint();
					}
					return;
				}
			}
		} catch (err) {
			console.warn(
				"Failed to generate statutory Form 107-1/u HTML, using window.print() fallback:",
				err,
			);
		}

		// Direct browser print fallback (styled via @media print in medicalPrescription.css)
		window.print();
	};

	return (
		<div className="rx-modal-overlay" data-testid="medical-prescription-modal">
			<div className="rx-modal-container">
				{/* Header */}
				<div className="rx-modal-header rx-non-printable p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
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
						className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="rx-modal-body p-4 sm:p-5 overflow-y-auto flex flex-col md:flex-row gap-5 flex-1">
					{/* Left Column: Medication Selector */}
					<div className="rx-medication-selector rx-non-printable flex-1 flex flex-col gap-3">
						{/* 1-Click Fast Clinical Packages (Order 1094n) */}
						<div className="flex flex-col gap-2 p-3 rounded-xl border border-teal-500/30 bg-teal-500/5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
									1-Клик клинические пакеты (Приказ 1094н):
								</span>
								<span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
									0 кликов на поиск
								</span>
							</div>
							<div className="flex flex-col gap-1.5">
								{DENTAL_FAST_PRESCRIPTION_PACKAGES.map((pkg) => {
									const isPkgActive =
										pkg.drugIds.length === selectedIds.length &&
										pkg.drugIds.every((id) => isDrugSelected(id, selectedIds));
									return (
										<div
											key={pkg.id}
											className={
												"min-h-[44px] w-full p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1.5 " +
												(isPkgActive
													? "bg-teal-500/15 border-teal-600 ring-1 ring-teal-500 text-[var(--ink,#0f172a)] shadow-xs"
													: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:border-teal-500/60 hover:bg-teal-500/5 text-[var(--muted,#64748b)]")
											}
										>
											{/* biome-ignore lint/a11y/useSemanticElements: interactive row contains nested action buttons */}
											<div
												role="button"
												tabIndex={0}
												onClick={() =>
													setSelectedIds(pkg.drugIds.map(normalizeDrugId))
												}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														setSelectedIds(pkg.drugIds.map(normalizeDrugId));
													}
												}}
												className="flex items-center justify-between gap-2 cursor-pointer"
											>
												<div className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 text-left flex-1">
													<Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
													<span>{pkg.label}</span>
												</div>
												<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-teal-700 dark:text-teal-300 shrink-0">
													{pkg.badge || `${pkg.drugIds.length} преп.`}
												</span>
											</div>
											<span className="text-[11px] text-[var(--muted,#64748b)] leading-snug">
												{pkg.desc}
											</span>
											<div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[var(--line,#e2e8f0)]/50">
												<button
													type="button"
													data-testid={`btn-med-fast-diary-${pkg.id}`}
													onClick={() => {
														setSelectedIds(pkg.drugIds.map(normalizeDrugId));
														handleInsertToDiary(pkg.drugIds);
													}}
													className="min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 text-[var(--ink,#0f172a)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
													title="Внести в дневник формы 043/у"
												>
													<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
													<span>В дневник</span>
												</button>
												<button
													type="button"
													data-testid={`btn-med-fast-print-${pkg.id}`}
													onClick={() => {
														setSelectedIds(pkg.drugIds.map(normalizeDrugId));
														setTimeout(() => handlePrint(), 50);
													}}
													className="min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
													title="Мгновенная печать рецепта по экспресс-прописи"
												>
													<Printer className="w-4 h-4 shrink-0" />
													<span>Печать</span>
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
								Препараты ({selectedIds.length}/3 на бланк):
							</span>
							<div className="flex items-center gap-1.5">
								<Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<select
									value={validityDays}
									onChange={(e) =>
										setValidityDays(Number(e.target.value) as 15 | 60 | 365)
									}
									className="min-h-[36px] text-xs font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
									aria-label="Срок действия рецепта"
								>
									<option value={15}>15 дней (ПКУ / срочный)</option>
									<option value={60}>60 дней (стандартный)</option>
									<option value={365}>1 год (хронический)</option>
								</select>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							{DENTAL_MEDICATIONS_CATALOG.map((med) => {
								const isSelected = isDrugSelected(med.id, selectedIds);
								return (
									<button
										key={`${med.id}_${med.formRu}`}
										type="button"
										onClick={() => toggleMedication(med.id)}
										className={
											"min-h-[56px] w-full flex items-start justify-between p-3 rounded-xl border text-left overflow-hidden transition-all cursor-pointer " +
											(isSelected
												? "bg-[var(--teal-surface,#f0fdfa)] border-teal-600 text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-teal-500"
												: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:border-teal-500 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]")
										}
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
											className={
												"flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border transition-colors " +
												(isSelected
													? "bg-teal-600 border-teal-600 text-white"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]")
											}
										>
											{isSelected && <Check className="w-3.5 h-3.5" />}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Right Column: Live Form 107-1/u Sheet Preview */}
					<div className="rx-prescription-sheet rx-printable-sheet w-full md:w-80 p-4 rounded-xl border border-[var(--line,#cbd5e1)] shadow-lg flex flex-col gap-3 font-serif text-xs bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] transition-colors">
						<div className="rx-sheet-header flex justify-between items-start gap-2 border-b border-[var(--line,#cbd5e1)] pb-2.5">
							<div className="border border-dashed border-[var(--line,#94a3b8)] p-2 rounded text-[10px] leading-tight text-[var(--muted,#475569)] flex-1">
								<div className="font-bold uppercase text-[10px] text-[var(--ink,#0f172a)]">
									{prescriptionDoc.header.clinicName}
								</div>
								<div>Адрес: {prescriptionDoc.header.clinicAddress}</div>
								<div>ОГРН: {prescriptionDoc.header.clinicOgrn}</div>
								<div className="text-[9px] text-[var(--muted,#64748b)] mt-0.5 italic">
									Штамп медицинской организации
								</div>
							</div>
							<div className="text-right text-[9px] text-[var(--muted,#64748b)] leading-tight shrink-0 max-w-[130px]">
								<div>Минздрав РФ</div>
								<div className="font-bold text-[var(--ink,#0f172a)]">
									Форма № 107-1/у
								</div>
								<div>Приказ № 1094н</div>
							</div>
						</div>

						<div className="text-center my-0.5">
							<div className="font-bold text-sm tracking-wider uppercase text-[var(--ink,#0f172a)]">
								Рецепт
							</div>
							<div className="text-[10px] text-[var(--muted,#475569)]">
								Серия и номер:{" "}
								<span className="font-bold text-[var(--ink,#0f172a)]">
									{prescriptionDoc.header.seriesNumber}
								</span>{" "}
								от <span>{prescriptionDoc.header.dateLabelRu}</span>
							</div>
							<div className="text-[9px] text-[var(--muted,#64748b)]">
								(взрослый, детский — нужное подчеркнуть)
							</div>
						</div>

						<div className="text-[11px] flex flex-col gap-1 border-b border-[var(--line,#cbd5e1)] pb-2 text-[var(--ink,#0f172a)]">
							<div>
								Пациент:{" "}
								<span className="font-bold">
									{prescriptionDoc.patient.fullName}
								</span>
							</div>
							<div className="flex justify-between text-[10px] text-[var(--muted,#475569)]">
								<span>Д/Р: {prescriptionDoc.patient.birthDate}</span>
								<span>Медкарта: {prescriptionDoc.patient.cardNum}</span>
							</div>
							<div className="text-[10px] text-[var(--muted,#475569)]">
								Врач:{" "}
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									{prescriptionDoc.doctor.fullName}
								</span>{" "}
								({prescriptionDoc.doctor.specialty})
							</div>
						</div>

						<div className="flex flex-col gap-2 flex-1 min-h-[140px] py-1">
							{prescriptionDoc.items.length === 0 ? (
								<div className="text-center text-[var(--muted,#94a3b8)] italic py-8 text-xs">
									Выберите препараты (до 3 позиций на бланк)
								</div>
							) : (
								prescriptionDoc.items.map((item) => (
									<div key={item.itemNumber} className="flex flex-col gap-0.5">
										<div className="font-bold italic text-teal-700 dark:text-teal-400">
											{item.itemNumber}. {item.latinRp}
										</div>
										<div className="italic text-[10px] text-[var(--muted,#475569)] pl-3">
											{item.dispenseLatin}
										</div>
										<div className="text-[10px] pl-3 font-sans text-[var(--ink,#0f172a)]">
											{item.signaRu}
										</div>
										{item.tradeNameRu && (
											<div className="text-[9px] text-[var(--muted,#64748b)] pl-3 font-sans">
												[Торговое наименование: {item.tradeNameRu}]
											</div>
										)}
									</div>
								))
							)}
						</div>

						<div className="pt-2 border-t border-[var(--line,#cbd5e1)] flex flex-col gap-2">
							<div className="text-[10px] text-[var(--muted,#475569)] font-sans flex justify-between items-center">
								<span>
									<strong>Срок действия:</strong>{" "}
									<span
										className={
											validityDays === 15
												? "underline font-bold text-[var(--ink,#0f172a)]"
												: ""
										}
									>
										15 дней
									</span>{" "}
									/{" "}
									<span
										className={
											validityDays === 60
												? "underline font-bold text-teal-700 dark:text-teal-400"
												: ""
										}
									>
										60 дней
									</span>{" "}
									/{" "}
									<span
										className={
											validityDays === 365
												? "underline font-bold text-[var(--ink,#0f172a)]"
												: ""
										}
									>
										до 1 года
									</span>
								</span>
								<span className="text-[9px] text-[var(--muted,#64748b)]">
									(нужное подчеркнуть)
								</span>
							</div>

							<div className="flex items-end justify-between pt-2 mt-1 border-t border-dashed border-[var(--line,#cbd5e1)]">
								<div className="flex flex-col gap-1">
									<span className="text-[9px] text-[var(--muted,#64748b)]">
										Подпись и личная печать врача:
									</span>
									<div className="border-b border-[var(--ink,#0f172a)] w-28 h-5 flex items-end">
										<span className="text-[9px] italic text-[var(--muted,#475569)] truncate">
											/ {doctorName.replace(/^(Д-р|Врач)\s+/i, "")} /
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-10 h-10 rounded-full border border-dashed border-[var(--line,#94a3b8)] flex flex-col items-center justify-center text-[7px] font-bold text-[var(--muted,#64748b)] leading-none text-center">
										<span>ВРАЧ</span>
										<span className="text-[6.5px]">М.П.</span>
									</div>
									<div className="w-11 h-11 rounded-full border-2 border-double border-teal-600 dark:border-teal-400 flex flex-col items-center justify-center text-[6.5px] font-bold text-teal-700 dark:text-teal-300 leading-none text-center">
										<span className="uppercase">Клиника</span>
										<span>Для рецептов</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="rx-modal-footer rx-non-printable p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<div className="text-xs text-[var(--muted,#64748b)] leading-tight">
						Соответствует приказу Минздрава России от 24.11.2021 № 1094н
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] sm:border-transparent transition-colors text-center cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							data-testid="med-rx-insert-to-diary-btn"
							onClick={() => handleInsertToDiary()}
							className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer"
						>
							<FileText className="w-4 h-4 shrink-0" />
							<span>Внести в дневник 043/у</span>
						</button>
						<button
							type="button"
							onClick={handleCopyPatientPrescriptionMemo}
							data-testid="med-rx-copy-patient-btn"
							className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer"
							title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Скопировать для пациента</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
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
