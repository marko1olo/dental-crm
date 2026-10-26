import React from "react";

interface Props {
	patientName: string;
	tubeVolume: string;
	clinicRoom: string;
	onPatientNameChange: (val: string) => void;
	onTubeVolumeChange: (val: string) => void;
	onClinicRoomChange: (val: string) => void;
}

export const PrinterPrpForm: React.FC<Props> = ({
	patientName,
	tubeVolume,
	clinicRoom,
	onPatientNameChange,
	onTubeVolumeChange,
	onClinicRoomChange,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "12px",
			}}
		>
			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>ФИО пациента</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={patientName}
					onChange={(e) => onPatientNameChange(e.target.value)}
				/>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Тип и объем пробирки</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={tubeVolume}
					onChange={(e) => onTubeVolumeChange(e.target.value)}
				/>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Кабинет / Назначение</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={clinicRoom}
					onChange={(e) => onClinicRoomChange(e.target.value)}
				/>
			</div>
		</div>
	);
};
