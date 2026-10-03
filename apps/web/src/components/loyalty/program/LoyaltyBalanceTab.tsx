import type React from "react";
import {
	Award,
	Check,
	CheckCircle2,
	CreditCard,
	ShieldCheck,
	Sparkles,
	Users,
} from "lucide-react";
import type {
	FamilyMember,
	FamilyPoolResult,
	LoyaltyRedemptionResult,
	LoyaltyTierDefinition,
	TierProgressionResult,
} from "./loyaltyEngine";
import { QUICK_REDEMPTION_PRESETS_RUB } from "./loyaltyPresets";

export interface LoyaltyBalanceTabProps {
	readonly patientName: string;
	readonly currentTier: LoyaltyTierDefinition;
	readonly effectiveBalanceRub: number;
	readonly tierProgression: TierProgressionResult;
	readonly redemptionSuccessMsg: string | null;
	readonly familyMembers: readonly FamilyMember[];
	readonly selectedFamilyMemberId: string;
	readonly onSelectFamilyMemberId: (id: string) => void;
	readonly activePointsBalance: number;
	readonly familyPool: FamilyPoolResult;
	readonly invoiceAmountRub: number;
	readonly onInvoiceAmountChange: (amount: number) => void;
	readonly excludedAmountRub: number;
	readonly onExcludedAmountChange: (amount: number) => void;
	readonly requestedPointsRub: number;
	readonly onRequestedPointsChange: (points: number) => void;
	readonly redemptionCalc: LoyaltyRedemptionResult;
	readonly onOneClickRedeem: () => void;
	readonly onApplyQuickPoints: (pts: number) => void;
	readonly onApplyMaxPoints: () => void;
	readonly isDoctorOverride: boolean;
	readonly onDoctorOverrideChange: (override: boolean) => void;
	readonly onExecuteRedemption: () => void;
}

export const LoyaltyBalanceTab: React.FC<LoyaltyBalanceTabProps> = ({
	patientName,
	currentTier,
	effectiveBalanceRub,
	tierProgression,
	redemptionSuccessMsg,
	familyMembers,
	selectedFamilyMemberId,
	onSelectFamilyMemberId,
	activePointsBalance,
	familyPool,
	invoiceAmountRub,
	onInvoiceAmountChange,
	excludedAmountRub,
	onExcludedAmountChange,
	requestedPointsRub,
	onRequestedPointsChange,
	redemptionCalc,
	onOneClickRedeem,
	onApplyQuickPoints,
	onApplyMaxPoints,
	isDoctorOverride,
	onDoctorOverrideChange,
	onExecuteRedemption,
}) => {
	return (
		<div>
			{/* Tier Hero Card */}
			<div className="loyalty-tier-hero" style={{ background: currentTier.cardGradient }}>
				<div className="loyalty-tier-hero-bg-accent" />
				<div className="loyalty-tier-hero-top">
					<div>
						<span className="loyalty-tier-hero-badge">
							<Award size={16} />
							{currentTier.badgeLabelRu}
						</span>
						<h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
							{patientName}
						</h3>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Кэшбэк бонусами</div>
						<div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
							{currentTier.cashbackPercent}%
						</div>
					</div>
				</div>

				<div className="loyalty-points-display">
					<div className="loyalty-points-value">
						{effectiveBalanceRub.toLocaleString("ru-RU")}
						<span className="loyalty-points-label">бонусных ₽</span>
					</div>
					<p style={{ fontSize: "0.875rem", opacity: 0.95 }}>
						1 бонус = 1 рубль • Оплата до {currentTier.maxInvoiceCoveragePercent}% счета
					</p>
				</div>

				{/* Progress to next tier */}
				{tierProgression.nextTier && (
					<div className="loyalty-tier-progress-wrap">
						<div className="loyalty-progress-bar-track">
							<div
								className="loyalty-progress-bar-fill"
								style={{ width: `${tierProgression.progressPercent}%` }}
							/>
						</div>
						<div className="loyalty-progress-info">
							<span>
								Накоплено: {tierProgression.lifetimeSpentRub.toLocaleString("ru-RU")} ₽
							</span>
							<span>
								До уровня {tierProgression.nextTier.nameRu}:{" "}
								{tierProgression.remainingToNextTierRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Fast Cashier Redemption Calculator */}
			<div className="loyalty-cashier-card">
				<h4 className="loyalty-section-title">
					<CreditCard size={20} color="var(--teal)" />
					Калькулятор списания бонусов
				</h4>

				{redemptionSuccessMsg && (
					<div
						style={{
							background: "rgba(16, 185, 129, 0.1)",
							border: "1px solid var(--line)",
							color: "var(--ok-fg)",
							padding: "0.75rem 1rem",
							borderRadius: "0.5rem",
							marginBottom: "1rem",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							fontWeight: 600,
						}}
					>
						<CheckCircle2 size={18} />
						{redemptionSuccessMsg}
					</div>
				)}

				{familyMembers.length > 0 && (
					<div
						style={{
							marginBottom: "1rem",
							padding: "0.75rem",
							borderRadius: "0.5rem",
							background: selectedFamilyMemberId
								? "rgba(13, 148, 136, 0.08)"
								: "var(--paper-soft)",
							border: selectedFamilyMemberId
								? "1px solid var(--teal)"
								: "1px dashed var(--line)",
						}}
					>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								fontSize: "0.8125rem",
								fontWeight: 700,
								color: "var(--ink)",
								marginBottom: "0.375rem",
							}}
						>
							<Users size={16} color="var(--teal)" />
							Оплата за члена семьи (Ребенок / Супруг) из единого кошелька:
						</label>
						<div
							style={{
								display: "flex",
								gap: "0.5rem",
								flexWrap: "wrap",
								alignItems: "center",
							}}
						>
							<select
								value={selectedFamilyMemberId}
								onChange={(e) => onSelectFamilyMemberId(e.target.value)}
								style={{
									flex: 1,
									minWidth: "220px",
									padding: "0.5rem 0.75rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
									fontSize: "0.875rem",
									fontWeight: 600,
								}}
							>
								<option value="">
									Оплата за себя ({patientName}) — личный баланс{" "}
									{activePointsBalance.toLocaleString("ru-RU")} ₽
								</option>
								{familyMembers.map((m) => (
									<option key={m.patientId} value={m.patientId}>
										{m.fullName} ({m.roleRu}) — из общего баланса семьи (
										{familyPool.totalPooledPoints.toLocaleString("ru-RU")} ₽)
									</option>
								))}
							</select>
							{selectedFamilyMemberId && (
								<span
									style={{
										fontSize: "0.75rem",
										color: "var(--ok-fg)",
										fontWeight: 700,
										padding: "4px 8px",
										borderRadius: "4px",
										background: "rgba(16, 185, 129, 0.1)",
									}}
								>
									Единый кошелек (без комиссии и ручных переводов)
								</span>
							)}
						</div>
					</div>
				)}

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: "1rem",
					}}
				>
					<div>
						<label
							style={{
								display: "block",
								fontSize: "0.8125rem",
								fontWeight: 600,
								color: "var(--muted)",
								marginBottom: "0.375rem",
							}}
						>
							Сумма счета (₽)
						</label>
						<input
							type="number"
							min={0}
							step={100}
							value={invoiceAmountRub}
							onChange={(e) => onInvoiceAmountChange(Number(e.target.value))}
							style={{
								width: "100%",
								padding: "0.625rem 0.875rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontSize: "1rem",
								fontWeight: 700,
							}}
						/>
					</div>

					<div>
						<label
							style={{
								display: "block",
								fontSize: "0.8125rem",
								fontWeight: 600,
								color: "var(--muted)",
								marginBottom: "0.375rem",
							}}
						>
							Исключения (лаборатория CAD/CAM, импланты ₽)
						</label>
						<input
							type="number"
							min={0}
							step={100}
							value={excludedAmountRub}
							onChange={(e) => onExcludedAmountChange(Number(e.target.value))}
							style={{
								width: "100%",
								padding: "0.625rem 0.875rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontSize: "1rem",
								fontWeight: 700,
							}}
						/>
					</div>

					<div>
						<label
							style={{
								display: "block",
								fontSize: "0.8125rem",
								fontWeight: 600,
								color: "var(--muted)",
								marginBottom: "0.375rem",
							}}
						>
							Списать бонусов (₽)
						</label>
						<input
							type="number"
							min={0}
							max={effectiveBalanceRub}
							value={requestedPointsRub}
							onChange={(e) => onRequestedPointsChange(Number(e.target.value))}
							style={{
								width: "100%",
								padding: "0.625rem 0.875rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--teal)",
								background: "var(--paper)",
								color: "var(--teal)",
								fontSize: "1rem",
								fontWeight: 700,
							}}
						/>
					</div>
				</div>

				{/* Quick Buttons */}
				<div className="loyalty-quick-actions-row">
					<button
						type="button"
						className="loyalty-quick-btn one-click-btn"
						onClick={onOneClickRedeem}
						data-testid="loyalty-one-click-redeem-btn"
						title="Списать максимально разрешенные бонусы в чек в 1 клик"
						style={{
							background: "var(--teal)",
							color: "var(--on-teal, var(--paper))",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.375rem",
							cursor: "pointer",
						}}
					>
						<Sparkles size={14} />
						1-клик списать в чек ({redemptionCalc.maxAllowedRedemptionRub} ₽)
					</button>
					{QUICK_REDEMPTION_PRESETS_RUB.map((preset) => (
						<button
							key={preset}
							type="button"
							className="loyalty-quick-btn"
							onClick={() => onApplyQuickPoints(preset)}
						>
							Списать {preset.toLocaleString("ru-RU")} ₽
						</button>
					))}
					<button
						type="button"
						className="loyalty-quick-btn max-btn"
						onClick={onApplyMaxPoints}
					>
						Списать максимум ({redemptionCalc.maxAllowedRedemptionRub} ₽)
					</button>
				</div>

				{/* Doctor Autonomy / Warranty override (Mandates 8e, 8s) */}
				<div
					style={{
						marginTop: "0.75rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						padding: "0.5rem 0.75rem",
						background: "var(--paper-soft)",
						borderRadius: "0.375rem",
						border: "1px dashed var(--line)",
					}}
				>
					<input
						type="checkbox"
						id="doctor-override-checkbox"
						checked={isDoctorOverride}
						onChange={(e) => onDoctorOverrideChange(e.target.checked)}
						style={{
							width: "16px",
							height: "16px",
							cursor: "pointer",
							accentColor: "var(--teal)",
						}}
						data-testid="loyalty-doctor-override-checkbox"
					/>
					<label
						htmlFor="doctor-override-checkbox"
						style={{
							fontSize: "0.8125rem",
							color: "var(--ink)",
							cursor: "pointer",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "0.375rem",
						}}
					>
						<ShieldCheck size={15} color="var(--teal)" />
						Привилегия врача / Гарантийная переделка (покрытие до 100% счета бонусами)
					</label>
				</div>

				{/* 54-FZ Fiscal Breakdown */}
				<div className="loyalty-fiscal-box">
					<div
						style={{
							fontWeight: 700,
							fontSize: "0.875rem",
							marginBottom: "0.5rem",
							color: "var(--ink)",
						}}
					>
						Расчет сплита чека:
					</div>
					<div className="loyalty-fiscal-row">
						<span>База, доступная для оплаты бонусами:</span>
						<strong>
							{(redemptionCalc.redeemableBaseKop / 100).toLocaleString("ru-RU")} ₽
						</strong>
					</div>
					<div className="loyalty-fiscal-row">
						<span>Оплата бонусами (зачет баллов):</span>
						<strong style={{ color: "var(--teal)" }}>
							-
							{(
								redemptionCalc.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop / 100
							).toLocaleString("ru-RU")}{" "}
							₽
						</strong>
					</div>
					<div className="loyalty-fiscal-row highlight">
						<span>К доплате пациентом:</span>
						<span style={{ fontSize: "1.125rem", fontWeight: 800 }}>
							{redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				<div style={{ marginTop: "1rem", textAlign: "right" }}>
					<button
						type="button"
						onClick={onExecuteRedemption}
						data-testid="loyalty-execute-redemption-btn"
						style={{
							padding: "0.75rem 1.75rem",
							minHeight: "44px",
							borderRadius: "0.625rem",
							border: "none",
							background: "var(--teal)",
							color: "var(--on-teal, var(--paper))",
							fontSize: "0.9375rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.5rem",
						}}
					>
						<Check size={18} />
						Применить списание бонусов ({redemptionCalc.actualRedeemedPointsRub} ₽)
					</button>
				</div>
			</div>
		</div>
	);
};
