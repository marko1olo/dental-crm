import type React from "react";
import { Users } from "lucide-react";
import type { FamilyMember, FamilyPoolResult } from "../../loyaltyEngine";

export interface LoyaltyFamilySelectorBarProps {
	readonly familyMembers: readonly FamilyMember[];
	readonly selectedFamilyMemberId: string;
	readonly onSelectFamilyMemberId: (id: string) => void;
	readonly patientName: string;
	readonly activePointsBalance: number;
	readonly familyPool: FamilyPoolResult;
}

export const LoyaltyFamilySelectorBar: React.FC<LoyaltyFamilySelectorBarProps> = ({
	familyMembers,
	selectedFamilyMemberId,
	onSelectFamilyMemberId,
	patientName,
	activePointsBalance,
	familyPool,
}) => {
	if (familyMembers.length === 0) return null;

	return (
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
	);
};
