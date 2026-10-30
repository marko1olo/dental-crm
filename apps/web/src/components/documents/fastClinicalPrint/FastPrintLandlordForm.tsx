import React from "react";
import type { FastPrintClinicInfo } from "./types";

export function FastPrintLandlordForm({
	effectiveClinic,
	setCustomClinic,
}: {
	effectiveClinic: FastPrintClinicInfo;
	setCustomClinic: React.Dispatch<React.SetStateAction<FastPrintClinicInfo>>;
}): React.JSX.Element {
	return (
		<div
			className="fast-print-landlord-drawer fast-print-no-print"
			data-testid="landlord-override-drawer"
		>
			<div className="fast-print-landlord-grid">
				<div className="fast-print-field">
					<label className="fast-print-field-label">
						Название клиники в шапке карты
					</label>
					<input
						type="text"
						data-testid="input-landlord-name"
						value={effectiveClinic.name || ""}
						onChange={(e) =>
							setCustomClinic((prev) => ({ ...prev, name: e.target.value }))
						}
						className="fast-print-input"
					/>
				</div>
				<div className="fast-print-field">
					<label className="fast-print-field-label">ИНН организации</label>
					<input
						type="text"
						data-testid="input-landlord-inn"
						value={effectiveClinic.inn || ""}
						onChange={(e) =>
							setCustomClinic((prev) => ({ ...prev, inn: e.target.value }))
						}
						className="fast-print-input"
					/>
				</div>
				<div className="fast-print-field">
					<label className="fast-print-field-label">
						Номер медицинской лицензии
					</label>
					<input
						type="text"
						data-testid="input-landlord-license"
						value={effectiveClinic.licenseNumber || ""}
						onChange={(e) =>
							setCustomClinic((prev) => ({
								...prev,
								licenseNumber: e.target.value,
							}))
						}
						className="fast-print-input"
					/>
				</div>
			</div>
		</div>
	);
}
