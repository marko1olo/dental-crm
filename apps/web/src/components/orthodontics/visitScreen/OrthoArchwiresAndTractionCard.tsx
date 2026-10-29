import React from "react";
import {
	ARCHWIRE_MATERIALS,
	WORKHORSE_ARCHWIRES,
	ROUND_SECTIONS,
	RECT_SECTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	type ArchwireMaterial,
	type ArchwireSection,
	type ElasticScheme,
	type ElasticSize,
	type ElasticWearMode,
} from "../orthoProtocolTypes";

export interface OrthoArchwiresAndTractionCardProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly setArchwireMaterial: (mat: ArchwireMaterial) => void;
	readonly archwireSection: ArchwireSection;
	readonly setArchwireSection: (sec: ArchwireSection) => void;
	readonly selectedActions: string[];
	readonly setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
	readonly elasticScheme: ElasticScheme;
	readonly setElasticScheme: (sch: ElasticScheme) => void;
	readonly elasticSize: ElasticSize;
	readonly setElasticSize: (size: ElasticSize) => void;
	readonly elasticWear: ElasticWearMode;
	readonly setElasticWear: (wear: ElasticWearMode) => void;
}

export const OrthoArchwiresAndTractionCard: React.FC<OrthoArchwiresAndTractionCardProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
	selectedActions,
	setSelectedActions,
	elasticScheme,
	setElasticScheme,
	elasticSize,
	setElasticSize,
	elasticWear,
	setElasticWear,
}) => {
	const hasElasticTraction = selectedActions.includes("elastic_traction");

	const toggleElasticTraction = (checked: boolean) => {
		setSelectedActions((prev) =>
			checked ? [...prev, "elastic_traction"] : prev.filter((a) => a !== "elastic_traction"),
		);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* 1. Archwire Material & Sections */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-bold text-[var(--ink)]">Рабочая ортодонтическая дуга:</span>
					<div className="flex items-center gap-1 flex-wrap">
						{ARCHWIRE_MATERIALS.map((m: any) => {
							const mId = typeof m === "string" ? m : m.id;
							const mLabel = typeof m === "string" ? m.toUpperCase() : m.badge || m.label || mId.toUpperCase();
							const isActive = archwireMaterial === mId;
							return (
								<button
									key={mId}
									type="button"
									onClick={() => setArchwireMaterial(mId)}
									className={`px-2 py-0.5 rounded text-[11px] font-bold border min-h-[28px] transition-all ${
										isActive
											? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									{mLabel}
								</button>
							);
						})}
					</div>
				</div>

				{/* Workhorse Presets */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{WORKHORSE_ARCHWIRES.map((w) => {
						const isSelected = archwireMaterial === w.material && archwireSection === w.section;
						return (
							<button
								key={w.id}
								type="button"
								onClick={() => {
									setArchwireMaterial(w.material);
									setArchwireSection(w.section);
								}}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer min-h-[36px] transition-all ${
									isSelected
										? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{w.label}
							</button>
						);
					})}
				</div>

				{/* Custom Section Selector */}
				<div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]/60 flex-wrap">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Сечение:</span>
					<div className="flex items-center gap-1 flex-wrap">
						{[...ROUND_SECTIONS, ...RECT_SECTIONS].map((sec) => {
							const isSec = archwireSection === sec;
							return (
								<button
									key={sec}
									type="button"
									onClick={() => setArchwireSection(sec)}
									className={`px-2 py-0.5 rounded text-[10px] font-bold border min-h-[26px] ${
										isSec
											? "bg-[var(--teal)] text-white border-[var(--teal)]"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
									}`}
								>
									{sec}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* 2. Intermaxillary Elastics & Traction */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">Межчелюстные эластики:</span>
					<label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
						<input
							type="checkbox"
							checked={hasElasticTraction}
							onChange={(e) => toggleElasticTraction(e.target.checked)}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
						/>
						<span>Назначить тяги</span>
					</label>
				</div>

				{hasElasticTraction && (
					<div className="flex flex-col gap-2 pt-1">
						{/* Schemes */}
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
							{ELASTIC_SCHEMES.map((es) => {
								const isSelected = elasticScheme === es.id;
								return (
									<button
										key={es.id}
										type="button"
										onClick={() => setElasticScheme(es.id)}
										className={`p-2 rounded-lg text-left text-xs font-semibold border cursor-pointer min-h-[38px] transition-all ${
											isSelected
												? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-bold shadow-2xs"
												: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
										}`}
									>
										<div className="truncate font-bold">{(es as any).label || (es as any).name}</div>
										<div className="text-[10px] text-[var(--muted)] truncate">{(es as any).desc || (es as any).indication}</div>
									</button>
								);
							})}
						</div>

						{/* Size & Wear Mode */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
							<div className="flex flex-col gap-1">
								<span className="text-[11px] font-semibold text-[var(--muted)]">Размер и сила:</span>
								<div className="flex items-center gap-1 flex-wrap">
									{ELASTIC_SIZES.slice(0, 4).map((sz) => {
										const isSz = elasticSize === sz.id;
										return (
											<button
												key={sz.id}
												type="button"
												onClick={() => setElasticSize(sz.id)}
												className={`px-2 py-1 rounded text-[11px] font-bold border min-h-[30px] ${
													isSz
														? "bg-[var(--teal)] text-white border-[var(--teal)]"
														: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
												}`}
											>
												{sz.label}
											</button>
										);
									})}
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<span className="text-[11px] font-semibold text-[var(--muted)]">Режим ношения:</span>
								<div className="flex items-center gap-1">
									{[
										["full_time", "Круглосуточно (24 ч)"],
										["night_only", "Только на ночь"],
									].map(([mode, label]) => {
										const isMode = elasticWear === mode;
										return (
											<button
												key={mode}
												type="button"
												onClick={() => setElasticWear(mode as ElasticWearMode)}
												className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold border min-h-[30px] truncate ${
													isMode
														? "bg-[var(--teal)] text-white border-[var(--teal)]"
														: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
												}`}
											>
												{label}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
