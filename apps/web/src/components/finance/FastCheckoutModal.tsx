import React, { useRef } from "react";
import {
	QrCode,
	X,
	ShieldCheck,
	ArrowRight,
	Layers,
	Sparkles,
	Building2,
	User,
	FileText,
} from "lucide-react";
import { type CheckoutPaymentMethodType } from "../payments/checkout/fastCheckoutPresets";
import {
	type Ffd12FiscalPayload,
	type TreatmentPlanStageOption,
} from "../payments/checkout/fastCheckoutEngine";
import { useModalA11y } from "../../hooks/useModalA11y";

import { FastCheckoutPaymentSplit } from "./FastCheckoutPaymentSplit";
import { FastCheckoutFamilyBalance } from "./FastCheckoutFamilyBalance";
import { FastCheckoutReceiptPreview } from "./FastCheckoutReceiptPreview";
import { FastCheckoutPresetsAndDiscounts } from "./FastCheckoutPresetsAndDiscounts";
import { useFastCheckoutLogic } from "./useFastCheckoutLogic";

export * from "./FastCheckoutPaymentSplit";
export * from "./FastCheckoutFamilyBalance";
export * from "./FastCheckoutReceiptPreview";
export * from "./FastCheckoutPresetsAndDiscounts";
export * from "./fastCheckoutFiscalHandlers";
export * from "./useFastCheckoutLogic";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly orderId?: string | undefined;
	readonly stages?: readonly TreatmentPlanStageOption[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly initialSimpleCashierMode?: boolean | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		patientName = "",
		patientPhone = "",
		patientEmail = "",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		familyPayerName = "",
		orderId = "",
	} = props;

	const {
		stages,
		selectedStageId,
		stagePaymentMode,
		setStagePaymentMode,
		activeMethod,
		cardAmountRub,
		setCardAmountRub,
		cashAmountRub,
		setCashAmountRub,
		sbpAmountRub,
		setSbpAmountRub,
		sbpStatus,
		isCheckingSbp,
		sbpCheckMessage,
		depositAmountRub,
		setDepositAmountRub,
		loyaltyAmountRub,
		setLoyaltyAmountRub,
		cashTenderedRub,
		setCashTenderedRub,
		isPrinting,
		pendingOfflineCount,
		isFlushingQueue,
		interruptedPaymentState,
		setInterruptedPaymentState,
		isSubmittingManualCard,
		kktHardwareStatus,
		isTier2Open,
		setIsTier2Open,
		isSimpleCashierMode,
		setIsSimpleCashierMode,
		clientType,
		setClientType,
		buyerInn,
		setBuyerInn,
		buyerName,
		setBuyerName,
		isElectronicReceiptOnly,
		setIsElectronicReceiptOnly,
		discountPreset,
		setDiscountPreset,
		customDiscountPercent,
		setCustomDiscountPercent,
		baseStageAmountKop,
		discountCalc,
		stageCalc,
		effectiveBillKop,
		targetBillKop,
		targetBillRub,
		effectiveSbpAmountRub,
		sbpQrData,
		remainingKop,
		remainingRub,
		cashChange,
		validation,
		handleQuickPreset,
		handleStageSelect,
		handleSingle100Percent,
		handleAddRemainingToCard,
		handleAddRemainingToCash,
		handleAddRemainingToSbp,
		handleAddRemainingToDeposit,
		handleAddRemainingDepositPlusCard,
		handleAddRemainingToLoyalty,
		handleAddRemaining5050,
		handleAddRemainingToFamily,
		handleExecutePayment,
		handleCheckSbpStatus,
		handleConfirmSbpManual,
		handleManualCardTerminalConfirm,
		handleAcceptPaymentOfflineFallback,
		handleRetryFiscalizationDirect,
		handleFlushQueue,
	} = useFastCheckoutLogic(props);

	const primaryInputRef = useRef<HTMLInputElement | null>(null);

	const { modalRef, handleInputEnterKeyDown } = useModalA11y<HTMLDivElement>({
		isOpen,
		onClose,
		onSubmit: () => {
			if (!isPrinting) {
				void handleExecutePayment();
			}
		},
		autoFocusRef: primaryInputRef,
		initialFocusSelector:
			'[data-testid="simple-card-btn"], [data-testid="simple-cash-btn"], [data-testid="simple-sbp-btn"], [data-testid="simple-deposit-btn"], input, button',
	});

	if (!isOpen) return null;

	return (
		<div
			ref={modalRef}
			className="fast-checkout-modal-overlay"
			data-testid="fast-checkout-modal"
			tabIndex={-1}
		>
			<div className="fast-checkout-modal-container max-w-3xl">
				{/* Header */}
				<div className="p-3 sm:py-2.5 sm:px-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
							<QrCode className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] truncate flex items-center gap-2 m-0">
								1-Клик Оплата приема & Кассовый чек
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 truncate">
								{patientName} • Заказ #{orderId} • К оплате:{" "}
								<span className="font-bold font-mono text-teal-700 dark:text-teal-300">
									{(effectiveBillKop / 100).toLocaleString("ru-RU", {
										minimumFractionDigits: 2,
									})}{" "}
									₽
								</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer shrink-0 ml-2"
						aria-label="Закрыть быструю кассу"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-3 sm:p-4 pb-28 sm:pb-24 overflow-y-auto flex flex-col gap-4 flex-1 min-h-0">
					{/* Step-by-Step Guidance Ribbon & Autosave Status */}
					<div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-xs flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 min-w-0">
							<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] shrink-0">
								1
							</span>
							<span className="truncate">Способ</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted,#64748b)] shrink-0" />
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 min-w-0">
							<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] shrink-0">
								2
							</span>
							<span className="truncate">Сумма</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted,#64748b)] shrink-0" />
						<div
							className={`flex items-center gap-1.5 font-bold min-w-0 ${
								validation.isValid
									? "text-emerald-700 dark:text-emerald-300"
									: "text-amber-600"
							}`}
						>
							<span
								className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
									validation.isValid ? "bg-emerald-600" : "bg-amber-500"
								} text-white text-[9px] shrink-0`}
							>
								3
							</span>
							<span className="truncate">Кассовый чек</span>
						</div>
						<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center min-w-0">
							<ShieldCheck size={13} className="inline mr-1 shrink-0 text-emerald-500" />
							<span className="truncate">Для пациентов-физлиц ИНН не требуется</span>
						</span>
						<button
							type="button"
							onClick={() => setIsSimpleCashierMode((prev) => !prev)}
							className={`min-h-[44px] sm:min-h-[30px] sm:h-7.5 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ml-auto flex items-center gap-1.5 shrink-0 ${
								isSimpleCashierMode
									? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/30"
									: "bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-500"
							}`}
							title="Переключить крупный режим «Простая касса» для врача/кассира"
							data-testid="toggle-simple-cashier-btn"
						>
							<span>Простая касса</span>
							<span className="text-[10px] opacity-90 font-mono">
								[{isSimpleCashierMode ? "Крупно" : "Сплит"}]
							</span>
						</button>
					</div>

					{/* Presets and Discounts */}
					<FastCheckoutPresetsAndDiscounts
						familyPayerName={familyPayerName}
						patientFamilyBalanceRub={patientFamilyBalanceRub}
						onQuickPreset={handleQuickPreset}
						discountPreset={discountPreset}
						onSetDiscountPreset={setDiscountPreset}
						customDiscountPercent={customDiscountPercent}
						onSetCustomDiscountPercent={setCustomDiscountPercent}
						discountCalc={discountCalc}
					/>

					{/* Treatment Stage Selector */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Layers size={14} className="text-teal-600" />
								Выбор этапа сметы / плана лечения:
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">
								{stages.length}{" "}
								{stages.length === 1
									? "этап"
									: stages.length < 5
									? "этапа"
									: "этапов"}{" "}
								в плане
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{stages.map((st) => {
								const isSelected = selectedStageId === st.id;
								return (
									<button
										key={st.id}
										type="button"
										onClick={() => handleStageSelect(st.id)}
										className={`min-h-[48px] p-2.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
											isSelected
												? "border-teal-600 bg-teal-500/10 text-teal-900 dark:text-teal-200 shadow-sm"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<span className="text-xs font-bold truncate">{st.titleRu}</span>
										<span className="text-xs font-mono font-extrabold text-teal-700 dark:text-teal-300">
											{(st.amountKop / 100).toLocaleString("ru-RU")} ₽
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Stage Advance Mode Selection */}
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col gap-2">
						<div className="flex items-center justify-between flex-wrap gap-1">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Sparkles size={14} className="text-teal-600" />
								Режим чека для этапа:
							</span>
							<span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
								{stageCalc.ffdTag1214NameRu}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<button
								type="button"
								onClick={() => setStagePaymentMode("full")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "full"
										? "border-teal-600 bg-teal-500/15 text-teal-900 dark:text-teal-200 shadow-xs ring-1 ring-teal-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
								}`}
							>
								<span>100% Оплата</span>
								<span className="text-xs font-mono opacity-80">
									{(baseStageAmountKop / 100).toLocaleString("ru-RU")} ₽
								</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_30")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_30"
										? "border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-amber-400"
								}`}
							>
								<span>Аванс 30%</span>
								<span className="text-xs font-mono opacity-80">
									{Math.round((baseStageAmountKop * 30) / 10000).toLocaleString("ru-RU")} ₽
								</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_50")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_50"
										? "border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-amber-400"
								}`}
							>
								<span>Аванс 50%</span>
								<span className="text-xs font-mono opacity-80">
									{Math.round((baseStageAmountKop * 50) / 10000).toLocaleString("ru-RU")} ₽
								</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_offset_tag1215")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_offset_tag1215"
										? "border-purple-600 bg-purple-500/15 text-purple-900 dark:text-purple-200 shadow-xs ring-1 ring-purple-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-purple-400"
								}`}
							>
								<span>Зачет аванса</span>
								<span className="text-xs font-mono opacity-80">
									Доплата {(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")} ₽
								</span>
							</button>
						</div>

						{stagePaymentMode === "advance_offset_tag1215" && (
							<div className="mt-1 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between flex-wrap gap-2 text-purple-950 dark:text-purple-100">
								<div>
									<strong>Зачет ранее внесенного аванса:</strong>{" "}
									{(stageCalc.advanceOffsetTag1215Kop / 100).toLocaleString("ru-RU")} ₽
									(зачет аванса)
								</div>
								<div className="font-mono font-bold">
									К доплате сейчас:{" "}
									{(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")} ₽
								</div>
							</div>
						)}
					</div>

					{/* Payer Type & INN Panel */}
					<div
						className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2"
						data-testid="payer-type-section"
					>
						<div className="flex items-center justify-between flex-wrap gap-2">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Building2 size={14} className="text-teal-600" />
								Тип плательщика (реквизиты чека):
							</span>
							{clientType === "physical_person" && (
								<span
									className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center min-w-0"
									data-testid="inn-physical-not-required-badge"
									aria-label="54-ФЗ: ИНН с физлиц НЕ требуется"
									title="54-ФЗ: ИНН с физлиц НЕ требуется"
								>
									<ShieldCheck size={14} className="inline mr-1 shrink-0 text-emerald-500" />
									По 54-ФЗ для физлиц не требуется
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setClientType("physical_person")}
								className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									clientType === "physical_person"
										? "bg-teal-600 text-white shadow-xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink)] border border-[var(--line,#cbd5e1)] hover:border-teal-400"
								}`}
								data-testid="tab-payer-physical"
							>
								<User size={13} />
								<span>Физическое лицо (пациент)</span>
							</button>
							<button
								type="button"
								onClick={() => setClientType("legal_entity")}
								className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									clientType === "legal_entity"
										? "bg-teal-600 text-white shadow-xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink)] border border-[var(--line,#cbd5e1)] hover:border-teal-400"
								}`}
								data-testid="tab-payer-legal"
							>
								<Building2 size={13} />
								<span>Юрлицо / ИП</span>
							</button>
						</div>

						{clientType === "physical_person" ? (
							<div className="space-y-1">
								<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
									<span>ИНН физлица (опционально, только если пациент запросил справку 13% НДФЛ):</span>
								</label>
								<input
									type="text"
									maxLength={12}
									value={buyerInn}
									onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
									onKeyDown={handleInputEnterKeyDown}
									placeholder="Не требуется (пациент-физлицо)"
									className="min-h-[44px] sm:min-h-0 sm:h-8 w-full max-w-sm px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
									data-testid="input-buyer-inn-physical"
								/>
								{buyerInn && buyerInn.length !== 12 && (
									<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 mt-0.5 flex items-center gap-1 font-medium">
										<ShieldCheck size={12} className="text-emerald-500 shrink-0" />
										<span>ИНН физлица обычно 12 цифр (для чека опционально, оплата не блокируется)</span>
									</p>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
										<FileText size={12} className="text-teal-600" />
										<span>ИНН организации / ИП (10 или 12 цифр): *</span>
									</label>
									<input
										type="text"
										maxLength={12}
										value={buyerInn}
										onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
										placeholder="ИНН (10 или 12 цифр)"
										className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
										data-testid="input-buyer-inn-legal"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
										<span>Наименование организации / ИП:</span>
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										placeholder="ООО «Компания» или ИП Иванов"
										className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
										data-testid="input-buyer-name-legal"
									/>
								</div>
							</div>
						)}
					</div>

					{/* Split Payment Section (Selector, SBP QR, Cash Tender) */}
					<FastCheckoutPaymentSplit
						isSimpleCashierMode={isSimpleCashierMode}
						activeMethod={activeMethod}
						onSelectMethod={handleSingle100Percent}
						targetBillRub={targetBillRub}
						targetBillKop={targetBillKop}
						cardAmountRub={cardAmountRub}
						setCardAmountRub={setCardAmountRub}
						cashAmountRub={cashAmountRub}
						setCashAmountRub={setCashAmountRub}
						sbpAmountRub={sbpAmountRub}
						setSbpAmountRub={setSbpAmountRub}
						depositAmountRub={depositAmountRub}
						setDepositAmountRub={setDepositAmountRub}
						loyaltyAmountRub={loyaltyAmountRub}
						setLoyaltyAmountRub={setLoyaltyAmountRub}
						cashTenderedRub={cashTenderedRub}
						setCashTenderedRub={setCashTenderedRub}
						remainingRub={remainingRub}
						remainingKop={remainingKop}
						cashChange={cashChange}
						patientDepositRub={patientDepositRub}
						patientFamilyBalanceRub={patientFamilyBalanceRub}
						familyPayerName={familyPayerName}
						sbpStatus={sbpStatus}
						isCheckingSbp={isCheckingSbp}
						sbpCheckMessage={sbpCheckMessage}
						sbpQrData={sbpQrData}
						effectiveSbpAmountRub={effectiveSbpAmountRub}
						onCheckSbpStatus={handleCheckSbpStatus}
						onConfirmSbpManual={handleConfirmSbpManual}
						onInputEnterKeyDown={handleInputEnterKeyDown}
						onAddRemainingToCard={handleAddRemainingToCard}
						onAddRemainingToCash={handleAddRemainingToCash}
						onAddRemainingToSbp={handleAddRemainingToSbp}
						onAddRemainingToDeposit={handleAddRemainingToDeposit}
						onAddRemainingDepositPlusCard={handleAddRemainingDepositPlusCard}
						onAddRemainingToLoyalty={handleAddRemainingToLoyalty}
						onAddRemainingToFamily={handleAddRemainingToFamily}
						onAddRemaining5050={handleAddRemaining5050}
						onSwitchToSplitMode={() => setIsSimpleCashierMode(false)}
					/>

					{/* Family Balance Section */}
					<FastCheckoutFamilyBalance
						patientDepositRub={patientDepositRub}
						patientFamilyBalanceRub={patientFamilyBalanceRub}
						familyPayerName={familyPayerName}
						isTier2Open={isTier2Open}
						onToggleTier2={() => setIsTier2Open((prev) => !prev)}
					/>
				</div>

				{/* Receipt Preview, Banners, and Sticky Footer */}
				<FastCheckoutReceiptPreview
					kktHardwareStatus={kktHardwareStatus}
					interruptedPaymentState={interruptedPaymentState}
					setInterruptedPaymentState={setInterruptedPaymentState}
					isPrinting={isPrinting}
					isFlushingQueue={isFlushingQueue}
					isSubmittingManualCard={isSubmittingManualCard}
					pendingOfflineCount={pendingOfflineCount}
					validation={validation}
					activeMethod={activeMethod}
					targetBillKop={targetBillKop}
					targetBillRub={targetBillRub}
					patientPhone={patientPhone}
					patientEmail={patientEmail}
					isElectronicReceiptOnly={isElectronicReceiptOnly}
					setIsElectronicReceiptOnly={setIsElectronicReceiptOnly}
					onClose={onClose}
					onExecutePayment={handleExecutePayment}
					onAcceptPaymentOfflineFallback={handleAcceptPaymentOfflineFallback}
					onManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					onRetryFiscalizationDirect={handleRetryFiscalizationDirect}
					onFlushQueue={handleFlushQueue}
					onFixValidationError={() => handleSingle100Percent(activeMethod || "bank_card")}
				/>
			</div>
		</div>
	);
};
