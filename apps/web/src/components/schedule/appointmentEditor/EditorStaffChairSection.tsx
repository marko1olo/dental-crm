import React from "react";
import type { AppointmentCardEditorProps } from "./types";

export function EditorStaffChairSection({
	appointment,
	dashboard,
	appointmentDraft,
	activeAssistants,
	activeChairs,
	updateAppointmentScheduleDraft,
}: Pick<
	AppointmentCardEditorProps,
	| "appointment"
	| "dashboard"
	| "appointmentDraft"
	| "activeAssistants"
	| "activeChairs"
	| "updateAppointmentScheduleDraft"
>) {
	const showAssistant =
		dashboard?.clinicSettings?.profile?.mode !== "one_chair" &&
		activeAssistants.length > 0;

	return (
		<>
			{showAssistant && (
				<div className="min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">Ассистент</span>
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{activeAssistants.map((member) => (
							<button
								key={member.id}
								type="button"
								className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.assistantUserId === member.id ? "active" : ""}`}
								title={member.fullName}
								onClick={() =>
									updateAppointmentScheduleDraft(
										appointment.id,
										"assistantUserId",
										appointmentDraft.assistantUserId === member.id ? "" : member.id,
									)
								}
							>
								<span className="truncate">{member.fullName}</span>
							</button>
						))}
					</div>
				</div>
			)}

			<div className="min-w-0">
				<span className="text-xs font-semibold text-[var(--muted)] block mb-2">Кресло</span>
				<div className="flex flex-wrap gap-1.5 min-w-0">
					{activeChairs.map((chair) => (
						<button
							key={chair.id}
							type="button"
							className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.chairId === chair.id ? "active" : ""}`}
							title={chair.name}
							onClick={() => updateAppointmentScheduleDraft(appointment.id, "chairId", chair.id)}
						>
							<span className="truncate">{chair.name}</span>
						</button>
					))}
				</div>
			</div>
		</>
	);
}
