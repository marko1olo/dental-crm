import { Activity, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
	type DrillProtocol,
	extractHUZones,
	generateDrillProtocol,
	type ImplantSystem,
	mischDescription,
} from "../../utils/dicom/boneQualityEngine";
import {
	classifyMischBoneDensity,
	type BoneDensityRecommendation,
} from "./panoramicMprMath";

interface Props {
	huSamples?: number[] | undefined; // HU values sampled along the implant axis
	implantDiameterMm?: number | undefined;
	implantLengthMm?: number | undefined;
	implantSystem?: ImplantSystem | undefined;
	toothFdi?: number | undefined;
	onSystemChange?: ((s: ImplantSystem) => void) | undefined;
}

const SYSTEMS: { value: ImplantSystem; label: string }[] = [
	{ value: "osstem", label: "Osstem (TS III / TS IV)" },
	{ value: "straumann", label: "Straumann (BLX / BLT)" },
	{ value: "nobel", label: "Nobel Biocare (Active / Parallel)" },
	{ value: "bredent", label: "Bredent (SKY / Blue Sky)" },
	{ value: "mdi", label: "MDI Mini Implants" },
];

const MISCH_COLORS: Record<string, string> = {
	D1: "var(--red, #ef4444)",
	D2: "var(--teal, #0d9488)",
	D3: "var(--amber, #f59e0b)",
	D4: "var(--orange, #f97316)",
	D5: "var(--purple, #a855f7)",
};


/*
 * ПЛОТНОСТЬ КОСТИ НЕ ПРИДУМЫВАЕТСЯ.
 *
 * Здесь стояли значения по умолчанию: huSamples = [850, 920, 780, 640],
 * toothFdi = 36, имплантат 4,0 × 10,0 мм. Панель рендерится без единого пропса
 * (ImagingView), поэтому эти числа показывались для ЛЮБОГО снимка — включая
 * прицельный и фотографию полости рта, где единиц Хаунсфилда физически нет. По
 * ним считался класс кости по Мишу и печатался полный протокол сверления:
 * диаметры свёрл, обороты, торк. Одинаковый для каждого пациента.
 *
 * Хирург, действующий по такому протоколу, работает по выдуманной плотности.
 * Ветка пустого состояния при этом была недостижима: значение по умолчанию —
 * непустой массив.
 *
 * Теперь измерений нет по умолчанию: панель честно говорит, что плотность не
 * измерена, и показывает расчёт только по настоящим значениям.
 */
export function BoneQualityPanel({
	huSamples,
	implantDiameterMm = 4.0,
	implantLengthMm = 10.0,
	implantSystem = "osstem",
	toothFdi,
	onSystemChange,
}: Props) {
	const [expanded, setExpanded] = useState(true);

	if (!huSamples || huSamples.length === 0) {
		return (
			<div
				className="p-3 rounded-xl border shadow-sm my-2"
				style={{
					background: "var(--paper)",
					color: "var(--ink)",
					borderColor: "var(--line)",
				}}
			>
				<PanelHeader
					expanded={expanded}
					onToggle={() => setExpanded((e) => !e)}
					toothFdi={toothFdi}
				/>
				{expanded && (
					<div
						className="text-xs p-3 text-center"
						style={{ color: "var(--muted)" }}
					>
						{/*
							Было «Наведите курсор на ложе имплантата для автоматического
							расчета плотности кости HU» — обещание расчёта, которого не
							произойдёт: на прицельном снимке и на фотографии единиц
							Хаунсфилда нет вовсе, а измерения по КЛКТ сюда пока не
							приходят.
						*/}
						Плотность кости не измерена. Она считается по КЛКТ: единицы
						Хаунсфилда есть только в объёмном исследовании, на прицельном снимке
						и на фотографии их нет.
					</div>
				)}
			</div>
		);
	}

	const zones = extractHUZones(huSamples);
	const meanHU = Math.round(
		huSamples.reduce((s, v) => s + v, 0) / huSamples.length,
	);
	const recommendation: BoneDensityRecommendation =
		classifyMischBoneDensity(meanHU);
	const protocol: DrillProtocol = generateDrillProtocol(
		zones,
		implantSystem,
		implantDiameterMm,
		implantLengthMm,
	);
	const activeClass = recommendation.mischClass;
	const mischColor = MISCH_COLORS[activeClass] ?? "#a1a1aa";

	return (
		<div
			className="p-3 rounded-xl border shadow-sm my-2"
			style={{
				background: "var(--paper)",
				color: "var(--ink)",
				borderColor: "var(--line)",
			}}
		>
			<PanelHeader
				expanded={expanded}
				onToggle={() => setExpanded((e) => !e)}
				toothFdi={toothFdi}
			/>

			{expanded && (
				<div className="mt-2 space-y-3">
					{/* Misch Class Badge */}
					<div
						className="flex items-start gap-3 p-2.5 rounded-lg"
						style={{ background: "var(--glass-panel)" }}
					>
						<div
							style={{
								background: mischColor,
								color: "var(--on-teal, #fff)",
								fontWeight: 800,
								fontSize: "16px",
								padding: "4px 12px",
								borderRadius: "6px",
								letterSpacing: "1px",
								flexShrink: 0,
							}}
						>
							{activeClass}
						</div>
						<div
							className="text-xs leading-snug flex-1"
							style={{ color: "var(--ink)" }}
						>
							<div className="font-semibold">{recommendation.label}</div>
							<div
								className="text-[11px] mt-0.5"
								style={{ color: "var(--muted)" }}
							>
								{recommendation.description}
							</div>
							<div
								className="text-[11px] font-medium mt-1"
								style={{ color: "var(--teal)" }}
							>
								Средняя плотность: {meanHU} HU ({recommendation.huRange})
							</div>
						</div>
					</div>

					{/* Clinical Recommendations & Protocol Hints */}
					<div
						className="p-2.5 rounded-lg text-xs leading-relaxed border space-y-1.5"
						style={{
							background: "var(--paper-soft)",
							borderColor: "var(--line)",
							color: "var(--ink)",
						}}
					>
						<div
							className="font-semibold flex items-center gap-1.5"
							style={{ color: "var(--amber, #f59e0b)" }}
						>
							<Activity className="w-3.5 h-3.5 shrink-0" />
							Клинические рекомендации по препарированию ({activeClass}):
						</div>
						<div className="text-[11px]" style={{ color: "var(--ink)" }}>
							{recommendation.clinicalAdvice}
						</div>
						<div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
							<span
								className="px-2 py-0.5 rounded font-medium border"
								style={{
									background: "var(--paper-soft)",
									borderColor: "var(--line)",
									color: "var(--ink)",
								}}
							>
								Обороты: {recommendation.drillingRpm}
							</span>
							<span
								className="px-2 py-0.5 rounded font-medium border"
								style={{
									background: "var(--paper-soft)",
									borderColor: "var(--line)",
									color: "var(--ink)",
								}}
							>
								Торк: {recommendation.torqueNcm}
							</span>
							{recommendation.corticalTap && (
								<span
									className="px-2 py-0.5 rounded font-bold border"
									style={{
										background: "var(--danger-soft, rgba(239, 68, 68, 0.15))",
										borderColor: "var(--danger-border, rgba(239, 68, 68, 0.3))",
										color: "var(--danger-ink, var(--ink))",
									}}
								>
									КОРТИКАЛЬНЫЙ МЕТЧИК
								</span>
							)}
							{recommendation.underDrilling && (
								<span
									className="px-2 py-0.5 rounded font-bold border"
									style={{
										background: "var(--warning-soft, rgba(245, 158, 11, 0.15))",
										borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))",
										color: "var(--warning-ink, var(--ink))",
									}}
								>
									НЕДОСВЕРЛИВАНИЕ (-{recommendation.underDrillingMm} мм)
								</span>
							)}
							{recommendation.osteotomeCondensation && (
								<span
									className="px-2 py-0.5 rounded font-bold border"
									style={{
										background: "var(--purple-soft, rgba(168, 85, 247, 0.15))",
										borderColor: "var(--purple-border, rgba(168, 85, 247, 0.3))",
										color: "var(--purple-ink, var(--ink))",
									}}
								>
									ОСТЕОТОМНАЯ КОМПРЕССИЯ
								</span>
							)}
						</div>
					</div>

					{/* HU Zones */}
					<div className="grid grid-cols-3 gap-2">
						<ZoneCard label="Кортикальная" hu={zones.corticalHU} />
						<ZoneCard label="Губчатая" hu={zones.cancellousHU} />
						<ZoneCard label="Апикальная" hu={zones.apicalHU} />
					</div>

					{/* Implant System Selector */}
					<div>
						<label
							htmlFor="bone-implant-system-select"
							className="text-[11px] font-medium block mb-1"
							style={{ color: "var(--muted)" }}
						>
							Система имплантации
						</label>
						<select
							id="bone-implant-system-select"
							value={implantSystem}
							onChange={(e) =>
								onSystemChange?.(e.target.value as ImplantSystem)
							}
							className="w-full text-xs p-1.5 min-h-[44px] rounded-md border"
							style={{
								background: "var(--surface-50)",
								color: "var(--ink)",
								borderColor: "var(--line)",
							}}
						>
							{SYSTEMS.map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</div>

					{/* Warnings */}
					{protocol.warnings.length > 0 && (
						<div className="space-y-1">
							{protocol.warnings.map((w) => (
								<div
									key={w}
									className="text-[11px] p-2 rounded border flex items-center gap-1.5"
									style={{
										background: "var(--warning-soft, rgba(245, 158, 11, 0.1))",
										borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))",
										color: "var(--warning-ink, var(--ink))",
									}}
								>
									<AlertTriangle
										className="w-3.5 h-3.5 shrink-0"
										style={{ color: "var(--amber, #f59e0b)" }}
									/>
									<span>{w}</span>
								</div>
							))}
						</div>
					)}

					{/* Drill Sequence */}
					<div>
						<div
							className="text-xs font-semibold mb-1.5 flex items-center justify-between"
							style={{ color: "var(--ink)" }}
						>
							<span>Протокол сверления</span>
							{protocol.underdrillingApplied && (
								<span
									className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
									style={{
										background: "var(--warning-soft, rgba(245, 158, 11, 0.15))",
										borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))",
										color: "var(--warning-ink, var(--ink))",
									}}
								>
									НЕДОСВЕРЛИВАНИЕ (МЯГКАЯ КОСТЬ)
								</span>
							)}
							{protocol.corticalTapRequired && (
								<span
									className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
									style={{
										background: "var(--danger-soft, rgba(239, 68, 68, 0.15))",
										borderColor: "var(--danger-border, rgba(239, 68, 68, 0.3))",
										color: "var(--danger-ink, var(--ink))",
									}}
								>
									МЕТЧИК (ПЛОТНЫЙ КОРТИКАЛ)
								</span>
							)}
						</div>
						<div className="space-y-1.5">
							{protocol.steps.map((step) => (
								<div
									key={step.step}
									className="flex gap-2 items-start p-2 rounded-lg"
									style={{
										background: "var(--paper-soft)",
									}}
								>
									<div
										className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
										style={{
											background: "var(--surface-200, var(--paper-soft))",
											color: "var(--ink)",
										}}
									>
										{step.step}
									</div>
									<div className="flex-1 min-w-0">
										<div
											className="text-xs font-medium truncate"
											title={`${step.drillType} • Ø${step.diameterMm}мм × ${step.depthMm}мм`}
											style={{ color: "var(--ink)" }}
										>
											{step.drillType} • Ø{step.diameterMm}мм × {step.depthMm}мм
										</div>
										<div
											className="text-[11px]"
											style={{ color: "var(--muted)" }}
										>
											{step.rpmRange} RPM • {step.torqueNcm} Ncm{" "}
											{step.irrigation ? "• Охлаждение физраствором" : ""}
										</div>
										{step.note && (
											<div
												className="text-[11px] mt-0.5"
												style={{ color: "var(--amber, #f59e0b)" }}
											>
												{step.note}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function PanelHeader({
	expanded,
	onToggle,
	toothFdi,
}: {
	expanded: boolean;
	onToggle: () => void;
	/* Номер зуба известен не всегда: без измерения его подставлять неоткуда. */
	toothFdi?: number | undefined;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="w-full flex justify-between items-center cursor-pointer min-h-[44px] pb-1.5 border-b select-none"
			style={{
				borderColor: "var(--line)",
				background: "none",
				borderLeft: "none",
				borderRight: "none",
				borderTop: "none",
			}}
		>
			<span className="text-xs font-bold flex items-center gap-1.5 text-[var(--teal)]">
				<Activity className="w-4 h-4 text-[var(--teal)]" />
				Плотность кости (HU){toothFdi ? ` • Зуб #${toothFdi}` : ""}
			</span>
			<span style={{ color: "var(--muted)" }}>
				{expanded ? (
					<ChevronUp className="w-4 h-4" />
				) : (
					<ChevronDown className="w-4 h-4" />
				)}
			</span>
		</button>
	);
}

function ZoneCard({ label, hu }: { label: string; hu: number }) {
	if (!Number.isFinite(hu)) {
		return (
			<div
				className="p-2 rounded-lg text-center"
				style={{ background: "var(--paper-soft)" }}
			>
				<div
					className="text-xs truncate"
					title={label}
					style={{ color: "var(--muted)" }}
				>
					{label}
				</div>
				<div className="text-xs font-bold" style={{ color: "var(--muted)" }}>
					— HU
				</div>
			</div>
		);
	}

	const color =
		hu > 1250
			? "var(--red, #ef4444)"
			: hu >= 850
				? "var(--teal, #0d9488)"
				: hu >= 350
					? "var(--amber, #f59e0b)"
					: hu >= 150
						? "var(--orange, #f97316)"
						: "var(--purple, #a855f7)";
	const boneClass =
		hu > 1250
			? "D1"
			: hu >= 850
				? "D2"
				: hu >= 350
					? "D3"
					: hu >= 150
						? "D4"
						: "D5";
	return (
		<div
			className="p-2 rounded-lg text-center"
			style={{ background: "var(--paper-soft)" }}
		>
			<div
				className="text-xs truncate"
				title={label}
				style={{ color: "var(--muted)" }}
			>
				{label}
			</div>
			<div className="text-xs font-bold" style={{ color }}>
				{Math.round(hu)} HU ({boneClass})
			</div>
		</div>
	);
}

