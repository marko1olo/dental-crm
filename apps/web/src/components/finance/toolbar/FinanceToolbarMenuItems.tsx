import React, { useRef } from "react";
import {
	TrendingUp,
	FileText,
	FileCheck,
	Banknote,
	ShieldCheck,
	PlusCircle,
	Calendar,
	Coins,
	Users,
	UploadCloud,
	FileSpreadsheet,
} from "lucide-react";
import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import type { FinanceToolbarMenuProps } from "./FinanceToolbarMenu.js";
import { showToast } from "../../GlobalToast.js";

function MenuItemBtn({ onClick, icon, label, testId, isDanger }: {
	readonly onClick: () => void;
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly testId?: string | undefined;
	readonly isDanger?: boolean | undefined;
}): React.JSX.Element {
	const textCls = isDanger ? "text-rose-700 dark:text-rose-300 font-semibold" : "text-[var(--ink)] font-medium";
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--line)] ${textCls} flex items-center gap-2 cursor-pointer transition-colors min-h-[36px] sm:min-h-[32px]`}
			role="menuitem"
			data-testid={testId}
		>
			{icon}
			<span>{label}</span>
		</button>
	);
}

export function FinanceToolbarMenuItems(p: FinanceToolbarMenuProps): React.JSX.Element {
	const wrap = (fn: () => void) => () => { p.onCloseFinanceOptions(); fn(); };
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
				const errJson = await response.json().catch(() => null);
				throw new Error(errJson?.message || `Ошибка сервера: ${response.status}`);
			}

			const data = await response.json();
			showToast(
				`Выписка 1С загружена: ${data.count ?? 0} платежей на сумму ${data.totalReceivedRub ?? 0} ₽`,
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
		<>
			<input
				type="file"
				ref={fileInputRef}
				accept=".txt,.csv"
				className="hidden"
				aria-hidden="true"
				onChange={handleUploadBankStatementFile}
			/>
			{p.onOpenQuickExpense && (
				<MenuItemBtn
					onClick={wrap(p.onOpenQuickExpense)}
					icon={<PlusCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />}
					label="Внести чек расхода"
					testId="menuitem-quick-expense"
					isDanger
				/>
			)}
			<MenuItemBtn onClick={wrap(p.onOpenPnl)} icon={<TrendingUp size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />} label="Управленческий P&L" />
			{p.onOpenAccountingExport && (
				<MenuItemBtn
					onClick={wrap(p.onOpenAccountingExport)}
					icon={<FileSpreadsheet size={14} className="shrink-0 text-orange-600 dark:text-orange-400" />}
					label="Экспорт в 1С (CommerceML)"
					testId="menuitem-accounting-export"
				/>
			)}
			<MenuItemBtn
				onClick={() => {
					p.onCloseFinanceOptions();
					fileInputRef.current?.click();
				}}
				icon={<UploadCloud size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />}
				label="Выписка 1С (Загрузка)"
				testId="menuitem-upload-bank-statement"
			/>
			<MenuItemBtn onClick={wrap(p.onGoToDocuments)} icon={<FileText size={14} className="shrink-0 text-sky-600 dark:text-sky-400" />} label="Документы" />
			<MenuItemBtn onClick={wrap(() => p.onOpenBillingAct?.())} icon={<FileCheck size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />} label="Акт выполненных работ и гарантии" testId="btn-finance-open-billing-act" />
			{p.onOpenTaxCertificate && (
				<MenuItemBtn onClick={wrap(p.onOpenTaxCertificate)} icon={<FileText size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />} label="Справка для налогового вычета" testId="btn-finance-open-tax-cert" />
			)}
			{p.onOpenT13Timesheet && (
				<MenuItemBtn onClick={wrap(p.onOpenT13Timesheet)} icon={<Calendar size={14} className="shrink-0 text-cyan-600 dark:text-cyan-400" />} label="Табель рабочего времени" testId="btn-finance-open-timesheet-t13" />
			)}
			<MenuItemBtn onClick={wrap(p.onOpenCashbox)} icon={<Banknote size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />} label="Касса и оплата" testId="btn-finance-open-cashbox" />
			{p.onOpenSplitPayment && (
				<MenuItemBtn onClick={wrap(p.onOpenSplitPayment)} icon={<Coins size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />} label="Сплит-оплата (Разделить чек)" testId="menuitem-split-payment" />
			)}
			{p.onOpenFamilyBilling && (
				<MenuItemBtn onClick={wrap(p.onOpenFamilyBilling)} icon={<Users size={14} className="shrink-0 text-violet-600 dark:text-violet-400" />} label="Семейный баланс" testId="menuitem-family-billing" />
			)}
			<MenuItemBtn onClick={wrap(p.onToggleCashShift)} icon={<ShieldCheck size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />} label={p.isCashShiftOpen ? "Скрыть кассовую смену" : "Кассовая смена"} testId="menuitem-toggle-cash-shift" />
		</>
	);
}
