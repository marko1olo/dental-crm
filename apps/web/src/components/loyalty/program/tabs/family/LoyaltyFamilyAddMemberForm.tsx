import type React from "react";
import { Plus } from "lucide-react";
import type { FamilyMember } from "../../loyaltyEngine";

export interface LoyaltyFamilyAddMemberFormProps {
	readonly newMemberName: string;
	readonly onNewMemberNameChange: (name: string) => void;
	readonly newMemberRole: FamilyMember["roleRu"];
	readonly onNewMemberRoleChange: (role: FamilyMember["roleRu"]) => void;
	readonly onAddFamilyMember: () => void;
}

export const LoyaltyFamilyAddMemberForm: React.FC<LoyaltyFamilyAddMemberFormProps> = ({
	newMemberName,
	onNewMemberNameChange,
	newMemberRole,
	onNewMemberRoleChange,
	onAddFamilyMember,
}) => {
	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "0.5rem",
				padding: "0.75rem 1rem",
				marginTop: "1rem",
				display: "flex",
				gap: "0.75rem",
				alignItems: "flex-end",
				flexWrap: "wrap",
			}}
		>
			<div style={{ flex: 2, minWidth: "200px" }}>
				<label
					style={{
						display: "block",
						fontSize: "0.8125rem",
						fontWeight: 600,
						color: "var(--muted)",
						marginBottom: "0.25rem",
					}}
				>
					ФИО родственника
				</label>
				<input
					type="text"
					placeholder="Например: Воронова Анна Михайловна"
					value={newMemberName}
					onChange={(e) => onNewMemberNameChange(e.target.value)}
					style={{
						width: "100%",
						padding: "0.5rem 0.75rem",
						borderRadius: "0.5rem",
						border: "1px solid var(--line)",
						fontSize: "0.875rem",
					}}
				/>
			</div>

			<div style={{ flex: 1, minWidth: "160px" }}>
				<label
					style={{
						display: "block",
						fontSize: "0.8125rem",
						fontWeight: 600,
						color: "var(--muted)",
						marginBottom: "0.25rem",
					}}
				>
					Роль в семье
				</label>
				<select
					value={newMemberRole}
					onChange={(e) =>
						onNewMemberRoleChange(e.target.value as FamilyMember["roleRu"])
					}
					style={{
						width: "100%",
						padding: "0.5rem 0.75rem",
						borderRadius: "0.5rem",
						border: "1px solid var(--line)",
						fontSize: "0.875rem",
						background: "var(--paper)",
					}}
				>
					<option value="Супруг / Супруга">Супруг / Супруга</option>
					<option value="Ребенок">Ребенок</option>
					<option value="Родитель">Родитель</option>
					<option value="Родственник">Родственник</option>
				</select>
			</div>

			<button
				type="button"
				onClick={onAddFamilyMember}
				style={{
					padding: "0.5rem 1.25rem",
					minHeight: "44px",
					borderRadius: "0.5rem",
					border: "none",
					background: "var(--teal)",
					color: "var(--on-teal, var(--paper))",
					fontWeight: 700,
					fontSize: "0.875rem",
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "0.375rem",
				}}
			>
				<Plus size={16} />
				Добавить в семейный пул
			</button>
		</div>
	);
};
