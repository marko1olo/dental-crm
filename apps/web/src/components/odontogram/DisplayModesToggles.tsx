import type { OdontogramViewMode } from "@dental/shared";
import { Activity, Eye, EyeOff } from "lucide-react";
import React from "react";

export interface DisplayModesTogglesProps {
	readonly showWisdomTeeth: boolean;
	readonly setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	readonly activeMode: OdontogramViewMode;
	readonly showPulpAndCanals: boolean;
	readonly setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DisplayModesToggles: React.FC<DisplayModesTogglesProps> = ({
	showWisdomTeeth,
	setShowWisdomTeeth,
	activeMode,
	showPulpAndCanals,
	setShowPulpAndCanals,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={() => setShowWisdomTeeth((prev) => !prev)}
				className={`min-h-[36px] max-md:min-h-[44px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
					showWisdomTeeth
						? "bg-[var(--teal-soft,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)]/40 shadow-2xs"
						: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
				title="Скрыть или показать третьи моляры (18, 28, 38, 48) на схеме"
				data-testid="btn-odontogram-wisdom-visibility"
			>
				<span className="flex items-center gap-2.5 min-w-0">
					{showWisdomTeeth ? (
						<Eye
							size={16}
							className="shrink-0 text-[var(--teal,#0d9488)]"
						/>
					) : (
						<EyeOff
							size={16}
							className="shrink-0 text-[var(--ink-muted,#64748b)]"
						/>
					)}
					<div className="flex flex-col text-left min-w-0">
						<span className="font-bold text-[12px] leading-tight text-[var(--ink,#0f172a)]">
							Показ зубов мудрости (8-ки)
						</span>
						<span className="text-[10px] font-normal text-[var(--ink-muted,#64748b)] truncate">
							Отображение 18, 28, 38, 48 на схеме
						</span>
					</div>
				</span>
				<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] shrink-0 ml-2 border border-[var(--line,#e2e8f0)]">
					{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}
				</span>
			</button>

			{activeMode === "anatomical_svg" && (
				<button
					type="button"
					onClick={() => setShowPulpAndCanals((prev) => !prev)}
					className={`min-h-[36px] max-md:min-h-[44px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
						showPulpAndCanals
							? "bg-[var(--teal-soft,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)]/40 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
					title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
					data-testid="btn-odontogram-pulp-canals"
				>
					<span className="flex items-center gap-2.5 min-w-0">
						<Activity
							size={16}
							className={`shrink-0 ${showPulpAndCanals ? "text-[var(--teal,#0d9488)]" : "text-[var(--ink-muted,#64748b)]"}`}
						/>
						<div className="flex flex-col text-left min-w-0">
							<span className="font-bold text-[12px] leading-tight text-[var(--ink,#0f172a)]">
								Каналы и пульпа
							</span>
							<span className="text-[10px] font-normal text-[var(--ink-muted,#64748b)] truncate">
								Рентген-прозрачность эмали для эндодонтии
							</span>
						</div>
					</span>
					<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] shrink-0 ml-2 border border-[var(--line,#e2e8f0)]">
						{showPulpAndCanals ? "ВКЛ" : "ВЫКЛ"}
					</span>
				</button>
			)}
		</>
	);
};
