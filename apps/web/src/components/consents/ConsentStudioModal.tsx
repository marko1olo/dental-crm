/**
 * apps/web/src/components/consents/ConsentStudioModal.tsx
 *
 * Каноническая студия подписания согласий и договоров DENTE CRM (SSOT).
 * Мандаты 8e (Zero Disabled Buttons), 8x (человеческий язык), 8am (1 Primary CTA),
 * Apple HIG mobile ergonomics (нативный Bottom Sheet, хэндл 36x5px, тач-таргеты >= 44px).
 */

import React, { useState, useEffect, useRef } from "react";
import {
	FileText,
	Printer,
	CheckCircle2,
	Clock,
	X,
	ShieldCheck,
	AlertCircle,
	FileSignature,
	UserCheck,
} from "lucide-react";
import {
	CANONICAL_CONSENT_CATALOG,
	type ConsentDocumentId,
	type ConsentSignStatus,
	type ConsentPartyContext,
	generateConsentPrintHtml,
} from "./consentCatalogData";
import { SignaturePadCanvas } from "./SignaturePadCanvas";

export interface ConsentStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: Partial<ConsentPartyContext>;
	readonly initialDocId?: ConsentDocumentId;
	readonly onDocumentSigned?: (payload: {
		docId: ConsentDocumentId;
		status: ConsentSignStatus;
		signatureSvg?: string;
		signaturePng?: string;
		signedAt: string;
	}) => void;
}

interface DocSignRecord {
	status: ConsentSignStatus;
	signedAt?: string;
	signatureSvg?: string;
	signaturePng?: string;
	isPaperOriginalArchived?: boolean;
}

export const ConsentStudioModal: React.FC<ConsentStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	initialDocId = "therapy_hygiene",
	onDocumentSigned,
}) => {
	const [activeDocId, setActiveDocId] = useState<ConsentDocumentId>(initialDocId);
	const [signRecords, setSignRecords] = useState<Record<ConsentDocumentId, DocSignRecord>>({
		therapy_hygiene: { status: "pending" },
		surgery_implant: { status: "pending" },
		orthodontics: { status: "pending" },
		paid_contract: { status: "pending" },
	});
	const [isPaperChecked, setIsPaperChecked] = useState<boolean>(false);
	const [currentSvg, setCurrentSvg] = useState<string>("");
	const [currentPng, setCurrentPng] = useState<string>("");
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	const activeDoc =
		CANONICAL_CONSENT_CATALOG.find((d) => d.id === activeDocId) ||
		CANONICAL_CONSENT_CATALOG[0];

	// Закрытие по Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Сброс временных полей при переключении документа
	useEffect(() => {
		const existing = signRecords[activeDocId];
		setIsPaperChecked(existing?.isPaperOriginalArchived ?? false);
		setCurrentSvg(existing?.signatureSvg ?? "");
		setCurrentPng(existing?.signaturePng ?? "");
	}, [activeDocId, signRecords]);

	if (!isOpen) return null;

	// Печать бланка А4 (Мандат 8e: печать доступна в любой момент)
	const handlePrint = () => {
		const record = signRecords[activeDocId];
		const html = generateConsentPrintHtml(activeDoc, patientContext, {
			status: record.status,
			signedAt: record.signedAt,
			signatureSvg: record.signatureSvg,
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		} else {
			// Фоллбэк: печать через скрытый iframe
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "0";
			document.body.appendChild(iframe);
			iframe.contentDocument?.write(html);
			iframe.contentDocument?.close();
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => {
				document.body.removeChild(iframe);
			}, 1000);
		}
	};

	// Фиксация подписанного документа (Мандат 8e: кнопка НИКОГДА НЕ DISABLED)
	const handleConfirmSign = () => {
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		let status: ConsentSignStatus = "signed_digital";
		if (isPaperChecked || (!currentSvg && !currentPng)) {
			status = "signed_paper";
		}

		const updatedRecord: DocSignRecord = {
			status,
			signedAt: nowStr,
			signatureSvg: currentSvg || undefined,
			signaturePng: currentPng || undefined,
			isPaperOriginalArchived: isPaperChecked || status === "signed_paper",
		};

		setSignRecords((prev) => ({
			...prev,
			[activeDocId]: updatedRecord,
		}));

		onDocumentSigned?.({
			docId: activeDocId,
			status,
			signatureSvg: updatedRecord.signatureSvg,
			signaturePng: updatedRecord.signaturePng,
			signedAt: nowStr,
		});

		const label =
			status === "signed_paper"
				? "Зафиксировано: подписано на бумажном носителе"
				: "Зафиксировано: цифровая подпись сохранена";
		setToastMsg(label);
		setTimeout(() => setToastMsg(null), 3500);
	};

	const currentRecord = signRecords[activeDocId];

	return (
		<div
			className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-studio-title"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-5xl max-h-[92vh] md:max-h-[88vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-t-[24px] md:rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* iOS тактильный хэндл для смартфонов (Apple HIG 36x5px) */}
				<div className="flex md:hidden w-full justify-center pt-2.5 pb-1">
					<div
						className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)]"
						aria-hidden="true"
					/>
				</div>

				{/* Каноническая шапка (<= 52px на десктопе, Мандат 8am) */}
				<header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shrink-0">
							<ShieldCheck size={18} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h1
								id="consent-studio-title"
								className="text-base md:text-lg font-semibold tracking-tight text-[var(--ink,#0f172a)] truncate"
							>
								Студия юридических согласий и договоров
							</h1>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								{patientContext?.patientName
									? `Пациент: ${patientContext.patientName}`
									: "Электронное и бумажное подписание медицинских документов"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Вторичная кнопка печати (Мандат 8e: печать без блокировок) */}
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium text-[var(--ink,#0f172a)] transition-colors shadow-2xs min-h-[44px] md:min-h-[36px]"
							title="Распечатать бланк А4 для подписи ручкой"
						>
							<Printer size={15} aria-hidden="true" />
							<span className="hidden sm:inline">Печать бланка А4</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center w-9 h-9 rounded-xl border border-transparent hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]"
							title="Закрыть студию"
							aria-label="Закрыть"
						>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
				</header>

				{/* Тело студии: 2-колоночная сетка на десктопе, вертикальный стек на смартфонах */}
				<div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--line,#e2e8f0)] min-h-0">
					{/* Левая колонка: 4 канонических документа с их статусами */}
					<aside className="w-full md:w-80 shrink-0 p-3 md:p-4 bg-[var(--paper-soft,#f8fafc)]/50 flex flex-col gap-2">
						<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted,#64748b)] px-1">
							Документы пациента ({CANONICAL_CONSENT_CATALOG.length})
						</span>
						<div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
							{CANONICAL_CONSENT_CATALOG.map((doc) => {
								const rec = signRecords[doc.id];
								const isSelected = doc.id === activeDocId;
								const isSigned = rec.status !== "pending";

								return (
									<button
										key={doc.id}
										type="button"
										onClick={() => setActiveDocId(doc.id)}
										className={`group flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all shrink-0 w-[240px] md:w-full min-h-[48px] ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]/20"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)]"
										}`}
									>
										<div
											className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
												isSigned
													? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
													: "bg-[var(--line,#cbd5e1)]/30 text-[var(--ink-muted,#64748b)]"
											}`}
										>
											{isSigned ? (
												<CheckCircle2 size={16} aria-hidden="true" />
											) : (
												<Clock size={16} aria-hidden="true" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-tight truncate">
												{doc.title}
											</div>
											<div className="text-[11px] text-[var(--ink-muted,#64748b)] truncate mt-0.5">
												{isSigned
													? rec.status === "signed_paper"
														? "Подписано на бумаге"
														: "Подписано на планшете"
													: "Ожидает подписи"}
											</div>
										</div>
									</button>
								);
							})}
						</div>

						{/* Информационная плашка статуса */}
						<div className="mt-auto hidden md:flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink-muted,#64748b)]">
							<FileSignature size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Законная сила ЭЦП по ст. 5 63-ФЗ и приказу МЗ 1051н.</span>
						</div>
					</aside>

					{/* Правая колонка: Просмотр документа и блок подписи */}
					<main className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-5 min-h-0">
						{/* Шапка активного документа */}
						<div className="border-b border-[var(--line,#e2e8f0)] pb-3">
							<div className="flex items-center justify-between gap-2">
								<h2 className="text-base md:text-lg font-bold text-[var(--ink,#0f172a)]">
									{activeDoc.title}
								</h2>
								<span
									className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
										currentRecord.status === "signed_digital"
											? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20"
											: currentRecord.status === "signed_paper"
												? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
												: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
									}`}
								>
									{currentRecord.status === "signed_digital"
										? "✓ Подписано на планшете"
										: currentRecord.status === "signed_paper"
											? "✓ Подписано на бумаге"
											: "Ожидает подписания"}
								</span>
							</div>
							<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1">
								{activeDoc.subtitle} • {activeDoc.statutoryBasis}
							</p>
						</div>

						{/* Содержимое разделов документа */}
						<div className="space-y-3.5 text-xs md:text-sm text-[var(--ink,#0f172a)] leading-relaxed">
							{activeDoc.sections.map((section) => (
								<div
									key={section.id}
									className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)]/60 border border-[var(--line,#e2e8f0)]"
								>
									<h3 className="font-semibold text-[var(--ink,#0f172a)] mb-1">
										{section.title}
									</h3>
									<p className="text-[var(--ink-muted,#64748b)]">
										{section.content}
									</p>
									{section.bullets && (
										<ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--ink-muted,#64748b)]">
											{section.bullets.map((b, i) => (
												<li key={i}>{b}</li>
											))}
										</ul>
									)}
								</div>
							))}
						</div>

						{/* Блок подписи: Сенсорный пад + чекбокс бумаги */}
						<div className="mt-2 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<FileSignature size={18} className="text-[var(--teal,#0d9488)]" />
									<span className="text-xs md:text-sm font-semibold text-[var(--ink,#0f172a)]">
										Подписание документа
									</span>
								</div>
								<span className="text-xs text-[var(--ink-muted,#64748b)]">
									Сенсорный ввод или бумажный оригинал
								</span>
							</div>

							{/* Опция 1: Бумажный оригинал (Мандат 8e: врач ставит галочку в 1 клик) */}
							<label className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer transition-colors min-h-[44px]">
								<input
									type="checkbox"
									checked={isPaperChecked}
									onChange={(e) => setIsPaperChecked(e.target.checked)}
									className="w-4 h-4 rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] border-[var(--line,#cbd5e1)] cursor-pointer"
								/>
								<div className="text-xs md:text-sm text-[var(--ink,#0f172a)] font-medium">
									✓ Подписано пациентом на бумажном носителе (оригинал в архиве)
								</div>
							</label>

							{/* Опция 2: Сенсорный SignaturePad */}
							{!isPaperChecked && (
								<div className="space-y-2">
									<div className="text-xs text-[var(--ink-muted,#64748b)]">
										Распишитесь пальцем или стилусом на экране:
									</div>
									<SignaturePadCanvas
										height={120}
										onStrokeEnd={(_strokes, svg, png) => {
											setCurrentSvg(svg);
											setCurrentPng(png);
										}}
										onClear={() => {
											setCurrentSvg("");
											setCurrentPng("");
										}}
										placeholder="Поле сенсорной подписи пациента"
									/>
								</div>
							)}
						</div>
					</main>
				</div>

				{/* Floating Bottom Bar (Apple HIG: плашка в Natural Thumb Zone) */}
				<footer className="sticky bottom-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]/95 backdrop-blur-md shrink-0">
					<div className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block">
						{toastMsg ? (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium">
								{toastMsg}
							</span>
						) : (
							<span>Мандат 8e: фиксация доступна в 1 клик без бюрократических преград.</span>
						)}
					</div>

					{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: никогда не disabled!) */}
					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={handleConfirmSign}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white shadow-sm transition-all active:scale-[0.99] cursor-pointer"
							title="Зафиксировать статус подписания в медицинской карте"
						>
							<UserCheck size={18} aria-hidden="true" />
							<span>✓ Зафиксировать подписанный документ</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ConsentStudioModal;
