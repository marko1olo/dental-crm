/**
 * DENTE Dental CRM — Shift Staff & Chair Selector
 * Doctor, Optional Assistant & Chair Selection (Mandates 8e, 8n)
 */

import React from "react";
import { MEDICAL_STAFF_ROLES, type StaffMember } from "../../doctorShiftRosterPresets";
import type { FlatChairItem } from "../types";

export interface ShiftStaffSelectorProps {
	staffList: StaffMember[];
	flatChairsList: FlatChairItem[];
	selectedDocId: string;
	onSelectDocId: (docId: string) => void;
	selectedChairKey: string;
	onSelectChairKey: (chairKey: string) => void;
	selectedAssistantId?: string;
	onSelectAssistantId?: (asstId: string) => void;
}

export const ShiftStaffSelector: React.FC<ShiftStaffSelectorProps> = ({
	staffList,
	flatChairsList,
	selectedDocId,
	onSelectDocId,
	selectedChairKey,
	onSelectChairKey,
	selectedAssistantId = "",
	onSelectAssistantId,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div>
				<label
					htmlFor="popover-doctor-select"
					className="shift-editor-select-label"
				>
					Врач / Специалист
				</label>
				<select
					id="popover-doctor-select"
					data-testid="popover-doctor-select"
					value={selectedDocId}
					onChange={(e) => onSelectDocId(e.target.value)}
					className="shift-editor-select"
					style={{ minHeight: "44px" }}
				>
					{staffList
						.filter((s) => s.isDoctor)
						.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.fullName} ({MEDICAL_STAFF_ROLES[doc.role]?.nameRu || "Врач"})
							</option>
						))}
				</select>
			</div>

			{onSelectAssistantId && (
				<div>
					<label
						htmlFor="popover-assistant-select"
						className="shift-editor-select-label"
					>
						Ассистент (опционально)
					</label>
					<select
						id="popover-assistant-select"
						data-testid="popover-assistant-select"
						value={selectedAssistantId}
						onChange={(e) => onSelectAssistantId(e.target.value)}
						className="shift-editor-select"
						style={{ minHeight: "44px" }}
					>
						<option value="">-- Без ассистента (соло-приём) --</option>
						{staffList
							.filter((s) => s.isAssistant)
							.map((asst) => (
								<option key={asst.id} value={asst.id}>
									{asst.fullName}
								</option>
							))}
					</select>
				</div>
			)}

			<div>
				<label
					htmlFor="popover-chair-select"
					className="shift-editor-select-label"
				>
					Кабинет и Кресло
				</label>
				<select
					id="popover-chair-select"
					data-testid="popover-chair-select"
					value={selectedChairKey}
					onChange={(e) => onSelectChairKey(e.target.value)}
					className="shift-editor-select"
					style={{ minHeight: "44px" }}
				>
					{flatChairsList.map((item) => (
						<option
							key={`${item.cabinetId}::${item.chairId}`}
							value={`${item.cabinetId}::${item.chairId}`}
						>
							{item.cabinetName} — {item.chairName}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
