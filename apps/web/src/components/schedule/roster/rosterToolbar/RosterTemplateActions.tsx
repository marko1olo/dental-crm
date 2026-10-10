/**
 * DENTE Dental CRM — Doctor Shift Roster Template Actions & Quick Presets
 * Layer 4: Presentation Subcomponent (RosterTemplateActions, RosterQuickActionsGroup, RosterPresetsStrip)
 */

import React from "react";
import {
	CalendarRange,
	Copy,
	Layers,
	RotateCcw,
	Sparkles,
} from "lucide-react";
import type { RosterTemplateActionsProps, RosterPresetsStripProps } from "./types";

export const RosterQuickActionsGroup: React.FC<RosterTemplateActionsProps> = React.memo(
	function RosterQuickActionsGroup({
		onApplyPreset,
		onAutoFillDefault,
		onCopyWeekToNextWeek,
		onCopyWeekToMonth,
		onClearWeek,
		onRotateShifts,
		isPresetMenuOpen,
		onTogglePresetMenu,
		onClosePresetMenu,
		onApplyTemplate,
		hasTemplateHandler,
	}) {
		return (
			<div className="roster-actions-group">
				{onCopyWeekToNextWeek && (
					<button
						type="button"
						data-testid="roster-copy-next-week-btn"
						className="roster-btn roster-btn-secondary"
						onClick={onCopyWeekToNextWeek}
						style={{ minHeight: "34px", height: "34px" }}
						title="Копировать все смены текущей недели на следующую неделю (+7 дней)"
					>
						<Copy size={16} />
						<span>Копировать на след. неделю</span>
					</button>
				)}
				{onCopyWeekToMonth && (
					<button
						type="button"
						data-testid="roster-copy-month-btn"
						className="roster-btn roster-btn-secondary"
						onClick={onCopyWeekToMonth}
						style={{ minHeight: "34px", height: "34px" }}
						title="Копировать график текущей недели на следующие 4 недели вперед (месяц)"
					>
						<CalendarRange size={16} />
						<span>Копировать на 4 недели (месяц)</span>
					</button>
				)}
				{onClearWeek && (
					<button
						type="button"
						data-testid="roster-clear-week-btn"
						className="roster-btn roster-btn-secondary"
						onClick={onClearWeek}
						style={{ minHeight: "34px", height: "34px", color: "var(--bad-fg, #ef4444)" }}
						title="Очистить все смены текущей недели"
					>
						<RotateCcw size={16} />
						<span>Очистить неделю</span>
					</button>
				)}
				{onRotateShifts && (
					<button
						type="button"
						data-testid="roster-rotate-shifts-btn"
						className="roster-btn roster-btn-secondary"
						onClick={onRotateShifts}
						style={{ minHeight: "34px", height: "34px" }}
						title="Ротация смен (Утро ⇄ Вечер) для всех врачей недели"
					>
						<RotateCcw size={16} />
						<span>Ротация (Утро ⇄ Вечер)</span>
					</button>
				)}
				<button
					type="button"
					className="roster-btn roster-btn-auto"
					onClick={onAutoFillDefault}
					style={{ minHeight: "34px", height: "34px" }}
					title="Автозаполнение графика по стандартным шаблонам отделений"
				>
					<Sparkles size={16} />
					<span>Автозаполнение по шаблону</span>
				</button>
				<div className="roster-preset-dropdown" style={{ position: "relative" }}>
					<button
						type="button"
						className="roster-btn roster-btn-secondary"
						style={{ minHeight: "34px", height: "34px" }}
						title="Применить типовой график сменности ко всем врачам"
						onClick={onTogglePresetMenu}
						aria-expanded={isPresetMenuOpen}
					>
						<Layers size={16} />
						<span>Шаблоны графиков ▾</span>
					</button>
					<div
						className="roster-preset-menu"
						style={{
							display: isPresetMenuOpen ? "flex" : "none",
							position: "absolute",
							top: "calc(100% + 4px)",
							left: 0,
							zIndex: 50,
							background: "var(--paper, #ffffff)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "8px",
							boxShadow: "var(--shadow-3, 0 10px 15px -3px rgba(0,0,0,0.1))",
							flexDirection: "column",
							minWidth: "260px",
							padding: "4px",
						}}
						aria-hidden={!isPresetMenuOpen}
					>
						<button
							type="button"
							onClick={() => {
								onApplyPreset("five_day", "5/2");
								onClosePresetMenu();
							}}
						>
							Пятидневка (5/2, Пн-Пт 6.6ч)
						</button>
						<button
							type="button"
							onClick={() => {
								onApplyPreset("two_two", "2/2");
								onClosePresetMenu();
							}}
						>
							Сменный 2 через 2 (2/2, 12ч)
						</button>
						<button
							type="button"
							onClick={() => {
								onApplyPreset("morning", "Утренние смены");
								onClosePresetMenu();
							}}
						>
							Все утренние (08:30–14:30)
						</button>
						<button
							type="button"
							onClick={() => {
								onApplyPreset("evening", "Вечерние смены");
								onClosePresetMenu();
							}}
						>
							Все вечерние (14:30–20:30)
						</button>
						<button
							type="button"
							onClick={() => {
								onApplyPreset("full_day", "Полный день");
								onClosePresetMenu();
							}}
						>
							Полный день (12ч смены)
						</button>
						{onCopyWeekToNextWeek && (
							<button
								type="button"
								data-testid="dropdown-copy-next-week"
								onClick={() => {
									onCopyWeekToNextWeek();
									onClosePresetMenu();
								}}
							>
								Копировать на след. неделю (+7 дней)
							</button>
						)}
						{onCopyWeekToMonth && (
							<button
								type="button"
								data-testid="dropdown-copy-month"
								onClick={() => {
									onCopyWeekToMonth();
									onClosePresetMenu();
								}}
							>
								Копировать на 4 недели (месяц)
							</button>
						)}
						{onClearWeek && (
							<button
								type="button"
								data-testid="dropdown-clear-week"
								onClick={() => {
									onClearWeek();
									onClosePresetMenu();
								}}
								style={{ color: "var(--bad-fg, #ef4444)" }}
							>
								Очистить смены недели
							</button>
						)}
						{hasTemplateHandler && (
							<>
								<div
									style={{
										borderTop: "1px solid var(--line, #cbd5e1)",
										margin: "0.25rem 0",
										padding: "0.25rem 0.75rem 0.125rem",
										fontSize: "0.6875rem",
										fontWeight: 700,
										color: "var(--muted, #64748b)",
										textTransform: "uppercase",
									}}
								>
									Закрепление за креслом
								</div>
								<button
									type="button"
									data-testid="toolbar-template-mon-wed-fri"
									onClick={() => {
										onApplyTemplate("mon_wed_fri_morning");
										onClosePresetMenu();
									}}
								>
									Пн/Ср/Пт (Утро 08:00–14:00)
								</button>
								<button
									type="button"
									data-testid="toolbar-template-tue-thu-sat"
									onClick={() => {
										onApplyTemplate("tue_thu_sat_evening");
										onClosePresetMenu();
									}}
								>
									Вт/Чт/Сб (Вечер 14:00–20:00)
								</button>
								<button
									type="button"
									data-testid="toolbar-template-two-two"
									onClick={() => {
										onApplyTemplate("two_two_full");
										onClosePresetMenu();
									}}
								>
									2/2 (Полный день 08:00–20:00)
								</button>
								<button
									type="button"
									data-testid="toolbar-template-daily-morning"
									onClick={() => {
										onApplyTemplate("daily_morning");
										onClosePresetMenu();
									}}
								>
									Каждый день (Утро 08:00–14:00)
								</button>
								<button
									type="button"
									data-testid="toolbar-template-five-day"
									onClick={() => {
										onApplyTemplate("five_day_standard");
										onClosePresetMenu();
									}}
								>
									Пятидневка (09:00–18:00)
								</button>
								<button
									type="button"
									data-testid="toolbar-template-even-odd"
									onClick={() => {
										onApplyTemplate("even_odd_month");
										onClosePresetMenu();
									}}
								>
									Чётные / Нечётные (Врач А/Б)
								</button>
							</>
						)}
						{onRotateShifts && (
							<button
								type="button"
								data-testid="toolbar-rotate-shifts"
								onClick={() => {
									onRotateShifts();
									onClosePresetMenu();
								}}
							>
								Ротация смен (Утро ⇄ Вечер)
							</button>
						)}
					</div>
				</div>
			</div>
		);
	},
);

export const RosterPresetsStrip: React.FC<RosterPresetsStripProps> = React.memo(
	function RosterPresetsStrip({ onApplyPreset, children }) {
		return (
			<div
				className="roster-presets-strip"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					padding: "0.5rem 1.5rem",
					background: "var(--paper-soft, #f8fafc)",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					flexWrap: "wrap",
				}}
			>
				<span
					style={{
						fontSize: "0.75rem",
						fontWeight: 700,
						color: "var(--muted, #64748b)",
					}}
				>
					Шаблоны сменности:
				</span>
				<button
					type="button"
					data-testid="roster-preset-five-day"
					className="roster-btn roster-btn-secondary"
					onClick={() => onApplyPreset("five_day", "Пятидневка")}
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0.25rem 0.75rem",
						fontSize: "0.8125rem",
					}}
					title="Пятидневка (Пн–Пт) для врачей и кресел"
				>
					<span>Пятидневка</span>
				</button>
				<button
					type="button"
					data-testid="roster-preset-two-two"
					className="roster-btn roster-btn-secondary"
					onClick={() => onApplyPreset("two_two", "2/2")}
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0.25rem 0.75rem",
						fontSize: "0.8125rem",
					}}
					title="Сменный график 2 через 2 дня"
				>
					<span>2/2</span>
				</button>
				<button
					type="button"
					data-testid="roster-preset-morning"
					className="roster-btn roster-btn-secondary"
					onClick={() => onApplyPreset("morning", "Утро 08:00–14:00")}
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0.25rem 0.75rem",
						fontSize: "0.8125rem",
					}}
					title="Утренние смены 08:00–14:00"
				>
					<span>Утро 08:00–14:00</span>
				</button>
				<button
					type="button"
					data-testid="roster-preset-evening"
					className="roster-btn roster-btn-secondary"
					onClick={() => onApplyPreset("evening", "Вечер 14:00–20:00")}
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0.25rem 0.75rem",
						fontSize: "0.8125rem",
					}}
					title="Вечерние смены 14:00–20:00"
				>
					<span>Вечер 14:00–20:00</span>
				</button>
				<button
					type="button"
					data-testid="roster-preset-full-day"
					className="roster-btn roster-btn-secondary"
					onClick={() => onApplyPreset("full_day", "Полный день 08:00–20:00")}
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0.25rem 0.75rem",
						fontSize: "0.8125rem",
					}}
					title="Полный рабочий день 08:00–20:00"
				>
					<span>Полный день 08:00–20:00</span>
				</button>
				{children}
			</div>
		);
	},
);

export const RosterTemplateActions: React.FC<RosterTemplateActionsProps> = React.memo(
	function RosterTemplateActions(props) {
		return (
			<>
				<RosterQuickActionsGroup {...props} />
				<RosterPresetsStrip onApplyPreset={props.onApplyPreset} />
			</>
		);
	},
);
