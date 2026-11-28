import React, { useRef } from "react";
import { generateUuidV7, type StaffRole } from "@dental/shared";
import { MoreHorizontal } from "lucide-react";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import { FinanceToolbarMenuItems } from "./FinanceToolbarMenuItems.js";

export interface FinanceToolbarMenuProps {
	readonly isFinanceOptionsOpen: boolean;
	readonly onToggleFinanceOptions: () => void;
	readonly onCloseFinanceOptions: () => void;
	readonly onOpenPnl: () => void;
	readonly onGoToDocuments: () => void;
	readonly onOpenCashbox: () => void;
	readonly onOpenBillingAct?: (() => void) | undefined;
	readonly onOpenQuickExpense?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenFamilyBilling?: (() => void) | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onOpenCashFlow?: (() => void) | undefined;
	readonly onOpenAccountingExport?: (() => void) | undefined;
	readonly isCashShiftOpen: boolean;
	readonly onToggleCashShift: () => void;
	readonly userRole?: StaffRole | undefined;
}

export function FinanceToolbarMenu(p: FinanceToolbarMenuProps): React.JSX.Element {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUploadBankStatementFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const content = await file.text();
			const response = await fetch("/api/finance/bank-statements/upload", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({ content }),
			});

			if (!response.ok) {
				let msg = `Ошибка сервера: ${response.status}`;
				try {
					const errJson = (await response.json()) as { message?: string } | null;
					if (errJson?.message) msg = errJson.message;
				} catch (parseErr) {
					clientLogger.warn("[FinanceToolbarMenu] Non-JSON error response:", parseErr);
				}
				throw new Error(msg);
			}

			const rawJson = (await response.json()) as {
				data?: { count?: number; totalReceivedRub?: number };
				count?: number;
				totalReceivedRub?: number;
			};
			const data = rawJson?.data ?? rawJson;
			showToast(
				`Выписка 1С загружена: ${data?.count ?? 0} платежей на сумму ${data?.totalReceivedRub ?? 0} ₽`,
				"success",
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось разобрать файл выписки 1С";
			showToast(msg, "error");
		} finally {
			if (e.target) e.target.value = "";
		}
	};

	return (
		<div className="relative shrink-0">
			<input
				type="file"
				ref={fileInputRef}
				accept=".txt,.csv"
				className="hidden"
				aria-hidden="true"
				onChange={handleUploadBankStatementFile}
			/>
			<button
				type="button"
				onClick={p.onToggleFinanceOptions}
				data-testid="finance-toolbar-options-btn"
				className="min-h-[36px] min-w-[36px] sm:min-w-0 sm:min-h-0 sm:h-7 w-9 sm:w-7 p-0 flex items-center justify-center shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
				title="Дополнительные финансовые отчеты и документы"
				aria-label="Дополнительные действия"
				aria-expanded={p.isFinanceOptionsOpen}
			>
				<MoreHorizontal size={15} className="shrink-0" aria-hidden="true" />
			</button>
			{p.isFinanceOptionsOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-56 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-1 text-left"
					role="menu"
				>
					<FinanceToolbarMenuItems
						{...p}
						onTriggerBankStatementUpload={() => fileInputRef.current?.click()}
					/>
				</div>
			)}
		</div>
	);
}
