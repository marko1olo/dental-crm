import React, { useState } from "react";
import {
	Box,
	Maximize2,
	Minimize2,
	Camera,
	Sliders,
	Activity,
	Radio,
	RotateCw,
	Layers,
	Eye,
	X,
	ArrowLeft,
	HelpCircle,
	Sparkles,
} from "lucide-react";

export interface CtPopoutStudioProps {
	patientName?: string;
	patientCardNumber?: string;
	deviceName?: string;
	studyDate?: string;
	onClose?: () => void;
	onReturnToCrm?: () => void;
}

export function CtPopoutStudio({
	patientName = "Воронова Екатерина Сергеевна",
	patientCardNumber = "043/у-2026/891",
	deviceName = "Vatech Pax-i 3D Smart (FOV 12×9 см)",
	studyDate = "08.10.2026, 14:30",
	onClose,
	onReturnToCrm,
}: CtPopoutStudioProps) {
	const [activeProjection, setActiveProjection] = useState<string>("iso");
	const [activeWlPreset, setActiveWlPreset] = useState<string>("bone");
	const [sliceIndex, setSliceIndex] = useState<number>(225);
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(1.0);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isNerveVisible, setIsNerveVisible] = useState<boolean>(true);

	const projections = [
		{ id: "front", label: "Перед" },
		{ id: "back", label: "Зад" },
		{ id: "left", label: "Лево" },
		{ id: "right", label: "Право" },
		{ id: "top", label: "Верх" },
		{ id: "bottom", label: "Низ" },
		{ id: "iso", label: "3D Изо" },
		{ id: "pano", label: "Панорама" },
	];

	const wlPresets = [
		{ id: "soft", label: "Мягкие ткани", wl: "40 / 400" },
		{ id: "bone", label: "Костная ткань", wl: "400 / 1500" },
		{ id: "teeth", label: "Зубы / Эмаль", wl: "1200 / 3000" },
		{ id: "implants", label: "Импланты", wl: "1500 / 4000" },
	];

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen?.().catch(() => {});
			setIsFullscreen(false);
		}
	};

	return (
		<div
			className="w-full h-full flex flex-col font-sans select-none overflow-hidden bg-zinc-950 text-zinc-100"
			data-testid="ct-popout-studio"
		>
			{/* 1. Header Toolbar (1-Row, Hick's Law) */}
			<header className="h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
				{/* Left: Patient & Hardware Telemetry */}
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
							<Box className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 leading-none">
								<strong className="text-xs font-bold text-zinc-100 whitespace-nowrap">
									3D КЛКТ Студия • {patientName}
								</strong>
								<span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">({patientCardNumber})</span>
							</div>
							<div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono whitespace-nowrap">
								<span>{deviceName}</span>
								<span>•</span>
								<span>{studyDate}</span>
							</div>
						</div>
					</div>

					<div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

					{/* Popout Status Indicator */}
					<div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-cyan-300 font-mono shrink-0">
						<Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
						<span>Popout · 60 FPS</span>
					</div>
				</div>

				{/* Center: 8-Projection Skull Toolbar (Segmented Buttons) */}
				<div className="hidden sm:inline-flex ct-studio-skull-bar">
					{projections.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setActiveProjection(p.id)}
							className={`ct-studio-skull-btn ${activeProjection === p.id ? "active" : ""}`}
							data-testid={`projection-btn-${p.id}`}
							title={`Проекция черепа: ${p.label}`}
						>
							{p.label}
						</button>
					))}
				</div>

				{/* Right: Window & Display Controls */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setIsNerveVisible(!isNerveVisible)}
						className={`ct-studio-action-btn ${isNerveVisible ? "ct-studio-action-btn--active" : ""}`}
						title="Показать/скрыть нижнечелюстной нерв"
					>
						<Activity className="w-3.5 h-3.5 text-rose-400" />
						<span className="hidden xl:inline">Нерв V3</span>
					</button>

					<button
						type="button"
						onClick={toggleFullscreen}
						className="ct-studio-action-btn"
						style={{ width: "28px", padding: 0 }}
						title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
					>
						{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
					</button>

					<button
						type="button"
						onClick={onReturnToCrm || onClose}
						className="ct-studio-action-btn"
						title="Вернуться в основное окно медицинской карты"
						data-testid="ct-popout-return-btn"
					>
						<ArrowLeft className="w-3.5 h-3.5" />
						<span>В карту</span>
					</button>
				</div>
			</header>

			{/* 2. 4-Segmented MPR Viewport Canvas */}
			<main className="flex-1 min-h-0 p-2 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2 bg-black">
				{/* Quadrant 1: 3D Raymarching Volume */}
				<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
					<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
						<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
							3D ОБЪЕМ (VR)
						</span>
						<span className="text-[10px] font-mono text-zinc-400">Проекция: {activeProjection.toUpperCase()}</span>
					</div>

					{/* 3D Visual Mesh / Simulation */}
					<div className="flex-1 flex items-center justify-center relative">
						<div className="w-56 h-56 rounded-full border border-cyan-500/20 flex items-center justify-center relative">
							<div className="w-44 h-44 rounded-2xl border border-dashed border-cyan-400/30 flex items-center justify-center rotate-12">
								<Box className="w-24 h-24 text-cyan-400/60 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
							</div>
							{isNerveVisible && (
								<div
									className="absolute inset-x-8 bottom-12 h-6 border-b-2 border-rose-500/80 rounded-b-full filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
									title="Нижнечелюстной канал (N. Alveolaris Inferior)"
								/>
							)}
						</div>
					</div>

					<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
						<span>Плотность кости: D2 (850 HU)</span>
						<span>FOV: 12×9 см</span>
						<span>Воксель: 0.2 мм</span>
					</div>
				</section>

				{/* Quadrant 2: Axial Slice */}
				<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
					<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
						<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
							АКСИАЛЬНЫЙ (AXIAL)
						</span>
						<span className="text-[10px] font-mono text-zinc-400">Срез #{sliceIndex} / 450</span>
					</div>

					<div className="flex-1 flex items-center justify-center relative">
						<div className="w-48 h-48 rounded-full border border-teal-500/30 flex items-center justify-center">
							{/* Dental arch curve overlay */}
							<div className="w-36 h-28 border-b-2 border-dashed border-amber-400/60 rounded-b-full flex items-center justify-center">
								<div className="w-2 h-2 rounded-full bg-teal-400" />
							</div>
						</div>
					</div>

					<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
						<span>Z: +14.2 мм</span>
						<span>Сплайн дуги: Активен</span>
						<span>WL: {activeWlPreset.toUpperCase()}</span>
					</div>
				</section>

				{/* Quadrant 3: Coronal Slice */}
				<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
					<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
						<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
							КОРОНАЛЬНЫЙ (CORONAL)
						</span>
						<span className="text-[10px] font-mono text-zinc-400">Y: 0.0 мм</span>
					</div>

					<div className="flex-1 flex items-center justify-center relative">
						<div className="w-44 h-40 border border-indigo-500/20 rounded-xl flex items-center justify-center">
							<div className="w-28 h-20 border-b border-indigo-400/40 rounded-b-xl" />
						</div>
					</div>

					<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
						<span>ВЧ Пазухи: Пневматизация норма</span>
						<span>Slab: {slabThicknessMm} мм</span>
					</div>
				</section>

				{/* Quadrant 4: Cross-Section / Panoramic */}
				<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
					<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
						<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
							КРОСС-СЕКЦИЯ / ПАНОРАМА
						</span>
						<span className="text-[10px] font-mono text-zinc-400">Зона 46–47</span>
					</div>

					<div className="flex-1 flex items-center justify-center relative">
						<div className="w-52 h-28 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-2">
							<div className="w-40 h-10 border-b-2 border-amber-400/40 rounded-b-full" />
							{isNerveVisible && (
								<div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-mono">
									<div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
									<span>Канал N. Mandibularis (отступ 4.8 мм)</span>
								</div>
							)}
						</div>
					</div>

					<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
						<span>Толщина альвеолярного гребня: 7.4 мм</span>
						<span>Высота до канала: 12.1 мм</span>
					</div>
				</section>
			</main>

			{/* 3. Bottom HUD Toolbar (Presets & Slab Thickness) */}
			<footer className="h-12 px-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
				{/* Left: WL Presets */}
				{/* Left: WL Presets */}
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-zinc-400 font-medium">Окно (WL):</span>
					<div className="ct-studio-wl-bar">
						{wlPresets.map((w) => (
							<button
								key={w.id}
								type="button"
								onClick={() => setActiveWlPreset(w.id)}
								className={`ct-studio-wl-btn ${activeWlPreset === w.id ? "active" : ""}`}
								title={`Пресет: ${w.label} (${w.wl})`}
							>
								{w.label}
							</button>
						))}
					</div>
				</div>

				{/* Center: Slice Scrubbing & Slab */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
						<span className="text-zinc-400">Срез:</span>
						<input
							type="range"
							min="1"
							max="450"
							value={sliceIndex}
							onChange={(e) => setSliceIndex(Number(e.target.value))}
							className="w-36 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
						/>
						<span className="w-12 text-right">{sliceIndex} / 450</span>
					</div>

					<div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

					<div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
						<span>Slab (MIP):</span>
						{[0.2, 1.0, 5.0, 10.0].map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => setSlabThicknessMm(val)}
								className={`ct-studio-slab-btn ${slabThicknessMm === val ? "active" : ""}`}
							>
								{val} мм
							</button>
						))}
					</div>
				</div>

				{/* Right: Snapshot & Export Action */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="ct-studio-action-btn"
						title="Сделать снимок экрана среза в формате PNG"
					>
						<Camera className="w-3.5 h-3.5 text-teal-400" />
						<span>Снимок экрана</span>
					</button>
				</div>
			</footer>
		</div>
	);
}
