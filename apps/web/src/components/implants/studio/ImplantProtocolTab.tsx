/**
 * ImplantProtocolTab.tsx — Вкладка протокола хирургической операции имплантации (DENTE CRM).
 * 6 систем имплантов РФ, расчет плотности кости Misch D1–D4, зеленая зона торка 35–45 Н·см,
 * ISQ 65–85, выбор типоразмеров и этапа остеоинтеграции (Мандаты 8e, 8n, 8am, 8ze).
 */

import React from "react";
import { Check, Sparkles, Wrench } from "lucide-react";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	SURGICAL_QUICK_TEMPLATES,
	FDI_SURGICAL_PRESETS,
	type CanonicalImplantSystemId,
	type CanonicalImplantSystem,
	type MischBoneDensity,
	type ImplantStageType,
	type ImplantSurgeryQuickTemplate,
} from "../implantologyCatalogData";

export interface ImplantProtocolTabProps {
	readonly toothFdi: number;
	readonly onToothChange: (fdi: number) => void;
	readonly boneDensity: MischBoneDensity;
	readonly systemId: CanonicalImplantSystemId;
	readonly activeSystem: CanonicalImplantSystem;
	readonly onSystemChange: (id: CanonicalImplantSystemId) => void;
	readonly diameterMm: number;
	readonly onDiameterChange: (d: number) => void;
	readonly lengthMm: number;
	readonly onLengthChange: (l: number) => void;
	readonly torqueNcm: number;
	readonly onTorqueChange: (t: number) => void;
	readonly torqueZone: {
		readonly status: "under_torque" | "optimal_green" | "over_torque";
		readonly labelRu: string;
		readonly colorClass: string;
	};
	readonly isqValue: number;
	readonly onIsqChange: (isq: number) => void;
	readonly stage: ImplantStageType;
	readonly onStageChange: (stage: ImplantStageType) => void;
	readonly isGbrPerformed: boolean;
	readonly onGbrChange: (gbr: boolean) => void;
	readonly onApplyTemplate: (tmpl: ImplantSurgeryQuickTemplate) => void;
}

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	const {
		toothFdi, onToothChange, boneDensity, systemId, activeSystem, onSystemChange,
		diameterMm, onDiameterChange, lengthMm, onLengthChange, torqueNcm, onTorqueChange,
		torqueZone, isqValue, onIsqChange, stage, onStageChange, isGbrPerformed, onGbrChange,
		onApplyTemplate,
	} = props;

	return (
		<div className="space-y-3.5" data-testid="tab-content-protocol">
			{/* 1-клик шаблоны */}
			<section className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]" aria-label="Клинические шаблоны">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] mb-2">
					<Sparkles size={14} className="text-[var(--teal,#0d9488)]" />
					<span>1-клик клинические шаблоны протокола:</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{SURGICAL_QUICK_TEMPLATES.map((tmpl) => (
						<button
							key={tmpl.id}
							type="button"
							onClick={() => onApplyTemplate(tmpl)}
							className="text-left p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer flex flex-col gap-1 w-full min-h-[44px]"
							data-testid={`quick-template-${tmpl.id}`}
						>
							<div className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between gap-1 w-full">
								<span className="leading-snug">{tmpl.labelRu}</span>
								<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
									{tmpl.defaultTorqueNcm} Н·см
								</span>
							</div>
							<div className="text-[11px] text-[var(--muted)] leading-normal line-clamp-2">{tmpl.descriptionRu}</div>
						</button>
					))}
				</div>
			</section>

			{/* Выбор позиции зуба FDI (11–48) */}
			<section className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2" aria-label="Позиция зуба">
				<div className="flex items-center justify-between">
					<label htmlFor="tooth-fdi-select" className="text-xs font-bold text-[var(--ink)]">Позиция зуба (FDI 11–48):</label>
					<span className="text-xs text-[var(--muted)]">Плотность Misch: <strong className="text-[var(--ink)]">{boneDensity}</strong></span>
				</div>
				<div className="flex flex-wrap gap-1.5 items-center">
					{FDI_SURGICAL_PRESETS.map((fdi) => (
						<button
							key={fdi}
							type="button"
							onClick={() => onToothChange(fdi)}
							className={`min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[38px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
								toothFdi === fdi
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid={`fdi-chip-${fdi}`}
						>
							#{fdi}
						</button>
					))}
					<div className="flex items-center gap-1.5 ml-auto sm:ml-0">
						<span className="text-[11px] text-[var(--muted)]">Свой:</span>
						<input
							id="tooth-fdi-select"
							type="number"
							min={11}
							max={48}
							value={toothFdi}
							onChange={(e) => onToothChange(Number(e.target.value) || 46)}
							className="min-h-[44px] sm:min-h-[36px] w-14 px-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-center"
							data-testid="tooth-fdi-custom-input"
						/>
					</div>
				</div>
			</section>

			{/* 6 систем имплантации в РФ */}
			<section className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2" aria-label="Система имплантации">
				<div className="text-xs font-bold text-[var(--ink)]">Система имплантации (6 стандартов РФ):</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{(Object.keys(CANONICAL_IMPLANT_SYSTEMS) as CanonicalImplantSystemId[]).map((id) => {
						const sys = CANONICAL_IMPLANT_SYSTEMS[id];
						const isSel = systemId === id;
						return (
							<button
								key={id}
								type="button"
								onClick={() => onSystemChange(id)}
								className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
									isSel
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--ink)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
								}`}
								data-testid={`system-card-${id}`}
							>
								<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
									<span>{sys.brandName}</span>
									{isSel && <Check size={13} className="text-[var(--teal,#0d9488)]" />}
								</div>
								<div className="text-[11px] truncate text-[var(--muted)] font-medium">{sys.lineName}</div>
								<div className="text-[10px] text-[var(--muted)]">{sys.countryRu}</div>
							</button>
						);
					})}
				</div>
			</section>

			{/* Типоразмеры: диаметр и длина */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
					<div className="text-xs font-bold text-[var(--ink)]">Диаметр (мм):</div>
					<div className="flex flex-wrap gap-1.5">
						{activeSystem.diametersMm.map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => onDiameterChange(d)}
								className={`min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[42px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
									diameterMm === d
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
								data-testid={`diameter-chip-${d}`}
							>
								Ø {d}
							</button>
						))}
					</div>
				</div>
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
					<div className="text-xs font-bold text-[var(--ink)]">Длина (мм):</div>
					<div className="flex flex-wrap gap-1.5">
						{activeSystem.lengthsMm.map((l) => (
							<button
								key={l}
								type="button"
								onClick={() => onLengthChange(l)}
								className={`min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[42px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
									lengthMm === l
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
								data-testid={`length-chip-${l}`}
							>
								{l} мм
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Торк и стабильность ISQ */}
			<section className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5" aria-label="Первичная стабильность">
				<div className="flex items-center justify-between">
					<div className="text-xs font-bold text-[var(--ink)]">Первичная стабильность (Торк):</div>
					<span className={`text-xs font-bold ${torqueZone.colorClass}`}>{torqueZone.labelRu}</span>
				</div>
				<div className="flex items-center gap-3">
					<input
						type="range"
						min={15}
						max={60}
						step={5}
						value={torqueNcm}
						onChange={(e) => onTorqueChange(Number(e.target.value))}
						className="flex-1 accent-[var(--teal,#0d9488)] cursor-pointer h-8"
						data-testid="torque-slider"
						aria-label="Слайдер усилия торка"
					/>
					<span className="font-mono text-sm font-bold text-[var(--ink)] w-16 text-right">{torqueNcm} Н·см</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-xs">
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Коэффициент ISQ:</span>
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={40}
								max={90}
								value={isqValue}
								onChange={(e) => onIsqChange(Number(e.target.value) || 70)}
								className="w-14 min-h-[36px] px-1 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-center text-[var(--ink)]"
								data-testid="isq-input"
								aria-label="Значение ISQ"
							/>
							<span className="text-[11px] text-[var(--muted)]">ISQ (65–85)</span>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Отвертка:</span>
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1">
							<Wrench size={12} className="text-[var(--teal,#0d9488)]" />
							{activeSystem.screwdriverAliasRu}
						</span>
					</div>
				</div>
			</section>

			{/* Этап остеоинтеграции и костная пластика */}
			<section className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2.5" aria-label="Этап операции">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onStageChange("one_stage_healing_abutment")}
						className={`min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
							stage === "one_stage_healing_abutment"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
						data-testid="stage-healing-abutment"
					>
						Формирователь десны (1-эт.)
					</button>
					<button
						type="button"
						onClick={() => onStageChange("two_stage_plug")}
						className={`min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
							stage === "two_stage_plug"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
						data-testid="stage-plug"
					>
						Заглушка (2-эт.)
					</button>
				</div>
				<label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--ink)] min-h-[44px] py-1">
					<input
						type="checkbox"
						checked={isGbrPerformed}
						onChange={(e) => onGbrChange(e.target.checked)}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)] cursor-pointer"
						data-testid="checkbox-gbr"
					/>
					<span>Костная пластика (GBR)</span>
				</label>
			</section>
		</div>
	);
};

export default ImplantProtocolTab;
