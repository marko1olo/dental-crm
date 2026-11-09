/**
 * apps/web/src/components/consents/ConsentStudioModal.tsx
 *
 * Каноническая студия информированных согласий и медицинских договоров DENTE CRM (SSOT).
 * Единый консолидированный центр управления согласий (Sweet Spot 350–430 строк, Мандат 8b/8zi):
 *   - 15 уставных бланков Минздрава РФ с фильтрацией и пакетным выбором
 *   - Сенсорный планшетный холст подписи пациента стилусом/пальцем (Touch/Stylus Canvas)
 *   - Резервный бумажный маршрут с фиксацией в 1 клик (Мандат 8e: Zero-Disabled Buttons)
 *   - Ровно 1 Primary CTA кнопка #0d9488 (var(--teal), Мандат 8am)
 *   - Нативная сенсорная эргономика Apple HIG: Bottom Sheet rounded-t-[24px], Drag Handle 36x5px
 */

import React, { useState, useEffect } from "react";
import {
	ShieldCheck,
	Printer,
	X,
	UserCheck,
	FileText,
	FileCheck2,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import {
	CANONICAL_CONSENT_CATALOG,
	type ConsentDocumentId,
	type ConsentSignStatus,
	type ConsentPartyContext,
	getConsentDocumentById,
	generateConsentPrintHtml,
	computeConsentIntegrityHash,
} from "./consentCatalogData";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { ConsentBatchSignActions } from "./studio/ConsentBatchSignActions";
import { ConsentDocumentViewer, type DocumentSignRecord } from "./studio/ConsentDocumentViewer";
import { ConsentSignaturePad } from "./studio/ConsentSignaturePad";

export interface ConsentStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientContext?: Partial<ConsentPartyContext> & { patientId?: string };
	readonly patient?: {
		readonly id?: string;
		readonly fullName?: string;
		readonly birthDate?: string;
		readonly passport?: string;
		readonly phone?: string;
		readonly snils?: string;
		readonly cardNumber?: string;
		readonly [key: string]: any;
	};
	readonly patientName?: string;
	readonly initialDocId?: ConsentDocumentId;
	readonly initialSelectedIds?: readonly ConsentDocumentId[];
	readonly initialMode?: "single" | "batch";
	readonly onDocumentSigned?: (payload: {
		docIds: ConsentDocumentId[];
		status: ConsentSignStatus;
		signatureSvg?: string;
		signedAt: string;
		integrityHash: string;
	}) => void;
	readonly onConsentSigned?: (payload: {
		verificationMethod: string;
		paperOriginalStored?: boolean;
		docIds?: ConsentDocumentId[];
		status?: ConsentSignStatus;
		signedAt?: string;
		integrityHash?: string;
		patientName?: string;
		[key: string]: any;
	}) => void;
}

function mapCatalogIdToBackendKind(id: ConsentDocumentId): string {
	switch (id) {
		case "therapy":
		case "endodontics":
		case "orthopedics":
		case "surgery":
		case "hygiene":
		case "periodontics":
			return "procedure_specific_consent_packet";
		case "implant":
			return "implantology";
		case "orthodontics":
			return "orthodontics";
		case "anesthesia":
			return "anesthesia_consent_log";
		case "pediatric":
			return "pediatric";
		case "radiology":
			return "radiation_xray";
		case "personal_data":
			return "personal_data_processing_consent";
		case "sedation":
			return "sedation";
		case "refusal":
			return "medical_intervention_refusal";
		case "paid_contract":
		default:
			return "informed_consent";
	}
}

export const ConsentStudioModal: React.FC<ConsentStudioModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientContext,
	patient,
	patientName,
	initialDocId = "therapy",
	initialSelectedIds,
	initialMode = "batch",
	onDocumentSigned,
	onConsentSigned,
}) => {
	const effectivePatientName =
		patientContext?.patientName ||
		patient?.fullName ||
		patientName ||
		"Пациент клиники";

	const effectivePatientId =
		patientId ||
		(patient as any)?.id ||
		(patientContext as any)?.patientId;

	const effectiveContext: Partial<ConsentPartyContext> = {
		patientName: effectivePatientName,
		birthDate: patientContext?.birthDate || patient?.birthDate,
		passport: patientContext?.passport || patient?.passport,
		phone: patientContext?.phone || patient?.phone,
		snils: patientContext?.snils || patient?.snils,
		clinicName: patientContext?.clinicName || "Клиника «DENTE»",
		doctorName: patientContext?.doctorName,
		diagnosisText: patientContext?.diagnosisText,
		plannedProcedures: patientContext?.plannedProcedures,
	};

	const defaultSelection: ConsentDocumentId[] = initialSelectedIds
		? [...initialSelectedIds]
		: initialMode === "single"
			? [initialDocId]
			: ["therapy", "personal_data", "anesthesia", "paid_contract"];

	const [selectedIds, setSelectedIds] = useState<Set<ConsentDocumentId>>(new Set(defaultSelection));
	const [activeDocId, setActiveDocId] = useState<ConsentDocumentId>(initialDocId);
	const [signRecords, setSignRecords] = useState<Record<string, DocumentSignRecord>>({});
	const [isPaperChecked, setIsPaperChecked] = useState<boolean>(false);
	const [signatureSvg, setSignatureSvg] = useState<string>("");
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const activeDoc = getConsentDocumentById(activeDocId);
	const currentRecord: DocumentSignRecord = signRecords[activeDocId] || { status: "pending" };
	const isCurrentSigned = currentRecord.status !== "pending";

	const handleBatchSign = () => {
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const status: ConsentSignStatus = isPaperChecked || !signatureSvg ? "signed_paper" : "signed_digital";
		const targetDocs = selectedIds.size > 0 ? Array.from(selectedIds) : [activeDocId];
		const updated = { ...signRecords };

		for (const docId of targetDocs) {
			const hash = computeConsentIntegrityHash(docId, effectivePatientName, nowStr, signatureSvg || "PAPER-ARCHIVE");
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

		onConsentSigned?.({
			verificationMethod: status === "signed_paper" ? "paper_physical" : "digital_touch",
			paperOriginalStored: status === "signed_paper",
			docIds: targetDocs,
			status,
			signedAt: nowStr,
			signatureSvg: signatureSvg || undefined,
			integrityHash: firstHash,
			patientName: effectivePatientName,
		});

		// Сквозное сохранение в PostgreSQL через API DENTE CRM
		if (effectivePatientId) {
			const savePromises = targetDocs.map(async (docId) => {
				const docItem = getConsentDocumentById(docId);
				const hash = updated[docId]?.integrityHash || "DENTE-SSOT";
				const mappedKind = mapCatalogIdToBackendKind(docId);
				const res = await fetch(`/api/patients/${encodeURIComponent(effectivePatientId)}/consents`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						consentType: docId,
						kind: mappedKind,
						title: docItem.title,
						verificationMethod: status === "signed_paper" ? "paper_signed" : "tablet_stylus",
						signatureSvg: status === "signed_digital" ? signatureSvg : undefined,
						integrityHash: hash,
						notes: status === "signed_paper"
							? "Подписано пациентом на бумажном носителе (оригинал в архиве)"
							: "Подписано пациентом на сенсорном планшете (ПЭП по 63-ФЗ)",
					}),
				});
				if (!res.ok) {
					throw new Error(`Ошибка сервера ${res.status}`);
				}
			});

			Promise.all(savePromises)
				.then(() => {
					setToastMsg(
						status === "signed_paper"
							? `✓ Пакет из ${targetDocs.length} бланков сохранен на сервере и в архиве`
							: `✓ Пакет из ${targetDocs.length} бланков сохранен на сервере и подписан ПЭП`,
					);
				})
				.catch((err) => {
					console.warn("[ConsentStudioModal] Ошибка сохранения согласий на сервере:", err);
					setToastMsg(`⚠️ Сохранено локально. Ошибка связи с сервером. Повторите попытку.`);
				});
		} else {
			setToastMsg(
				status === "signed_paper"
					? `✓ Пакет из ${targetDocs.length} бланков зафиксирован на бумаге`
					: `✓ Пакет из ${targetDocs.length} бланков подписан электронной подписью`,
			);
		}
		setTimeout(() => setToastMsg(null), 4500);
	};

	const handlePaperConfirm = () => {
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const targetDocs = selectedIds.size > 0 ? Array.from(selectedIds) : [activeDocId];
		const updated = { ...signRecords };

		for (const docId of targetDocs) {
			const hash = computeConsentIntegrityHash(docId, effectivePatientName, nowStr, "PAPER-ORIGINAL-STORED");
			updated[docId] = {
				status: "signed_paper",
				signedAt: nowStr,
				integrityHash: hash,
			};
		}
		setSignRecords(updated);
		setIsPaperChecked(true);

		const firstHash = updated[targetDocs[0]]?.integrityHash || "DENTE-SSOT-PAPER";
		onDocumentSigned?.({
			docIds: targetDocs,
			status: "signed_paper",
			signedAt: nowStr,
			integrityHash: firstHash,
		});

		onConsentSigned?.({
			verificationMethod: "paper_physical",
			paperOriginalStored: true,
			docIds: targetDocs,
			status: "signed_paper",
			signedAt: nowStr,
			integrityHash: firstHash,
			patientName: effectivePatientName,
		});

		// Сквозное сохранение подтверждения на бумаге в PostgreSQL через API DENTE CRM
		if (effectivePatientId) {
			const savePromises = targetDocs.map(async (docId) => {
				const docItem = getConsentDocumentById(docId);
				const hash = updated[docId]?.integrityHash || "DENTE-SSOT-PAPER";
				const mappedKind = mapCatalogIdToBackendKind(docId);
				const res = await fetch(`/api/patients/${encodeURIComponent(effectivePatientId)}/consents`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						consentType: docId,
						kind: mappedKind,
						title: docItem.title,
						verificationMethod: "paper_signed",
						integrityHash: hash,
						notes: "Подтверждено подписание на бумажном носителе (оригинал в архиве)",
					}),
				});
				if (!res.ok) {
					throw new Error(`Ошибка сервера ${res.status}`);
				}
			});

			Promise.all(savePromises)
				.then(() => {
					setToastMsg(`✓ Пакет из ${targetDocs.length} бланков сохранен на сервере`);
				})
				.catch((err) => {
					console.warn("[ConsentStudioModal] Ошибка сохранения подтверждения согласий:", err);
					setToastMsg(`⚠️ Сохранено локально. Ошибка связи с сервером. Повторите попытку.`);
				});
		} else {
			setToastMsg(`✓ Пакет из ${targetDocs.length} бланков подтвержден на бумаге`);
		}
		setTimeout(() => setToastMsg(null), 4500);
	};

	const handlePrintDoc = () => {
		const html = generateConsentPrintHtml(activeDoc, effectiveContext, currentRecord);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 200);
		}
	};

	const handlePrintBlankDoc = () => {
		const html = generateConsentPrintHtml(activeDoc, effectiveContext, { status: "pending" });
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
		setSelectedIds(
			selectedIds.size === CANONICAL_CONSENT_CATALOG.length
				? new Set()
				: new Set(CANONICAL_CONSENT_CATALOG.map((d) => d.id)),
		);
	};

	return (
		<div
			className="fixed inset-0 z-[100001] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-studio-title"
			onClick={onClose}
		>
			<div
				data-testid="consent-studio-modal"
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
							<h1 id="consent-studio-title" className="text-sm md:text-lg font-semibold tracking-tight text-[var(--ink,#0f172a)] truncate">
								<span className="md:hidden">Согласия и договоры</span>
								<span className="hidden md:inline">Студия информированных согласий и договоров</span>
							</h1>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								Пациент: {effectivePatientName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							data-testid="btn-print-blank-consent"
							onClick={handlePrintBlankDoc}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium text-[var(--ink,#0f172a)] transition-colors shadow-2xs min-h-[44px] md:min-h-[36px] cursor-pointer"
							title="Распечатать чистый бланк А4 без подписи (для физической ручки)"
						>
							<FileText size={15} aria-hidden="true" />
							<span className="hidden sm:inline">Чистый бланк</span>
						</button>
						<button
							type="button"
							data-testid="btn-print-consent"
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
					{/* Левая колонка: Реестр 15 бланков с пакетным выбором */}
					<ConsentBatchSignActions
						documents={CANONICAL_CONSENT_CATALOG}
						activeDocId={activeDocId}
						selectedIds={selectedIds}
						signRecords={signRecords}
						onSelectDoc={setActiveDocId}
						onToggleSelected={toggleDocSelected}
						onToggleAll={toggleAllSelected}
					/>

					{/* Правая колонка: Просмотр текста и сенсорная подпись */}
					<main className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-5 min-h-0">
						{/* Информационная плашка статуса */}
						<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-2">
								<FileCheck2 size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span className="text-xs text-[var(--ink-muted,#64748b)]">
									Текущий документ: <strong className="text-[var(--ink,#0f172a)]">{activeDoc.title}</strong>
								</span>
							</div>
							<span
								className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
									isCurrentSigned
										? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
										: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
								}`}
							>
								{isCurrentSigned ? "✓ Подписан" : "Ожидает"}
							</span>
						</div>

						{/* Просмотр содержимого бланка */}
						<ConsentDocumentViewer
							doc={activeDoc}
							record={currentRecord}
							patientContext={effectiveContext}
						/>

						{/* Сенсорный холст / бумажный выбор */}
						<ConsentSignaturePad
							isPaperChecked={isPaperChecked}
							onPaperCheckChange={setIsPaperChecked}
							signatureSvg={signatureSvg}
							onSignatureChange={setSignatureSvg}
							selectedCount={selectedIds.size}
						/>

						{/* Правовая памятка (Мандат 8e / 8x) */}
						<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]/50 text-[11px] text-[var(--ink-muted,#64748b)] flex items-start gap-2">
							<AlertCircle size={14} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
							<div>
								<span>
									Пакетная фиксация согласий соответствует ст. 20 Федерального закона № 323-ФЗ и Федеральному закону № 63-ФЗ.
									При оформлении на бумаге оригинал передается в архив клиники.
								</span>
							</div>
						</div>
					</main>
				</div>

				{/* Floating Bottom Bar (Apple HIG Thumb Zone, ровно 1 Primary CTA #0d9488, Мандаты 8e, 8am) */}
				<footer className="sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]/95 backdrop-blur-md shrink-0">
					<div className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block">
						{toastMsg && (
							<span className={toastMsg.startsWith("⚠️") ? "text-amber-600 dark:text-amber-400 font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"}>{toastMsg}</span>
						)}
					</div>

					<div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-end">
						{/* Кнопка мгновенного подтверждения бумажного подписания (Мандат 8e: Zero-Disabled) */}
						<button
							type="button"
							data-testid="btn-confirm-paper-signed"
							onClick={handlePaperConfirm}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
							title="Зафиксировать подписание на бумаге в медкарте"
						>
							<FileText size={16} aria-hidden="true" />
							<span>Подтвердить подписание на бумаге</span>
						</button>

						{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am) */}
						<button
							type="button"
							data-testid="btn-batch-sign-consents"
							onClick={handleBatchSign}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white shadow-sm transition-all active:scale-[0.99] cursor-pointer border-0"
							title="Утвердить и подписать выбранный пакет документов"
						>
							<UserCheck size={18} aria-hidden="true" />
							<span>Подписать пакет согласий</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ConsentStudioModal;