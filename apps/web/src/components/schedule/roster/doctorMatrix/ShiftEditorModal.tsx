/**
 * DENTE Dental CRM — Shift Editor Popover / Modal (Layer 2)
 * 1-Click Fast Shift & Chair-Doctor Binding (Zero-Matryoshka, Depth 1, Mandates 8d, 8e, 8k, 8n)
 */

import React, { useMemo, useRef, useEffect } from "react";
import {
	Building,
	Calendar as CalendarIcon,
	Clock,
	Moon,
	Sun,
	Trash2,
	X,
} from "lucide-react";
import { MEDICAL_STAFF_ROLES } from "../doctorShiftRosterPresets";
import type { ShiftEditorModalProps } from "./types";

export const ShiftEditorModal: React.FC<ShiftEditorModalProps> = React.memo(
	function ShiftEditorModal({
		activePopover,
		weekDays,
		staffList,
		shifts,
		flatChairsList,
		onClosePopover,
		onApplyPreset,
		onApplyWeeklyTemplate,
		selectedDocId,
		setSelectedDocId,
		selectedChairKey,
		setSelectedChairKey,
		onOpenEdit,
		onOpenCreateInCell,
	}) {
		const popoverRef = useRef<HTMLDivElement>(null);

		const popoverDayInfo = useMemo(() => {
			if (!activePopover) return null;
			return weekDays?.find((d) => d.dateIso === activePopover.dateIso) ?? null;
		}, [activePopover, weekDays]);

		useEffect(() => {
			if (!activePopover) return;
			const handleClickOutside = (e: MouseEvent) => {
				if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
					onClosePopover();
				}
			};
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					onClosePopover();
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [activePopover, onClosePopover]);

		if (!activePopover) return null;

		return (
			<div
				ref={popoverRef}
				className="roster-cell-popover-anchored"
				data-testid="roster-cell-popover"
				style={{
					position: "absolute",
					top: "1rem",
					right: "1.5rem",
					zIndex: 50,
					backgroundColor: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
					border: "1px solid var(--line, #cbd5e1)",
					borderRadius: "0.75rem",
					boxShadow:
						"0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
					width: "100%",
					maxWidth: "480px",
					padding: "1.25rem",
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				{/* Popover Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						paddingBottom: "0.75rem",
					}}
				>
					<div>
						<h4
							style={{
								margin: 0,
								fontSize: "1rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
							}}
						>
							<span>Назначение смены</span>
						</h4>
						<div
							style={{
								fontSize: "0.8125rem",
								color: "var(--muted, #64748b)",
								marginTop: "2px",
							}}
						>
							{popoverDayInfo?.dayName || ""}, {activePopover.dateIso}
						</div>
					</div>
					<button
						type="button"
						onClick={onClosePopover}
						style={{
							minHeight: "44px",
							minWidth: "44px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "0.375rem",
							background: "transparent",
							border: "none",
							color: "var(--muted, #64748b)",
							cursor: "pointer",
						}}
						title="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Quick 1-Click Presets Grid */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<div
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted, #64748b)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						Быстрые шаблоны смен
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "0.5rem",
						}}
					>
						<button
							type="button"
							data-testid="cell-preset-morning"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyPreset("morning")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Sun size={18} color="#f59e0b" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Утро</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									08:00–14:00 (6ч)
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-preset-evening"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyPreset("evening")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Moon size={18} color="#6366f1" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Вечер</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									14:00–20:00 (6ч)
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-preset-full-day"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyPreset("full_day")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Building size={18} color="#0d9488" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Весь день</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									08:00–20:00 (11ч)
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-preset-clear"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyPreset("clear")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "#ef4444",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Trash2 size={18} color="#ef4444" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Выходной</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Очистить смену
								</div>
							</div>
						</button>
					</div>

					{/* Недельные шаблоны закрепления за креслом */}
					<div
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted, #64748b)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							marginTop: "0.5rem",
						}}
					>
						Недельное закрепление за креслом
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "0.5rem",
						}}
					>
						<button
							type="button"
							data-testid="cell-template-mon-wed-fri"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("mon_wed_fri_morning")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Sun size={18} color="#f59e0b" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Пн/Ср/Пт</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Утро 08:00–14:00
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-template-tue-thu-sat"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("tue_thu_sat_evening")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Moon size={18} color="#6366f1" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Вт/Чт/Сб</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Вечер 14:00–20:00
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-template-two-two"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("two_two_full")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<CalendarIcon size={18} color="#0d9488" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>2 через 2</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Весь день 08:00–20:00
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-template-daily-morning"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("daily_morning")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Sun size={18} color="#0284c7" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Каждый день</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Утро 08:00–14:00
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-template-five-day"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("five_day_standard")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
							}}
						>
							<Building size={18} color="#2563eb" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Пятидневка</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Пн-Пт 09:00–18:00
								</div>
							</div>
						</button>

						<button
							type="button"
							data-testid="cell-template-even-odd"
							className="roster-btn roster-btn-secondary"
							onClick={() => onApplyWeeklyTemplate("even_odd_month")}
							style={{
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								gap: "0.5rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								cursor: "pointer",
								gridColumn: "span 2",
							}}
						>
							<CalendarIcon size={18} color="#0d9488" className="shrink-0" />
							<div style={{ textAlign: "left" }}>
								<div>Чётные / Нечётные дни месяца</div>
								<div
									style={{
										fontSize: "0.6875rem",
										fontWeight: 400,
										color: "var(--muted, #64748b)",
									}}
								>
									Врач А — чётные (08–14) / Врач Б — нечётные (14–20)
								</div>
							</div>
						</button>
					</div>
				</div>

				{/* Doctor and Chair selectors */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
					}}
				>
					<div>
						<label
							htmlFor="popover-doctor-select"
							style={{
								display: "block",
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--muted, #64748b)",
								marginBottom: "0.25rem",
							}}
						>
							Врач / Специалист
						</label>
						<select
							id="popover-doctor-select"
							data-testid="popover-doctor-select"
							value={selectedDocId}
							onChange={(e) => setSelectedDocId(e.target.value)}
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								fontSize: "0.875rem",
							}}
						>
							{staffList
								.filter((s) => s.isDoctor)
								.map((doc) => (
									<option key={doc.id} value={doc.id}>
										{doc.fullName} (
										{MEDICAL_STAFF_ROLES[doc.role]?.nameRu || "Врач"})
									</option>
								))}
						</select>
					</div>

					<div>
						<label
							htmlFor="popover-chair-select"
							style={{
								display: "block",
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--muted, #64748b)",
								marginBottom: "0.25rem",
							}}
						>
							Кабинет и Кресло
						</label>
						<select
							id="popover-chair-select"
							data-testid="popover-chair-select"
							value={selectedChairKey}
							onChange={(e) => setSelectedChairKey(e.target.value)}
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "0.5rem 0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								fontSize: "0.875rem",
							}}
						>
							{flatChairsList.map((item) => (
								<option
									key={`${item.cabinetId}::${item.chairId}`}
									value={`${item.cabinetId}::${item.chairId}`}
								>
									{item.cabinetName} — {item.chairName}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Footer / Full Edit Button */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderTop: "1px solid var(--line, #e2e8f0)",
						paddingTop: "0.75rem",
						marginTop: "0.25rem",
					}}
				>
					<button
						type="button"
						data-testid="popover-full-edit-btn"
						className="roster-btn roster-btn-secondary"
						onClick={() => {
							const parts = selectedChairKey ? selectedChairKey.split("::") : [];
							const cabId = parts[0] || activePopover.cabinetId;
							const chId = parts[1] || activePopover.chairId;
							const existing = shifts.find(
								(s) =>
									s.dateIso === activePopover.dateIso &&
									s.chairId === chId &&
									s.status !== "cancelled" &&
									(!selectedDocId || s.doctorId === selectedDocId),
							);
							if (existing) {
								onOpenEdit(existing);
							} else {
								onOpenCreateInCell(activePopover.dateIso, cabId, chId);
							}
							onClosePopover();
						}}
						style={{
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							fontSize: "0.8125rem",
							color: "var(--muted, #64748b)",
						}}
					>
						<Clock size={16} />
						<span>Подробное редактирование</span>
					</button>

					<button
						type="button"
						className="roster-btn roster-btn-secondary"
						onClick={onClosePopover}
						style={{
							minHeight: "44px",
							fontSize: "0.8125rem",
						}}
					>
						Отмена
					</button>
				</div>
			</div>
		);
	},
);
