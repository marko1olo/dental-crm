import React from "react";
import { Check, Copy, MessageSquare, Moon, RefreshCw, Sun } from "lucide-react";
import type { ChannelConfig } from "./types";

export interface ScenarioPresetTab {
	id: string;
	label: string;
}

export const SCENARIO_PRESET_TABS: ScenarioPresetTab[] = [
	{ id: "root", label: "Приветствие" },
	{ id: "booking", label: "Онлайн-запись" },
	{ id: "reminders", label: "Напоминание" },
	{ id: "estimate", label: "Смета и план" },
	{ id: "reviews", label: "Отзывы" },
	{ id: "price_faq", label: "Прейскурант" },
	{ id: "admin_chat", label: "Администратор" },
];

export interface PhoneSimulatorPresetSelectorProps {
	config: ChannelConfig;
	currentScreenId: string;
	activeTheme: "light" | "dark";
	copied: boolean;
	onSelectScreen: (screenId: string) => void;
	onCopyText: () => void;
	onToggleTheme: () => void;
	onResetToStart: () => void;
}

export const PhoneSimulatorPresetSelector: React.FC<
	PhoneSimulatorPresetSelectorProps
> = ({
	config,
	currentScreenId,
	activeTheme,
	copied,
	onSelectScreen,
	onCopyText,
	onToggleTheme,
	onResetToStart,
}) => {
	return (
		<div
			className="tg-sim-control-panel"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				width: "100%",
				overflowX: "clip",
			}}
		>
			{/* Top Simulator Control Toolbar */}
			<div
				className="tg-sim-toolbar"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					padding: "6px 12px",
					background:
						activeTheme === "dark"
							? "var(--card-bg, #1e293b)"
							: "var(--paper, #ffffff)",
					border:
						activeTheme === "dark"
							? "1px solid rgba(51, 65, 85, 0.7)"
							: "1px solid var(--line, rgba(148, 163, 184, 0.25))",
					borderRadius: "12px",
					fontSize: "11px",
					whiteSpace: "nowrap",
					minHeight: "44px",
					boxSizing: "border-box",
				}}
			>
				<div
					className="tg-sim-toolbar-title"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontWeight: 600,
						flexShrink: 0,
						color:
							activeTheme === "dark"
								? "var(--paper-white, #f8fafc)"
								: "var(--ink, #0f172a)",
					}}
				>
					<MessageSquare
						size={15}
						style={{ color: config.iconColor }}
						aria-hidden="true"
					/>
					<span>{config.badge}</span>
					<span
						className="tg-sim-live-badge"
						style={{
							fontSize: "9px",
							fontWeight: 700,
							textTransform: "uppercase",
							padding: "2px 6px",
							borderRadius: "4px",
							background: "rgba(13, 148, 136, 0.15)",
							color: "var(--teal, #0d9488)",
						}}
					>
						Live
					</span>
				</div>

				<div
					className="tg-sim-toolbar-actions"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						flexShrink: 0,
					}}
				>
					<button
						type="button"
						onClick={onCopyText}
						className="tg-sim-tool-btn"
						title="Копировать текст сообщения"
						data-testid="tg-copy-message-btn"
						style={{
							minHeight: "36px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: "4px 8px",
							borderRadius: "8px",
							border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
							background: "transparent",
							fontSize: "11px",
							fontWeight: 500,
							cursor: "pointer",
							color:
								activeTheme === "dark"
									? "var(--paper-white, #cbd5e1)"
									: "var(--ink, #475569)",
							transition: "all 0.15s ease",
						}}
					>
						{copied ? (
							<Check size={13} color="#10b981" />
						) : (
							<Copy size={13} />
						)}
						<span>{copied ? "Скопировано" : "Копия"}</span>
					</button>

					<button
						type="button"
						onClick={onToggleTheme}
						className="tg-sim-tool-btn"
						title={
							activeTheme === "light"
								? "Включить тёмную тему предпросмотра"
								: "Включить светлую тему предпросмотра"
						}
						style={{
							minHeight: "36px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: "4px 8px",
							borderRadius: "8px",
							border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
							background: "transparent",
							fontSize: "11px",
							fontWeight: 500,
							cursor: "pointer",
							color:
								activeTheme === "dark"
									? "var(--paper-white, #cbd5e1)"
									: "var(--ink, #475569)",
							transition: "all 0.15s ease",
						}}
					>
						{activeTheme === "light" ? (
							<Moon size={13} />
						) : (
							<Sun size={13} />
						)}
						<span>Тема</span>
					</button>

					<button
						type="button"
						onClick={onResetToStart}
						className="tg-sim-tool-btn"
						title="Перезапустить диалог бота"
						style={{
							minHeight: "36px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: "4px 8px",
							borderRadius: "8px",
							border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
							background: "transparent",
							fontSize: "11px",
							fontWeight: 500,
							cursor: "pointer",
							color:
								activeTheme === "dark"
									? "var(--paper-white, #cbd5e1)"
									: "var(--ink, #475569)",
							transition: "all 0.15s ease",
						}}
					>
						<RefreshCw size={13} />
						<span>/start</span>
					</button>
				</div>
			</div>

			{/* Scenario Preset Switcher Ribbon */}
			<div
				className="tg-template-quick-chips"
				style={{
					display: "flex",
					gap: "6px",
					padding: "8px 10px",
					background:
						activeTheme === "dark"
							? "rgba(15, 23, 42, 0.5)"
							: "var(--paper-soft, rgba(0, 0, 0, 0.03))",
					border:
						activeTheme === "dark"
							? "1px solid rgba(51, 65, 85, 0.5)"
							: "1px solid var(--line, rgba(0, 0, 0, 0.08))",
					borderRadius: "12px",
					overflowX: "auto",
					scrollbarWidth: "none",
					WebkitOverflowScrolling: "touch",
				}}
			>
				{SCENARIO_PRESET_TABS.map((tab) => {
					const isSelected = currentScreenId === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onSelectScreen(tab.id)}
							style={{
								minHeight: "36px",
								padding: "4px 12px",
								fontSize: "11px",
								fontWeight: isSelected ? 600 : 500,
								borderRadius: "8px",
								border: isSelected
									? "none"
									: "1px solid var(--line, rgba(148, 163, 184, 0.35))",
								background: isSelected
									? "var(--teal, #0d9488)"
									: activeTheme === "dark"
										? "var(--card-bg, #1e293b)"
										: "var(--paper, #ffffff)",
								color: isSelected
									? "#ffffff"
									: activeTheme === "dark"
										? "var(--paper-white, #cbd5e1)"
										: "var(--ink, #0f172a)",
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								transition: "all 0.15s ease",
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
