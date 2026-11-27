import React from "react";
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
	ArrowLeftRight,
} from "lucide-react";
import type { StaffRole } from "@dental/shared";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";
import { resolveClinicMode } from "../../../lib/clinicCapabilities";
import { useAppStore } from "../../../store/appStore";
import type { FinanceToolbarMenuProps } from "./FinanceToolbarMenu";

const PNL_ALLOWED_ROLES: ReadonlySet<StaffRole> = new Set([
	"owner",
	"manager",
	"head_doctor",
	"accountant",
]);

const ACCOUNTING_ALLOWED_ROLES: ReadonlySet<StaffRole> = new Set([
	"owner",
	"manager",
	"accountant",
]);

const TIMESHEET_ALLOWED_ROLES: ReadonlySet<StaffRole> = new Set([
	"owner",
	"admin",
	"manager",
	"head_doctor",
	"accountant",
	"senior_admin",
]);

function MenuItemBtn({ onClick, icon, label, testId, isDanger }: {
	readonly onClick: () => void;
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly testId?: string | undefined;
	readonly isDanger?: boolean | undefined;
}): React.JSX.Element {
	const textCls = isDanger ? "text-[var(--danger-ink)] font-semibold" : "text-[var(--ink)] font-medium";
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] ${textCls} flex items-center gap-2 cursor-pointer transition-colors min-h-[36px] sm:min-h-[32px]`}
			role="menuitem"
			data-testid={testId}
		>
			{icon}
			<span>{label}</span>
		</button>
	);
}

export function FinanceToolbarMenuItems(
	p: FinanceToolbarMenuProps & { readonly onTriggerBankStatementUpload?: () => void },
): React.JSX.Element {
	const wrap = (fn: () => void) => () => { p.onCloseFinanceOptions(); fn(); };
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const rawClinicMode = useAppStore((s) => s.dashboard?.clinicSettings?.profile?.mode);
	const clinicMode = resolveClinicMode(rawClinicMode);
	const featureFlags = useWorkspaceProfile();
	const isSoloMode = clinicMode === "solo_doctor";
	const effectiveRole = p.userRole ?? selectedWorkspaceRole;
	const canViewPnl = PNL_ALLOWED_ROLES.has(effectiveRole);
	const canManageAccounting = ACCOUNTING_ALLOWED_ROLES.has(effectiveRole);
	const canViewTimesheet =
		TIMESHEET_ALLOWED_ROLES.has(effectiveRole) && !isSoloMode && featureFlags.hasPayrollModule !== false;

	return (
		<>
			{p.onOpenQuickExpense && (
				<MenuItemBtn
					onClick={wrap(p.onOpenQuickExpense)}
					icon={<PlusCircle className="w-4 h-4 shrink-0 text-current" />}
					label="Внести чек расхода"
					testId="menuitem-quick-expense"
					isDanger
				/>
			)}
			{canViewPnl && (
				<MenuItemBtn onClick={wrap(p.onOpenPnl)} icon={<TrendingUp className="w-4 h-4 shrink-0 text-current" />} label="Управленческий P&L" />
			)}
			{canManageAccounting && p.onOpenAccountingExport && (
				<MenuItemBtn
					onClick={wrap(p.onOpenAccountingExport)}
					icon={<FileSpreadsheet className="w-4 h-4 shrink-0 text-current" />}
					label="Экспорт в 1С (CommerceML)"
					testId="menuitem-accounting-export"
				/>
			)}
			{canManageAccounting && p.onTriggerBankStatementUpload && (
				<MenuItemBtn
					onClick={() => {
						p.onTriggerBankStatementUpload?.();
						p.onCloseFinanceOptions();
					}}
					icon={<UploadCloud className="w-4 h-4 shrink-0 text-current" />}
					label="Выписка 1С (Загрузка)"
					testId="menuitem-upload-bank-statement"
				/>
			)}
			<MenuItemBtn onClick={wrap(p.onGoToDocuments)} icon={<FileText className="w-4 h-4 shrink-0 text-current" />} label="Документы" />
			<MenuItemBtn onClick={wrap(() => p.onOpenBillingAct?.())} icon={<FileCheck className="w-4 h-4 shrink-0 text-current" />} label="Акт выполненных работ и гарантии" testId="btn-finance-open-billing-act" />
			{p.onOpenTaxCertificate && (
				<MenuItemBtn onClick={wrap(p.onOpenTaxCertificate)} icon={<FileText className="w-4 h-4 shrink-0 text-current" />} label="Справка для налогового вычета" testId="btn-finance-open-tax-cert" />
			)}
			{canViewTimesheet && p.onOpenT13Timesheet && (
				<MenuItemBtn onClick={wrap(p.onOpenT13Timesheet)} icon={<Calendar className="w-4 h-4 shrink-0 text-current" />} label="Табель рабочего времени" testId="btn-finance-open-timesheet-t13" />
			)}
			<MenuItemBtn onClick={wrap(p.onOpenCashbox)} icon={<Banknote className="w-4 h-4 shrink-0 text-current" />} label="Касса и оплата" testId="btn-finance-open-cashbox" />
			{p.onOpenCashFlow && (
				<MenuItemBtn onClick={wrap(p.onOpenCashFlow)} icon={<ArrowLeftRight className="w-4 h-4 shrink-0 text-current" />} label="Кассовый ордер и перевод" testId="menuitem-cash-flow" />
			)}
			{p.onOpenSplitPayment && (
				<MenuItemBtn onClick={wrap(p.onOpenSplitPayment)} icon={<Coins className="w-4 h-4 shrink-0 text-current" />} label="Сплит-оплата (Разделить чек)" testId="menuitem-split-payment" />
			)}
			{p.onOpenFamilyBilling && (
				<MenuItemBtn onClick={wrap(p.onOpenFamilyBilling)} icon={<Users className="w-4 h-4 shrink-0 text-current" />} label="Семейный баланс" testId="menuitem-family-billing" />
			)}
			<MenuItemBtn onClick={wrap(p.onToggleCashShift)} icon={<ShieldCheck className="w-4 h-4 shrink-0 text-current" />} label={p.isCashShiftOpen ? "Скрыть кассовую смену" : "Кассовая смена"} testId="menuitem-toggle-cash-shift" />
		</>
	);
}
