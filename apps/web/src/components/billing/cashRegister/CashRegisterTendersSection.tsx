/**
 * CashRegisterTendersSection.tsx — Payment Method Tiles, Cash Change & SBP QR.
 * Mandate 8b: <= 180 lines. Mandate 8e: Doctor & Cashier Autonomy.
 */

import React from "react";
import { CreditCard, Banknote, QrCode, Wallet, Layers } from "lucide-react";
import type { CashChangeResult } from "@dental/shared";

export type CheckoutTenderMethod = "card" | "cash" | "sbp" | "deposit" | "split";

export interface CashRegisterTendersSectionProps {
	readonly method: CheckoutTenderMethod;
	readonly onSelectMethod: (m: CheckoutTenderMethod) => void;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly totalDue: number;
	readonly cashReceivedRub: number;
	readonly onCashReceivedChange: (val: number) => void;
	readonly cashChangeResult: CashChangeResult;
	readonly cashPresets: number[];
	readonly sbpQrSvg: string | null;
}

export const CashRegisterTendersSection: React.FC<CashRegisterTendersSectionProps> = ({
	method,
	onSelectMethod,
	onOpenSplitPayment,
	totalDue,
	cashReceivedRub,
	onCashReceivedChange,
	cashChangeResult,
	cashPresets,
	sbpQrSvg,
}) => {
	return (
		<div className="space-y-4">
			{/* Payment Tender Method Tiles (Touch targets >= 44x44px) */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<label className="text-xs font-medium text-[var(--muted,#64748b)]">
						Способ расчёта
					</label>
					{onOpenSplitPayment && (
						<button
							type="button"
							onClick={onOpenSplitPayment}
							data-testid="link-open-split-payment"
							className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium min-h-[32px] flex items-center"
						>
							Расширенный сплит →
						</button>
					)}
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{[
						{ id: "card", testId: "btn-tender-card", label: "Карта", fullLabel: "Банковская карта", icon: CreditCard },
						{ id: "sbp", testId: "btn-tender-sbp", label: "QR СБП", fullLabel: "QR СБП", icon: QrCode },
						{ id: "cash", testId: "btn-tender-cash", label: "Наличные", fullLabel: "Наличные", icon: Banknote },
						{ id: "deposit", testId: "btn-tender-deposit", label: "Аванс", fullLabel: "Аванс / депозит", icon: Wallet },
						{ id: "split", testId: "btn-tender-split", label: "Сплит оплат", fullLabel: "Сплит / раздельно", icon: Layers },
					].map((t) => {
						const Icon = t.icon;
						const isSelected = method === t.id;
						const isSplit = t.id === "split";
						return (
							<button
								key={t.id}
								type="button"
								data-testid={t.testId}
								onClick={() => onSelectMethod(t.id as CheckoutTenderMethod)}
								className={`min-h-[44px] p-2.5 sm:p-3 rounded-xl border flex items-center gap-2 text-left text-xs sm:text-sm font-medium transition-all ${
									isSplit ? "col-span-2 sm:col-span-1" : ""
								} ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shadow-xs"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
							>
								<Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`} />
								<span className="whitespace-normal leading-tight">
									<span className="hidden sm:inline">{t.fullLabel}</span>
									<span className="sm:hidden">{t.label}</span>
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Cash Tender Change Calculation (Mandates 8e, 8n) */}
			{method === "cash" && (
				<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3 animate-in fade-in duration-150">
					<div className="flex items-center justify-between text-xs">
						<span className="font-semibold text-[var(--ink)]">Кассовый расчёт наличных</span>
						<button
							type="button"
							data-testid="btn-cash-exact"
							onClick={() => onCashReceivedChange(totalDue)}
							className="text-[11px] text-[var(--teal,#0d9488)] hover:underline font-medium min-h-[36px] px-2 flex items-center"
						>
							Ровно без сдачи
						</button>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						<div className="flex-1">
							<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
								Получено от пациента (₽)
							</label>
							<input
								type="number"
								min={0}
								data-testid="input-cash-tendered"
								value={cashReceivedRub || ""}
								onChange={(e) => onCashReceivedChange(Number(e.target.value) || 0)}
								placeholder="0"
								className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-base font-bold text-[var(--ink)]"
							/>
						</div>

						{/* Live Change Indicator */}
						<div className="flex-1 p-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col justify-center">
							<span className="text-[11px] text-[var(--muted,#64748b)]">Сдача пациенту:</span>
							<span
								data-testid="display-cash-change"
								className={`text-lg font-bold tracking-tight ${
									cashChangeResult.isShortage
										? "text-amber-600 dark:text-amber-400"
										: "text-[var(--teal,#0d9488)]"
								}`}
							>
								{cashChangeResult.isShortage
									? `Не хватает: ${cashChangeResult.shortageRub.toLocaleString("ru-RU")} ₽`
									: `${cashChangeResult.changeRub.toLocaleString("ru-RU")} ₽`}
							</span>
						</div>
					</div>

					{/* Fast Bill Chips */}
					<div className="flex flex-wrap items-center gap-1.5 pt-1">
						<span className="text-[11px] text-[var(--muted,#64748b)] mr-1">Купюры:</span>
						{cashPresets.map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => onCashReceivedChange(preset)}
								className="min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)] hover:bg-[var(--teal,#0d9488)]/10 hover:border-[var(--teal,#0d9488)] transition-colors"
							>
								{preset.toLocaleString("ru-RU")} ₽
							</button>
						))}
					</div>
				</div>
			)}

			{/* SBP Dynamic QR Display */}
			{method === "sbp" && (
				<div
					className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col items-center gap-3 animate-in fade-in duration-150"
					data-testid="sbp-dynamic-qr-card"
				>
					<div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
						<QrCode className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Сканируйте QR-код в приложении любого банка (СБП)</span>
					</div>

					{sbpQrSvg ? (
						<div
							className="p-3 bg-white rounded-xl shadow-xs border border-[var(--line,#cbd5e1)]"
							data-testid="sbp-qr-svg"
							dangerouslySetInnerHTML={{ __html: sbpQrSvg }}
						/>
					) : (
						<div className="w-[140px] h-[140px] flex items-center justify-center border border-dashed rounded-xl text-xs text-[var(--muted)]">
							Формирование QR...
						</div>
					)}

					<div className="text-center">
						<span className="text-sm font-bold text-[var(--ink)]">
							{totalDue.toLocaleString("ru-RU")} ₽
						</span>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Комиссия 0% • Зачисление на счёт клиники мгновенно
						</p>
					</div>
				</div>
			)}
		</div>
	);
};
