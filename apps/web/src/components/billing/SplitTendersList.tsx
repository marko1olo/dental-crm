/**
 * apps/web/src/components/billing/SplitTendersList.tsx
 *
 * Interactive Multi-Tender Input List for SplitPaymentModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CreditCard, Banknote, QrCode, Wallet } from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";
import { SbpDynamicQrCard } from "./SbpDynamicQrCard.js";
import { showToast } from "../GlobalToast.js";
import { SplitTenderRow } from "./splitTenders/SplitTenderRow.js";
import type { SplitTendersListProps, SplitAllocatedTenderTarget } from "./splitTenders/types.js";

export type { SplitTendersListProps, SplitAllocatedTenderTarget };

export const SplitTendersList: React.FC<SplitTendersListProps> = (props) => {
	const {
		splitResult, cardRub, setCardRub, cashRub, setCashRub, sbpRub, setSbpRub,
		depositRub, setDepositRub, familyDepositRub, setFamilyDepositRub,
		patientDepositRub = 0, patientFamilyBalanceRub = 0, invoiceId, visitId,
		patientName, clinicLegalName, handleAllocateRemainingTo,
	} = props;
	const rem = splitResult.remainingRub;
	const remLabel = rem > 0 ? `+ остаток (${formatDisplayCurrency(rem)})` : undefined;

	return (
		<div className="space-y-3 pt-1" data-testid="split-tenders-list">
			<SplitTenderRow
				icon={<CreditCard size={16} />} title="Карта POS" subtitle="Безналичный расчет"
				value={cardRub} onChange={setCardRub} testId="input-split-card"
				actionLabel={remLabel} onAction={() => handleAllocateRemainingTo("card")} actionTestId="btn-fill-card-remaining"
			/>
			<SplitTenderRow
				icon={<Banknote size={16} />} title="Наличные" subtitle="Наличный расчет"
				value={cashRub} onChange={setCashRub} testId="input-split-cash"
				actionLabel={remLabel} onAction={() => handleAllocateRemainingTo("cash")} actionTestId="btn-fill-cash-remaining"
			/>
			<SplitTenderRow
				icon={<QrCode size={16} />} title="QR СБП" subtitle="Система быстрых платежей"
				value={sbpRub} onChange={setSbpRub} testId="input-split-sbp"
				actionLabel={remLabel} onAction={() => handleAllocateRemainingTo("sbp")} actionTestId="btn-fill-sbp-remaining"
			/>

			{sbpRub > 0 && (
				<div className="pt-1" data-testid="split-sbp-qr-preview">
					<SbpDynamicQrCard
						sumRub={sbpRub} orderId={invoiceId || visitId} patientName={patientName}
						clinicLegalName={clinicLegalName} ttlSeconds={30} compactMode={true}
						onPaymentSuccess={() => showToast(`СБП часть (${formatDisplayCurrency(sbpRub)}) успешно оплачена!`, "success")}
					/>
				</div>
			)}

			<SplitTenderRow
				icon={<Wallet size={16} />} title="Личный депозит" subtitle={`Доступно: ${formatDisplayCurrency(patientDepositRub || 0)}`}
				value={depositRub} onChange={setDepositRub} testId="input-split-deposit"
				actionLabel={(patientDepositRub || 0) > 0 ? "Макс" : undefined}
				onAction={() => setDepositRub(Math.min(patientDepositRub || 0, rem + depositRub))}
				actionTestId="btn-fill-deposit-max"
			/>

			{(patientFamilyBalanceRub || 0) > 0 && (
				<SplitTenderRow
					icon={<Wallet size={16} />} title="Семейный баланс" subtitle={`Доступно: ${formatDisplayCurrency(patientFamilyBalanceRub || 0)}`}
					value={familyDepositRub} onChange={setFamilyDepositRub} testId="input-split-family"
					actionLabel="Макс" onAction={() => setFamilyDepositRub(Math.min(patientFamilyBalanceRub || 0, rem + familyDepositRub))}
					actionTestId="btn-fill-family-max" actionColorClass="text-amber-600 dark:text-amber-400"
				/>
			)}
		</div>
	);
};
