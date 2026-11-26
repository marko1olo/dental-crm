/**
 * apps/web/src/components/shift/ShiftStudioModal.tsx
 *
 * Canonical SSOT Cashier Shift Studio & Fiscal Z-Report Modal.
 * First Principles Architecture for Russian Dental Clinics (1-5 Chairs).
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft-focus defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8am: Exactly ONE Primary CTA in var(--primary).
 * - Mandate 8x & 8ap: Living clinical language (No raw law codes in UI).
 * - Apple HIG: Native Mobile Bottom Sheet, touch targets >= 44x44px.
 * - Integer Kopeck Math: Strict integer kopecks (0 floating-point errors).
 * - Sweet Spot size: 250-350 lines (Mandates 8b and 8zi).
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, CheckCircle2, FileText, Layers, RefreshCw, ShieldCheck, X } from "lucide-react";
import { generateUuidV7, kopecksToRub, rubToKopecks } from "@dental/shared";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import {
	type CashShiftRecord,
	ACTIVE_SHIFT_PRESET,
	SHIFT_JOURNAL_FIXTURES,
	calculateTotalRevenueKopecks,
	calculateExpectedCashInDrawerKopecks,
	calculateEncashmentKopecks,
	buildZReportPrintData,
} from "./shiftCatalogData";
import {
	ShiftSummaryCard,
	ShiftZReportPreview,
	ShiftDrawerActions,
	ShiftJournalList,
} from "./studio/index";
import "./styles/shiftStudio.css";

export interface ShiftStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "current" | "closing" | "journal" | undefined;
	readonly initialShift?: CashShiftRecord | undefined;
	readonly onShiftClosed?: ((zReportData: ReturnType<typeof buildZReportPrintData>) => void) | undefined;
}

function createEmptyLiveShift(): CashShiftRecord {
	return {
		id: "live-shift",
		shiftNumber: 0,
		status: "open",
		openedAt: new Date().toISOString(),
		closedAt: null,
		cashierId: "",
		cashierFullName: "Администратор / Кассир",
		clinicLegalName: "Стоматологическая клиника",
		cashboxModel: "Основная касса",
		initialChangeFundKopecks: 0,
		revenue: {
			cashKopecks: 0,
			cardKopecks: 0,
			sbpKopecks: 0,
			depositKopecks: 0,
		},
		totalRevenueKopecks: 0,
		countedCashKopecks: 0,
		expectedCashInDrawerKopecks: 0,
		cashDiscrepancyKopecks: 0,
		isBalanced: true,
		isTerminalReconciled: true,
		encashmentKopecks: 0,
		retainedChangeFundKopecks: 0,
		ofdStatus: "pending",
		zReportNumber: null,
		doctorsEarnings: [],
	};
}

interface ApiReconciliationSnapshot {
	hasOpenShift?: boolean;
	shiftId?: string;
	shiftNumber?: number;
	openedAt?: string;
	cashierId?: string;
	startingBalanceRub?: number;
	expectedCashInDrawerRub?: number;
	incomeCashRub?: number;
	incomeElectronicRub?: number;
	incomeSbpRub?: number;
	advanceOffsetRub?: number;
	netRevenueRub?: number;
}

interface ApiJournalShiftRow {
	id: string;
	shiftNumber: number;
	status: "open" | "closed";
	openedAt: string;
	closedAt?: string | null;
	cashierName?: string;
	startBalanceRub?: number;
	startBalanceKopecks?: number;
	closingBalanceRub?: number | null;
	incomeTotalRub?: number;
	incomeTotalKopecks?: number;
	incomeCashRub?: number;
	incomeElectronicRub?: number;
	incomeSbpRub?: number;
	advanceOffsetRub?: number;
	ofdStatus?: "delivered" | "pending";
	zReportNumber?: string | null;
}

export const ShiftStudioModal: React.FC<ShiftStudioModalProps> = ({
	isOpen,
	onClose,
	initialTab = "current",
	initialShift,
	onShiftClosed,
}) => {
	const titleId = useId();
	const isDemo = isDemoShowcaseMode();
	const resolvedDefaultShift = useMemo(
		() => initialShift ?? (isDemo ? ACTIVE_SHIFT_PRESET : createEmptyLiveShift()),
		[initialShift, isDemo],
	);
	const [activeTab, setActiveTab] = useState<"current" | "closing" | "journal">(initialTab);
	const [currentShift, setCurrentShift] = useState<CashShiftRecord>(resolvedDefaultShift);
	const [shiftsJournal, setShiftsJournal] = useState<readonly CashShiftRecord[]>(() =>
		isDemo ? SHIFT_JOURNAL_FIXTURES : [],
	);
	const [journalFilter, setJournalFilter] = useState<"all" | "open" | "closed">("all");

	// Closing form local state
	const [countedCashRub, setCountedCashRub] = useState<number>(() => kopecksToRub(resolvedDefaultShift.countedCashKopecks));
	const [isTerminalReconciled, setIsTerminalReconciled] = useState<boolean>(true);
	const [encashmentOption, setEncashmentOption] = useState<"full" | "retain_change">("retain_change");
	const [retainedChangeRub, setRetainedChangeRub] = useState<number>(() => kopecksToRub(resolvedDefaultShift.retainedChangeFundKopecks));
	const [printZReport, setPrintZReport] = useState<boolean>(true);

	// Execution state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successNotice, setSuccessNotice] = useState<string | null>(null);

	// Reset state on modal open/close & hydrate live shift + journal from PostgreSQL 18 API
	useEffect(() => {
		if (!isOpen) {
			setErrorMessage(null);
			setSuccessNotice(null);
			return;
		}
		setActiveTab(initialTab);
		setCurrentShift(resolvedDefaultShift);
		setCountedCashRub(kopecksToRub(resolvedDefaultShift.countedCashKopecks));
		setRetainedChangeRub(kopecksToRub(resolvedDefaultShift.retainedChangeFundKopecks));
		setErrorMessage(null);
		setSuccessNotice(null);

		if (initialShift || isDemo) {
			return;
		}

		let cancelled = false;
		const loadLiveShiftData = async () => {
			try {
				const [shiftRes, journalRes] = await Promise.all([
					fetch("/api/cashbox/shift", { headers: denteClinicalReadHeaders() }),
					fetch("/api/cashbox/shifts", { headers: denteClinicalReadHeaders() }),
				]);

				if (!cancelled && shiftRes.ok) {
					const raw = (await shiftRes.json().catch(() => null)) as unknown;
					const snap = (
						raw && typeof raw === "object" && "data" in raw
							? (raw as { data?: ApiReconciliationSnapshot }).data
							: raw
					) as ApiReconciliationSnapshot | null;

					if (snap && snap.hasOpenShift) {
						const startKop = rubToKopecks(Number(snap.startingBalanceRub || 0));
						const cashKop = rubToKopecks(Number(snap.incomeCashRub || 0));
						const cardKop = rubToKopecks(Number(snap.incomeElectronicRub || 0));
						const sbpKop = rubToKopecks(Number(snap.incomeSbpRub || 0));
						const depKop = rubToKopecks(Number(snap.advanceOffsetRub || 0));
						const expectedKop = snap.expectedCashInDrawerRub != null
							? rubToKopecks(Number(snap.expectedCashInDrawerRub))
							: startKop + cashKop;
						const totalKop = snap.netRevenueRub != null
							? rubToKopecks(Number(snap.netRevenueRub))
							: cashKop + cardKop + sbpKop + depKop;

						const hydrated: CashShiftRecord = {
							...createEmptyLiveShift(),
							id: snap.shiftId || "live-shift",
							shiftNumber: snap.shiftNumber || 1,
							status: "open",
							openedAt: snap.openedAt || new Date().toISOString(),
							cashierId: snap.cashierId || "",
							initialChangeFundKopecks: startKop,
							revenue: {
								cashKopecks: cashKop,
								cardKopecks: cardKop,
								sbpKopecks: sbpKop,
								depositKopecks: depKop,
							},
							totalRevenueKopecks: totalKop,
							countedCashKopecks: expectedKop,
							expectedCashInDrawerKopecks: expectedKop,
							retainedChangeFundKopecks: startKop,
							encashmentKopecks: Math.max(0, expectedKop - startKop),
						};
						setCurrentShift(hydrated);
						setCountedCashRub(kopecksToRub(expectedKop));
						setRetainedChangeRub(kopecksToRub(startKop));
					} else if (snap && snap.hasOpenShift === false) {
						setCurrentShift({ ...createEmptyLiveShift(), status: "closed" });
						setCountedCashRub(0);
						setRetainedChangeRub(0);
					}
				}

				if (!cancelled && journalRes.ok) {
					const rawJ = (await journalRes.json().catch(() => null)) as unknown;
					const rows = (
						rawJ && typeof rawJ === "object" && "data" in rawJ
							? (rawJ as { data?: unknown }).data
							: rawJ
					) as ApiJournalShiftRow[] | null;

					if (Array.isArray(rows)) {
						setShiftsJournal(
							rows.map((r) => {
								const startKop = r.startBalanceKopecks ?? rubToKopecks(Number(r.startBalanceRub || 0));
								const cashKop = rubToKopecks(Number(r.incomeCashRub || 0));
								const cardKop = rubToKopecks(Number(r.incomeElectronicRub || 0));
								const sbpKop = rubToKopecks(Number(r.incomeSbpRub || 0));
								const depKop = rubToKopecks(Number(r.advanceOffsetRub || 0));
								const totalKop = r.incomeTotalKopecks ?? (cashKop + cardKop + sbpKop + depKop);
								const closingKop = r.closingBalanceRub != null ? rubToKopecks(Number(r.closingBalanceRub)) : startKop + cashKop;
								return {
									...createEmptyLiveShift(),
									id: r.id,
									shiftNumber: r.shiftNumber,
									status: r.status,
									openedAt: r.openedAt,
									closedAt: r.closedAt ?? null,
									cashierFullName: r.cashierName || "Кассир клиники",
									initialChangeFundKopecks: startKop,
									revenue: {
										cashKopecks: cashKop,
										cardKopecks: cardKop,
										sbpKopecks: sbpKop,
										depositKopecks: depKop,
									},
									totalRevenueKopecks: totalKop,
									countedCashKopecks: closingKop,
									expectedCashInDrawerKopecks: startKop + cashKop,
									retainedChangeFundKopecks: startKop,
									ofdStatus: r.ofdStatus || "pending",
									zReportNumber: r.zReportNumber ?? null,
								};
							}),
						);
					}
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Не удалось загрузить данные кассовой смены";
				if (!cancelled) setErrorMessage(msg);
			}
		};

		void loadLiveShiftData();
		return () => {
			cancelled = true;
		};
	}, [isOpen, initialTab, initialShift, isDemo, resolvedDefaultShift]);

	// Escape key dismissal
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSubmitting) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	// Derived calculations in integer kopecks
	const totalRevenueKop = useMemo(() => calculateTotalRevenueKopecks(currentShift.revenue), [currentShift.revenue]);
	const expectedCashInDrawerKop = useMemo(
		() => calculateExpectedCashInDrawerKopecks(currentShift.initialChangeFundKopecks, currentShift.revenue.cashKopecks),
		[currentShift.initialChangeFundKopecks, currentShift.revenue.cashKopecks],
	);

	const countedCashKop = rubToKopecks(countedCashRub);
	const cashDiscrepancyKop = countedCashKop - expectedCashInDrawerKop;
	const isCashMatched = Math.abs(cashDiscrepancyKop) === 0;
	const encashmentKop = useMemo(
		() => calculateEncashmentKopecks(countedCashKop, encashmentOption, rubToKopecks(retainedChangeRub)),
		[countedCashKop, encashmentOption, retainedChangeRub],
	);

	if (!isOpen) return null;

	// Execute shift close
	const handleExecuteCloseShift = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);

		const closedAtIso = new Date().toISOString();
		const baseClosedRecord: CashShiftRecord = {
			...currentShift,
			status: "closed",
			closedAt: closedAtIso,
			countedCashKopecks: countedCashKop,
			expectedCashInDrawerKopecks: expectedCashInDrawerKop,
			cashDiscrepancyKopecks: cashDiscrepancyKop,
			isBalanced: isCashMatched,
			isTerminalReconciled,
			encashmentKopecks: encashmentKop,
			retainedChangeFundKopecks: rubToKopecks(retainedChangeRub),
			zReportNumber: `Z-${currentShift.shiftNumber}`,
			ofdStatus: "pending",
		};

		try {
			const idempotencyKey = generateUuidV7();
			const payload = {
				shiftNumber: currentShift.shiftNumber,
				cashierFullName: currentShift.cashierFullName,
				countedCashRub: kopecksToRub(countedCashKop),
				differenceRub: kopecksToRub(cashDiscrepancyKop),
				isBalanced: isCashMatched,
				force: true,
				closedAt: closedAtIso,
			};

			const res = await fetch("/api/cashbox/shift/close", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
					...denteClinicalMutationHeaders(),
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const rawErr = (await res.json().catch(() => null)) as unknown;
				const errJson = (rawErr != null && typeof rawErr === "object" && "data" in rawErr
					? (rawErr as { data?: unknown }).data
					: rawErr) as { message?: string; error?: string } | null;
				throw new Error(
					errJson?.message || errJson?.error || `Ошибка закрытия смены (HTTP ${res.status})`,
				);
			}

			const rawSuccess = (await res.json().catch(() => null)) as unknown;
			const responseData = (
				rawSuccess != null && typeof rawSuccess === "object" && "data" in rawSuccess
					? (rawSuccess as { data?: unknown }).data
					: rawSuccess
			) as {
				zReportNumber?: string;
				ofdStatus?: string;
				kktReportData?: { fiscalDocNumber?: string; zReportNumber?: string };
			} | null;

			const resolvedZReport =
				responseData?.zReportNumber ||
				responseData?.kktReportData?.zReportNumber ||
				baseClosedRecord.zReportNumber;
			const resolvedOfdStatus: CashShiftRecord["ofdStatus"] =
				responseData?.ofdStatus === "delivered" || Boolean(responseData?.kktReportData?.fiscalDocNumber)
					? "delivered"
					: "pending";
			const closedRecord: CashShiftRecord = {
				...baseClosedRecord,
				zReportNumber: resolvedZReport,
				ofdStatus: resolvedOfdStatus,
			};

			setCurrentShift(closedRecord);
			setShiftsJournal((prev) => [closedRecord, ...prev.filter((s) => s.id !== closedRecord.id)]);
			setSuccessNotice(`Смена №${currentShift.shiftNumber} успешно закрыта! Z-отчёт ${closedRecord.zReportNumber} сформирован.`);
			onShiftClosed?.(buildZReportPrintData(closedRecord));
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось закрыть кассовую смену";
			setErrorMessage(msg);
			showToast(msg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const modalContent = (
		<div className="shift-studio-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="shift-studio-modal">
			<div className="shift-studio-modal">
				{/* Apple HIG Tactile Drag Handle */}
				<div className="shift-studio-drag-handle" aria-hidden="true">
					<div className="shift-studio-drag-pill" />
				</div>

				{/* Header */}
				<div className="shift-studio-header">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<h2 id={titleId} className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight leading-snug">
								Студия кассовой смены и Z-отчёт
							</h2>
							<p className="text-xs text-[var(--muted)]">
								{`Смена №${currentShift.shiftNumber} • ${currentShift.cashierFullName} • ${currentShift.clinicLegalName}`}
							</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="shift-studio-close-btn" aria-label="Закрыть окно">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="shift-studio-nav-tabs">
					<button
						type="button"
						onClick={() => setActiveTab("current")}
						className={`shift-studio-tab-btn ${activeTab === "current" ? "active" : ""}`}
						data-testid="tab-shift-current"
					>
						<Layers className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Текущая смена и выручка</span>
						<span className="sm:hidden font-bold">Смена</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("closing")}
						className={`shift-studio-tab-btn ${activeTab === "closing" ? "active" : ""}`}
						data-testid="tab-shift-closing"
					>
						<FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Закрытие смены и Z-отчёт</span>
						<span className="sm:hidden font-bold">Z-отчёт</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("journal")}
						className={`shift-studio-tab-btn ${activeTab === "journal" ? "active" : ""}`}
						data-testid="tab-shift-journal"
					>
						<Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Журнал смен ({shiftsJournal.length})</span>
						<span className="sm:hidden font-bold">Журнал ({shiftsJournal.length})</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="shift-studio-body space-y-4">
					{/* TAB 1: CURRENT SHIFT */}
					{activeTab === "current" && (
						<ShiftSummaryCard shift={currentShift} totalRevenueKop={totalRevenueKop} />
					)}

					{/* TAB 2: CLOSING & Z-REPORT */}
					{activeTab === "closing" && (
						<div className="space-y-4" data-testid="shift-closing-section">
							<ShiftDrawerActions
								expectedCashInDrawerKop={expectedCashInDrawerKop}
								countedCashRub={countedCashRub}
								setCountedCashRub={setCountedCashRub}
								cashDiscrepancyKop={cashDiscrepancyKop}
								isCashMatched={isCashMatched}
								cardRevenueKop={currentShift.revenue.cardKopecks}
								isTerminalReconciled={isTerminalReconciled}
								setIsTerminalReconciled={setIsTerminalReconciled}
								encashmentOption={encashmentOption}
								setEncashmentOption={setEncashmentOption}
								retainedChangeRub={retainedChangeRub}
								setRetainedChangeRub={setRetainedChangeRub}
								printZReport={printZReport}
								setPrintZReport={setPrintZReport}
								onPrintXReport={() => window.print()}
								onExportJournal={() => window.print()}
							/>

							<ShiftZReportPreview shift={currentShift} onPrint={() => window.print()} />

							{errorMessage && (
								<div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center justify-between gap-2">
									<span>{errorMessage}</span>
									<button type="button" onClick={handleExecuteCloseShift} className="h-8 px-2.5 rounded-md bg-[var(--danger)] text-white font-medium text-xs shrink-0 cursor-pointer">
										Повторить
									</button>
								</div>
							)}

							{successNotice && (
								<div className="p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--success-line,var(--line))] text-[var(--success-ink,var(--success))] text-xs flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-[var(--success-ink,var(--success))] shrink-0" />
									<span>{successNotice}</span>
								</div>
							)}
						</div>
					)}

					{/* TAB 3: SHIFT JOURNAL */}
					{activeTab === "journal" && (
						<ShiftJournalList
							shifts={shiftsJournal}
							filter={journalFilter}
							onFilterChange={setJournalFilter}
							onPrintZReport={() => window.print()}
						/>
					)}
				</div>

				{/* Footer with exactly 1 Primary CTA button */}
				<div className="shift-studio-footer">
					<button type="button" onClick={onClose} className="shift-secondary-btn" aria-busy={isSubmitting}>
						Отмена
					</button>

					{activeTab === "closing" ? (
						<button
							type="button"
							onClick={handleExecuteCloseShift}
							aria-busy={isSubmitting}
							data-testid="btn-confirm-close-shift-z-report"
							className="shift-primary-cta flex-1 max-w-md"
						>
							{isSubmitting ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin" />
									<span>Закрытие смены и печать Z-отчёта...</span>
								</>
							) : (
								<span>✓ Снять Z-отчёт и закрыть смену</span>
							)}
						</button>
					) : (
						<button
							type="button"
							onClick={() => setActiveTab("closing")}
							data-testid="btn-nav-to-closing-tab"
							className="shift-primary-cta flex-1 max-w-md"
						>
							<span>Перейти к закрытию смены и Z-отчёту</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default ShiftStudioModal;
