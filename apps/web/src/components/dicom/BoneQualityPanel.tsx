import { Activity, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
	type DrillProtocol,
	extractHUZones,
	generateDrillProtocol,
	type ImplantSystem,
	mischDescription,
} from "../../utils/dicom/boneQualityEngine";

interface Props {
	huSamples?: number[]; // HU values sampled along the implant axis
	implantDiameterMm?: number;
	implantLengthMm?: number;
	implantSystem?: ImplantSystem;
	toothFdi?: number;
	onSystemChange?: (s: ImplantSystem) => void;
}

const SYSTEMS: { value: ImplantSystem; label: string }[] = [
	{ value: "osstem", label: "Osstem (TS III / TS IV)" },
	{ value: "straumann", label: "Straumann (BLX / BLT)" },
	{ value: "nobel", label: "Nobel Biocare (Active / Parallel)" },
	{ value: "bredent", label: "Bredent (SKY / Blue Sky)" },
	{ value: "mdi", label: "MDI Mini Implants" },
];

const MISCH_COLORS: Record<string, string> = {
	D1: "#ef4444",
	D2: "#22c55e",
	D3: "#f59e0b",
	D4: "#f97316",
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
	onSystemChange = () => {},
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
	const protocol: DrillProtocol = generateDrillProtocol(
		zones,
		implantSystem,
		implantDiameterMm,
		implantLengthMm,
	);
	const mischColor = MISCH_COLORS[protocol.mischClass] ?? "#a1a1aa";

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
						className="flex items-center gap-3 p-2 rounded-lg"
						style={{ background: "var(--glass-panel)" }}
					>
						<div
							style={{
								background: mischColor,
								color: "#fff",
								fontWeight: 800,
								fontSize: "16px",
								padding: "4px 12px",
								borderRadius: "6px",
								letterSpacing: "1px",
								flexShrink: 0,
							}}
						>
							{protocol.mischClass}
						</div>
						<div
							className="text-xs leading-snug"
							style={{ color: "var(--muted)" }}
						>
							{mischDescription(protocol.mischClass)}
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
							onChange={(e) => onSystemChange(e.target.value as ImplantSystem)}
							className="w-full text-xs p-1.5 rounded-md border"
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
									className="text-[11px] p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1.5"
								>
									<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
								<span className="text-[10px] text-amber-600 font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950">
									UNDERDRILL
								</span>
							)}
							{protocol.corticalTapRequired && (
								<span className="text-[10px] text-rose-600 font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950">
									CORTICAL TAP
								</span>
							)}
						</div>
						<div className="space-y-1.5">
							{protocol.steps.map((step) => (
								<div
									key={step.step}
									className="flex gap-2 items-start p-2 rounded-md border"
									style={{
										background: "var(--glass-panel)",
										borderColor: "var(--line)",
									}}
								>
									<div
										className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0"
										style={{ color: "var(--ink)" }}
									>
										{step.step}
									</div>
									<div className="flex-1 min-w-0">
										<div
											className="text-xs font-medium truncate"
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
											<div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
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
			className="w-full flex justify-between items-center cursor-pointer pb-1.5 border-b select-none"
			style={{
				borderColor: "var(--line)",
				background: "none",
				borderLeft: "none",
				borderRight: "none",
				borderTop: "none",
			}}
		>
			<span className="text-xs font-bold flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
				<Activity className="w-4 h-4 text-sky-500" />
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
	const color =
		hu > 1250
			? "#ef4444"
			: hu >= 850
				? "#22c55e"
				: hu >= 350
					? "#f59e0b"
					: "#f97316";
	return (
		<div
			className="p-2 rounded-md border text-center"
			style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
		>
			<div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>
				{label}
			</div>
			<div className="text-xs font-bold" style={{ color }}>
				{Math.round(hu)} HU
			</div>
		</div>
	);
}
