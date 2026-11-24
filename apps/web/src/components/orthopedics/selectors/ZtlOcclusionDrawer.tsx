import React from "react";
import { Sliders, Activity, Compass } from "lucide-react";

export type ArticulatorType = "bio_art" | "kavo_protar" | "average_anatomical";
export type GuidanceType = "canine_guidance" | "group_function" | "mutually_protected" | "balanced_articulation";

export interface OcclusionProfile {
	articulatorType: ArticulatorType;
	facebow: boolean;
	guidanceType: GuidanceType;
	sagittalCondylarAngleDeg: number;
	bennettAngleDeg: number;
}

export interface ZtlOcclusionDrawerProps {
	readonly activeArticulator: ArticulatorType;
	readonly onSelectArticulator: (type: ArticulatorType) => void;
	readonly activeFacebow: boolean;
	readonly onToggleFacebow: (checked: boolean) => void;
	readonly guidanceType?: GuidanceType | undefined;
	readonly onChangeGuidanceType?: ((type: GuidanceType) => void) | undefined;
	readonly sagittalCondylarAngleDeg?: number | undefined;
	readonly onChangeSagittalAngle?: ((deg: number) => void) | undefined;
	readonly bennettAngleDeg?: number | undefined;
	readonly onChangeBennettAngle?: ((deg: number) => void) | undefined;
	readonly occlusionProfile?: OcclusionProfile | undefined;
	readonly onChangeOcclusionProfile?: ((profile: OcclusionProfile) => void) | undefined;
}

const GUIDANCE_OPTIONS: readonly { id: GuidanceType; label: string; desc: string }[] = [
	{ id: "canine_guidance", label: "Клыковое ведение", desc: "Разобщение моляров при латеротрузии" },
	{ id: "group_function", label: "Групповая функция", desc: "Контакт щечных бугров рабочей стороны" },
	{ id: "mutually_protected", label: "Взаимно-защищенная", desc: "Боковые защищают фронтальные в окклюзии" },
	{ id: "balanced_articulation", label: "Сбалансированная", desc: "Двусторонний баланс для съемных работ" },
];

export function ZtlOcclusionDrawer({
	activeArticulator,
	onSelectArticulator,
	activeFacebow,
	onToggleFacebow,
	guidanceType = "canine_guidance",
	onChangeGuidanceType,
	sagittalCondylarAngleDeg = 33,
	onChangeSagittalAngle,
	bennettAngleDeg = 15,
	onChangeBennettAngle,
	occlusionProfile,
	onChangeOcclusionProfile,
}: ZtlOcclusionDrawerProps) {
	const currentGuidance = occlusionProfile?.guidanceType ?? guidanceType;
	const currentSagittal = occlusionProfile?.sagittalCondylarAngleDeg ?? sagittalCondylarAngleDeg;
	const currentBennett = occlusionProfile?.bennettAngleDeg ?? bennettAngleDeg;
	const currentArticulator = occlusionProfile?.articulatorType ?? activeArticulator;
	const currentFacebow = occlusionProfile?.facebow ?? activeFacebow;

	const updateProfile = (patch: Partial<OcclusionProfile>) => {
		const next: OcclusionProfile = {
			articulatorType: patch.articulatorType ?? currentArticulator,
			facebow: patch.facebow ?? currentFacebow,
			guidanceType: patch.guidanceType ?? currentGuidance,
			sagittalCondylarAngleDeg: patch.sagittalCondylarAngleDeg ?? currentSagittal,
			bennettAngleDeg: patch.bennettAngleDeg ?? currentBennett,
		};
		onChangeOcclusionProfile?.(next);
	};

	const handleArticulatorClick = (art: ArticulatorType) => {
		onSelectArticulator(art);
		updateProfile({ articulatorType: art });
	};

	const handleFacebowChange = (checked: boolean) => {
		onToggleFacebow(checked);
		updateProfile({ facebow: checked });
	};

	const handleGuidanceClick = (guidance: GuidanceType) => {
		onChangeGuidanceType?.(guidance);
		updateProfile({ guidanceType: guidance });
	};

	const handleSagittalChange = (val: number) => {
		const safeVal = Math.min(60, Math.max(10, val));
		onChangeSagittalAngle?.(safeVal);
		updateProfile({ sagittalCondylarAngleDeg: safeVal });
	};

	const handleBennettChange = (val: number) => {
		const safeVal = Math.min(30, Math.max(0, val));
		onChangeBennettAngle?.(safeVal);
		updateProfile({ bennettAngleDeg: safeVal });
	};

	return (
		<div className="mb-2.5 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="occlusion-section">
			{/* Заголовок */}
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Окклюзия и артикулятор:
					</span>
					<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
						Цифровое моделирование CAD/CAM
					</span>
				</div>
				<span className="text-[11px] text-[var(--ink-muted)] truncate">
					Биомеханика движений нижней челюсти и CAD/CAM профиль
				</span>
			</div>

			{/* Выбор артикулятора и лицевая дуга */}
			<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
				<div className="flex flex-wrap items-center gap-1.5">
					{[
						{ id: "bio_art" as const, label: "Полурегулируемый (Arcon)" },
						{ id: "kavo_protar" as const, label: "Полностью регулируемый (Non-Arcon)" },
						{ id: "average_anatomical" as const, label: "Среднеанатомический" },
					].map((art) => {
						const isSelected = currentArticulator === art.id;
						return (
							<button
								key={art.id}
								type="button"
								onClick={() => handleArticulatorClick(art.id)}
								className={`min-h-[44px] sm:h-9 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
									isSelected
										? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] ring-1 ring-[var(--primary)] shadow-2xs font-bold"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--paper-subtle)]"
								}`}
								data-testid={`articulator-chip-${art.id}`}
							>
								{art.label}
							</button>
						);
					})}
				</div>

				<label className="flex items-center gap-2 px-2.5 py-1 min-h-[44px] sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] cursor-pointer select-none" data-testid="facebow-checkbox-label">
					<input
						type="checkbox"
						checked={currentFacebow}
						onChange={(e) => handleFacebowChange(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
						data-testid="facebow-checkbox"
					/>
					<span>{`Лицевая дуга (суставной путь ${currentSagittal}° / Беннетт ${currentBennett}°)`}</span>
				</label>
			</div>

			{/* Окклюзионная схема ведения (Клыковое / Групповая / Защищенная) */}
			<div className="pt-2 border-t border-[var(--line)]/60">
				<div className="flex items-center gap-1 mb-1.5">
					<Activity size={13} className="text-[var(--primary)]" />
					<span className="text-[11px] font-semibold text-[var(--ink)]">Схема ведения в латеротрузии:</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
					{GUIDANCE_OPTIONS.map((opt) => {
						const active = currentGuidance === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleGuidanceClick(opt.id)}
								className={`p-2 rounded-lg text-left border transition-all flex flex-col justify-between ${
									active
										? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] shadow-2xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--paper-subtle)]"
								}`}
								data-testid={`guidance-chip-${opt.id}`}
							>
								<span className="text-xs font-bold leading-tight truncate">{opt.label}</span>
								<span className="text-[10px] text-[var(--ink-muted)] mt-0.5 line-clamp-1">{opt.desc}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Углы суставного пути и угол Беннетта */}
			<div className="pt-2 border-t border-[var(--line)]/60 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Compass size={13} className="text-[var(--primary)]" />
					<span className="text-[11px] font-semibold text-[var(--ink)]">Суставные углы (CAD/CAM):</span>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5 text-xs text-[var(--ink)]">
						<span className="text-[var(--ink-muted)] text-[11px]">Сагиттальный путь:</span>
						<input
							type="number"
							min={10}
							max={60}
							value={currentSagittal}
							onChange={(e) => handleSagittalChange(Number.parseInt(e.target.value, 10) || 33)}
							className="w-14 h-7 text-center rounded-md border border-[var(--line)] bg-[var(--paper)] font-mono text-xs font-semibold text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none"
							data-testid="sagittal-angle-input"
						/>
						<span className="text-[11px] font-mono text-[var(--ink-muted)]">°</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-[var(--ink)]">
						<span className="text-[var(--ink-muted)] text-[11px]">Угол Беннетта:</span>
						<input
							type="number"
							min={0}
							max={30}
							value={currentBennett}
							onChange={(e) => handleBennettChange(Number.parseInt(e.target.value, 10) || 15)}
							className="w-14 h-7 text-center rounded-md border border-[var(--line)] bg-[var(--paper)] font-mono text-xs font-semibold text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none"
							data-testid="bennett-angle-input"
						/>
						<span className="text-[11px] font-mono text-[var(--ink-muted)]">°</span>
					</div>
				</div>
			</div>
		</div>
	);
}
