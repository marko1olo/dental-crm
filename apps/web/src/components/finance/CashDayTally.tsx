import type { Dashboard } from "@dental/shared";
import React, { useEffect, useMemo, useState } from "react";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { localDayKey, summarizeCashDay } from "./cashDaySummary";
import { OfflineFiscalBatchModal } from "./fiscal/OfflineFiscalBatchModal";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../GlobalToast";
import { CashDayTallyChannelsGrid } from "./cashDayTally/CashDayTallyChannelsGrid";
import { CashDayTallyPaymentList } from "./cashDayTally/CashDayTallyPaymentList";
import { CashDayTallyActionsBar } from "./cashDayTally/CashDayTallyActionsBar";
import { CashDayTallyModalZReport } from "./cashDayTally/CashDayTallyModalZReport";
import { useCashDayTallyExports } from "./cashDayTally/useCashDayTallyExports";

export interface CashDayTallyProps {
	readonly payments: readonly Dashboard["payments"][number][] | undefined;
	readonly methodLabels: Record<string, string>;
	readonly money: (value: number | null) => string;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
}

export function CashDayTally({
	payments,
	methodLabels,
	money,
	cashierFullName = "Сидорова Анна Павловна",
	clinicName = "ООО «ДЕНТЕ КЛИНИКА»",
	clinicInn = "",
}: CashDayTallyProps) {
	const [countedCashInput, setCountedCashInput] = useState("");
	const [isOfflineBatchOpen, setIsOfflineBatchOpen] = useState(false);
	const [pendingQueueCount, setPendingQueueCount] = useState(0);

	useEffect(() => {
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			const count = items.filter((i) => i.status === "pending_print" || i.status === "hardware_offline").length;
			setPendingQueueCount(count);
		});
		return () => unsubscribe();
	}, []);

	const dayKey = localDayKey(new Date()) ?? "";
	const summary = useMemo(() => summarizeCashDay(payments, dayKey), [payments, dayKey]);
	const isLoaded = payments !== undefined;
	const hasAnything = summary.receivedCount > 0 || summary.familyWalletRub > 0 || summary.refundedCount > 0;
	const countedCash = normalizeRubAmountInput(countedCashInput);
	const countedCashInvalid = Boolean(countedCashInput.trim()) && countedCash === null;
	const differenceRub = countedCash === null ? null : (Math.round(countedCash * 100) - Math.round(summary.cashRub * 100)) / 100;

	const {
		zReportData,
		isZReportOpen,
		setIsZReportOpen,
		isCopiedZReport,
		handleOpenZReport,
		handlePrintAccountingStatement,
		handleExport1cCsv,
		handleCopyZReportText,
	} = useCashDayTallyExports({ clinicName, clinicInn, cashierFullName, dayKey, summary });

	const headline = !isLoaded
		? "Касса за сегодня: считаем…"
		: hasAnything
			? `Касса за сегодня: пришло ${money(summary.receivedRub)}, из них наличными ${money(summary.cashRub)}`
			: "Касса за сегодня: оплат пока не записано";

	return (
		<details className="payment-capture-detail-section mb-4" data-testid="cash-day-tally">
			<summary>{headline}</summary>
			<div className="smart-details-content space-y-4">
				{!isLoaded ? (
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>Загружаем оплаты клиники за сегодня...</p>
				) : !hasAnything ? (
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>За сегодня оплат ещё не записано.</p>
				) : (
					<>
						<CashDayTallyChannelsGrid summary={summary} money={money} differenceRub={differenceRub} />
						<CashDayTallyPaymentList summary={summary} methodLabels={methodLabels} money={money} />
						<CashDayTallyActionsBar
							countedCashInput={countedCashInput}
							setCountedCashInput={setCountedCashInput}
							countedCashInvalid={countedCashInvalid}
							differenceRub={differenceRub}
							summary={summary}
							money={money}
							pendingQueueCount={pendingQueueCount}
							onOpenOfflineBatch={() => setIsOfflineBatchOpen(true)}
							onPrintStatement={handlePrintAccountingStatement}
							onExport1cCsv={handleExport1cCsv}
							onOpenZReport={handleOpenZReport}
						/>
						<p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: "13px" }}>
							Считаются оплаты за сегодня по всей клинике. Сверка выявляет расхождения до закрытия смены.
						</p>
					</>
				)}
			</div>
			<CashDayTallyModalZReport
				isOpen={isZReportOpen}
				zReportData={zReportData}
				onClose={() => setIsZReportOpen(false)}
				onCopyText={handleCopyZReportText}
				isCopied={isCopiedZReport}
			/>
			<OfflineFiscalBatchModal
				isOpen={isOfflineBatchOpen}
				onClose={() => setIsOfflineBatchOpen(false)}
				clinicName={clinicName}
				cashierFullName={cashierFullName}
				clinicRequisites={{ name: clinicName, inn: clinicInn }}
				onBatchProcessed={() => {
					FiscalReceiptQueueManager.flushAllPending();
					showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
				}}
			/>
		</details>
	);
}
