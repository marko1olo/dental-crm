/**
 * StudioCuratorAssignmentTab.tsx — Встроенный таб назначения куратора в студии планов лечения.
 * Мандаты 8b, 8e, 8n: Простота соло-врача (самокурация), 0 disabled кнопок, тихий бэк-офис.
 */

import React, { useState } from "react";
import { UserCheck, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppStore } from "../../../store/appStore";

export interface StudioCuratorAssignmentTabProps {
	readonly doctorFullName?: string | undefined;
	readonly planId?: string | null | undefined;
	readonly initialCuratorId?: string | null | undefined;
	readonly initialFunnelStage?: string | null | undefined;
	readonly initialNextContactDate?: string | null | undefined;
	readonly initialNotes?: string | null | undefined;
	readonly onSaveCuratorSettings?: ((settings: {
		curatorId: string;
		curatorName: string;
		funnelStage: string;
		nextContactDate: string;
		notes: string;
	}) => void) | undefined;
}

export const StudioCuratorAssignmentTab: React.FC<StudioCuratorAssignmentTabProps> = ({
	doctorFullName = "Лечащий врач",
	planId,
	initialCuratorId,
	initialFunnelStage,
	initialNextContactDate,
	initialNotes,
	onSaveCuratorSettings,
}) => {
	const dashboard = useAppStore((s) => s.dashboard);
	const staffList = (dashboard?.clinicSettings?.staff ?? []).map((s) => ({
		id: s.id,
		name: s.fullName || (s as { name?: string }).name || "Сотрудник",
		role: s.role,
	}));

	const [selectedCuratorId, setSelectedCuratorId] = useState<string>(initialCuratorId || "doctor_self");
	const [funnelStage, setFunnelStage] = useState<string>(initialFunnelStage || "decision_making");
	const [nextContactDate, setNextContactDate] = useState<string>(
		initialNextContactDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || ""
	);
	const [notes, setNotes] = useState<string>(initialNotes || "");
	const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const handleSave = async () => {
		setSaveError(null);
		const curatorObj = staffList.find((s) => s.id === selectedCuratorId);
		const curatorName = selectedCuratorId === "doctor_self" ? doctorFullName : curatorObj?.name || doctorFullName;
		const actualCuratorId = selectedCuratorId === "doctor_self" ? null : (selectedCuratorId || null);

		const isValidUuid = typeof planId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);

		if (isValidUuid && typeof window !== "undefined" && typeof window.fetch === "function") {
			setIsSaving(true);
			try {
				const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						curatorId: actualCuratorId,
						curatorName,
						curatorFunnelStage: funnelStage,
						curatorNextContactDate: nextContactDate || null,
						curatorNotes: notes || null,
					}),
				});

				if (!res.ok) {
					const errJson = await res.json().catch(() => ({}));
					const errMsg = errJson?.message || errJson?.error || "Ошибка сохранения настроек куратора на сервере";
					setSaveError(errMsg);
					setIsSaving(false);
					return;
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : "Сетевой сбой при обращении к серверу";
				setSaveError(errMsg);
				setIsSaving(false);
				return;
			}
			setIsSaving(false);
		} else if (!onSaveCuratorSettings && !planId) {
			// Мандат 8e / T.A.R.S.: Запрет бутафорского тоста успеха при отсутствии реальной персистенции
			setSaveError("План лечения ещё не сохранён в базе данных. Сохраните черновик плана для фиксации куратора.");
			return;
		}

		if (onSaveCuratorSettings) {
			onSaveCuratorSettings({
				curatorId: selectedCuratorId,
				curatorName,
				funnelStage,
				nextContactDate,
				notes,
			});
		}

		setSaveSuccess(true);
		setTimeout(() => setSaveSuccess(false), 2500);
	};

	return (
		<div className="space-y-4 max-w-2xl mx-auto" data-testid="studio-curator-assignment-tab">
			{/* Уведомление об успешном сохранении */}
			{saveSuccess && (
				<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2 animate-in fade-in">
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span>Настройки куратора плана успешно сохранены в базе данных!</span>
				</div>
			)}

			{/* Сообщение об ошибке */}
			{saveError && (
				<div className="p-3 rounded-xl bg-[var(--danger-soft,rgba(239,68,68,0.1))] border border-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)] text-xs font-medium flex items-center gap-2 animate-in fade-in">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{saveError}</span>
				</div>
			)}

			<div className="p-4 sm:p-5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl space-y-4">
				{/* 1. Выбор ответственного куратора */}
				<div>
					<label htmlFor="curator-select" className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1.5">
						<UserCheck className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						Ответственный куратор плана:
					</label>
					<select
						id="curator-select"
						value={selectedCuratorId}
						onChange={(e) => setSelectedCuratorId(e.target.value)}
						className="w-full h-10 px-3 text-xs font-medium bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] cursor-pointer"
					>
						<option value="doctor_self">{`Веду сам (${doctorFullName})`}</option>
						{staffList.map((member) => (
							<option key={member.id} value={member.id}>
								{member.name} ({member.role})
							</option>
						))}
					</select>
					<span className="text-[11px] text-[var(--muted)] mt-1 block">
						В соло-практике курацию ведет лечащий врач; в командной клинике можно назначить координатора или администратора.
					</span>
				</div>

				{/* 2. Этап воронки куратора */}
				<div>
					<label htmlFor="funnel-stage-select" className="text-xs font-bold text-[var(--ink)] block mb-1.5">
						Текущий этап воронки принятия решения:
					</label>
					<select
						id="funnel-stage-select"
						value={funnelStage}
						onChange={(e) => setFunnelStage(e.target.value)}
						className="w-full h-10 px-3 text-xs font-medium bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] cursor-pointer"
					>
						<option value="consultation">Первичная консультация и диагностика</option>
						<option value="decision_making">План презентован (пациент принимает решение)</option>
						<option value="tier_selected">Тариф согласован (ожидание предоплаты / визита)</option>
						<option value="in_treatment">Лечение начато (активная реализация этапов)</option>
					</select>
				</div>

				{/* 3. Дата следующего контакта */}
				<div>
					<label htmlFor="next-contact-date" className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1.5">
						<Calendar className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						Дата следующего контакта / звонка куратора:
					</label>
					<input
						id="next-contact-date"
						type="date"
						value={nextContactDate}
						onChange={(e) => setNextContactDate(e.target.value)}
						className="w-full h-10 px-3 text-xs font-medium bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>

				{/* 4. Заметки куратора */}
				<div>
					<label htmlFor="curator-notes" className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1.5">
						<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						Внутренние заметки куратора:
					</label>
					<textarea
						id="curator-notes"
						rows={3}
						placeholder="Приоритеты пациента, финансовые договоренности, соображения по рассрочке..."
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="w-full p-2.5 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] resize-none"
					/>
				</div>

				{/* Кнопка сохранения настроек куратора */}
				<div className="pt-2 flex justify-end">
					<button
						type="button"
						onClick={handleSave}
						className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] transition-colors cursor-pointer"
					>
						Сохранить параметры курации
					</button>
				</div>
			</div>
		</div>
	);
};

export default StudioCuratorAssignmentTab;
