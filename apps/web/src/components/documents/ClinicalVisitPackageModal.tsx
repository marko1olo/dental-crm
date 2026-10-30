/**
 * ClinicalVisitPackageModal.tsx
 *
 * Канонический SSOT хаб первичной документации клиники DENTE Dental CRM.
 * Объединяет:
 * 1. Пакет документов первичного приёма (Договор, Согласие 1051н, Согласие 152-ФЗ, Анкета здоровья).
 * 2. Клинический пакет приёма врача (Медицинская карта приёма, План лечения, Назначение лекарств, Направление на рентген/КТ, Памятка).
 * 3. Справка для налогового вычета 13% НДФЛ (ФНС КНД 1151156 с авто-агрегацией оплат из кассы 54-ФЗ).
 *
 * Инварианты Мандата 8e, 8n, 8am, 8ap и Apple HIG:
 * - Автономия врача: кнопки печати НИКОГДА не блокируются (disabled = false).
 * - Печать договора с 0 ₽ и прочерками («___________») до приёма без ошибок.
 * - Заполнение соматической нормы в 1 клик («✓ Соматически здоров / Интактные зубы»).
 * - Ровно ОДНА Primary CTA кнопка (var(--teal)) на видимый экран.
 * - На смартфонах — нативный Bottom Sheet со скруглением rounded-t-[24px], Drag Handle 36x5px и Thumb Zone.
 * - Sweet Spot: 350–450 строк.
 */

import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import React, { useMemo, useState } from "react";
import {
	Check,
	CheckCircle2,
	ChevronRight,
	ClipboardCheck,
	FileDown,
	FileText,
	HelpCircle,
	Printer,
	Receipt,
	ShieldCheck,
	Stethoscope,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import { printClinicalPackage } from "./clinicalPackagePrintEngine";
import {
	aggregatePatientPaymentsForTaxYear,
	printTaxCertificate,
} from "./taxCertificateEngine";

export type ClinicalPackageTab = "primary" | "clinical" | "tax";

export interface ClinicalItem {
	readonly kind: DocumentKind;
	readonly title: string;
	readonly statutoryRef: string;
	readonly description: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
}

export interface ClinicalVisitPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	readonly onCreateDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenDocument?: ((documentId: string) => void) | undefined;
	readonly onSelectDocumentKind?: ((kind: DocumentKind) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	readonly clinicProfileDraft?: any | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: payments from cash register 54-FZ
	readonly payments?: readonly any[] | undefined;
	readonly initialTab?: ClinicalPackageTab | undefined;
}

export const PRIMARY_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "paid_medical_services_contract",
		title: "Договор оказания платных медицинских услуг",
		statutoryRef: "Договор клиники · Стандарт",
		description: "Договор с пациентом или плательщиком на стоматологические услуги (допустима печать до приёма с 0 ₽).",
		icon: FileText,
	},
	{
		kind: "informed_consent",
		title: "Информированное добровольное согласие на лечение",
		statutoryRef: "Согласие на лечение · Стандарт 1051н",
		description: "Согласие на диагностику, осмотр, местную анестезию и терапевтическое лечение.",
		icon: ShieldCheck,
	},
	{
		kind: "personal_data_processing_consent",
		title: "Согласие на обработку персональных данных",
		statutoryRef: "Персональные данные · 152-ФЗ",
		description: "Правовое основание для ведения медицинской карты, связи и сервисных уведомлений.",
		icon: UserCheck,
	},
	{
		kind: "patient_intake_questionnaire",
		title: "Анкета первичного пациента о здоровье",
		statutoryRef: "Анкета здоровья · Аллергоанамнез",
		description: "Сбор аллергоанамнеза и соматического статуса с возможностью фиксации физиологической нормы в 1 клик.",
		icon: ClipboardCheck,
	},
];

export const CLINICAL_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "dental_medical_card_043u",
		title: "Медицинская карта приёма",
		statutoryRef: "Амбулаторная карта",
		description: "Первичный и повторный учёт состояния зубочелюстной системы, зубная формула и дневник визита.",
		icon: FileText,
	},
	{
		kind: "treatment_plan",
		title: "Протокол приёма и комплексный план лечения",
		statutoryRef: "Клинический протокол",
		description: "Фиксация клинического статуса, манипуляций, этапов и стоимости лечения.",
		icon: Stethoscope,
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк",
		statutoryRef: "Назначение лекарств",
		description: "Назначение антибактериальных, противовоспалительных и обезболивающих препаратов.",
		icon: Receipt,
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на рентгенодиагностику и КТ",
		statutoryRef: "Лучевая диагностика",
		description: "Направление на прицельный снимок, панораму (ОПТГ) или 3D томографию челюстей (КЛКТ).",
		icon: FileDown,
	},
	{
		kind: "post_visit_recommendations",
		title: "Рекомендации пациенту после приёма",
		statutoryRef: "Памятка ухода",
		description: "Инструкция по уходу за полостью рта, приёму медикаментов и гигиеническому режиму.",
		icon: HelpCircle,
	},
];

export function ClinicalVisitPackageModal(
	props: ClinicalVisitPackageModalProps,
): React.JSX.Element | null {
	const {
		isOpen,
		onClose,
		patient,
		doctorFullName,
		existingDocuments = [],
		onCreateDocument,
		onOpenDocument,
		onSelectDocumentKind,
		clinicProfileDraft,
		payments = [],
		initialTab = "primary",
	} = props;

	const [activeTab, setActiveTab] = useState<ClinicalPackageTab>(initialTab);
	const [isNormApplied, setIsNormApplied] = useState<boolean>(false);
	const [selectedTaxYear, setSelectedTaxYear] = useState<number>(() => new Date().getFullYear());

	const documentsByKind = useMemo(() => {
		const map = new Map<DocumentKind, GeneratedDocument[]>();
		for (const doc of existingDocuments) {
			const list = map.get(doc.kind) ?? [];
			list.push(doc);
			map.set(doc.kind, list);
		}
		return map;
	}, [existingDocuments]);

	const currentPackageItems = activeTab === "primary" ? PRIMARY_STATUTORY_ITEMS : CLINICAL_STATUTORY_ITEMS;

	const missingKinds = useMemo(() => {
		return currentPackageItems
			.filter((item) => !documentsByKind.has(item.kind))
			.map((item) => item.kind);
	}, [currentPackageItems, documentsByKind]);

	// Агрегация кассовых чеков для справки 13% НДФЛ
	const taxAggregated = useMemo(() => {
		return aggregatePatientPaymentsForTaxYear(payments as any[], selectedTaxYear);
	}, [payments, selectedTaxYear]);

	if (!isOpen) return null;

	const handleBatchCreate = () => {
		if (!onCreateDocument) return;
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handlePrintPrimaryPackage = (isBlank = false) => {
		printPrimaryIntakePackage({
			patient: isBlank ? null : (patient as any),
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
			isNormApplied: isBlank ? false : isNormApplied,
		});
	};

	const handlePrintClinicalPackage = (isBlank = false) => {
		printClinicalPackage({
			patient: isBlank ? null : (patient as any),
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	const handlePrintTaxCertificate = () => {
		printTaxCertificate({
			clinic: clinicProfileDraft,
			patient: patient as any,
			taxpayerFullName: patient?.fullName || "____________________",
			effectiveInn: (patient as any)?.administrativeProfile?.snils || "",
			relationship: "self",
			selectedYear: selectedTaxYear,
			aggregated: taxAggregated,
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clinical-package-modal-title"
			data-testid="clinical-visit-package-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="relative w-full max-w-[840px] h-[92dvh] sm:h-auto sm:max-h-[90vh] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-t-[24px] sm:rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] flex flex-col overflow-hidden"
				style={{ maxWidth: "100vw", overflowX: "hidden" }}
			>
				{/* Apple HIG Tactile Drag Handle (Mobile only, 36x5px) */}
				<div
					className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab shrink-0 bg-[var(--paper-soft,#f8fafc)]"
					onClick={onClose}
					aria-label="Закрыть свайпом"
				>
					<div className="w-9 h-[5px] rounded-full bg-[var(--line-strong,#94a3b8)]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope size={18} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h3
								className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
								id="clinical-package-modal-title"
							>
								Пакет первичной документации
							</h3>
							<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] truncate">
								{patient?.fullName || "Пациент не выбран"} {patient?.cardNumber ? `· Карта № ${patient.cardNumber}` : ""}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="secondary-button w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/50 transition cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Category Switcher Tabs */}
				<div className="flex items-center px-4 sm:px-6 pt-2.5 pb-2 gap-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-x-auto no-scrollbar shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("primary")}
						className={`secondary-button min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
							activeTab === "primary"
								? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
								: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-package-primary"
					>
						<ShieldCheck size={14} aria-hidden="true" />
						<span>Первичный визит (4 бланка)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("clinical")}
						className={`secondary-button min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
							activeTab === "clinical"
								? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
								: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-package-clinical"
					>
						<Stethoscope size={14} aria-hidden="true" />
						<span>Клинический пакет (5 бланков)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("tax")}
						className={`secondary-button min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
							activeTab === "tax"
								? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
								: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-package-tax"
					>
						<Zap size={14} aria-hidden="true" />
						<span>Справка 13% НДФЛ (ФНС)</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5">
					{/* Patient & Somatic Norm Bar */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-2.5 flex-wrap">
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
							<div className="text-xs text-[var(--ink,#0f172a)] flex flex-wrap gap-1 items-center">
								<span className="font-bold">{patient?.fullName || "Пациент для оформления"}</span>
								{patient?.birthDate && <span className="text-[var(--muted,#64748b)]">· {patient.birthDate}</span>}
								{patient?.phone && <span className="text-[var(--muted,#64748b)]">· {patient.phone}</span>}
							</div>
						</div>

						{/* Mandate 8e: 1-click Somatic Norm Button */}
						{activeTab === "primary" && (
							<button
								type="button"
								onClick={() => setIsNormApplied((prev) => !prev)}
								className={`secondary-button min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
									isNormApplied
										? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
										: "border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)]"
								}`}
								title="Установить соматическую норму: соматически здоров, интактные зубы (Мандат 8e)"
								data-testid="btn-toggle-somatic-norm-1click"
							>
								<CheckCircle2 size={15} className={isNormApplied ? "text-emerald-600" : "text-[var(--muted,#64748b)]"} />
								<span>{isNormApplied ? "Соматическая норма активна" : "Заполнить соматическую норму"}</span>
							</button>
						)}
					</div>

					{/* Tab 1 & Tab 2: Document Checklists */}
					{(activeTab === "primary" || activeTab === "clinical") && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] px-1">
								<span>Состав пакета документов:</span>
								<span>{missingKinds.length === 0 ? "Все бланки готовы" : `Не оформлено: ${missingKinds.length}`}</span>
							</div>

							<div className="grid grid-cols-1 gap-2.5">
								{currentPackageItems.map((item) => {
									const docs = documentsByKind.get(item.kind) ?? [];
									const isReady = docs.length > 0;
									const Icon = item.icon;

									return (
										<div
											key={item.kind}
											className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[var(--teal,#0d9488)]/40 transition"
										>
											<div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
												<div
													className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
														isReady ? "bg-emerald-500/10 text-emerald-600" : "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
													}`}
												>
													<Icon size={16} />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-1.5">
														<span className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-tight">
															{item.title}
														</span>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] shrink-0">
															{item.statutoryRef}
														</span>
													</div>
													<p className="text-[11px] text-[var(--muted,#64748b)] line-clamp-2 mt-0.5">
														{item.description}
													</p>
												</div>
											</div>

											<div className="flex items-center justify-end gap-1.5 shrink-0 sm:self-center">
												{isReady ? (
													<button
														type="button"
														onClick={() => docs[0]?.id && onOpenDocument?.(docs[0].id)}
														className="secondary-button min-h-[34px] h-8.5 px-3 rounded-lg border border-[var(--line,#e2e8f0)] text-xs font-medium text-[var(--ink,#0f172a)] flex items-center gap-1 hover:border-[var(--teal,#0d9488)] transition cursor-pointer"
													>
														<Check size={13} className="text-emerald-600" />
														<span>Оформлен</span>
													</button>
												) : (
													<button
														type="button"
														onClick={() => {
															if (onCreateDocument) onCreateDocument(item.kind);
															else if (onSelectDocumentKind) onSelectDocumentKind(item.kind);
														}}
														className="secondary-button min-h-[34px] h-8.5 px-3 rounded-lg border border-[var(--line,#e2e8f0)] text-xs font-medium text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] transition cursor-pointer"
													>
														<span>Открыть</span>
													</button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Tab 3: Tax 13% NDFL */}
					{activeTab === "tax" && (
						<div className="space-y-3.5">
							<div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex-wrap">
								<span className="text-xs font-semibold text-[var(--ink,#0f172a)]">
									Налоговый период (календарный год):
								</span>
								<div className="flex items-center gap-1.5">
									{[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
										<button
											key={y}
											type="button"
											onClick={() => setSelectedTaxYear(y)}
											className={`secondary-button min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
												selectedTaxYear === y
													? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
													: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)]"
											}`}
										>
											{y} год
										</button>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
								<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-[11px] text-[var(--muted,#64748b)]">Код 01 (стандартное):</div>
									<div className="text-base font-bold text-[var(--ink,#0f172a)] mt-0.5">
										{taxAggregated.code01Rub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
								<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-[11px] text-[var(--muted,#64748b)]">Код 02 (дорогостоящее):</div>
									<div className="text-base font-bold text-[var(--teal,#0d9488)] mt-0.5">
										{taxAggregated.code02Rub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
								<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-[11px] text-[var(--muted,#64748b)]">Возврат 13% НДФЛ:</div>
									<div className="text-base font-bold text-emerald-600 mt-0.5">
										{taxAggregated.estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer with STRICT 1 Primary CTA Button (Mandate 8am & Apple HIG) */}
				<div
					className="p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0"
					style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
				>
					<div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="secondary-button w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/30 transition cursor-pointer"
						>
							Закрыть
						</button>

						{activeTab === "primary" ? (
							<button
								type="button"
								onClick={() => handlePrintPrimaryPackage(true)}
								className="secondary-button w-full sm:w-auto min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] transition cursor-pointer text-center"
								title="Распечатать чистый бланк пакета с линиями для ручного заполнения (Мандат 8e)"
								data-testid="btn-print-blank-intake-package"
							>
								<Printer size={15} className="mr-1.5 shrink-0 inline" />
								<span>Бланк (_____)</span>
							</button>
						) : (
							<div className="sm:hidden" />
						)}
					</div>

					{/* THE ONE PRIMARY CTA BUTTON */}
					<div className="w-full sm:w-auto">
						{activeTab === "primary" && (
							<button
								type="button"
								onClick={() => handlePrintPrimaryPackage(false)}
								className="primary-button w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
								data-testid="btn-print-primary-package-cta"
							>
								<Printer size={16} />
								<span>Распечатать пакет документов</span>
							</button>
						)}

						{activeTab === "clinical" && (
							<button
								type="button"
								onClick={() => handlePrintClinicalPackage(false)}
								className="primary-button w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
								data-testid="btn-print-clinical-package-cta"
							>
								<Printer size={16} />
								<span>Распечатать клинический пакет</span>
							</button>
						)}

						{activeTab === "tax" && (
							<button
								type="button"
								onClick={handlePrintTaxCertificate}
								className="primary-button w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
								data-testid="btn-print-tax-certificate-cta"
							>
								<Printer size={16} />
								<span>Сформировать справку НДФЛ</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default ClinicalVisitPackageModal;
