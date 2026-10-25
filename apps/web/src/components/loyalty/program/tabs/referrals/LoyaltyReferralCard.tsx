import type React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { PatientReferralRecord } from "../../loyaltyEngine";

export interface LoyaltyReferralCardProps {
	readonly referral: PatientReferralRecord;
	readonly onCreditReferral: (referralId: string) => void;
}

export const LoyaltyReferralCard: React.FC<LoyaltyReferralCardProps> = ({
	referral,
	onCreditReferral,
}) => {
	const displayName = referral.invitedPatientName || referral.referredPatientName || "Пациент";
	const displayPhone = referral.invitedPatientPhone || referral.referredPatientPhone;

	return (
		<div
			className="loyalty-referral-card"
			data-testid={`referral-card-${referral.id}`}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div>
					<span
						className={`loyalty-referral-status-badge ${
							referral.isRewardCredited ? "credited" : "registered"
						}`}
					>
						{referral.isRewardCredited ? "Бонус начислен (500 ₽)" : "Зарегистрирован"}
					</span>
					<h5
						style={{
							fontSize: "0.9375rem",
							fontWeight: 700,
							marginTop: "0.375rem",
							color: "var(--ink)",
						}}
					>
						{displayName}
					</h5>
					{displayPhone && (
						<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
							тел. {displayPhone}
						</div>
					)}
				</div>
			</div>

			<div
				style={{
					fontSize: "0.8125rem",
					color: "var(--muted)",
					marginTop: "0.5rem",
				}}
			>
				{referral.noteRu || "Рекомендация пациента"}
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderTop: "1px solid var(--line)",
					paddingTop: "0.625rem",
					marginTop: "0.75rem",
				}}
			>
				<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
					Вознаграждение:
				</span>
				{referral.isRewardCredited ? (
					<span
						style={{
							fontSize: "0.75rem",
							fontWeight: 700,
							color: "var(--ok-fg)",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.25rem",
						}}
					>
						<CheckCircle2 size={14} />
						+500 ₽ зачислено
					</span>
				) : (
					<button
						type="button"
						onClick={() => onCreditReferral(referral.id)}
						data-testid={`credit-referral-btn-${referral.id}`}
						style={{
							padding: "0.375rem 0.75rem",
							minHeight: "36px",
							borderRadius: "0.375rem",
							border: "none",
							background: "var(--teal)",
							color: "var(--on-teal, var(--paper))",
							fontSize: "0.75rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.25rem",
						}}
					>
						<Sparkles size={13} />
						Начислить 500 ₽ бонусов
					</button>
				)}
			</div>
		</div>
	);
};
