import {
	Check,
	Droplets,
	Eye,
	Flame,
	Flower2,
	Laptop,
	Moon,
	Sparkles,
	Sun,
	Trees,
	Waves,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { type ThemeMode, useThemeStore } from "../../store/themeStore";
import { DENTE_THEMES, type ThemeMetadata } from "./themeData";

interface ThemeSwitcherModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

const THEME_ICONS: Record<
	ThemeMode,
	React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
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

export function ThemeSwitcherModal({
	isOpen,
	onClose,
}: ThemeSwitcherModalProps) {
	const currentTheme = useThemeStore((state) => state.themeMode);
	const setThemeMode = useThemeStore((state) => state.setThemeMode);
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return undefined;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSelect = (mode: ThemeMode) => {
		setThemeMode(mode);
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
			style={{ zIndex: 10000 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="theme-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={modalRef}
				className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				style={{
					backgroundColor: "var(--glass-panel, var(--paper-strong))",
					backdropFilter: "blur(20px)",
					WebkitBackdropFilter: "blur(20px)",
					borderColor: "var(--glass-border, var(--line-strong))",
					color: "var(--ink)",
					boxShadow:
						"0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px var(--teal-soft, rgba(13, 148, 136, 0.2))",
				}}
			>
				{/* Modal Header */}
				<div
					className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b"
					style={{
						borderColor: "var(--line)",
						backgroundColor: "var(--paper-soft)",
					}}
				>
					<div className="flex items-center gap-3">
						<div
							className="p-2 rounded-xl flex items-center justify-center shrink-0"
							style={{
								backgroundColor: "var(--teal-surface)",
								color: "var(--teal)",
								border: "1px solid var(--line)",
							}}
						>
							<Sparkles size={18} aria-hidden="true" />
						</div>
						<div>
							<h2
								id="theme-modal-title"
								className="text-base sm:text-lg font-bold leading-tight"
							>
								Темы оформления DENTE CRM
							</h2>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								10 специализированных медицинских палитр с атмосферной глубиной
								и WCAG AAA
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg transition-colors hover:opacity-80 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
						style={{ color: "var(--muted)" }}
						aria-label="Закрыть окно выбора тем"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Themes Grid */}
				<div className="flex-1 overflow-y-auto p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
					{DENTE_THEMES.map((theme: ThemeMetadata) => {
						const isSelected = currentTheme === theme.id;
						const Icon = THEME_ICONS[theme.id] || Sparkles;

						return (
							<button
								key={theme.id}
								type="button"
								onClick={() => handleSelect(theme.id)}
								className="flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer relative group hover:scale-[1.005]"
								style={{
									backgroundColor: isSelected
										? "var(--teal-surface)"
										: "var(--paper)",
									borderColor: isSelected ? "var(--teal)" : "var(--line)",
									boxShadow: isSelected
										? "0 0 12px var(--teal-soft), 0 0 0 1.5px var(--teal)"
										: "none",
								}}
							>
								{/* Card Header */}
								<div className="flex items-center justify-between w-full mb-1.5">
									<div className="flex items-center gap-2">
										<span
											className="w-3 h-3 rounded-full shrink-0 border"
											style={{
												backgroundColor: theme.primaryDot,
												borderColor: "var(--line)",
											}}
											aria-hidden="true"
										/>
										<Icon
											size={15}
											className="shrink-0 opacity-85"
											style={{ color: isSelected ? "var(--teal)" : "var(--ink-2)" }}
											aria-hidden="true"
										/>
										<span className="font-semibold text-xs sm:text-sm">{theme.name}</span>
									</div>

									<div className="flex items-center gap-1.5">
										<span
											className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
											style={{
												backgroundColor: "var(--paper-soft)",
												color: "var(--muted)",
												border: "1px solid var(--line)",
											}}
										>
											{theme.badge}
										</span>
										{isSelected && (
											<span
												className="p-0.5 rounded-full shrink-0 flex items-center justify-center"
												style={{
													backgroundColor: "var(--teal)",
													color: "var(--on-teal, #ffffff)",
												}}
											>
												<Check size={10} strokeWidth={3} aria-hidden="true" />
											</span>
										)}
									</div>
								</div>

								{/* Description */}
								<p
									className="text-[11px] sm:text-xs mb-2 flex-1 line-clamp-2 leading-relaxed"
									style={{ color: "var(--muted)" }}
								>
									{theme.description}
								</p>

								{/* Card Footer: Palette preview & WCAG */}
								<div
									className="flex items-center justify-between pt-1.5 border-t text-[10.5px]"
									style={{ borderColor: "var(--line)", color: "var(--muted)" }}
								>
									<div className="flex items-center gap-1.5">
										<span className="font-mono opacity-70">Контраст:</span>
										<span
											className="font-semibold"
											style={{ color: "var(--ink)" }}
										>
											{theme.wcagRatio}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										<span
											className="w-3.5 h-3.5 rounded border"
											style={{
												backgroundColor: theme.secondaryDot,
												borderColor: "var(--line)",
											}}
											title="Фон"
										/>
										<span
											className="w-3.5 h-3.5 rounded border"
											style={{
												backgroundColor: theme.primaryDot,
												borderColor: "var(--line)",
											}}
											title="Акцент"
										/>
									</div>
								</div>
							</button>
						);
					})}
				</div>

				{/* Modal Footer */}
				<div
					className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-t text-xs"
					style={{
						borderColor: "var(--line)",
						backgroundColor: "var(--paper-soft)",
					}}
				>
					<span style={{ color: "var(--muted)" }}>
						Выбранная палитра мгновенно применяется ко всем рабочим экранам
					</span>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all cursor-pointer min-h-[32px] sm:h-8 flex items-center justify-center hover:opacity-90"
						style={{
							backgroundColor: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
						}}
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
}
