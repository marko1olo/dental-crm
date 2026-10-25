import { Check, Palette } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { useThemeStore } from "../../../store/themeStore";
import { THEME_OPTIONS } from "../doctorClinicalPreferencesConstants";

export function DoctorThemeSelectorCard() {
	const themeMode = useThemeStore((s) => s.themeMode);
	const setThemeMode = useThemeStore((s) => s.setThemeMode);

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Palette size={15} className="text-[var(--teal)]" />
					<span>Тема оформления кабинета</span>
				</label>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Мгновенное переключение без перезагрузки страницы
				</span>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
				{THEME_OPTIONS.map((theme) => {
					const isCurrent = themeMode === theme.mode;
					return (
						<button
							key={theme.mode}
							type="button"
							onClick={() => {
								setThemeMode(theme.mode);
								showToast(`Тема «${theme.title}» активирована`, "success");
							}}
							className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[44px] ${
								isCurrent
									? "bg-[var(--paper-card)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper-card)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
						>
							<div className="flex items-center justify-between gap-1 w-full">
								<span className="text-xs font-bold text-[var(--ink)] truncate">{theme.title}</span>
								{isCurrent && (
									<span className="w-4 h-4 rounded-full bg-[var(--teal)] text-[var(--on-teal)] flex items-center justify-center shrink-0">
										<Check size={10} className="stroke-[3]" />
									</span>
								)}
							</div>
							<div className="flex items-center gap-1 my-0.5">
								<div
									className="w-4 h-4 rounded-full border border-[var(--line)] shrink-0"
									style={{ backgroundColor: theme.previewColors[0] }}
									title="Фон"
								/>
								<div
									className="w-4 h-4 rounded-full border border-[var(--line)] shrink-0"
									style={{ backgroundColor: theme.previewColors[1] }}
									title="Карточка"
								/>
								<div
									className="w-4 h-4 rounded-full shrink-0"
									style={{ backgroundColor: theme.previewColors[2] }}
									title="Акцент"
								/>
								<span className="text-[10px] text-[var(--muted)] ml-auto font-medium">
									{theme.badge}
								</span>
							</div>
							<p className="text-[10px] text-[var(--muted)] m-0 line-clamp-1">{theme.desc}</p>
						</button>
					);
				})}
			</div>
		</div>
	);
}
