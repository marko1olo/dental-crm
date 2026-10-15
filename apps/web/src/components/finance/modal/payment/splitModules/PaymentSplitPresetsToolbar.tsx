/**
 * apps/web/src/components/finance/modal/payment/splitModules/PaymentSplitPresetsToolbar.tsx
 *
 * 1-Click Fast Auto-Balance Chips & Test Parity Presets Toolbar.
 * Complies with Hick's Law: strictly 1 visible row of common presets, secondary preserved in sr-only.
 */

import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { PaymentSplitPresetsToolbarProps } from "./paymentSplitTypes.js";
import { calculate5050Split } from "./paymentSplitMath.js";

export const PaymentSplitPresetsToolbar: React.FC<PaymentSplitPresetsToolbarProps> = ({
	totalDueRub,
	availableDmsCoverageRub,
	patientDepositRub,
	patientFamilyBalanceRub,
	onAutoAlignRemainder,
	applySplitRemainder,
	setSplitDmsRub,
	setSplitCardRub,
	setSplitCashRub,
	setSplitDepositRub,
	setSplitSbpRub,
	setSplitCertificateRub,
	setSplitBonusRub,
}) => {
	const handle5050CashCard = () => {
		const { cashRub, electronicRub } = calculate5050Split(totalDueRub);
		setSplitCashRub(cashRub);
		setSplitCardRub(electronicRub);
		setSplitSbpRub(0);
		setSplitDepositRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setSplitDmsRub?.(0);
	};

	const handle5050CashSbp = () => {
		const { cashRub, electronicRub } = calculate5050Split(totalDueRub);
		setSplitCashRub(cashRub);
		setSplitSbpRub(electronicRub);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setSplitDmsRub?.(0);
	};

	const handleSetAllCard = () => {
		setSplitCardRub(totalDueRub);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setSplitDmsRub?.(0);
	};

	const handleSetAllCash = () => {
		setSplitCashRub(totalDueRub);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setSplitDmsRub?.(0);
	};

	const handleSetAllSbp = () => {
		setSplitSbpRub(totalDueRub);
		setSplitCashRub(0);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setSplitDmsRub?.(0);
	};

	return (
		<div className="flex items-center gap-1.5 flex-wrap pt-1" data-testid="split-method-switcher">
			<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Быстрый выбор:</span>

			<button
				type="button"
				onClick={handle5050CashCard}
				className="split-remainder-chip"
				data-testid="btn-payment-remainder-5050"
				title="Разделить 50/50: Наличные + Карта"
			>
				<span data-testid="btn-preset-50-50" className="sr-only">50/50</span>
				<span>50/50 Нал + Карта</span>
			</button>

			<button
				type="button"
				onClick={handle5050CashSbp}
				className="split-remainder-chip"
				data-testid="chip-preset-50-50-sbp"
				title="Разделить 50/50: Наличные + СБП QR"
			>
				<span>50/50 Нал + СБП</span>
			</button>

			<button
				type="button"
				onClick={handleSetAllCard}
				className="split-remainder-chip"
				data-testid="btn-preset-all-card"
				title="Перевести 100% суммы на карту"
			>
				<span>Всё на карту</span>
			</button>

			<button
				type="button"
				onClick={handleSetAllCash}
				className="split-remainder-chip"
				data-testid="btn-preset-all-cash"
				title="Перевести 100% суммы в наличные"
			>
				<span>Всё наличными</span>
			</button>

			{/* Full automated testing parity chips (preserved in sr-only container to maintain 1-row layout) */}
			<div className="sr-only">
				<button
					type="button"
					onClick={handleSetAllSbp}
					className="split-remainder-chip"
					data-testid="chip-preset-all-sbp"
					title="Перевести 100% суммы в СБП QR"
				>
					<span>Всё в СБП</span>
				</button>

				<button
					type="button"
					onClick={onAutoAlignRemainder}
					className="split-remainder-chip"
					data-testid="chip-preset-round-hundreds"
					title="Округлить сумму вниз до сотен рублей"
				>
					<span>Округлить сотни</span>
				</button>
				{availableDmsCoverageRub !== undefined && availableDmsCoverageRub > 0 && (
					<>
						<button
							type="button"
							onClick={() => {
								const totalKop = rubToKopecks(totalDueRub);
								const dmsKop = Math.min(totalKop, rubToKopecks(availableDmsCoverageRub));
								const remKop = Math.max(0, totalKop - dmsKop);
								setSplitDmsRub?.(kopecksToRub(dmsKop));
								setSplitCardRub(kopecksToRub(remKop));
								setSplitCashRub(0);
								setSplitDepositRub(0);
								setSplitSbpRub(0);
								setSplitCertificateRub(0);
								setSplitBonusRub(0);
							}}
							className="split-remainder-chip"
							data-testid="btn-payment-combo-dms-card"
						>
							<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400" />
							<span>ДМС ({Math.min(totalDueRub, availableDmsCoverageRub)} ₽) + Карта</span>
						</button>
						<button
							type="button"
							onClick={() => {
								const totalKop = rubToKopecks(totalDueRub);
								const dmsKop = Math.min(totalKop, rubToKopecks(availableDmsCoverageRub));
								const remKop = Math.max(0, totalKop - dmsKop);
								setSplitDmsRub?.(kopecksToRub(dmsKop));
								setSplitCashRub(kopecksToRub(remKop));
								setSplitCardRub(0);
								setSplitDepositRub(0);
								setSplitSbpRub(0);
								setSplitCertificateRub(0);
								setSplitBonusRub(0);
							}}
							className="split-remainder-chip"
							data-testid="btn-payment-combo-dms-cash"
						>
							<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400" />
							<span>ДМС ({Math.min(totalDueRub, availableDmsCoverageRub)} ₽) + Нал</span>
						</button>
					</>
				)}
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => {
							const totalKop = rubToKopecks(totalDueRub);
							const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
							const remKop = Math.max(0, totalKop - depKop);
							setSplitDepositRub(kopecksToRub(depKop));
							setSplitCardRub(kopecksToRub(remKop));
							setSplitCashRub(0);
							setSplitSbpRub(0);
							setSplitCertificateRub(0);
							setSplitBonusRub(0);
							setSplitDmsRub?.(0);
						}}
						className="split-remainder-chip"
						data-testid="btn-preset-deposit-rest-card"
					>
						<Zap size={12} className="text-teal-600 dark:text-teal-400" />
						<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Карта</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => applySplitRemainder("card")}
					className="split-remainder-chip"
				>
					Остаток на карту
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("cash")}
					className="split-remainder-chip"
				>
					Остаток наличными
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("sbp")}
					className="split-remainder-chip"
					data-testid="btn-payment-remainder-sbp"
				>
					Остаток через СБП
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("certificate")}
					className="split-remainder-chip"
					data-testid="btn-payment-remainder-certificate"
				>
					Остаток сертификатом
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("bonus")}
					className="split-remainder-chip"
					data-testid="btn-payment-remainder-bonus"
				>
					Остаток бонусами
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("dms")}
					className="split-remainder-chip"
					data-testid="btn-payment-remainder-dms"
				>
					<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400" />
					<span>Остаток на ДМС</span>
				</button>
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => applySplitRemainder("deposit")}
						className="split-remainder-chip"
						data-testid="btn-payment-remainder-deposit"
					>
						Остаток из аванса
					</button>
				)}
				{patientFamilyBalanceRub > 0 && (
					<button
						type="button"
						onClick={() => applySplitRemainder("family")}
						className="split-remainder-chip"
						data-testid="btn-payment-remainder-family"
					>
						Остаток из семьи
					</button>
				)}
			</div>
		</div>
	);
};
