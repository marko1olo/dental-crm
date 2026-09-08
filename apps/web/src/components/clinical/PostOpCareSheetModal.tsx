/**
 * PostOpCareSheetModal.tsx
 *
 * Клиническая модалка памяток пациенту после приёма (Post-Op Care Sheet).
 * Фича 223: 1-клик стоматологические рецептурные пакеты и памятки пациенту после приёма.
 *
 * СООТВЕТСТВИЕ КОНСТИТУЦИИ:
 * - Мандат 8e: Автономия врача (0 заблокированных disabled кнопок).
 * - Мандат 8k: Анти-трение (1-клик печать, 1-клик копирование в WhatsApp, 1-клик добавление в SOAP).
 * - Мандат 8d п. 6: Закон Анти-Матрёшки (глубина модалок строго 1).
 * - Мандат 8d п. 4: Плотность тулбара 32–36px, тач-таргеты >= 44px на мобильных.
 * - Мандат 8d п. 7: Ноль мультяшных эмодзи в медицинских документах (только векторные иконки Lucide).
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	X,
	Printer,
	Copy,
	Check,
	FileText,
	AlertTriangle,
	ShieldCheck,
	HeartPulse,
	Stethoscope,
} from "lucide-react";
import {
	POST_OP_PATIENT_MEMOS,
	getPostOpPatientMemo,
	generatePatientMemoText,
	renderPatientMemoPrintHtml,
	type PostOpMemoId,
} from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";

export type PostOpCareSheetType = "surgical" | "anesthesia" | "endo" | "hygiene";

export interface PostOpCareSheetDef {
	readonly id: PostOpCareSheetType;
	readonly memoId: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly testId: string;
}

export const POST_OP_CARE_SHEETS: readonly PostOpCareSheetDef[] = [
	{
		id: "surgical",
		memoId: "surgery_extraction",
		title: "Памятка пациенту после удаления зуба и хирургических манипуляций",
		shortTitle: "Хирургия / Удаление",
		badge: "Хирургия 043/у",
		testId: "post-op-tab-surgical",
	},
	{
		id: "anesthesia",
		memoId: "anesthesia_caries",
		title: "Памятка пациенту после местной анестезии и лечения кариеса",
		shortTitle: "Анестезия / Кариес",
		badge: "Терапия 043/у",
		testId: "post-op-tab-anesthesia",
	},
	{
		id: "endo",
		memoId: "endodontics",
		title: "Памятка пациенту после эндодонтического лечения (корневые каналы)",
		shortTitle: "Эндодонтия / Каналы",
		badge: "Эндодонтия 043/у",
		testId: "post-op-tab-endo",
	},
	{
		id: "hygiene",
		memoId: "surgery_extraction",
		title: "Памятка пациенту после профгигиены и пародонтологического лечения",
		shortTitle: "Гигиена / Пародонтология",
		badge: "Пародонтология 043/у",
		testId: "post-op-tab-hygiene",
	},
];

export interface PostOpCareSheetModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly defaultSheetType?: PostOpCareSheetType | undefined;
	readonly patient?: {
		readonly id?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly cardNumber?: string | null | undefined;
		readonly address?: string | null | undefined;
	} | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly onApplyToSoap?: ((memoText: string) => void) | undefined;
}

export function PostOpCareSheetModal({
	isOpen,
	onClose,
	defaultSheetType = "surgical",
	patient,
	doctorName = "Д-р Смирнова Анна Сергеевна",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	clinicName = "Стоматологическая клиника «DENTE»",
	clinicPhone = "+7 (495) 777-88-99",
	clinicAddress = "г. Москва, ул. Стоматологическая, д. 24",
	toothNumber,
	onApplyToSoap,
}: PostOpCareSheetModalProps) {
	const [activeSheetType, setActiveSheetType] = useState<PostOpCareSheetType>(defaultSheetType);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	useEffect(() => {
		if (defaultSheetType) {
			setActiveSheetType(defaultSheetType);
		}
	}, [defaultSheetType]);

	const currentSheetDef = useMemo(() => {
		return (
			POST_OP_CARE_SHEETS.find((s) => s.id === activeSheetType) ||
			POST_OP_CARE_SHEETS[0]!
		);
	}, [activeSheetType]);

	const activeMemo = useMemo(() => {
		return getPostOpPatientMemo(currentSheetDef.memoId);
	}, [currentSheetDef.memoId]);

	const memoRenderOptions = useMemo(() => {
		return {
			patientFullName: patient?.fullName || "Пациент",
			patientBirthDate: patient?.birthDate || undefined,
			doctorFullName: doctorName || "Врач-стоматолог",
			doctorSpecialty: doctorSpecialty || "Стоматолог-терапевт",
			clinicName: clinicName || "Стоматологическая клиника «DENTE»",
			clinicPhone: clinicPhone || "+7 (495) 777-88-99",
			clinicAddress: clinicAddress || "г. Москва, ул. Стоматологическая, д. 24",
			toothNumber: toothNumber || undefined,
			visitDate: new Date().toLocaleDateString("ru-RU"),
		};
	}, [patient, doctorName, doctorSpecialty, clinicName, clinicPhone, clinicAddress, toothNumber]);

	const formattedText = useMemo(() => {
		return generatePatientMemoText(currentSheetDef.memoId, memoRenderOptions);
	}, [currentSheetDef.memoId, memoRenderOptions]);

	const htmlSheet = useMemo(() => {
		return renderPatientMemoPrintHtml(currentSheetDef.memoId, memoRenderOptions);
	}, [currentSheetDef.memoId, memoRenderOptions]);

	if (!isOpen) return null;

	const handleCopyToWhatsApp = async () => {
		try {
			await navigator.clipboard.writeText(formattedText);
			setIsCopied(true);
			showToast("Памятка скопирована в буфер обмена для отправки в WhatsApp / Telegram", "success");
			setTimeout(() => setIsCopied(false), 2500);
		} catch {
			showToast("Ошибка копирования памятки в буфер обмена", "error");
		}
	};

	const handlePrint = () => {
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (printWin) {
			printWin.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8" />
					<title>${activeMemo.title}</title>
					<style>
						@media print {
							@page { margin: 10mm; size: A4 portrait; }
							body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
						}
					</style>
				</head>
				<body>
					${htmlSheet}
					<script>
						window.onload = function() { window.print(); window.close(); };
					</script>
				</body>
				</html>
			`);
			printWin.document.close();
		} else {
			window.print();
		}
	};

	const handleApplySoap = () => {
		if (onApplyToSoap) {
			onApplyToSoap(formattedText);
			showToast(`Памятка «${currentSheetDef.shortTitle}» добавлена в дневник визита`, "success");
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
			data-testid="post-op-care-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="post-op-care-title"
		>
			<div className="flex flex-col w-full max-w-3xl max-h-[92vh] rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden">
				{/* Тулбар шапки модалки (1 строка, плотность 34px по Закону Хика) */}
				<div className="flex items-center justify-between px-4 py-2.5 sm:px-5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] shrink-0">
							<HeartPulse className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<h2
								id="post-op-care-title"
								className="text-sm sm:text-base font-bold text-[var(--ink)] truncate"
							>
								Памятка пациенту после приёма (Post-Op Care)
							</h2>
							<p className="text-xs text-[var(--muted)] truncate">
								{patient?.fullName ? `${patient.fullName} • ` : ""}
								Клинические рекомендации и режим покоя
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="btn-close-post-op-modal"
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--line)]/50 hover:text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* 1-клик переключатель профильных памяток */}
				<div className="px-4 py-2 sm:px-5 border-b border-[var(--line)] bg-[var(--paper)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
					{POST_OP_CARE_SHEETS.map((sheet) => {
						const isSelected = activeSheetType === sheet.id;
						return (
							<button
								key={sheet.id}
								type="button"
								data-testid={sheet.testId}
								onClick={() => setActiveSheetType(sheet.id)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--teal)] text-white shadow-xs"
										: "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)] hover:border-[var(--teal)]"
								}`}
							>
								<FileText className="h-3.5 w-3.5 shrink-0" />
								<span>{sheet.shortTitle}</span>
							</button>
						);
					})}
				</div>

				{/* Основной контент памятки */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
					<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
						<div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
							<span className="font-bold text-[var(--ink)] text-sm">{activeMemo.title}</span>
							<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20">
								{currentSheetDef.badge}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)]">{activeMemo.summary}</p>
					</div>

					{/* Ключевые правила ухода */}
					<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-2">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-xs uppercase tracking-wider">
							<ShieldCheck className="h-4 w-4 text-[var(--teal)] shrink-0" />
							<span>Ключевые правила и рекомендации:</span>
						</div>
						<ul className="space-y-1.5 pl-4 list-disc text-xs text-[var(--ink)] leading-relaxed">
							{activeMemo.keyRules.map((rule, idx) => (
								<li key={idx}>{rule}</li>
							))}
						</ul>
					</div>

					{/* Тревожные симптомы (CITO) */}
					<div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-300 space-y-2">
						<div className="flex items-center gap-1.5 font-semibold text-xs text-red-700 dark:text-red-400 uppercase tracking-wider">
							<AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
							<span>Срочно связаться с клиникой при:</span>
						</div>
						<ul className="space-y-1 pl-4 list-disc text-xs leading-relaxed">
							{activeMemo.urgentTriggers.map((trig, idx) => (
								<li key={idx}>{trig}</li>
							))}
						</ul>
					</div>
				</div>

				{/* Подвал действий: 1-клик печать, 1-клик WhatsApp, 1-клик в SOAP (Мандат 8e: 0 disabled) */}
				<div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex-wrap">
					<div className="text-xs text-[var(--muted)] font-mono">
						Печать А4/А5 • Текст без эмодзи
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{onApplyToSoap && (
							<button
								type="button"
								data-testid="btn-apply-post-op-soap"
								onClick={handleApplySoap}
								className="min-h-[44px] sm:min-h-[34px] sm:h-[34px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
							>
								<Stethoscope className="h-3.5 w-3.5 text-[var(--teal)] shrink-0" />
								<span>Внести в SOAP-дневник</span>
							</button>
						)}

						<button
							type="button"
							data-testid="btn-copy-post-op-wa"
							onClick={handleCopyToWhatsApp}
							className="min-h-[44px] sm:min-h-[34px] sm:h-[34px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-emerald-500 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
						>
							{isCopied ? (
								<>
									<Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
									<span className="text-emerald-700 dark:text-emerald-400">Скопировано!</span>
								</>
							) : (
								<>
									<Copy className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
									<span>Скопировать для WhatsApp</span>
								</>
							)}
						</button>

						<button
							type="button"
							data-testid="btn-print-post-op"
							onClick={handlePrint}
							className="min-h-[44px] sm:min-h-[34px] sm:h-[34px] px-4 rounded-xl bg-[var(--teal)] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--teal)]/90 shadow-xs transition-all cursor-pointer"
						>
							<Printer className="h-3.5 w-3.5 shrink-0" />
							<span>Печать памятки</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
