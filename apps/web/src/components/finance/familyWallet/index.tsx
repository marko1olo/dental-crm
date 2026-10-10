import { Activity, ArrowRight, Users } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { WALLET_PANEL_SUBJECT, type FamilyWalletPanelProps } from "./types";
import { useFamilyWallet } from "./useFamilyWallet";
import { FamilyWalletBalanceCard } from "./FamilyWalletBalanceCard";
import { FamilyHistoryFeed } from "./FamilyHistoryFeed";
import { FamilyMembersList } from "./FamilyMembersList";
import { FamilyBonusSection } from "../FamilyBonusSection";
import { FamilyTopupSection } from "../FamilyTopupSection";
import { FamilyCombinedBillingModal } from "../FamilyCombinedBillingModal";
import { FamilyTransferModal } from "./FamilyTransferModal";

export const FamilyWalletPanel: React.FC<FamilyWalletPanelProps> = ({
	patientId,
	remainingDebtRub,
	onPaymentSuccess,
}) => {
	const {
		family,
		isLoading,
		loadFailure,
		loadFamily,
		isPaying,
		isToppingUp,
		isCombinedBillingModalOpen,
		setIsCombinedBillingModalOpen,
		isLedgerOpen,
		setIsLedgerOpen,
		isRefundModalOpen,
		setIsRefundModalOpen,
		topupInput,
		setTopupInput,
		topupMethod,
		setTopupMethod,
		amountInput,
		setAmountInput,
		ledgerEntries,
		refundAmountInput,
		setRefundAmountInput,
		refundTargetPatientId,
		setRefundTargetPatientId,
		refundReason,
		setRefundReason,
		refundDestination,
		setRefundDestination,
		isRefunding,
		targetPatientId,
		setTargetPatientId,
		balanceVal,
		animatedBalance,
		headMember,
		headFullName,
		targetMemberName,
		amount,
		topupBlockReason,
		debtSuggestionRub,
		payBlockReason,
		handlePay,
		handleTopup,
		handleExecuteRefund,
		handlePrintLedger,
	} = useFamilyWallet({ patientId, remainingDebtRub, onPaymentSuccess });

	if (isLoading)
		return (
			<div className="family-wallet-loading">
				<Activity size={16} className="animate-spin inline mr-2" />
				Загрузка семейного кошелька...
			</div>
		);
	if (loadFailure)
		return (
			<PanelLoadFailure
				subject={WALLET_PANEL_SUBJECT}
				status={loadFailure.status}
				onRetry={() => {
					void loadFamily();
				}}
			/>
		);
	if (!family) return null;

	return (
		<div className="family-wallet-panel" data-testid="family-wallet-panel">
			<div className="family-wallet-bg-icon">
				<Users size={96} />
			</div>

			<FamilyWalletBalanceCard
				family={family}
				headFullName={headFullName}
				balanceVal={balanceVal}
				animatedBalance={animatedBalance}
				onOpenCombinedBilling={() => setIsCombinedBillingModalOpen(true)}
				onToggleLedger={() => setIsLedgerOpen((prev) => !prev)}
				isLedgerOpen={isLedgerOpen}
				ledgerCount={ledgerEntries.length}
				onOpenRefundModal={() => setIsRefundModalOpen(true)}
			/>

			{/* Секция: Семейный гроссбух (история операций) */}
			<FamilyHistoryFeed
				isOpen={isLedgerOpen}
				onClose={() => setIsLedgerOpen(false)}
				ledgerEntries={ledgerEntries}
				headFullName={headFullName}
				onPrintLedger={handlePrintLedger}
			/>

			{/* Списание с семейного баланса */}
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-withdraw-amount"
						className="family-wallet-input-label"
					>
						Сумма списания (₽)
					</label>
					{targetMemberName && (
						<p className="family-wallet-payer">
							Оплата за: <strong>{targetMemberName}</strong>
						</p>
					)}
					<input
						id="family-withdraw-amount"
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={amountInput}
						onChange={(e) => setAmountInput(e.target.value)}
						placeholder="0"
						disabled={isPaying}
						aria-invalid={payBlockReason ? true : undefined}
						aria-describedby={
							payBlockReason ? "family-withdraw-hint" : undefined
						}
					/>
					{debtSuggestionRub > 0 && (
						<div className="quick-chips-row">
							<button
								type="button"
								className="quick-chip quick-chip--sm"
								onClick={() => setAmountInput(String(debtSuggestionRub))}
								disabled={isPaying}
								title={isPaying ? "Идет операция списания..." : undefined}
							>
								Долг: {money(debtSuggestionRub)}
							</button>
						</div>
					)}
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handlePay}
						disabled={isPaying}
						title={isPaying ? "Идет списание средств с семейного баланса..." : undefined}
						className="family-wallet-btn"
					>
						{isPaying ? "Списание..." : "Списать с баланса"}{" "}
						<ArrowRight size={16} />
					</button>
				</div>
			</div>
			{payBlockReason && (
				<p
					className="family-wallet-hint"
					id="family-withdraw-hint"
					role="status"
				>
					{payBlockReason}
				</p>
			)}

			{/* Бонусные баллы & Быстрый выбор суммы */}
			<FamilyBonusSection
				balanceVal={balanceVal}
				amount={amount}
				isPaying={isPaying}
				onSelectAmount={(val) => setAmountInput(String(val))}
			/>

			{/* Список членов семейной группы и выбор цели списания */}
			<FamilyMembersList
				members={family.members ?? []}
				targetPatientId={targetPatientId}
				patientId={patientId}
				isPaying={isPaying}
				headPatientId={family.headPatientId || headMember?.id}
				onSelectTargetPatient={setTargetPatientId}
			/>

			{/* Пополнение семейного кошелька */}
			<FamilyTopupSection
				topupInput={topupInput}
				setTopupInput={setTopupInput}
				topupMethod={topupMethod}
				setTopupMethod={setTopupMethod}
				topupBlockReason={topupBlockReason}
				isToppingUp={isToppingUp}
				onTopup={handleTopup}
			/>

			{/* Модальное окно объединенного расчета семьи и сплит-оплаты */}
			<FamilyCombinedBillingModal
				isOpen={isCombinedBillingModalOpen}
				onClose={() => setIsCombinedBillingModalOpen(false)}
				familyGroupId={family.id}
				familyGroupName={family.name?.trim() || "Семья"}
				availableFamilyWalletRub={balanceVal}
				initialPayer={{
					payerId: headMember?.id || patientId,
					payerFullName: headFullName,
				}}
				onCheckoutComplete={async () => {
					setIsCombinedBillingModalOpen(false);
					await onPaymentSuccess?.();
					void loadFamily();
				}}
			/>

			{/* Модальное окно возврата на семейный депозит (Refund Routing) */}
			<FamilyTransferModal
				isOpen={isRefundModalOpen}
				onClose={() => setIsRefundModalOpen(false)}
				family={family}
				headFullName={headFullName}
				headMember={headMember}
				refundTargetPatientId={refundTargetPatientId}
				setRefundTargetPatientId={setRefundTargetPatientId}
				refundAmountInput={refundAmountInput}
				setRefundAmountInput={setRefundAmountInput}
				refundReason={refundReason}
				setRefundReason={setRefundReason}
				refundDestination={refundDestination}
				setRefundDestination={setRefundDestination}
				isRefunding={isRefunding}
				onConfirmRefund={handleExecuteRefund}
			/>
		</div>
	);
};

export type * from "./types";
export {
	WALLET_PANEL_SUBJECT,
	refusalToast,
	PATIENT_ID_PATTERN,
	FAMILY_TOPUP_METHODS,
	formatFamilyBalanceLabel,
	formatAvailableForDebitLabel,
} from "./types";
export { FamilyMembersList } from "./FamilyMembersList";
export { FamilyBonusSection } from "../FamilyBonusSection";
export { FamilyTopupSection } from "../FamilyTopupSection";
export { useFamilyWallet } from "./useFamilyWallet";
export { FamilyWalletBalanceCard } from "./FamilyWalletBalanceCard";
export { FamilyTransferModal } from "./FamilyTransferModal";
export { FamilyHistoryFeed } from "./FamilyHistoryFeed";
