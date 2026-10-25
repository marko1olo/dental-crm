import type React from "react";
import { CreditCard } from "lucide-react";
import type { FamilyMember } from "../../loyaltyEngine";

export interface LoyaltyFamilyMemberCardProps {
	readonly member: FamilyMember;
	readonly onSelectMemberForPayment: (memberId: string) => void;
	readonly onToggleMemberPermission: (memberId: string) => void;
}

export const LoyaltyFamilyMemberCard: React.FC<LoyaltyFamilyMemberCardProps> = ({
	member,
	onSelectMemberForPayment,
	onToggleMemberPermission,
}) => {
	return (
		<div className="loyalty-family-member-card">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div>
					<span className="loyalty-member-role-badge">{member.roleRu}</span>
					<h5
						style={{
							fontSize: "0.9375rem",
							fontWeight: 700,
							marginTop: "0.25rem",
							color: "var(--ink)",
						}}
					>
						{member.fullName}
					</h5>
				</div>
			</div>

			<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
				Личные траты: {(member.lifetimeSpentKop / 100).toLocaleString("ru-RU")} ₽
				<br />
				Накоплено баллов: {member.individualPointsBalance} ₽
			</div>

			<button
				type="button"
				onClick={() => onSelectMemberForPayment(member.patientId)}
				style={{
					marginTop: "0.5rem",
					marginBottom: "0.5rem",
					width: "100%",
					padding: "0.375rem 0.5rem",
					minHeight: "36px",
					borderRadius: "0.375rem",
					border: "1px solid var(--teal)",
					background: "transparent",
					color: "var(--teal)",
					fontSize: "0.75rem",
					fontWeight: 700,
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "0.25rem",
				}}
			>
				<CreditCard size={14} />
				Оплатить лечение из семейного счета
			</button>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderTop: "1px solid var(--line)",
					paddingTop: "0.5rem",
					marginTop: "auto",
				}}
			>
				<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
					Списание бонусов:
				</span>
				<button
					type="button"
					onClick={() => onToggleMemberPermission(member.patientId)}
					style={{
						fontSize: "0.75rem",
						fontWeight: 700,
						minHeight: "44px",
						padding: "0.25rem 0.625rem",
						borderRadius: "0.375rem",
						border: "none",
						cursor: "pointer",
						background: member.isBonusSpendingAllowed
							? "rgba(16, 185, 129, 0.15)"
							: "rgba(239, 68, 68, 0.15)",
						color: member.isBonusSpendingAllowed ? "var(--ok-fg)" : "var(--bad-fg)",
					}}
				>
					{member.isBonusSpendingAllowed ? "Разрешено" : "Заблокировано"}
				</button>
			</div>
		</div>
	);
};
