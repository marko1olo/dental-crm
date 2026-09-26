import { Check, Sparkles, X, Sun, Moon, Droplets, Flower2, Trees, Zap, Flame, Waves, Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import { type ThemeMode, useThemeStore } from "../../store/themeStore";
import { DENTE_THEMES, type ThemeMetadata } from "./themeData";

interface ThemeSwitcherModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

const THEME_ICONS: Record<ThemeMode, React.ComponentType<{ size?: number; className?: string }>> = {
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
	auto: Sparkles,
};

export function ThemeSwitcherModal({ isOpen, onClose }: ThemeSwitcherModalProps) {
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

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="theme-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={modalRef}
				className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
				style={{
					backgroundColor: "var(--paper-strong)",
					borderColor: "var(--line-strong)",
					color: "var(--ink)",
				}}
			>
				{/* Modal Header */}
				<div
					className="flex items-center justify-between px-6 py-4 border-b"
					style={{ borderColor: "var(--line)", backgroundColor: "var(--paper)" }}
				>
					<div className="flex items-center gap-3">
						<div
							className="p-2 rounded-xl flex items-center justify-center"
							style={{ backgroundColor: "var(--teal-surface)", color: "var(--teal)" }}
						>
							<Sparkles size={20} aria-hidden="true" />
						</div>
						<div>
							<h2 id="theme-modal-title" className="text-lg font-bold leading-tight">
								Темы оформления DENTE CRM
							</h2>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								10 специализированных медицинских палитр с атмосферной глубиной и WCAG AAA
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg transition-colors hover:opacity-80"
						style={{ color: "var(--muted)" }}
						aria-label="Закрыть окно выбора тем"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Themes Grid */}
				<div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					{DENTE_THEMES.map((theme: ThemeMetadata) => {
						const isSelected = currentTheme === theme.id;
						const Icon = THEME_ICONS[theme.id] || Sparkles;

						return (
							<button
								key={theme.id}
								type="button"
								onClick={() => handleSelect(theme.id)}
								className="flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative"
								style={{
									backgroundColor: isSelected ? "var(--teal-surface)" : "var(--paper)",
									borderColor: isSelected ? "var(--teal)" : "var(--line)",
									boxShadow: isSelected ? "0 0 0 2px var(--teal)" : "none",
								}}
							>
								{/* Card Header */}
								<div className="flex items-center justify-between w-full mb-2">
									<div className="flex items-center gap-2.5">
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border"
											style={{
												backgroundColor: theme.primaryDot,
												borderColor: "var(--line)",
											}}
										/>
										<Icon size={16} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
										<span className="font-semibold text-sm">{theme.name}</span>
									</div>

									<div className="flex items-center gap-2">
										<span
											className="text-[11px] px-2 py-0.5 rounded-full font-medium"
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
												className="p-1 rounded-full shrink-0"
												style={{ backgroundColor: "var(--teal)", color: "#ffffff" }}
											>
												<Check size={12} strokeWidth={3} aria-hidden="true" />
											</span>
										)}
									</div>
								</div>

								{/* Description */}
								<p className="text-xs mb-3 flex-1" style={{ color: "var(--muted)" }}>
									{theme.description}
								</p>

								{/* Card Footer: Palette preview & WCAG */}
								<div
									className="flex items-center justify-between pt-2 border-t text-[11px]"
									style={{ borderColor: "var(--line)", color: "var(--muted)" }}
								>
									<div className="flex items-center gap-1.5">
										<span className="font-mono">Контраст:</span>
										<span className="font-semibold" style={{ color: "var(--ink)" }}>
											{theme.wcagRatio}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										<span
											className="w-4 h-4 rounded border"
											style={{ backgroundColor: theme.secondaryDot, borderColor: "var(--line)" }}
											title="Фон"
										/>
										<span
											className="w-4 h-4 rounded border"
											style={{ backgroundColor: theme.primaryDot, borderColor: "var(--line)" }}
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
					className="flex items-center justify-between px-6 py-3 border-t text-xs"
					style={{ borderColor: "var(--line)", backgroundColor: "var(--paper-soft)" }}
				>
					<span style={{ color: "var(--muted)" }}>
						Настройки темы автоматически сохраняются в браузере и на вашем рабочем месте
					</span>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
						style={{ backgroundColor: "var(--teal)", color: "#ffffff" }}
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
}
