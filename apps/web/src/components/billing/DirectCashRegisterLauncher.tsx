/**
 * apps/web/src/components/billing/DirectCashRegisterLauncher.tsx
 *
 * Autonomous Studio Stand & Launcher for DENTE Cashbox, Fiscal Checkout & Fast Payments.
 *
 * Governed by:
 * - Mandate 8aq: Mounted in live UI tree under #cashbox / #billing-checkout.
 * - Mandate 8am: Exactly ONE Primary CTA button (#0d9488 / var(--teal)) per visible context.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons).
 * - Apple HIG: Clean desktop ergonomics + native touch response on mobile.
 * - Sweet Spot size: 150-250 lines.
 */

import React, { useState, useEffect } from "react";
import {
	CreditCard,
	Banknote,
	QrCode,
	Wallet,
	Layers,
	ShieldCheck,
	ArrowLeft,
	RefreshCw,
	CheckCircle,
} from "lucide-react";
import { CashCheckoutStudioModal } from "./CashCheckoutStudioModal.js";
import {
	getBillingDemoInvoice,
	formatRubles,
	BILLING_PAYMENT_METHODS,
} from "./billingCatalogData.js";

export interface DirectCashRegisterLauncherProps {
	readonly onClose?: () => void;
	readonly initialOpen?: boolean;
}

export const DirectCashRegisterLauncher: React.FC<DirectCashRegisterLauncherProps> = ({
	onClose,
	initialOpen = true,
}) => {
	const demoInvoice = getBillingDemoInvoice();
	const [isModalOpen, setIsModalOpen] = useState<boolean>(initialOpen);
	const [activeAmountRub, setActiveAmountRub] = useState<number>(demoInvoice.amountRub);
	const [activeMethod, setActiveMethod] = useState<string>("card");
	const [recentReceipt, setRecentReceipt] = useState<any | null>(null);

	// Deep link hash & search listener
	useEffect(() => {
		if (typeof window === "undefined") return;
		const hash = (window.location.hash || "").toLowerCase();
		const search = (window.location.search || "").toLowerCase();

		if (
			hash.includes("billing-checkout") ||
			hash.includes("cashbox") ||
			search.includes("billing-checkout") ||
			search.includes("cashbox") ||
			search.includes("checkout_studio")
		) {
			setIsModalOpen(true);
		}
	}, []);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start max-w-5xl mx-auto box-border"
			data-testid="direct-cash-register-launcher-root"
		>
			{/* Top Bar Header */}
			<div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-3">
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper,#ffffff)] text-xs font-semibold flex items-center gap-1.5 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						>
							<ArrowLeft className="w-4 h-4" />
							<span>Назад</span>
						</button>
					)}
					<div>
						<h1 className="text-xl sm:text-2xl font-bold text-[var(--ink,#0f172a)] tracking-tight flex items-center gap-2">
							<ShieldCheck className="w-6 h-6 text-[var(--teal,#0d9488)]" />
							<span>Касса и чеки · Экспресс-оплата</span>
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
							Фискализация 54-ФЗ, прием платежей (нал, карта, СБП, сплит) и семейный баланс
						</p>
					</div>
				</div>

				{/* Primary Action Button */}
				<button
					type="button"
					data-testid="btn-launcher-open-checkout"
					onClick={() => setIsModalOpen(true)}
					className="min-h-[44px] px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
					style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
				>
					<CreditCard className="w-4 h-4" />
					<span>Принять оплату ({formatRubles(activeAmountRub)})</span>
				</button>
			</div>

			{/* Main Showcase Grid */}
			<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Current Patient & Bill Card */}
				<div className="md:col-span-2 p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
					<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
						<span className="text-xs uppercase tracking-wider font-bold text-[var(--muted)]">Активный счёт пациента</span>
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-[var(--teal,#0d9488)]">
							Готов к расчёту
						</span>
					</div>

					<div>
						<h3 className="text-lg font-bold text-[var(--ink)]">{demoInvoice.patientName}</h3>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							{demoInvoice.patientPhone} · Врач: {demoInvoice.doctorName}
						</p>
						<p className="text-xs text-[var(--ink)] mt-2 font-medium bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line)]">
							{demoInvoice.serviceTitle}
						</p>
					</div>

					{/* Quick amount presets */}
					<div>
						<span className="text-xs font-bold text-[var(--muted)] block mb-2">Сумма счёта:</span>
						<div className="flex flex-wrap gap-2">
							{[3200, 4500, 7500, 12000, 25000].map((amt) => (
								<button
									key={amt}
									type="button"
									onClick={() => setActiveAmountRub(amt)}
									className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
										activeAmountRub === amt
											? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
									}`}
								>
									{formatRubles(amt)}
								</button>
							))}
						</div>
					</div>

					{/* Fast Tender Selection */}
					<div>
						<span className="text-xs font-bold text-[var(--muted)] block mb-2">Основной способ оплаты:</span>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{BILLING_PAYMENT_METHODS.filter((m) => m.id !== "warranty" && m.id !== "certificate").map((t) => (
								<button
									key={t.id}
									type="button"
									onClick={() => {
										setActiveMethod(t.id);
										setIsModalOpen(true);
									}}
									className={`min-h-[44px] p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
										activeMethod === t.id
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
									}`}
								>
									<span>{t.shortLabel}</span>
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Cash Register Shift Info & Balances */}
				<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4 flex flex-col justify-between">
					<div className="space-y-3">
						<span className="text-xs uppercase tracking-wider font-bold text-[var(--muted)] block border-b border-[var(--line)] pb-2">
							Кассовый узел
						</span>
						<div className="space-y-1.5 text-xs">
							<div className="flex justify-between text-[var(--muted)]">
								<span>Статус смены:</span>
								<span className="font-bold text-[var(--teal,#0d9488)]">Открыта</span>
							</div>
							<div className="flex justify-between text-[var(--muted)]">
								<span>Кассир:</span>
								<span className="font-semibold text-[var(--ink)]">Администратор</span>
							</div>
							<div className="flex justify-between text-[var(--muted)]">
								<span>ФР / Терминал:</span>
								<span className="font-semibold text-[var(--ink)]">Онлайн (54-ФЗ)</span>
							</div>
							<div className="flex justify-between text-[var(--muted)] pt-2 border-t border-[var(--line)]">
								<span>Семейный баланс:</span>
								<span className="font-bold text-[var(--ink)]">{formatRubles(demoInvoice.familyBalanceRub)}</span>
							</div>
						</div>
					</div>

					{recentReceipt ? (
						<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
							<span className="font-bold text-teal-600 flex items-center gap-1">
								<CheckCircle className="w-3.5 h-3.5" /> Чек пробит успешно
							</span>
							<p className="text-[11px] text-[var(--ink)]">Сумма: {formatRubles(recentReceipt.amountRub || activeAmountRub)}</p>
						</div>
					) : (
						<div className="text-[11px] text-[var(--muted)] text-center p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							Чек формируется в 1 клик с автоматической печатью и фискализацией
						</div>
					)}
				</div>
			</div>

			{/* The Modal */}
			<CashCheckoutStudioModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				totalDueRub={activeAmountRub}
				patientId={demoInvoice.patientId}
				patientName={demoInvoice.patientName}
				patientPhone={demoInvoice.patientPhone}
				doctorFullName={demoInvoice.doctorName}
				patientDepositRub={demoInvoice.depositRub}
				patientFamilyBalanceRub={demoInvoice.familyBalanceRub}
				defaultMethod={activeMethod}
				onSuccess={(data) => {
					setRecentReceipt(data);
				}}
			/>
		</div>
	);
};

export default DirectCashRegisterLauncher;
