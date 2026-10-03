/**
 * apps/web/src/components/finance/modal/payment/PaymentBuyerAndStomxBar.tsx
 *
 * StomX 6 Cash Boxes, DDS receipt categories, and 54-FZ buyer details (physical/legal entity).
 */

import React from "react";
import { Building2, Tag, User, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import {
	STOMX_CASH_RECEIPT_CATEGORIES,
	STOMX_CASH_BOXES,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import type { PayerType } from "../../cashboxOperations.js";

export interface PaymentBuyerAndStomxBarProps {
	readonly selectedCashBoxType: StomxCashBoxType;
	readonly setSelectedCashBoxType: (box: StomxCashBoxType) => void;
	readonly selectedReceiptAlias: StomxReceiptTypeAlias;
	readonly setSelectedReceiptAlias: (alias: StomxReceiptTypeAlias) => void;
	readonly payerType: PayerType;
	readonly setPayerType: (type: PayerType) => void;
	readonly buyerInn: string;
	readonly buyerInnError: string | null;
	readonly setBuyerInnError: (error: string | null) => void;
	readonly handleInnChange: (val: string) => void;
}

export const PaymentBuyerAndStomxBar: React.FC<PaymentBuyerAndStomxBarProps> = ({
	selectedCashBoxType,
	setSelectedCashBoxType,
	selectedReceiptAlias,
	setSelectedReceiptAlias,
	payerType,
	setPayerType,
	buyerInn,
	buyerInnError,
	setBuyerInnError,
	handleInnChange,
}) => {
	return (
		<>
			{/* StomX 6 Cash Boxes & Cash Flow Category (ДДС) Selector (Mandates 8e, 8n) */}
			<div
				className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs"
				data-testid="payment-modal-stomx-bar"
			>
				{/* Cash Box Selection */}
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
						<span>Касса клиники:</span>
					</div>
					<div className="flex flex-wrap items-center gap-1">
						{STOMX_CASH_BOXES.slice(0, 3).map((box) => (
							<button
								key={box.type}
								type="button"
								onClick={() => setSelectedCashBoxType(box.type)}
								className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									selectedCashBoxType === box.type
										? "bg-teal-600 text-white shadow-2xs"
										: "bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
								}`}
								data-testid={`payment-box-${box.type}`}
							>
								{box.name}
							</button>
						))}
						<select
							value={selectedCashBoxType}
							onChange={(e) => setSelectedCashBoxType(e.target.value as StomxCashBoxType)}
							className="px-2 py-1 rounded-lg text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium cursor-pointer"
							aria-label="Все кассы"
							data-testid="select-payment-cashbox"
						>
							{STOMX_CASH_BOXES.map((b) => (
								<option key={b.type} value={b.type}>
									{b.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Cash Flow (ДДС) Receipt Category Selection */}
				<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
						<span>Статья ДДС:</span>
					</div>
					<div className="flex flex-wrap items-center gap-1">
						{STOMX_CASH_RECEIPT_CATEGORIES.slice(0, 3).map((cat) => (
							<button
								key={cat.alias}
								type="button"
								onClick={() => setSelectedReceiptAlias(cat.alias)}
								className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									selectedReceiptAlias === cat.alias
										? "bg-indigo-600 text-white shadow-2xs"
										: "bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
								}`}
								data-testid={`payment-cat-${cat.alias}`}
							>
								{cat.name}
							</button>
						))}
						<select
							value={selectedReceiptAlias}
							onChange={(e) => setSelectedReceiptAlias(e.target.value as StomxReceiptTypeAlias)}
							className="px-2 py-1 rounded-lg text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium cursor-pointer"
							aria-label="Все статьи поступлений"
							data-testid="select-payment-receipt-alias"
						>
							{STOMX_CASH_RECEIPT_CATEGORIES.map((cat) => (
								<option key={cat.alias} value={cat.alias}>
									{cat.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* 54-FZ Buyer Details (Mandates 8e & 8n: Frictionless, optional for physical persons) */}
			<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payer-type-section">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
						<Building2 size={14} className="text-indigo-600" />
						<span>Данные плательщика</span>
					</div>
					<div className="flex items-center gap-1 p-0.5 bg-[var(--paper,#ffffff)] rounded-lg border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => {
								setPayerType("physical");
								setBuyerInnError(null);
							}}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								payerType === "physical"
									? "bg-emerald-600 text-white shadow-2xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-payer-physical"
						>
							<User size={12} />
							<span>Физлицо (Гражданин)</span>
						</button>
						<button
							type="button"
							onClick={() => setPayerType("legal_entity")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								payerType === "legal_entity"
									? "bg-indigo-600 text-white shadow-2xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-payer-legal"
						>
							<Building2 size={12} />
							<span>Юрлицо / ИП</span>
						</button>
					</div>
				</div>

				{payerType === "physical" ? (
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
							<span className="flex items-center gap-1">
								<FileText size={12} className="text-emerald-600" />
								<span>ИНН пациента (необязательно, для справки НДФЛ 13%):</span>
							</span>
							<span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium" data-testid="inn-physical-not-required-badge">
								По 54-ФЗ для физлиц не требуется
							</span>
						</div>
						<div className="relative">
							<input
								type="text"
								value={buyerInn}
								onChange={(e) => handleInnChange(e.target.value)}
								placeholder="Необязательно (12 цифр для налогового вычета)"
								maxLength={12}
								className="h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
								data-testid="input-buyer-inn-physical"
							/>
							{buyerInn && (
								<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
									{buyerInn.length}/12
								</span>
							)}
						</div>
						{buyerInnError && (
							<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1">
								<AlertCircle size={10} />
								<span>{buyerInnError} (оплата не блокируется)</span>
							</p>
						)}
					</div>
				) : (
					<div className="space-y-1">
						<label className="text-[11px] font-bold text-[var(--ink,#0f172a)] flex items-center justify-between">
							<span>ИНН юридического лица / ИП (10 или 12 цифр):</span>
							<span className="text-[10px] text-indigo-600 font-bold">* Обязательно для юрлиц</span>
						</label>
						<div className="relative">
							<input
								type="text"
								value={buyerInn}
								onChange={(e) => handleInnChange(e.target.value)}
								placeholder="Введите 10 цифр (ООО) или 12 цифр (ИП)"
								maxLength={12}
								className={`h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border rounded-lg text-[var(--ink,#0f172a)] outline-none ${
									buyerInnError
										? "border-rose-500 focus:border-rose-600"
										: "border-[var(--line,#e2e8f0)] focus:border-indigo-500"
								}`}
								data-testid="input-buyer-inn-legal"
							/>
							{buyerInn && (
								<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
									{buyerInn.length} знаков
								</span>
							)}
						</div>
						{buyerInnError ? (
							<p className="text-[10px] text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1">
								<AlertCircle size={10} />
								<span>{buyerInnError}</span>
							</p>
						) : buyerInn.length === 10 || buyerInn.length === 12 ? (
							<p className="text-[10px] text-emerald-600 dark:text-emerald-400 m-0 flex items-center gap-1">
								<CheckCircle2 size={10} />
								<span>ИНН проверен</span>
							</p>
						) : null}
					</div>
				)}
			</div>
		</>
	);
};
