/**
 * apps/web/src/components/finance/modal/payment/PaymentSplitView.tsx
 *
 * Multi-tender split payment inputs, remainder distribution chips, and SBP QR preview.
 * Decomposed into ./splitModules/ in compliance with Mandate 8b (facade <= 250 lines).
 */

import React from "react";
import {
	Banknote,
	Coins,
	CreditCard,
	QrCode,
	ShieldCheck,
	Sparkles,
	Users,
	Wallet,
} from "lucide-react";
import {
	type PaymentSplitViewProps,
	PaymentMethodRow,
	PaymentFiscalSummaryCard,
	PaymentSplitPresetsToolbar,
	PaymentSplitSbpQrPanel,
} from "./splitModules/index.js";
import { autoAlignSplitRemainder } from "./splitModules/paymentSplitMath.js";

export type { PaymentSplitViewProps };
export * from "./splitModules/index.js";

export const PaymentSplitView: React.FC<PaymentSplitViewProps> = ({
	totalDueRub,
	splitCardRub,
	setSplitCardRub,
	splitCashRub,
	setSplitCashRub,
	splitSbpRub,
	setSplitSbpRub,
	splitDepositRub,
	setSplitDepositRub,
	splitFamilyRub,
	setSplitFamilyRub,
	splitCertificateRub,
	setSplitCertificateRub,
	splitBonusRub,
	setSplitBonusRub,
	splitDmsRub = 0,
	setSplitDmsRub,
	availableDmsCoverageRub,
	dmsGuaranteeLetterNumber,
	dmsInsurerName,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	applySplitRemainder,
	totalAllocatedRub,
	isBalanced,
	sbpStatus,
	sbpQrData,
	sbpCheckMessage,
	handleCheckSbpStatus,
	handleConfirmSbpManual,
	isCheckingSbp,
}) => {
	const effectiveFamilyRub =
		splitFamilyRub !== undefined
			? splitFamilyRub
			: patientDepositRub === 0 && patientFamilyBalanceRub > 0
				? splitDepositRub
				: 0;

	const handleFamilyChange = (val: number) => {
		if (setSplitFamilyRub) {
			setSplitFamilyRub(val);
		} else {
			setSplitDepositRub(val);
		}
	};

	const handleAutoAlignRemainder = () => {
		const { nextCardRub, nextCashRub } = autoAlignSplitRemainder({
			totalDueRub,
			totalAllocatedRub,
			splitCardRub,
			splitCashRub,
			splitDepositRub,
			splitSbpRub,
		});
		setSplitCardRub(nextCardRub);
		setSplitCashRub(nextCashRub);
	};

	return (
		<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2">
			{/* Modal Section Header */}
			<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-1">
				<div className="flex items-center gap-2">
					<Wallet size={15} className="text-teal-600 dark:text-teal-400" />
					<h3 className="text-xs font-bold m-0 text-[var(--ink,#0f172a)]">
						Комбинированная сплит-оплата
					</h3>
				</div>
				<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
					К оплате:{" "}
					<strong className="text-[var(--ink,#0f172a)]">
						{totalDueRub.toLocaleString("ru-RU")} ₽
					</strong>
				</span>
			</div>

			{/* Tender Inputs Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">


				{/* 1. Наличные (Касса) */}
				<PaymentMethodRow
					label="Наличные (Касса), ₽:"
					icon={Banknote}
					valueRub={splitCashRub}
					onChangeRub={setSplitCashRub}
					onFillRemainder={() => applySplitRemainder("cash")}
					testId="input-split-cash"
				/>

				{/* 2. Карта POS (Терминал) */}
				<PaymentMethodRow
					label="Карта POS (Терминал), ₽:"
					icon={CreditCard}
					valueRub={splitCardRub}
					onChangeRub={setSplitCardRub}
					onFillRemainder={() => applySplitRemainder("card")}
					testId="input-split-card"
				/>

				{/* 3. SberPay QR / СБП */}
				<PaymentMethodRow
					label="SberPay QR / СБП, ₽:"
					icon={QrCode}
					valueRub={splitSbpRub}
					onChangeRub={setSplitSbpRub}
					onFillRemainder={() => applySplitRemainder("sbp")}
					testId="input-split-sbp"
				/>

				{/* 4. Семейный баланс / Депозит */}
				<PaymentMethodRow
					label="Депозит семьи (Баланс), ₽:"
					icon={Users}
					valueRub={effectiveFamilyRub}
					onChangeRub={handleFamilyChange}
					onFillRemainder={() => applySplitRemainder("family")}
					testId="input-split-family"
					maxRub={patientFamilyBalanceRub || undefined}
					badgeText={
						patientFamilyBalanceRub > 0
							? `Доступно: ${patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽`
							: undefined
					}
				/>

				{/* Депозит / Личный аванс */}
				<PaymentMethodRow
					label="Личный депозит / Аванс, ₽:"
					icon={Wallet}
					valueRub={splitDepositRub}
					onChangeRub={setSplitDepositRub}
					onFillRemainder={() => applySplitRemainder("deposit")}
					testId="input-split-deposit"
				/>

				{/* Подарочный сертификат */}
				<PaymentMethodRow
					label="Подарочный сертификат, ₽:"
					icon={Coins}
					valueRub={splitCertificateRub}
					onChangeRub={setSplitCertificateRub}
					onFillRemainder={() => applySplitRemainder("certificate")}
					testId="input-split-certificate"
				/>
				<PaymentMethodRow
					label="Бонусные баллы, ₽:"
					icon={Sparkles}
					valueRub={splitBonusRub}
					onChangeRub={setSplitBonusRub}
					onFillRemainder={() => applySplitRemainder("bonus")}
					testId="input-split-bonus"
				/>
				<PaymentMethodRow
					label="Страховая компания (ДМС), ₽:"
					icon={ShieldCheck}
					valueRub={splitDmsRub}
					onChangeRub={(val) => setSplitDmsRub?.(val)}
					onFillRemainder={() => applySplitRemainder("dms")}
					testId="input-split-dms"
					isAccent={true}
					subLabel={
						dmsInsurerName
							? `${dmsInsurerName} ${dmsGuaranteeLetterNumber ? `(ГП №${dmsGuaranteeLetterNumber})` : ""}`
							: undefined
					}
					badgeText={
						availableDmsCoverageRub !== undefined
							? `Лимит ГП: ${availableDmsCoverageRub.toLocaleString("ru-RU")} ₽`
							: undefined
					}
				/>
			</div>

			{/* Presets Toolbar (1-Click Hick's Law) */}
			<PaymentSplitPresetsToolbar
				totalDueRub={totalDueRub}
				availableDmsCoverageRub={availableDmsCoverageRub}
				patientDepositRub={patientDepositRub}
				patientFamilyBalanceRub={patientFamilyBalanceRub}
				onAutoAlignRemainder={handleAutoAlignRemainder}
				applySplitRemainder={applySplitRemainder}
				setSplitDmsRub={setSplitDmsRub}
				setSplitCardRub={setSplitCardRub}
				setSplitCashRub={setSplitCashRub}
				setSplitDepositRub={setSplitDepositRub}
				setSplitSbpRub={setSplitSbpRub}
				setSplitCertificateRub={setSplitCertificateRub}
				setSplitBonusRub={setSplitBonusRub}
			/>

			{/* 54-FZ Fiscal Summary & Parity Card */}
			<PaymentFiscalSummaryCard
				totalDueRub={totalDueRub}
				totalAllocatedRub={totalAllocatedRub}
				isBalanced={isBalanced}
				onAutoAlignRemainder={handleAutoAlignRemainder}
				splitCashRub={splitCashRub}
				splitCardRub={splitCardRub}
				splitSbpRub={splitSbpRub}
				splitDepositRub={splitDepositRub}
				splitFamilyRub={effectiveFamilyRub}
				splitDmsRub={splitDmsRub}
				splitCertificateRub={splitCertificateRub}
				splitBonusRub={splitBonusRub}
			/>

			{/* Dynamic SBP QR Panel */}
			<PaymentSplitSbpQrPanel
				splitSbpRub={splitSbpRub}
				sbpStatus={sbpStatus}
				sbpQrData={sbpQrData}
				sbpCheckMessage={sbpCheckMessage}
				isCheckingSbp={isCheckingSbp}
				onCheckSbpStatus={handleCheckSbpStatus}
				onConfirmSbpManual={handleConfirmSbpManual}
			/>
		</div>
	);
};

export default PaymentSplitView;
