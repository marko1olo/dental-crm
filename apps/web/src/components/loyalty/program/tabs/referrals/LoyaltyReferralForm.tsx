import type React from "react";
import { UserPlus } from "lucide-react";

export interface LoyaltyReferralFormProps {
	readonly newReferralName: string;
	readonly onNewReferralNameChange: (name: string) => void;
	readonly newReferralPhone: string;
	readonly onNewReferralPhoneChange: (phone: string) => void;
	readonly newReferralNote: string;
	readonly onNewReferralNoteChange: (note: string) => void;
	readonly onAddReferral: () => void;
}

const inputStyle: React.CSSProperties = {
	width: "100%",
	padding: "0.5rem 0.75rem",
	borderRadius: "0.5rem",
	border: "1px solid var(--line)",
	fontSize: "0.875rem",
	background: "var(--paper)",
	color: "var(--ink)",
};

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: "0.8125rem",
	fontWeight: 600,
	color: "var(--muted)",
	marginBottom: "0.25rem",
};

export const LoyaltyReferralForm: React.FC<LoyaltyReferralFormProps> = ({
	newReferralName,
	onNewReferralNameChange,
	newReferralPhone,
	onNewReferralPhoneChange,
	newReferralNote,
	onNewReferralNoteChange,
	onAddReferral,
}) => {
	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "0.5rem",
				padding: "1rem",
				marginBottom: "1.5rem",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				gap: "0.75rem",
				alignItems: "flex-end",
			}}
		>
			<div>
				<label style={labelStyle}>ФИО приглашенного друга / родственника *</label>
				<input
					type="text"
					placeholder="Например: Смирнов Алексей"
					value={newReferralName}
					onChange={(e) => onNewReferralNameChange(e.target.value)}
					data-testid="referral-name-input"
					style={inputStyle}
				/>
			</div>

			<div>
				<label style={labelStyle}>Телефон (для сопоставления)</label>
				<input
					type="tel"
					placeholder="+7 (999) 000-00-00"
					value={newReferralPhone}
					onChange={(e) => onNewReferralPhoneChange(e.target.value)}
					data-testid="referral-phone-input"
					style={inputStyle}
				/>
			</div>

			<div>
				<label style={labelStyle}>Заметка / Причина обращения</label>
				<input
					type="text"
					placeholder="Например: Профгигиена / острая боль"
					value={newReferralNote}
					onChange={(e) => onNewReferralNoteChange(e.target.value)}
					data-testid="referral-note-input"
					style={inputStyle}
				/>
			</div>

			<div>
				<button
					type="button"
					onClick={onAddReferral}
					data-testid="add-referral-btn"
					style={{
						width: "100%",
						padding: "0.5rem 1rem",
						minHeight: "40px",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontWeight: 700,
						fontSize: "0.875rem",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.375rem",
					}}
				>
					<UserPlus size={16} />
					Зафиксировать рекомендацию
				</button>
			</div>
		</div>
	);
};
