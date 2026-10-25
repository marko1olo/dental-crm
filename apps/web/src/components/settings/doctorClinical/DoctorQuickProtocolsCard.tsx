import { Check, FileText } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";
import { AVAILABLE_QUICK_PROTOCOLS } from "../doctorClinicalPreferencesConstants";

export function DoctorQuickProtocolsCard() {
	const quickProtocolIds = useDoctorPreferencesStore(
		(s) => s.preferences.quickProtocolIds || [],
	);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const handleProtocolToggle = (protocolId: string) => {
		const next = quickProtocolIds.includes(protocolId)
			? quickProtocolIds.filter((id) => id !== protocolId)
			: [...quickProtocolIds, protocolId];
		updatePreferences({ quickProtocolIds: next });
		showToast("Список быстрых протоколов обновлен", "info");
	};

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<FileText size={15} className="text-[var(--teal)]" />
					<span>Быстрые шаблоны дневников приёма</span>
				</label>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Отображаются в панели экспресс-шаблонов визита
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{AVAILABLE_QUICK_PROTOCOLS.map((p) => {
					const isChecked = quickProtocolIds.includes(p.id);
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => handleProtocolToggle(p.id)}
							className={`p-2.5 rounded-xl text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[36px] cursor-pointer ${
								isChecked
									? "bg-[var(--paper-card)] border-[var(--teal)] text-[var(--ink)] font-semibold shadow-2xs"
									: "bg-[var(--paper-card)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
							}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span
									className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
										isChecked
											? "bg-[var(--teal)] border-[var(--teal)] text-[var(--on-teal)]"
											: "border-[var(--line)]"
									}`}
								>
									{isChecked && <Check size={11} className="stroke-[3]" />}
								</span>
								<span className="truncate">{p.title}</span>
							</div>
							<span className="text-[10px] font-mono font-bold text-[var(--muted)] shrink-0 ml-1">
								{p.icd}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
