import React from "react";
import { FamilyAddMemberFields } from "./FamilyAddMemberFields";

export interface FamilyAddMemberFormProps {
	readonly newFullName: string;
	readonly setNewFullName: (val: string) => void;
	readonly newRelationship: string;
	readonly setNewRelationship: (val: string) => void;
	readonly newBirthDate: string;
	readonly setNewBirthDate: (val: string) => void;
	readonly newPhone: string;
	readonly setNewPhone: (val: string) => void;
	readonly newCardNumber: string;
	readonly setNewCardNumber: (val: string) => void;
	readonly newAllowSpend: boolean;
	readonly setNewAllowSpend: (val: boolean) => void;
	readonly newAllowBooking: boolean;
	readonly setNewAllowBooking: (val: boolean) => void;
	readonly cardPlaceholder: string;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly onCancel: () => void;
}

export const FamilyAddMemberForm: React.FC<FamilyAddMemberFormProps> = ({
	newFullName,
	setNewFullName,
	newRelationship,
	setNewRelationship,
	newBirthDate,
	setNewBirthDate,
	newPhone,
	setNewPhone,
	newCardNumber,
	setNewCardNumber,
	newAllowSpend,
	setNewAllowSpend,
	newAllowBooking,
	setNewAllowBooking,
	cardPlaceholder,
	onSubmit,
	onCancel,
}) => {
	return (
		<form
			onSubmit={onSubmit}
			data-testid="form-add-family-member"
			style={{
				background: "var(--pc-surface, #ffffff)",
				border: "1px solid var(--pc-primary, #0284c7)",
				borderRadius: "10px",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				boxShadow: "0 2px 10px rgba(2, 132, 199, 0.08)",
			}}
		>
			<strong style={{ fontSize: "0.9375rem", color: "var(--pc-text-main, #0f172a)" }}>
				Новый член семьи
			</strong>

			<FamilyAddMemberFields
				newFullName={newFullName}
				setNewFullName={setNewFullName}
				newRelationship={newRelationship}
				setNewRelationship={setNewRelationship}
				newBirthDate={newBirthDate}
				setNewBirthDate={setNewBirthDate}
				newPhone={newPhone}
				setNewPhone={setNewPhone}
				newCardNumber={newCardNumber}
				setNewCardNumber={setNewCardNumber}
				cardPlaceholder={cardPlaceholder}
			/>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "4px" }}>
				<label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", cursor: "pointer", minHeight: "36px" }}>
					<input type="checkbox" checked={newAllowSpend} onChange={(e) => setNewAllowSpend(e.target.checked)} />
					<span>Разрешить списание с общего баланса</span>
				</label>
				<label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", cursor: "pointer", minHeight: "36px" }}>
					<input type="checkbox" checked={newAllowBooking} onChange={(e) => setNewAllowBooking(e.target.checked)} />
					<span>Разрешить онлайн-запись</span>
				</label>
			</div>

			<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
				<button type="button" className="pc-btn-secondary" onClick={onCancel} style={{ minHeight: "44px", padding: "8px 16px", fontSize: "0.8125rem" }}>
					Отмена
				</button>
				<button type="submit" className="pc-btn-primary" style={{ minHeight: "44px", padding: "8px 18px", fontSize: "0.8125rem", fontWeight: 600 }}>
					Добавить в семью
				</button>
			</div>
		</form>
	);
};
