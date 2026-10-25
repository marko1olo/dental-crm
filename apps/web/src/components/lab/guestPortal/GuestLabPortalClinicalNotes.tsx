import type React from "react";
import { AlignLeft } from "lucide-react";
import type { LabOrderData } from "./guestPortalTypes.js";

export interface GuestLabPortalClinicalNotesProps {
	readonly notes?: string | null | undefined;
}

export function GuestLabPortalClinicalNotes({ notes }: GuestLabPortalClinicalNotesProps): React.JSX.Element {
	return (
		<div>
			<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
				<AlignLeft size={16} /> Клинические заметки и указания врача
			</h3>
			<div
				style={{
					background: "var(--amber-soft)",
					padding: "16px",
					borderRadius: "8px",
					color: "var(--text-primary)",
					minHeight: "100px",
					border: "1px solid var(--amber)",
				}}
			>
				{notes ? (
					<p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap" }}>
						{notes}
					</p>
				) : (
					<p style={{ margin: 0, fontSize: "14px", fontStyle: "italic", opacity: 0.8 }}>
						Врач не оставил комментариев.
					</p>
				)}
			</div>
		</div>
	);
}
