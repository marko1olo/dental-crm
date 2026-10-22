import type React from "react";

export interface ClinicalWriteoffPassportBarProps {
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly selectedCabinetId: string;
	readonly onCabinetChange: (cabinetId: string) => void;
	readonly actNumber: string;
	readonly onActNumberChange: (actNum: string) => void;
	readonly actDate: string;
	readonly onActDateChange: (date: string) => void;
}

export const ClinicalWriteoffPassportBar: React.FC<ClinicalWriteoffPassportBarProps> = ({
	patientName,
	patientId,
	doctorFullName,
	doctorSpecialty,
	selectedCabinetId,
	onCabinetChange,
	actNumber,
	onActNumberChange,
	actDate,
	onActDateChange,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
			<div>
				<span className="text-xs font-semibold text-muted block mb-1">Пациент</span>
				<div className="font-bold text-sm text-ink">{patientName}</div>
				<div className="text-xs text-muted">ID: {patientId}</div>
			</div>

			<div>
				<span className="text-xs font-semibold text-muted block mb-1">Лечащий врач</span>
				<div className="font-bold text-sm text-ink">{doctorFullName}</div>
				<div className="text-xs text-muted">{doctorSpecialty}</div>
			</div>

			<div>
				<label htmlFor="cw-cabinet-select" className="text-xs font-semibold text-muted block mb-1">
					Кабинет списания (Кресло)
				</label>
				<select
					id="cw-cabinet-select"
					value={selectedCabinetId}
					onChange={(e) => onCabinetChange(e.target.value)}
					className="w-full min-h-[44px] px-2.5 rounded-lg border border-line bg-paper text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
				>
					<option value="cab_01_therapy">Кабинет №1 (Терапия)</option>
					<option value="cab_02_surgery">Кабинет №2 (Хирургия)</option>
				</select>
			</div>

			<div>
				<span className="text-xs font-semibold text-muted block mb-1">№ Акта и Дата</span>
				<div className="flex gap-1.5">
					<input
						type="text"
						value={actNumber}
						onChange={(e) => onActNumberChange(e.target.value)}
						className="flex-1 min-h-[44px] px-2 rounded-lg border border-line bg-paper text-ink text-xs font-mono font-bold"
					/>
					<input
						type="date"
						value={actDate}
						onChange={(e) => onActDateChange(e.target.value)}
						className="w-32 min-h-[44px] px-1.5 rounded-lg border border-line bg-paper text-ink text-xs"
					/>
				</div>
			</div>
		</div>
	);
};
