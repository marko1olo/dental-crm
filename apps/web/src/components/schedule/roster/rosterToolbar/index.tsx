/**
 * DENTE Dental CRM — Doctor Shift Roster Toolbar & KPI Controls Strip
 * Layer 5: Master Coordinator & Public Module Surface
 * Compliance: TK RF Article 350 (33-hour medical workweek), Mandate 8e, Mandate 8d (HIG 44px)
 */

import React from "react";
import {
	AlertTriangle,
	Check,
	Clock,
	FileSpreadsheet,
	Printer,
	Save,
	X,
} from "lucide-react";
import {
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type DoctorChairRosterTemplateId,
} from "../doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type {
	DoctorRosterToolbarProps,
	RosterChairOption,
} from "./types";
import { RosterWeekNav, RosterNavBar } from "./RosterDateNavigation";
import { RosterFilterBar } from "./RosterFilterBar";
import {
	RosterQuickActionsGroup,
	RosterPresetsStrip,
} from "./RosterTemplateActions";

export * from "./types";
export * from "./RosterDateNavigation";
export * from "./RosterFilterBar";
export * from "./RosterTemplateActions";

export const DoctorRosterToolbar: React.FC<DoctorRosterToolbarProps> = React.memo(
	function DoctorRosterToolbar({
		clinicName,
		kpis,
		monthNormObj,
		activeTab,
		onSelectTab,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		onPrevWeek,
		onNextWeek,
		onAutoFillDefault,
		onApplyPreset,
		onPrintSchedule,
		onExportT13,
		onSaveAll,
		onClose,
		notification,
		conflicts = [],
		onApplyDoctorChairWeeklyTemplate,
		onCopyWeekToNextWeek,
		onCopyWeekToMonth,
		onClearWeek,
		onRotateShifts,
		staffList,
		cabinets,
	}) {
		const monthName = React.useMemo(() => {
			if (monthNormObj?.nameRu) return monthNormObj.nameRu;
			try {
				const d = new Date(weekStartDateIso || Date.now());
				const raw = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(d);
				return raw.charAt(0).toUpperCase() + raw.slice(1);
			} catch {
				return "Текущий месяц";
			}
		}, [monthNormObj?.nameRu, weekStartDateIso]);

		const doctors = React.useMemo(() => {
			const list = (staffList || []).filter((s) => s.isDoctor);
			return list.length > 0
				? list
				: isDemoShowcaseMode()
					? DEFAULT_CLINIC_STAFF.filter((s) => s.isDoctor)
					: [];
		}, [staffList]);

		const allChairs = React.useMemo<RosterChairOption[]>(() => {
			const list: RosterChairOption[] = [];
			const sourceCabs =
				cabinets && cabinets.length > 0
					? cabinets
					: isDemoShowcaseMode()
						? CLINIC_CABINETS_CATALOG
						: [];
			for (const cab of sourceCabs) {
				for (const chair of cab.chairs || []) {
					list.push({
						chairId: chair.id,
						chairName: chair.name,
						cabinetId: cab.id,
						cabinetName: cab.name,
					});
				}
			}
			return list;
		}, [cabinets]);

		const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>(() => doctors[0]?.id || "");
		const [isPresetMenuOpen, setIsPresetMenuOpen] = React.useState<boolean>(false);
		const [selectedChairKey, setSelectedChairKey] = React.useState<string>(() => {
			const firstChair = allChairs[0];
			return firstChair ? `${firstChair.cabinetId}:::${firstChair.chairId}` : "";
		});

		React.useEffect(() => {
			if (!selectedDoctorId && doctors.length > 0) {
				setSelectedDoctorId(doctors[0]!.id);
			}
		}, [doctors, selectedDoctorId]);

		React.useEffect(() => {
			if (!selectedChairKey && allChairs.length > 0) {
				const firstChair = allChairs[0]!;
				setSelectedChairKey(`${firstChair.cabinetId}:::${firstChair.chairId}`);
			}
		}, [allChairs, selectedChairKey]);

		const handleApplyTemplate = React.useCallback(
			(templateId: DoctorChairRosterTemplateId) => {
				if (!onApplyDoctorChairWeeklyTemplate) return;
				const activeDoc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
				if (!activeDoc) return;
				const [activeCabId, activeChairId] = selectedChairKey.includes(":::")
					? selectedChairKey.split(":::")
					: [allChairs[0]?.cabinetId, allChairs[0]?.chairId];
				const targetCabId = activeCabId || cabinets?.[0]?.id || "cab-1";
				const targetChairId = activeChairId || allChairs[0]?.chairId || "chair-1";
				onApplyDoctorChairWeeklyTemplate(activeDoc.id, targetChairId, targetCabId, templateId);
			},
			[onApplyDoctorChairWeeklyTemplate, doctors, selectedDoctorId, selectedChairKey, allChairs, cabinets],
		);

		return (
			<>
				{/* Top Header */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<span className="roster-title-badge">Норма: 33 ч/нед</span>
								{clinicName && (
									<span
										className="truncate max-w-[140px] sm:max-w-[280px] inline-block"
										style={{
											fontSize: "0.8125rem",
											color: "var(--muted, #64748b)",
											fontWeight: 500,
											textOverflow: "ellipsis",
											overflow: "hidden",
											whiteSpace: "nowrap",
										}}
										title={clinicName}
									>
										{clinicName}
									</span>
								)}
							</div>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								График сменности и табель учета врачей
							</h2>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onPrintSchedule}
								style={{ minHeight: "34px", height: "34px" }}
								title="Печать графика в формате А4 Альбомный"
							>
								<Printer size={16} />
								<span>Печать (А4)</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onExportT13}
								style={{ minHeight: "34px", height: "34px" }}
								title="Табель учёта рабочего времени: Выгрузить в CSV для 1C или Excel"
							>
								<FileSpreadsheet size={16} />
								<span>Табель учёта времени (CSV)</span>
							</button>
							<button
								type="button"
								data-testid="roster-save-btn"
								className="roster-btn roster-btn-primary"
								onClick={() => onSaveAll(false)}
								style={{ minHeight: "44px" }}
								title="Сохранить изменения графика"
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onClose}
								style={{ minHeight: "34px", height: "34px" }}
								title="Закрыть табель (Esc)"
							>
								<X size={16} />
								<span>Закрыть</span>
							</button>
						</div>
					</div>

					{/* Notification Toast Strip */}
					{notification && (
						<div
							className={`roster-notification roster-notification-${notification.type}`}
						>
							{notification.type === "success" && <Check size={16} />}
							{notification.type === "error" && <AlertTriangle size={16} />}
							{notification.type === "info" && <Clock size={16} />}
							<span>{notification.message}</span>
						</div>
					)}

					{/* Navigation Strip */}
					<div className="roster-nav-strip">
						<RosterWeekNav
							weekStartDateIso={weekStartDateIso}
							weekEndDateIso={weekEndDateIso}
							selectedYear={selectedYear}
							onPrevWeek={onPrevWeek}
							onNextWeek={onNextWeek}
						/>

						{/* Quick Fill & Presets */}
						<RosterQuickActionsGroup
							onApplyPreset={onApplyPreset}
							onAutoFillDefault={onAutoFillDefault}
							onCopyWeekToNextWeek={onCopyWeekToNextWeek}
							onCopyWeekToMonth={onCopyWeekToMonth}
							onClearWeek={onClearWeek}
							onRotateShifts={onRotateShifts}
							isPresetMenuOpen={isPresetMenuOpen}
							onTogglePresetMenu={() => setIsPresetMenuOpen((prev) => !prev)}
							onClosePresetMenu={() => setIsPresetMenuOpen(false)}
							onApplyTemplate={handleApplyTemplate}
							hasTemplateHandler={Boolean(onApplyDoctorChairWeeklyTemplate)}
						/>
					</div>

					{/* KPI Strip */}
					<div className="roster-kpis-strip">
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Смен на неделю</span>
							<span className="roster-kpi-val">{kpis.totalWeekShifts}</span>
							<span className="roster-kpi-sub">
								{kpis.totalWeeklyHours} рабочих часов
							</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">
								Норма месяца ({monthName})
							</span>
							<span
								className="roster-kpi-val"
								style={{ color: "var(--teal, #0d9488)" }}
							>
								{monthNormObj?.normHours33 || 138.6} ч
							</span>
							<span className="roster-kpi-sub">33-часовая неделя</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Ассистентские пары</span>
							<span className="roster-kpi-val">{kpis.assistantPairingPct}%</span>
							<span className="roster-kpi-sub">Охват работы в 4 руки</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Коллизии и наложения</span>
							<span
								className="roster-kpi-val"
								style={{
									color:
										kpis.conflictCount > 0
											? "var(--bad-fg, #ef4444)"
											: "var(--teal, #0d9488)",
								}}
							>
								{kpis.conflictCount}
							</span>
							<span className="roster-kpi-sub">
								{kpis.errorConflictCount > 0
									? "Есть наложения смен"
									: "График сбалансирован"}
							</span>
						</div>
					</div>
				</div>

				{/* Nav, Tab & Period Strip */}
				<RosterNavBar
					activeTab={activeTab}
					onSelectTab={onSelectTab}
					weekStartDateIso={weekStartDateIso}
					weekEndDateIso={weekEndDateIso}
					selectedYear={selectedYear}
					onPrevWeek={onPrevWeek}
					onNextWeek={onNextWeek}
					onAutoFillDefault={onAutoFillDefault}
				/>

				{/* 1-Click Shift Allocation Presets Strip (Mandates 8e, 8k, 8n) */}
				<RosterPresetsStrip onApplyPreset={onApplyPreset}>
					<RosterFilterBar
						doctors={doctors}
						allChairs={allChairs}
						selectedDoctorId={selectedDoctorId}
						onSelectDoctorId={setSelectedDoctorId}
						selectedChairKey={selectedChairKey}
						onSelectChairKey={setSelectedChairKey}
						hasTemplateHandler={Boolean(onApplyDoctorChairWeeklyTemplate)}
					/>
				</RosterPresetsStrip>

				{/* Notifications & Conflicts Ribbon */}
				{notification && (
					<div
						style={{
							padding: "0.5rem 1.5rem",
							background:
								notification.type === "error"
									? "var(--bad-bg, #fef2f2)"
									: "var(--ok-bg, #f0fdf4)",
							color:
								notification.type === "error"
									? "var(--bad-fg, #991b1b)"
									: "var(--ok-fg, #166534)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							borderBottom: "1px solid rgba(0,0,0,0.05)",
						}}
					>
						<Check size={16} />
						<span>{notification.message}</span>
					</div>
				)}

				{Array.isArray(conflicts) && conflicts.length > 0 && (
					<div
						className="roster-conflict-banner"
						role="status"
						aria-live="polite"
					>
						<div className="roster-conflict-header">
							<AlertTriangle size={16} className="roster-conflict-icon" />
							<span className="roster-conflict-title">
								Предупреждения ({conflicts.length}):
							</span>
						</div>
						<div className="roster-conflict-list">
							{conflicts.map((c) => (
								<div
									key={c.id}
									className={`roster-conflict-tag ${c.severity === "error" ? "error" : "warning"}`}
									title={c.message}
								>
									<span className="roster-conflict-dot" />
									<span className="roster-conflict-text">{c.message}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</>
		);
	},
);

export default DoctorRosterToolbar;
