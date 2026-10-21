/**
 * DENTE Dental CRM — Lead Form Input Fields
 * Fast 10-Second Intake from Call: Name, Phone, Source, Revenue, Notes, Status
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { LeadFormContactFields } from "./LeadFormContactFields";
import { LeadFormDetailsFields } from "./LeadFormDetailsFields";
import { LeadFormStatusFields } from "./LeadFormStatusFields";

interface LeadFormFieldsProps {
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	borderColor: string;
	colBg: string;
}

export const LeadFormFields: React.FC<LeadFormFieldsProps> = ({
	editForm,
	setEditForm,
	borderColor,
	colBg,
}) => {
	const fieldStyle: React.CSSProperties = {
		padding: 10,
		borderRadius: 8,
		border: `1px solid ${borderColor}`,
		background: colBg,
		color: "var(--ink)",
	};
	const rowStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "column",
		gap: 6,
	};

	return (
		<>
			<LeadFormContactFields
				editForm={editForm}
				setEditForm={setEditForm}
				fieldStyle={fieldStyle}
				rowStyle={rowStyle}
				borderColor={borderColor}
			/>
			<LeadFormDetailsFields
				editForm={editForm}
				setEditForm={setEditForm}
				fieldStyle={fieldStyle}
				rowStyle={rowStyle}
				borderColor={borderColor}
			/>
			<LeadFormStatusFields
				editForm={editForm}
				setEditForm={setEditForm}
				fieldStyle={fieldStyle}
				rowStyle={rowStyle}
			/>
		</>
	);
};
