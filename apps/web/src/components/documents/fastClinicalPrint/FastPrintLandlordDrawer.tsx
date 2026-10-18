import React from "react";
import { Building2, ChevronDown, ChevronUp, FileText, Scissors } from "lucide-react";
import type { FastPrintClinicInfo } from "./types";
import type { InsertCutLayout } from "../partisanMedicalInsertTemplate";

interface FastPrintLandlordDrawerProps {
	readonly cutLayout: InsertCutLayout;
	readonly setCutLayout: (layout: InsertCutLayout) => void;
	readonly showLandlordEdit: boolean;
	readonly setShowLandlordEdit: (val: boolean) => void;
	readonly effectiveClinic: FastPrintClinicInfo;
	readonly setCustomClinic: React.Dispatch<React.SetStateAction<FastPrintClinicInfo>>;
}

export const FastPrintLandlordDrawer: React.FC<FastPrintLandlordDrawerProps> = ({
	cutLayout,
	setCutLayout,
	showLandlordEdit,
	setShowLandlordEdit,
	effectiveClinic,
	setCustomClinic,
}) => (
	<>
		<div className="fast-print-subbar fast-print-no-print">
			<div className="fast-print-format-group">
				<span className="fast-print-subbar-label">Формат:</span>
				<div className="fast-print-format-pills">
					<button
						type="button"
						data-testid="btn-format-a4-cut"
						onClick={() => setCutLayout("a4_cut")}
						className={`fast-print-pill-btn ${cutLayout === "a4_cut" ? "active" : ""}`}
					>
						<Scissors size={12} />
						<span>А4 с отрезом</span>
					</button>
					<button
						type="button"
						data-testid="btn-format-a5-direct"
						onClick={() => setCutLayout("a5_direct")}
						className={`fast-print-pill-btn ${cutLayout === "a5_direct" ? "active" : ""}`}
					>
						<FileText size={12} />
						<span>А5 вклейка</span>
					</button>
				</div>
			</div>

			<button
				type="button"
				data-testid="btn-toggle-landlord-override"
				onClick={() => setShowLandlordEdit(!showLandlordEdit)}
				className="fast-print-landlord-btn"
			>
				<Building2 size={13} className="fast-print-brand-icon" />
				<span>Клиника-арендодатель</span>
				{showLandlordEdit ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
			</button>
		</div>

		{showLandlordEdit && (
			<div className="fast-print-landlord-drawer fast-print-no-print" data-testid="landlord-override-drawer">
				<div className="fast-print-landlord-grid">
					<div className="fast-print-field">
						<label className="fast-print-field-label">Название клиники в шапке карты</label>
						<input
							type="text"
							data-testid="input-landlord-name"
							value={effectiveClinic.name || ""}
							onChange={(e) => setCustomClinic((prev) => ({ ...prev, name: e.target.value }))}
							className="fast-print-input"
						/>
					</div>
					<div className="fast-print-field">
						<label className="fast-print-field-label">ИНН организации</label>
						<input
							type="text"
							data-testid="input-landlord-inn"
							value={effectiveClinic.inn || ""}
							onChange={(e) => setCustomClinic((prev) => ({ ...prev, inn: e.target.value }))}
							className="fast-print-input"
						/>
					</div>
					<div className="fast-print-field">
						<label className="fast-print-field-label">Номер медицинской лицензии</label>
						<input
							type="text"
							data-testid="input-landlord-license"
							value={effectiveClinic.licenseNumber || ""}
							onChange={(e) => setCustomClinic((prev) => ({ ...prev, licenseNumber: e.target.value }))}
							className="fast-print-input"
						/>
					</div>
				</div>
			</div>
		)}
	</>
);
