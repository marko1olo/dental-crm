import React from "react";
import { RELATIONSHIP_OPTIONS } from "./familyConstants";

export interface FamilyAddMemberFieldsProps {
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
	readonly cardPlaceholder: string;
}

export const FamilyAddMemberFields: React.FC<FamilyAddMemberFieldsProps> = ({
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
	cardPlaceholder,
}) => {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-main, #334155)" }}>
					ФИО родственника *
				</label>
				<input
					type="text"
					value={newFullName}
					onChange={(e) => setNewFullName(e.target.value)}
					placeholder="Фамилия Имя Отчество"
					required
					style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
				/>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-main, #334155)" }}>
					Степень родства *
				</label>
				<select
					value={newRelationship}
					onChange={(e) => setNewRelationship(e.target.value)}
					style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
				>
					{RELATIONSHIP_OPTIONS.map((rel) => (
						<option key={rel} value={rel}>{rel}</option>
					))}
				</select>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>
					Дата рождения
				</label>
				<input
					type="date"
					value={newBirthDate}
					onChange={(e) => setNewBirthDate(e.target.value)}
					style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
				/>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>
					Телефон (для уведомлений)
				</label>
				<input
					type="tel"
					value={newPhone}
					onChange={(e) => setNewPhone(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
				/>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>
					Номер медицинской карты (если уже оформлена)
				</label>
				<input
					type="text"
					value={newCardNumber}
					onChange={(e) => setNewCardNumber(e.target.value)}
					placeholder={cardPlaceholder}
					style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
				/>
			</div>
		</div>
	);
};
