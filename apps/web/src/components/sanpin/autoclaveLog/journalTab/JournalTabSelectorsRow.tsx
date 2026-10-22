import React from "react";
import { Search } from "lucide-react";
import { STATUTORY_STERILIZATION_REGIMES, STATUTORY_STERILIZERS_CATALOG } from "../autoclaveLogPresets.js";

export interface JournalTabSelectorsRowProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly selectedSterilizerId: string;
	readonly onSterilizerChange: (id: string) => void;
	readonly selectedRegimeId: string;
	readonly onRegimeChange: (id: string) => void;
	readonly selectedStatus: "all" | "sterile_passed" | "rejected_defect";
	readonly onStatusChange: (s: "all" | "sterile_passed" | "rejected_defect") => void;
}

export const JournalTabSelectorsRow: React.FC<JournalTabSelectorsRowProps> = ({
	searchQuery, onSearchChange, selectedSterilizerId, onSterilizerChange,
	selectedRegimeId, onRegimeChange, selectedStatus, onStatusChange,
}) => (
	<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
		<div style={{ position: "relative", minWidth: "220px", flex: "2 1 240px" }}>
			<input
				type="text"
				placeholder="Поиск по изделиям, ID, сотруднику..."
				className="autoclave-input"
				style={{ paddingLeft: "2.25rem", width: "100%", minHeight: "40px" }}
				value={searchQuery}
				onChange={(e) => onSearchChange(e.target.value)}
			/>
			<Search size={16} color="var(--muted, #64748b)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
		</div>
		<select className="autoclave-select" style={{ minHeight: "40px", flex: "1 1 180px", minWidth: "160px" }} value={selectedSterilizerId} onChange={(e) => onSterilizerChange(e.target.value)}>
			<option value="all">Все аппараты ЦСО</option>
			{STATUTORY_STERILIZERS_CATALOG.map((st) => (
				<option key={st.id} value={st.id}>{st.code} — {st.brand}</option>
			))}
		</select>
		<select className="autoclave-select" style={{ minHeight: "40px", flex: "1 1 160px", minWidth: "140px" }} value={selectedRegimeId} onChange={(e) => onRegimeChange(e.target.value)}>
			<option value="all">Все режимы</option>
			{STATUTORY_STERILIZATION_REGIMES.map((reg) => (
				<option key={reg.id} value={reg.id}>{reg.shortLabelRu}</option>
			))}
		</select>
		<select className="autoclave-select" style={{ minHeight: "40px", flex: "1 1 130px", minWidth: "120px" }} value={selectedStatus} onChange={(e) => onStatusChange(e.target.value as any)}>
			<option value="all">Все статусы</option>
			<option value="sterile_passed">Стерильно</option>
			<option value="rejected_defect">Брак</option>
		</select>
	</div>
);
