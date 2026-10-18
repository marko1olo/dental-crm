import React from "react";

export interface DentalLabDrawerGeneralSectionProps {
	readonly formPatientName: string;
	readonly setFormPatientName: (val: string) => void;
	readonly formDoctorName: string;
	readonly setFormDoctorName: (val: string) => void;
	readonly formLabName: string;
	readonly setFormLabName: (val: string) => void;
	readonly formTechnicianName: string;
	readonly setFormTechnicianName: (val: string) => void;
}

export const DentalLabDrawerGeneralSection: React.FC<DentalLabDrawerGeneralSectionProps> = ({
	formPatientName,
	setFormPatientName,
	formDoctorName,
	setFormDoctorName,
	formLabName,
	setFormLabName,
	formTechnicianName,
	setFormTechnicianName,
}) => {
	return (
		<div className="space-y-2.5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<label className="font-semibold block mb-1">Пациент (ФИО):</label>
					<input
						type="text"
						required
						value={formPatientName}
						onChange={(e) => setFormPatientName(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-patient-name-input"
					/>
				</div>
				<div>
					<label className="font-semibold block mb-1">Врач-ортопед:</label>
					<input
						type="text"
						required
						value={formDoctorName}
						onChange={(e) => setFormDoctorName(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-doctor-name-input"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<label className="font-semibold block mb-1">Лаборатория-партнёр:</label>
					<input
						type="text"
						placeholder="Основная лаборатория"
						value={formLabName}
						onChange={(e) => setFormLabName(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
					/>
				</div>
				<div>
					<label className="font-semibold block mb-1">Зубной техник:</label>
					<input
						type="text"
						placeholder="Опционально"
						value={formTechnicianName}
						onChange={(e) => setFormTechnicianName(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
					/>
				</div>
			</div>
		</div>
	);
};
