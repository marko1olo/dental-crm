import React from "react";
import { Baby, Activity } from "lucide-react";
import type { PatientClinicalSafetyProfile, PregnancyTrimester } from "../safetyMath";

export interface AnamnesisChronicAndPregnancySectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(key: K, value: PatientClinicalSafetyProfile[K]) => void;
}

export const AnamnesisChronicAndPregnancySection: React.FC<AnamnesisChronicAndPregnancySectionProps> = React.memo(({ profile, onUpdateField }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
			<div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
				<Activity size={16} className="text-indigo-500" />
				<span>Беременность, соматика и инфекционный статус</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="space-y-1">
					<label className="font-semibold text-[var(--muted)] flex items-center gap-1">
						<Baby size={13} />
						<span>Беременность / Лактация:</span>
					</label>
					<select
						value={profile.pregnancyTrimester || "none"}
						onChange={(e) => onUpdateField("pregnancyTrimester", e.target.value as PregnancyTrimester)}
						className="w-full border border-[var(--line)] bg-[var(--paper)] rounded-lg p-2 text-xs text-[var(--ink)]"
					>
						<option value="none">Нет беременности</option>
						<option value="trimester_1">1-й триместр (органогенез, запрет КТ/адреналина)</option>
						<option value="trimester_2">2-й триместр (оптимальное окно лечения)</option>
						<option value="trimester_3">3-й триместр (щадящий режим, левый бок 15°)</option>
						<option value="lactation">Период грудного вскармливания (лактация)</option>
					</select>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={Boolean(profile.hasDiabetesMellitus)}
							onChange={(e) => onUpdateField("hasDiabetesMellitus", e.target.checked)}
							className="rounded text-[var(--teal)]"
						/>
						<span>Сахарный диабет</span>
					</label>
					<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={Boolean(profile.hasBronchialAsthma)}
							onChange={(e) => onUpdateField("hasBronchialAsthma", e.target.checked)}
							className="rounded text-[var(--teal)]"
						/>
						<span>Бронхиальная астма</span>
					</label>
					<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={Boolean(profile.hasEpilepsy)}
							onChange={(e) => onUpdateField("hasEpilepsy", e.target.checked)}
							className="rounded text-[var(--teal)]"
						/>
						<span>Эпилепсия</span>
					</label>
					<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={Boolean(profile.hasHepatitis || profile.hasHiv)}
							onChange={(e) => {
								onUpdateField("hasHepatitis", e.target.checked);
								onUpdateField("hasHiv", e.target.checked);
							}}
							className="rounded text-[var(--teal)]"
						/>
						<span>Гепатит / ВИЧ (СанПиН)</span>
					</label>
				</div>
			</div>
		</div>
	);
});
