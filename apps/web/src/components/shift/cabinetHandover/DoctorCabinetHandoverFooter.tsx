import React from "react";
import { CheckCircle2, DoorOpen } from "lucide-react";

export interface DoctorCabinetHandoverFooterProps {
	readonly handoverNote: string;
	readonly isSubmitted: boolean;
	readonly onChangeNote: (note: string) => void;
	readonly onSubmitHandover: () => void;
}

export const DoctorCabinetHandoverFooter: React.FC<DoctorCabinetHandoverFooterProps> = ({
	handoverNote,
	isSubmitted,
	onChangeNote,
	onSubmitHandover,
}) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "12px",
			flexWrap: "wrap",
			paddingTop: "6px",
			borderTop: "1px solid var(--line)",
		}}
	>
		<div style={{ flex: 1, minWidth: "220px" }}>
			<label htmlFor="handover-note-input" className="sr-only">
				Заметка сменщику
			</label>
			<input
				id="handover-note-input"
				type="text"
				value={handoverNote}
				onChange={(e) => onChangeNote(e.target.value)}
				placeholder="Примечание сменщику (например: стерильные боры в правом лотке)..."
				className="dente-input"
				style={{
					fontSize: "12px",
					padding: "5px 10px",
					height: "36px",
					width: "100%",
					borderRadius: "8px",
				}}
			/>
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
			<button
				type="button"
				onClick={onSubmitHandover}
				className={`primary-button ${isSubmitted ? "secondary-button" : ""}`}
				style={{
					fontSize: "13px",
					padding: "0 16px",
					minHeight: "36px",
					height: "36px",
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
				}}
				title="Зафиксировать передачу кабинета"
				data-testid="btn-submit-cabinet-handover"
			>
				{isSubmitted ? (
					<>
						<CheckCircle2 size={14} className="text-emerald-600" />
						<span>Кабинет передан</span>
					</>
				) : (
					<>
						<DoorOpen size={14} />
						<span>Подтвердить сдачу кабинета</span>
					</>
				)}
			</button>
		</div>
	</div>
);
