/**
 * apps/web/src/components/consents/ConsentStudioModal.tsx
 *
 * Каноническая студия информированных согласий и договоров DENTE CRM (SSOT).
 * Пакетная подпись в 1 клик, автономия врача (Мандат 8e, zero disabled buttons),
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), Apple HIG Bottom Sheet (390x844).
 * Живой язык без канцелярита и сырых номеров приказов (Мандаты 8x, 8ap).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	ShieldCheck,
	Printer,
	X,
	CheckCircle2,
	Clock,
	FileSignature,
	UserCheck,
	RotateCcw,
	CheckSquare,
	Square,
} from "lucide-react";
import {
	CANONICAL_CONSENT_CATALOG,
	type ConsentDocumentId,
	type ConsentSignStatus,
	type ConsentPartyContext,
	type ConsentDocumentItem,
	getConsentDocumentById,
	generateConsentPrintHtml,
	computeConsentIntegrityHash,
} from "./consentCatalogData";

export interface ConsentStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: Partial<ConsentPartyContext>;
	readonly initialDocId?: ConsentDocumentId;
	readonly initialSelectedIds?: readonly ConsentDocumentId[];
	readonly onDocumentSigned?: (payload: {
		docIds: ConsentDocumentId[];
		status: ConsentSignStatus;
		signatureSvg?: string;
		signedAt: string;
		integrityHash: string;
	}) => void;
}

interface SignItemRecord {
	status: ConsentSignStatus;
	signedAt?: string;
	signatureSvg?: string;
	integrityHash?: string;
}

export const ConsentStudioModal: React.FC<ConsentStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	initialDocId = "therapy",
	initialSelectedIds,
	onDocumentSigned,
}) => {
	const defaultSelection: ConsentDocumentId[] = initialSelectedIds
		? [...initialSelectedIds]
		: ["therapy", "personal_data", "anesthesia", "paid_contract"];

	const [selectedIds, setSelectedIds] = useState<Set<ConsentDocumentId>>(
		new Set(defaultSelection),
	);
	const [activeDocId, setActiveDocId] = useState<ConsentDocumentId>(initialDocId);
	const [signRecords, setSignRecords] = useState<Record<string, SignItemRecord>>({});
	const [isPaperChecked, setIsPaperChecked] = useState<boolean>(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	// Встроенный легковесный векторный Signature Canvas
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [signatureSvg, setSignatureSvg] = useState<string>("");

	const activeDoc: ConsentDocumentItem = getConsentDocumentById(activeDocId);
	const currentRecord = signRecords[activeDocId] || { status: "pending" };

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (points.length < 2) return;
		ctx.beginPath();
		ctx.strokeStyle = "#0f172a";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.stroke();
	}, [points]);

	useEffect(() => {
		redrawCanvas();
	}, [redrawCanvas]);

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		setIsDrawing(true);
		const rect = canvas.getBoundingClientRect();
		const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		setPoints([p]);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		setPoints((prev) => [...prev, p]);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		setIsDrawing(false);
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
		if (points.length > 2) {
			const d = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="100%" height="100%"><path d="${d.trim()}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
			setSignatureSvg(svg);
		}
	};

	const handleClearSignature = () => {
		setPoints([]);
		setSignatureSvg("");
		redrawCanvas();
	};

	// 1-кликовое пакетное утверждение (Мандаты 8e, 8n)
	const handleBatchSign = () => {
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const status: ConsentSignStatus = isPaperChecked || !signatureSvg ? "signed_paper" : "signed_digital";
		const pName = patientContext?.patientName || "Пациент клиники";
		const targetDocs = selectedIds.size > 0 ? Array.from(selectedIds) : [activeDocId];
		const updated = { ...signRecords };

		for (const docId of targetDocs) {
			const hash = computeConsentIntegrityHash(docId, pName, nowStr, signatureSvg || "PAPER-ARCHIVE");
			updated[docId] = {
				status,
				signedAt: nowStr,
				signatureSvg: signatureSvg || undefined,
				integrityHash: hash,
			};
		}
		setSignRecords(updated);

		const firstHash = updated[targetDocs[0]]?.integrityHash || "DENTE-SSOT";
		onDocumentSigned?.({
			docIds: targetDocs,
			status,
			signatureSvg: signatureSvg || undefined,
			signedAt: nowStr,
			integrityHash: firstHash,
		});

		setToastMsg(
			status === "signed_paper"
				? `✓ Пакет из ${targetDocs.length} бланков зафиксирован на бумаге`
				: `✓ Пакет из ${targetDocs.length} бланков подписан электронной подписью`,
		);
		setTimeout(() => setToastMsg(null), 3500);
	};

	const handlePrintDoc = () => {
		const rec = signRecords[activeDocId] || { status: "pending" };
		const html = generateConsentPrintHtml(activeDoc, patientContext, {
			status: rec.status,
			signedAt: rec.signedAt,
			signatureSvg: rec.signatureSvg,
		});
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 200);
		}
	};

	const toggleDocSelected = (id: ConsentDocumentId) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAllSelected = () => {
		if (selectedIds.size === CANONICAL_CONSENT_CATALOG.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(CANONICAL_CONSENT_CATALOG.map((d) => d.id)));
		}
	};

	if (!isOpen) return null;

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
				{/* Apple HIG тактильный хэндл для смартфонов (36x5px) */}
				<div className="flex md:hidden w-full justify-center pt-2.5 pb-1">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" aria-hidden="true" />
				</div>

				{/* Шапка студии (Мандат 8am: компактная, без визуального мусора) */}
				<header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shrink-0">
							<ShieldCheck size={18} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h1 id="consent-studio-title" className="text-base md:text-lg font-semibold tracking-tight text-[var(--ink,#0f172a)] truncate">
								Студия информированных согласий и договоров
							</h1>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								{patientContext?.patientName ? `Пациент: ${patientContext.patientName}` : "Пакетное электронное и бумажное подписание медицинских документов"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintDoc}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium text-[var(--ink,#0f172a)] transition-colors shadow-2xs min-h-[44px] md:min-h-[36px] cursor-pointer"
							title="Распечатать бланк А4"
						>
							<Printer size={15} aria-hidden="true" />
							<span className="hidden sm:inline">Печать бланка А4</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] cursor-pointer"
							title="Закрыть студию"
							aria-label="Закрыть"
						>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
				</header>

				{/* 2-колоночный рабочий стол студии */}
				<div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--line,#e2e8f0)] min-h-0">
					{/* Левая панель: Реестр 15 бланков Минздрава и выбор пакета */}
					<aside className="w-full md:w-80 shrink-0 p-3 md:p-4 bg-[var(--paper-soft,#f8fafc)]/50 flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted,#64748b)]">
								Бланки к визиту ({selectedIds.size}/{CANONICAL_CONSENT_CATALOG.length})
							</span>
							<button
								type="button"
								onClick={toggleAllSelected}
								className="text-[11px] text-[var(--teal,#0d9488)] hover:underline font-medium min-h-[28px] flex items-center cursor-pointer bg-transparent border-0 p-0"
							>
								{selectedIds.size === CANONICAL_CONSENT_CATALOG.length ? "Снять все" : "Выбрать все"}
							</button>
						</div>

						<div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
							{CANONICAL_CONSENT_CATALOG.map((doc) => {
								const rec = signRecords[doc.id] || { status: "pending" };
								const isSelected = doc.id === activeDocId;
								const isInPackage = selectedIds.has(doc.id);
								const isSigned = rec.status !== "pending";

								return (
									<div
										key={doc.id}
										onClick={() => setActiveDocId(doc.id)}
										className={`group flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all shrink-0 w-[240px] md:w-full min-h-[48px] cursor-pointer ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]/20"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)]"
										}`}
									>
										<div
											onClick={(e) => {
												e.stopPropagation();
												toggleDocSelected(doc.id);
											}}
											className="mt-0.5 text-[var(--ink-muted,#64748b)] hover:text-[var(--teal,#0d9488)] min-h-[28px] min-w-[28px] flex items-center justify-center -ml-1 cursor-pointer shrink-0"
											title={isInPackage ? "Исключить из пакета" : "Включить в пакет"}
										>
											{isInPackage ? (
												<CheckSquare size={18} className="text-[var(--teal,#0d9488)]" />
											) : (
												<Square size={18} className="text-[var(--ink-muted,#94a3b8)]" />
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

										<div className="shrink-0 mt-0.5">
											{isSigned ? (
												<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
											) : (
												<Clock size={16} className="text-[var(--ink-muted,#94a3b8)]" />
											)}
										</div>
									</div>
								);
							})}
						</div>

						<div className="mt-auto hidden md:flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink-muted,#64748b)]">
							<FileSignature size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Юридическая сила ЭЦП по ст. 5 63-ФЗ. Пакетная подпись в 1 клик.</span>
						</div>
					</aside>

					{/* Правая панель: Просмотр бланка и единый холст подписи */}
					<main className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-5 min-h-0">
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

						{/* Разделы бланка */}
						<div className="space-y-3.5 text-xs md:text-sm text-[var(--ink,#0f172a)] leading-relaxed">
							{activeDoc.sections.map((section) => (
								<div
									key={section.id}
									className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)]/60 border border-[var(--line,#e2e8f0)]"
								>
									<h3 className="font-semibold text-[var(--ink,#0f172a)] mb-1">
										{section.title}
									</h3>
									<p className="text-[var(--ink-muted,#64748b)]">{section.content}</p>
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

						{/* Блок цифровой подписи пациента со стилуса или пальца */}
						<div className="mt-2 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<FileSignature size={18} className="text-[var(--teal,#0d9488)]" />
									<span className="text-xs md:text-sm font-semibold text-[var(--ink,#0f172a)]">
										Электронная подпись пациента (Пакет из {selectedIds.size} бланков)
									</span>
								</div>
								<span className="text-xs text-[var(--ink-muted,#64748b)]">
									Сенсорный ввод или бумажный оригинал
								</span>
							</div>

							<label className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer transition-colors min-h-[44px]">
								<input
									type="checkbox"
									checked={isPaperChecked}
									onChange={(e) => setIsPaperChecked(e.target.checked)}
									className="w-4 h-4 rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] border-[var(--line,#cbd5e1)] cursor-pointer"
								/>
								<span className="text-xs md:text-sm text-[var(--ink,#0f172a)] font-medium">
									✓ Подписано пациентом на бумажном носителе (оригинал хранится в архиве)
								</span>
							</label>

							{!isPaperChecked && (
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted,#64748b)]">
										<span>Распишитесь пальцем или стилусом на экране (накладывается на весь пакет):</span>
										<button
											type="button"
											onClick={handleClearSignature}
											className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] min-h-[36px] px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] cursor-pointer"
											title="Очистить холст"
										>
											<RotateCcw size={13} />
											<span>Очистить подпись</span>
										</button>
									</div>
									<div className="relative touch-none border border-[var(--line,#cbd5e1)] rounded-xl bg-white overflow-hidden shadow-2xs">
										<canvas
											ref={canvasRef}
											width={360}
											height={120}
											onPointerDown={handlePointerDown}
											onPointerMove={handlePointerMove}
											onPointerUp={handlePointerUp}
											className="w-full h-[120px] cursor-crosshair"
										/>
										{points.length === 0 && (
											<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
												Поле для сенсорной подписи пациента (стилус или палец)
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</main>
				</div>

				{/* Floating Bottom Bar (Apple HIG Thumb Zone, ровно 1 Primary CTA кнопка #0d9488) */}
				<footer className="sticky bottom-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]/95 backdrop-blur-md shrink-0">
					<div className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block">
						{toastMsg ? (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium">{toastMsg}</span>
						) : (
							<span>Мандат 8e: подписание в 1 клик. Кнопка никогда не блокируется.</span>
						)}
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={handleBatchSign}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white shadow-sm transition-all active:scale-[0.99] cursor-pointer border-0"
							title="Утвердить и подписать выбранный пакет документов"
						>
							<UserCheck size={18} aria-hidden="true" />
							<span>✓ Подписать пакет согласий</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ConsentStudioModal;
