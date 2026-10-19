import { ToothShadeGuide } from "../../icons/DentalIcons";
import { SHADE_SWATCH_MAP } from "../labShadesData";

export interface DentalLabShadeHeaderProps {
	readonly currentSystem: "classical" | "3d_master" | "bleach" | "stump";
	readonly onSystemChange: (
		sys: "classical" | "3d_master" | "bleach" | "stump",
	) => void;
	readonly selectedShade: string;
	readonly selectedStumpShade?: string | null;
	readonly showBleachTab?: boolean;
}

export function DentalLabShadeHeader({
	currentSystem,
	onSystemChange,
	selectedShade,
	selectedStumpShade,
	showBleachTab,
}: DentalLabShadeHeaderProps) {
	const currentSwatch = SHADE_SWATCH_MAP[selectedShade];

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2 flex-wrap min-w-0">
				<ToothShadeGuide
					size={16}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] shrink-0">
					Шкала VITA:
				</span>
				<div className="dente-segmented-bar inline-flex items-center shrink-0 overflow-x-auto max-w-full scrollbar-none">
					<button
						type="button"
						onClick={() => onSystemChange("classical")}
						data-active={currentSystem === "classical" ? "true" : "false"}
						className={`dente-segmented-item min-h-[36px] ${currentSystem === "classical" ? "active" : ""}`}
						data-testid="vita-classical-tab"
					>
						VITA Classical
					</button>
					<button
						type="button"
						onClick={() => onSystemChange("3d_master")}
						data-active={currentSystem === "3d_master" ? "true" : "false"}
						className={`dente-segmented-item min-h-[36px] ${currentSystem === "3d_master" ? "active" : ""}`}
						data-testid="vita-3d-master-tab"
					>
						VITA 3D-Master
					</button>
					{showBleachTab && (
						<button
							type="button"
							onClick={() => onSystemChange("bleach")}
							data-active={currentSystem === "bleach" ? "true" : "false"}
							className={`dente-segmented-item min-h-[36px] ${currentSystem === "bleach" ? "active" : ""}`}
							data-testid="vita-bleach-tab"
						>
							Bleach
						</button>
					)}
					<button
						type="button"
						onClick={() => onSystemChange("stump")}
						data-active={currentSystem === "stump" ? "true" : "false"}
						className={`dente-segmented-item min-h-[36px] ${currentSystem === "stump" ? "active" : ""}`}
						data-testid="vita-stump-tab"
					>
						Культя (ND)
					</button>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-xs text-[var(--muted,#64748b)] font-medium">
					Выбранный оттенок:
				</span>
				<span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-600 text-white shadow-xs inline-flex items-center gap-1.5">
					{currentSwatch && (
						<span
							className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0"
							style={{ backgroundColor: currentSwatch.bg }}
							aria-hidden="true"
						/>
					)}
					<span>{selectedShade || "—"}</span>
				</span>
				{selectedStumpShade && (
					<span
						className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-amber-700 dark:bg-amber-600 text-white shadow-xs inline-flex items-center gap-1.5"
						title={`Культя зуба: ${selectedStumpShade}`}
						data-testid="selected-stump-shade-header-chip"
					>
						<span className="text-[10px] opacity-80">Культя:</span>
						<span>{selectedStumpShade}</span>
					</span>
				)}
			</div>
		</div>
	);
}
