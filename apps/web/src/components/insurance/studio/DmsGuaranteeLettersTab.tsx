import React from "react";
import { Plus } from "lucide-react";

export interface DmsGuaranteeLettersTabProps {
	readonly availableInsurers: ReadonlyArray<{ id: string; shortNameRu: string }>;
	readonly selectedInsurerId: string;
	readonly onSelectInsurerId: (id: string) => void;
	readonly newLetterNumber: string;
	readonly onChangeNewLetterNumber: (num: string) => void;
	readonly newLetterLimitRub: number;
	readonly onChangeNewLetterLimitRub: (limit: number) => void;
	readonly onAddLetter: () => void;
}

export const DmsGuaranteeLettersTab: React.FC<DmsGuaranteeLettersTabProps> = ({
	availableInsurers,
	selectedInsurerId,
	onSelectInsurerId,
	newLetterNumber,
	onChangeNewLetterNumber,
	newLetterLimitRub,
	onChangeNewLetterLimitRub,
	onAddLetter,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<div
				style={{
					fontSize: "13px",
					fontWeight: 700,
					color: "var(--ink, #0f172a)",
				}}
			>
				Выберите страховую компанию РФ:
			</div>
			<div className="dms-chips-bar">
				{availableInsurers.map((ins) => (
					<button
						key={ins.id}
						type="button"
						onClick={() => onSelectInsurerId(ins.id)}
						className={`dms-chip-btn ${selectedInsurerId === ins.id ? "dms-chip-btn-active" : ""}`}
					>
						{ins.shortNameRu}
					</button>
				))}
			</div>

			<div className="dms-form-card">
				<div
					style={{
						fontSize: "14px",
						fontWeight: 700,
						color: "var(--ink, #0f172a)",
					}}
				>
					Прикрепить новое гарантийное письмо
				</div>
				<div className="dms-form-grid">
					<div>
						<label className="dms-form-label">Номер гарантийного письма</label>
						<input
							type="text"
							value={newLetterNumber}
							onChange={(e) => onChangeNewLetterNumber(e.target.value)}
							className="dms-input"
						/>
					</div>
					<div>
						<label className="dms-form-label">Лимит покрытия (₽)</label>
						<input
							type="number"
							value={newLetterLimitRub}
							onChange={(e) =>
								onChangeNewLetterLimitRub(Number(e.target.value) || 0)
							}
							className="dms-input"
						/>
					</div>
				</div>
				<button
					type="button"
					onClick={onAddLetter}
					className="dms-btn-secondary dente-btn-secondary"
					style={{ alignSelf: "flex-start", minHeight: "44px" }}
				>
					<Plus size={16} /> Прикрепить гарантийное письмо
				</button>
			</div>
		</div>
	);
};

DmsGuaranteeLettersTab.displayName = "DmsGuaranteeLettersTab";
