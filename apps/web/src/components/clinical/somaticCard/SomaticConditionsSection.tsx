import { Activity, Check } from "lucide-react";
import React from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticConditionsSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly setProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	readonly onToggle: (key: keyof PatientClinicalSafetyProfile) => void;
}

export const SomaticConditionsSection: React.FC<SomaticConditionsSectionProps> = ({
	profile,
	setProfile,
	onToggle,
}) => {
	const isPregnancyActive = profile.pregnancyTrimester !== "none";

	return (
		<div className="space-y-2">
			<span className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
				<Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
				Диабет, астма, беременность
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<button
					type="button"
					data-testid="toggle-diabetes"
					onClick={() => onToggle("hasDiabetesMellitus")}
					className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
						profile.hasDiabetesMellitus
							? "bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--ink)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Сахарный диабет (риск замедленной эпителизации и инфекций)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasDiabetesMellitus
								? "bg-[var(--warning)] border-[var(--warning)] text-white"
								: "border-[var(--line-strong)]"
						}`}
					>
						{profile.hasDiabetesMellitus ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Сахарный диабет</span>
				</button>

				<button
					type="button"
					data-testid="toggle-asthma"
					onClick={() => onToggle("hasBronchialAsthma")}
					className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
						profile.hasBronchialAsthma
							? "bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--ink)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Бронхиальная астма (наличие ингалятора у пациента обязательно)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasBronchialAsthma
								? "bg-[var(--warning)] border-[var(--warning)] text-white"
								: "border-[var(--line-strong)]"
						}`}
					>
						{profile.hasBronchialAsthma ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Бронхиальная астма</span>
				</button>

				<div
					data-testid="toggle-pregnancy"
					className="flex flex-col gap-1.5 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] justify-between"
				>
					<div className="flex items-center justify-between gap-1">
						<span className="text-xs font-medium text-[var(--ink)] truncate">Беременность:</span>
						{isPregnancyActive ? (
							<span className="text-[10px] font-semibold text-[var(--primary)] px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]">
								{profile.pregnancyTrimester === "trimester_1" ? "1-й трим." : profile.pregnancyTrimester === "trimester_2" ? "2-й трим." : "3-й трим."}
							</span>
						) : (
							<span className="text-[10px] text-[var(--ink-muted)]">Нет</span>
						)}
					</div>
					<div className="p-1 bg-[var(--paper-soft)] rounded-lg border border-[var(--line)] flex items-center gap-1">
						{(
							[
								{ id: "none", label: "Нет" },
								{ id: "trimester_1", label: "1-й" },
								{ id: "trimester_2", label: "2-й" },
								{ id: "trimester_3", label: "3-й" },
							] as const
						).map((seg) => {
							const isSelected = profile.pregnancyTrimester === seg.id;
							return (
								<button
									key={seg.id}
									type="button"
									onClick={() =>
										setProfile((prev) => ({
											...prev,
											pregnancyTrimester: seg.id,
										}))
									}
									className={`flex-1 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-1.5 text-xs rounded-md transition-all font-medium inline-flex items-center justify-center cursor-pointer ${
										isSelected
											? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold border border-[var(--line)]"
											: "text-[var(--ink-muted)] hover:text-[var(--ink)] border border-transparent"
									}`}
								>
									{seg.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
