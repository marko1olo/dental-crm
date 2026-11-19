/**
 * DENTE CRM — Mobile Patient Finance Tab (Финансы и счета)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Patient Balance Hero Card, Invoices List, POS Tender Trigger.
 */

import { kopecksToRubles, type Patient } from "@dental/shared";
import { Receipt } from "lucide-react";
import React, { useMemo } from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { FamilyBalanceCard } from "../tabs/finance/FamilyBalanceCard";

export interface MobilePatientFinancePatient extends Patient {
	familyBalanceKopecks?: number | undefined;
	familyBalanceRub?: number | string | undefined;
	familyGroupName?: string | null | undefined;
	familyGroup?: { totalBalanceRub?: number | undefined } | null | undefined;
}

export interface MobilePatientFinanceInvoiceItem {
	id: string;
	number?: string | null | undefined;
	createdAt?: string | null | undefined;
	totalAmountRub?: number | null | undefined;
	totalRub?: number | null | undefined;
	amount?: number | null | undefined;
	status?: string | null | undefined;
}

export interface MobilePatientFinanceTabProps {
	patient: Patient | MobilePatientFinancePatient;
	patientInvoices: readonly MobilePatientFinanceInvoiceItem[];
	balanceRub: number;
	money: (amountRub: number) => string;
	onOpenCashier?: (() => void) | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
	onOpenFamilyTaxCertificate?: (() => void) | undefined;
}

export const MobilePatientFinanceTab: React.FC<MobilePatientFinanceTabProps> = ({
	patient,
	patientInvoices,
	balanceRub,
	money,
	onOpenCashier,
	onOpenTaxCertificate,
	onOpenFamilyTaxCertificate,
}) => {
	const fullName = patient.fullName || "Пациент";

	const familyBalance = useMemo(() => {
		const p = patient as Partial<MobilePatientFinancePatient>;
		if (typeof p.familyBalanceKopecks === "number") {
			return kopecksToRubles(p.familyBalanceKopecks);
		}
		if (typeof p.familyBalanceRub === "number") {
			return p.familyBalanceRub;
		}
		if (typeof p.familyBalanceRub === "string") {
			const parsed = Number(p.familyBalanceRub);
			return Number.isFinite(parsed) ? parsed : 0;
		}
		if (typeof p.familyGroup?.totalBalanceRub === "number") {
			return p.familyGroup.totalBalanceRub;
		}
		return 0;
	}, [patient]);

	const familyGroupName = (patient as Partial<MobilePatientFinancePatient>).familyGroupName;

	const handleOpenCashier = () => {
		if (onOpenCashier) {
			onOpenCashier();
			return;
		}
		usePatientStore.getState().setSelectedPatientId(patient.id);
		useAppStore.getState().setCurrentView("finance");
		showToast(`Переход в кассу для ${fullName}`, "info");
	};

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-finance">
			{/* Balance Hero Card */}
			<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2">
				<span className="text-xs font-semibold text-[var(--muted)]">
					Текущий баланс пациента:
				</span>
				<div className="flex items-baseline justify-between">
					<span
						className={`text-2xl font-black font-mono ${
							balanceRub > 0
								? "text-[var(--success-ink)]"
								: balanceRub < 0
									? "text-[var(--danger-ink)]"
									: "text-[var(--ink)]"
						}`}
						data-testid="mobile-patient-balance-value"
					>
						{balanceRub > 0 ? `+${money(balanceRub)}` : money(balanceRub)}
					</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						{balanceRub > 0 ? "Аванс / Депозит" : balanceRub < 0 ? "Задолженность" : "Оплачено полностью"}
					</span>
				</div>

				<div className="pt-2 flex gap-2">
					<button
						type="button"
						onClick={handleOpenCashier}
						className="flex-1 min-h-[44px] h-11 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-colors"
						data-testid="mobile-btn-open-cashier"
					>
						<Receipt size={16} className="shrink-0" />
						<span>Касса и оплата</span>
					</button>
				</div>
			</div>

			{/* Family Balance Card (Мандат 8aw, 8al — Симметрия Десктопа и Мобильных) */}
			<FamilyBalanceCard
				familyGroupName={familyGroupName}
				familyBalance={familyBalance}
				onOpenFamilyTaxCertificate={onOpenFamilyTaxCertificate ?? onOpenTaxCertificate}
			/>

			{/* Invoices List */}
			<div className="flex flex-col gap-2">
				<h3 className="text-xs font-bold text-[var(--muted)] m-0">
					История счетов и платежей ({patientInvoices.length})
				</h3>

				{patientInvoices.length === 0 ? (
					<div className="p-6 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--muted)]">
						У пациента нет выставленных счетов. Все оказанные услуги закрыты.
					</div>
				) : (
					patientInvoices.map((inv) => (
						<div
							key={inv.id}
							className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs"
						>
							<div>
								<div className="font-bold text-[var(--ink)]">Счёт № {inv.number || inv.id?.slice(0, 8)}</div>
								<div className="text-[11px] text-[var(--muted)]">
									{new Date(inv.createdAt || Date.now()).toLocaleDateString("ru-RU")}
								</div>
							</div>
							<div className="text-right">
								<div className="font-mono font-bold text-[var(--ink)]">{money(Number(inv.totalAmountRub ?? inv.totalRub ?? inv.amount ?? 0))}</div>
								<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--success-soft)] text-[var(--success-ink)] font-bold">
									Оплачен
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
