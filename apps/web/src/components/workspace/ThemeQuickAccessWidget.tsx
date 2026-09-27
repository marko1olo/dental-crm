import {
	ChevronDown,
	Droplets,
	Eye,
	Flame,
	Flower2,
	Laptop,
	Moon,
	Palette,
	Sparkles,
	Sun,
	Trees,
	Waves,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { type ThemeMode, useThemeStore } from "../../store/themeStore";
import { ThemeSwitcherModal } from "../theme/ThemeSwitcherModal";
import { DENTE_THEMES, type ThemeMetadata } from "../theme/themeData";

const THEME_ICONS: Record<
	ThemeMode,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	light: Sun,
	dark: Moon,
	night: Sparkles,
	ocean: Droplets,
	sakura: Flower2,
	emerald: Trees,
	cyber_xray: Zap,
	warm_sand: Flame,
	calm_teal: Waves,
	contrast: Eye,
	auto: Laptop,
};

export interface ThemeQuickAccessWidgetProps {
	readonly className?: string;
	readonly collapsed?: boolean;
	readonly variant?: "sidebar" | "topbar" | "footer";
}

/**
 * Quiet UI / System Silence Theme Access Control (Mandates 8p, 8c, 8e, Art Director's Bible).
 * Provides a quiet, noble control to preview and switch between all 10 clinical themes.
 * Zero neon glow, zero carnival colors, strict adherence to System Silence.
 * Supports desktop topbar (32px, 8px radius) and sidebar (collapsed icon or expanded bar) variants.
 */
export function ThemeQuickAccessWidget({
	className = "",
	collapsed = false,
	variant = "sidebar",
}: ThemeQuickAccessWidgetProps) {
	const currentMode = useThemeStore((state) => state.themeMode);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Listen for global custom event to open theme switcher from any part of the app
	useEffect(() => {
		const handleOpen = () => setIsModalOpen(true);
		window.addEventListener("dente:open-theme-switcher", handleOpen);
		return () =>
			window.removeEventListener("dente:open-theme-switcher", handleOpen);
	}, []);

	const currentMeta = DENTE_THEMES.find(
		(t: ThemeMetadata) => t.id === currentMode,
	);
	const Icon = THEME_ICONS[currentMode] || Palette;
	const dotColor = currentMeta?.primaryDot || "#0d9488";
	const label = currentMeta?.name || "Тема оформления";

	if (variant === "footer") {
		return (
			<>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className={`theme-footer-control h-[30px] min-h-[30px] max-h-[30px] px-2 rounded-lg border inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer text-[11px] font-semibold hover:border-[var(--teal,#0d9488)] ${className}`}
					style={{
						backgroundColor: "var(--paper-soft, rgba(0, 0, 0, 0.03))",
						borderColor: "var(--line)",
						color: "var(--ink)",
					}}
					aria-haspopup="dialog"
					aria-expanded={isModalOpen}
					aria-label={`Тема оформления: ${label}. Нажмите для выбора из 10 тем`}
					title={`Тема оформления: ${label} (${currentMeta?.badge || "10 тем"}). Нажмите для смены темы`}
					data-testid="sidebar-footer-theme-switcher-btn"
				>
					<span
						className="w-2 h-2 rounded-full shrink-0 border"
						style={{
							backgroundColor: dotColor,
							borderColor: "var(--line)",
						}}
						aria-hidden="true"
					/>
					<Icon size={12} className="shrink-0 opacity-75" aria-hidden="true" />
					{!collapsed && (
						<span className="truncate max-w-[65px] text-[11px] font-medium leading-none">
							{currentMeta?.shortLabel || label}
						</span>
					)}
				</button>

				<ThemeSwitcherModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			</>
		);
	}

	if (variant === "topbar") {
		return (
			<>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className={`theme-topbar-control h-8 min-h-[32px] max-h-8 px-2.5 rounded-lg border inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer text-xs font-semibold hover:border-[var(--line-strong)] ${className}`}
					style={{
						backgroundColor: "var(--paper)",
						borderColor: "var(--line)",
						color: "var(--ink)",
					}}
					aria-haspopup="dialog"
					aria-expanded={isModalOpen}
					aria-label={`Тема оформления: ${label}. Нажмите для выбора из 10 тем`}
					title={`Тема оформления: ${label} (${currentMeta?.badge || "10 тем"}). Нажмите для смены темы`}
					data-testid="topbar-theme-switcher-btn"
				>
					<span
						className="w-2.5 h-2.5 rounded-full shrink-0 border"
						style={{
							backgroundColor: dotColor,
							borderColor: "var(--line)",
						}}
						aria-hidden="true"
					/>
					<Icon size={14} className="shrink-0 opacity-75" aria-hidden="true" />
					<span className="truncate text-[12px] font-semibold">
						{currentMeta?.shortLabel || label}
					</span>
					<ChevronDown
						size={12}
						className="opacity-50 shrink-0 ml-0.5"
						aria-hidden="true"
					/>
				</button>

				<ThemeSwitcherModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			</>
		);
	}

	if (collapsed) {
		return (
			<>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className={`quick-theme-trigger-collapsed w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer relative group ${className}`}
					style={{
						backgroundColor: "var(--paper-soft)",
						borderColor: "var(--line)",
						color: "var(--ink-2)",
					}}
					aria-haspopup="dialog"
					aria-expanded={isModalOpen}
					aria-label={`Тема: ${label}. Нажмите для выбора из 10 тем`}
					title={`Тема: ${label}. Нажмите для выбора из 10 тем`}
					data-testid="sidebar-theme-switcher-btn"
				>
					<Icon size={16} className="opacity-80 group-hover:opacity-100" aria-hidden="true" />
					{/* Micro status dot */}
					<span
						className="absolute bottom-1 right-1 w-2 h-2 rounded-full border"
						style={{
							backgroundColor: dotColor,
							borderColor: "var(--line)",
						}}
						aria-hidden="true"
					/>
				</button>

				<ThemeSwitcherModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			</>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setIsModalOpen(true)}
				className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer min-h-[32px] hover:border-[var(--line-strong)] ${className}`}
				style={{
					backgroundColor: "var(--paper-soft)",
					borderColor: "var(--line)",
					color: "var(--ink)",
				}}
				aria-haspopup="dialog"
				aria-expanded={isModalOpen}
				aria-label={`Тема оформления: ${label}. Открыть выбор из 10 тем`}
				title={`Тема: ${label} (${currentMeta?.badge || "10 специализированных палитр"}). Нажмите для смены`}
				data-testid="sidebar-theme-switcher-btn"
			>
				<div className="flex items-center gap-2 min-w-0">
					{/* Noble, quiet color dot without neon glow */}
					<span
						className="w-2.5 h-2.5 rounded-full shrink-0 border"
						style={{
							backgroundColor: dotColor,
							borderColor: "var(--line)",
						}}
						aria-hidden="true"
					/>
					<Icon size={14} className="shrink-0 opacity-70" aria-hidden="true" />
					<span className="truncate text-[12px] font-semibold">
						{currentMeta?.shortLabel || label}
					</span>
				</div>

				<ChevronDown
					size={12}
					className="opacity-50 shrink-0 ml-1"
					aria-hidden="true"
				/>
			</button>

			<ThemeSwitcherModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	);
}
