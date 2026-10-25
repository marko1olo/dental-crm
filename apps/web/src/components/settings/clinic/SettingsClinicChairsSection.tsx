/**
 * apps/web/src/components/settings/clinic/SettingsClinicChairsSection.tsx
 *
 * Operational chairs & installation shifts management for Clinic Administrator.
 * Layer 5: Canonical Facade & Orchestrator strictly <= 100 lines.
 */

import React, { useState } from "react";
import type { Chair } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { ClinicChairEditModal } from "./chairsModules/ClinicChairEditModal";
import { ClinicChairQuickCreateBar } from "./chairsModules/ClinicChairQuickCreateBar";
import { ClinicChairsList } from "./chairsModules/ClinicChairsList";
import { persistChairDetails } from "./chairsModules/chairPersistService";
import type { SettingsClinicChairsSectionProps } from "./chairsModules/clinicChairsTypes";

export type { SettingsClinicChairsSectionProps } from "./chairsModules/clinicChairsTypes";
export type * from "./chairsModules/clinicChairsTypes";

export const SettingsClinicChairsSection: React.FC<SettingsClinicChairsSectionProps> = ({
	typedChairs, newChairName, setNewChairName, handleAddChair,
	newChairHasXraySensor, setNewChairHasXraySensor, newChairHasMicroscope, setNewChairHasMicroscope,
	newChairHasSurgeryKit, setNewChairHasSurgeryKit, chairScheduleDrafts, chairScheduleSaveStates,
	chairScheduleDirtyIds, chairScheduleSavingId, staffScheduleDraftFromWorkingHours,
	updateChairScheduleDraft, toggleChairWorkingDay, updateChairScheduleDay, saveChairSchedule,
	deleteChair, specialtyLabels, typedWeekdayOptions, setChairPresetDays, applyChairHoursToAll, showToast,
}) => {
	const appLogic = useAppLogicContext();
	const [editingChair, setEditingChair] = useState<Chair | null>(null);

	// 1-click addition directly passes overrideName: handleAddChair(chairName)
	const onQuickAddChair = (chairName?: string) => handleAddChair(chairName);

	const handleSaveChairDetails = async (chairId: string, patch: Partial<Chair>) => {
		updateChairScheduleDraft(chairId, patch);
		await persistChairDetails(chairId, patch, appLogic?.accessHeaders);
		await saveChairSchedule(chairId);
		if (typeof appLogic?.loadDashboard === "function") await appLogic.loadDashboard();
		showToast("Параметры кресла успешно обновлены", "success");
	};

	return (
		<article
			className="clinic-chairs-section-container p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4 col-span-full w-full"
			data-testid="clinic-chairs-section"
			style={{ flex: "1 1 100%", width: "100%" }}
		>
			<div className="panel-heading flex items-center justify-between">
				<div>
					<h3 className="font-bold text-base text-[var(--ink)] m-0">Кресла и стоматологические установки</h3>
					<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">
						Оснащение установок (RVG, микроскоп, хирургия), цветовые маркеры и индивидуальные графики смен
					</p>
				</div>
				<span className="status-pill status-confirmed px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--teal-surface)] text-[var(--primary)] border border-[var(--line)]">
					{typedChairs.length} {typedChairs.length === 1 ? "кресло" : "кресел"}
				</span>
			</div>

			<ClinicChairQuickCreateBar
				newChairName={newChairName}
				setNewChairName={setNewChairName}
				handleAddChair={handleAddChair}
				typedChairsCount={typedChairs.length}
				newChairHasXraySensor={newChairHasXraySensor}
				setNewChairHasXraySensor={setNewChairHasXraySensor}
				newChairHasMicroscope={newChairHasMicroscope}
				setNewChairHasMicroscope={setNewChairHasMicroscope}
				newChairHasSurgeryKit={newChairHasSurgeryKit}
				setNewChairHasSurgeryKit={setNewChairHasSurgeryKit}
			/>

			<ClinicChairsList
				typedChairs={typedChairs}
				chairScheduleDrafts={chairScheduleDrafts}
				chairScheduleSaveStates={chairScheduleSaveStates}
				chairScheduleDirtyIds={chairScheduleDirtyIds}
				chairScheduleSavingId={chairScheduleSavingId}
				staffScheduleDraftFromWorkingHours={staffScheduleDraftFromWorkingHours}
				specialtyLabels={specialtyLabels}
				typedWeekdayOptions={typedWeekdayOptions}
				updateChairScheduleDraft={updateChairScheduleDraft}
				toggleChairWorkingDay={toggleChairWorkingDay}
				updateChairScheduleDay={updateChairScheduleDay}
				setChairPresetDays={setChairPresetDays}
				applyChairHoursToAll={applyChairHoursToAll}
				saveChairSchedule={saveChairSchedule}
				deleteChair={deleteChair}
				showToast={showToast}
				onEditChair={(c) => setEditingChair(c)}
			/>

			<ClinicChairEditModal
				isOpen={Boolean(editingChair)}
				chair={editingChair}
				onClose={() => setEditingChair(null)}
				onSave={handleSaveChairDetails}
				specialtyLabels={specialtyLabels}
			/>
		</article>
	);
};

export default SettingsClinicChairsSection;
