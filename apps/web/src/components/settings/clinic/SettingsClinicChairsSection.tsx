/**
 * apps/web/src/components/settings/clinic/SettingsClinicChairsSection.tsx
 *
 * Operational chairs & installation shifts management for Clinic Administrator.
 *
 * Layer 5: Canonical Facade & Orchestrator (< 250 lines)
 * Decomposed via /decomposer standard into modular DAG:
 * - clinicChairsTypes.ts (Layer 0)
 * - ClinicChairCard.tsx (Layer 4)
 * - ClinicChairEditModal.tsx (Layer 4)
 */

import React, { useState } from "react";
import type { Chair } from "@dental/shared";
import { Plus } from "lucide-react";
import { ClinicChairCard } from "./chairsModules/ClinicChairCard";
import { ClinicChairEditModal } from "./chairsModules/ClinicChairEditModal";
import type {
	SettingsClinicChairsSectionProps,
	TextInputChangeEvent,
} from "./chairsModules/clinicChairsTypes";

export type { SettingsClinicChairsSectionProps } from "./chairsModules/clinicChairsTypes";
export type * from "./chairsModules/clinicChairsTypes";

export const SettingsClinicChairsSection: React.FC<SettingsClinicChairsSectionProps> = ({
	typedChairs,
	newChairName,
	setNewChairName,
	handleAddChair,
	newChairHasXraySensor,
	setNewChairHasXraySensor,
	newChairHasMicroscope,
	setNewChairHasMicroscope,
	newChairHasSurgeryKit,
	setNewChairHasSurgeryKit,
	chairScheduleDrafts,
	chairScheduleSaveStates,
	chairScheduleDirtyIds,
	chairScheduleSavingId,
	staffScheduleDraftFromWorkingHours,
	updateChairScheduleDraft,
	toggleChairWorkingDay,
	updateChairScheduleDay,
	saveChairSchedule,
	deleteChair,
	specialtyLabels,
	typedWeekdayOptions,
	setChairPresetDays,
	applyChairHoursToAll,
	showToast,
}) => {
	const [editingChair, setEditingChair] = useState<Chair | null>(null);

	const handleSaveChairDetails = async (chairId: string, patch: Partial<Chair>) => {
		updateChairScheduleDraft(chairId, patch);
		await saveChairSchedule(chairId);
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
						Оснащение установок (RVG, микроскоп, хирургия) и индивидуальные графики смен
					</p>
				</div>
				<span className="status-pill status-confirmed px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--teal-surface)] text-[var(--primary)] border border-[var(--line)]">
					{typedChairs.length} {typedChairs.length === 1 ? "кресло" : "кресел"}
				</span>
			</div>

			{/* Quick Create Chair */}
			<div className="quick-create flex items-center gap-2">
				<input
					aria-label="Новое кресло"
					placeholder="Название кресла или кабинета"
					value={newChairName}
					onChange={(event: TextInputChangeEvent) =>
						setNewChairName?.(event.target.value)
					}
					className="flex-1 h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
				/>
				<button
					aria-label="Добавить кресло или кабинет"
					className="icon-button h-9 min-h-[36px] w-9 min-w-[36px] flex items-center justify-center rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] shadow-xs transition-colors cursor-pointer shrink-0"
					type="button"
					onClick={handleAddChair}
				>
					<Plus aria-hidden="true" size={18} />
				</button>
			</div>

			{/* Chair Templates */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--ink-muted)] font-semibold">
					Шаблоны кабинетов:
				</span>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center"
					onClick={() => {
						setNewChairName?.(`Кабинет №${typedChairs.length + 1} (Терапия)`);
						setNewChairHasXraySensor(true);
						setNewChairHasMicroscope(false);
						setNewChairHasSurgeryKit(false);
					}}
					title="Кабинет общей терапии с RVG визиографом"
				>
					+ Терапия (с RVG)
				</button>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center"
					onClick={() => {
						setNewChairName?.(`Кабинет №${typedChairs.length + 1} (Хирургия)`);
						setNewChairHasXraySensor(true);
						setNewChairHasMicroscope(true);
						setNewChairHasSurgeryKit(true);
					}}
					title="Хирургический кабинет с микроскопом и хирургическим набором"
				>
					+ Хирургия (RVG + Микроскоп)
				</button>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center"
					onClick={() => {
						setNewChairName?.("Кабинет гигиены и профосмотра");
						setNewChairHasXraySensor(false);
						setNewChairHasMicroscope(false);
						setNewChairHasSurgeryKit(false);
					}}
					title="Кабинет гигиены"
				>
					+ Гигиена
				</button>
			</div>

			{/* Equipment Toggles for New Chair */}
			<div
				role="toolbar"
				className="role-picker equipment-picker flex items-center gap-1.5"
				aria-label="Оборудование кресла"
			>
				<span className="text-[11px] text-[var(--ink-muted)] font-semibold mr-1">Оснащение:</span>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasXraySensor ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasXraySensor}
					onClick={() => setNewChairHasXraySensor((value: boolean) => !value)}
				>
					RVG визиограф
				</button>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasMicroscope ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasMicroscope}
					onClick={() => setNewChairHasMicroscope((value: boolean) => !value)}
				>
					Микроскоп
				</button>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasSurgeryKit ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasSurgeryKit}
					onClick={() => setNewChairHasSurgeryKit((value: boolean) => !value)}
				>
					Хирургия
				</button>
			</div>

			{/* Chairs List */}
			<div className="staff-list space-y-3 pt-2">
				{typedChairs.map((chair) => {
					const rawScheduleDraft =
						chairScheduleDrafts[chair.id] ??
						(typeof staffScheduleDraftFromWorkingHours === "function"
							? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null)
							: null);
					const scheduleSaveState = chairScheduleSaveStates[chair.id] ?? "saved";
					const scheduleDirty = Boolean(
						chairScheduleDirtyIds && typeof chairScheduleDirtyIds.has === "function"
							? chairScheduleDirtyIds.has(chair.id)
							: Array.isArray(chairScheduleDirtyIds)
								? chairScheduleDirtyIds.includes(chair.id)
								: typeof chairScheduleDirtyIds === "object"
									? Boolean((chairScheduleDirtyIds as Record<string, unknown>)[chair.id])
									: false,
					);
					const scheduleSaving =
						chairScheduleSavingId === chair.id || scheduleSaveState === "saving";
					const scheduleSaveLabel = scheduleSaving
						? "Автосохранение"
						: scheduleSaveState === "error"
							? "Не сохранено"
							: scheduleDirty
								? "Ждет автосохранения"
								: "Сохранено";

					return (
						<ClinicChairCard
							key={chair.id}
							chair={chair}
							rawScheduleDraft={rawScheduleDraft}
							scheduleSaveState={scheduleSaveState}
							scheduleDirty={scheduleDirty}
							scheduleSaving={scheduleSaving}
							scheduleSaveLabel={scheduleSaveLabel}
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
					);
				})}
			</div>

			{/* Detailed Edit Modal */}
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
