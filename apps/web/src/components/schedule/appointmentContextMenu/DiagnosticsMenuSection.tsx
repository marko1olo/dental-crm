import React from "react";
import { Scan } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { usePatientStore } from "../../../store/patientStore";

export function DiagnosticsMenuSection({
	appointmentPatient,
	appointmentPatientName,
	onClose,
}: {
	appointmentPatient: any;
	appointmentPatientName: string;
	onClose: () => void;
}) {
	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Диагностика
			</div>
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
				role="menuitem"
				data-testid="appointment-open-cbct-radiology-btn"
				onClick={() => {
					onClose();
					if (typeof window !== "undefined") {
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
						}
						window.location.hash = "#radiology";
						showToast(`Открыты снимки и КТ пациента ${appointmentPatientName}`, "info");
					}
				}}
				title="Открыть рентген и 3D КТ (Клавиша X)"
			>
				<div className="flex items-center gap-2">
					<Scan size={14} className="text-[var(--teal)] shrink-0" />
					<span>КТ / Рентген снимки</span>
				</div>
				<span className="text-[10px] font-mono opacity-70">X</span>
			</button>
		</>
	);
}
