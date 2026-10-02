/**
 * DENTE CRM — 3D Virtual Implant Planning Studio Modal
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Anatomage
 *
 * Mandate 8e: Doctor Autonomy
 * - Exact fixture dimensions for Straumann, Nobel Biocare, Osstem, Dentium, MIS (3.0..5.5 mm, 7.0..15.0 mm).
 * - 1.5–2.0 mm safety corridor visualization.
 * - Calm clinical metrics: "Дистанция: 1.8 мм" or "Канал не размечен".
 * - 100% Doctor Autonomy: No modal locks, no disabled "Применить" button, no screaming audio sirens.
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Compass, Layers, Shield, X } from "lucide-react";
import { DentalImplant, NerveCanal } from "../icons/DentalIcons";
import type { CbctVoxelVolume, Point3D } from "./cbctMprMath";
import {
	DEFAULT_SAFETY_CORRIDOR_MM,
	FULL_IMPLANT_LIBRARY,
	IMPLANT_BRANDS,
	type ImplantBrandKey,
	type ImplantModel,
	MIN_SAFETY_CORRIDOR_MM,
	computeSafetyCorridorGeometry,
	filterImplantLibrary,
	formatNerveClearanceMetric,
	getAvailableDiameters,
	getAvailableLengths,
	inspectDistanceToMandibularCanal,
} from "./implantLibrary";
import {
	exportImplantToDiary043,
	exportImplantToTreatmentPlan,
} from "./ctImplantIntegrationBridge";

export interface CbctImplantModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly volume?: CbctVoxelVolume | null | undefined;
	readonly nerveCanalCenter?: { readonly x: number; readonly y: number; readonly z?: number } | null | undefined;
	readonly initialBrand?: ImplantBrandKey | undefined;
	readonly initialDiameterMm?: number | undefined;
	readonly initialLengthMm?: number;
	readonly onApplyToPlan?: (item: {
		readonly implant: ImplantModel;
		readonly toothFdi: number;
		readonly clearanceMm: number | null;
		readonly angulationDeg?: number;
		readonly safetyMarginMm?: number;
		readonly nerveStatus?: "safe" | "warning" | "danger" | "unmeasured";
	}) => void;
	readonly onApplyToDiary043?: (diaryText: string) => void;
}

export const CbctImplantModal: React.FC<CbctImplantModalProps> = ({
	isOpen,
	onClose,
	patientId = "default-patient",
	patientName = "Пациент",
	toothFdi = 46,
	nerveCanalCenter = null,
	initialBrand = "osstem",
	initialDiameterMm = 4.0,
	initialLengthMm = 10.0,
	onApplyToPlan,
	onApplyToDiary043,
}) => {
	const modalId = useId();

	// Fixture selection state
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>(initialBrand);
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(initialDiameterMm);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(initialLengthMm);
	const [safetyMarginMm, setSafetyMarginMm] = useState<number>(DEFAULT_SAFETY_CORRIDOR_MM);

	// Pose parameters in cross-section
	const [angulationDeg, setAngulationDeg] = useState<number>(0);
	const [entryDepthMm, setEntryDepthMm] = useState<number>(2.0);
	const [vestibularOffsetMm, setVestibularOffsetMm] = useState<number>(0.0);

	// Filter available diameters and lengths for current brand
	const availableDiameters = useMemo(() => getAvailableDiameters(selectedBrand), [selectedBrand]);

	// Auto-select valid diameter when brand changes
	useEffect(() => {
		if (availableDiameters.length > 0 && !availableDiameters.includes(selectedDiameterMm)) {
			setSelectedDiameterMm(availableDiameters[0] ?? 4.0);
		}
	}, [availableDiameters, selectedDiameterMm]);

	const availableLengths = useMemo(
		() => getAvailableLengths(selectedBrand, selectedDiameterMm),
		[selectedBrand, selectedDiameterMm],
	);

	// Auto-select valid length when diameter changes
	useEffect(() => {
		if (availableLengths.length > 0 && !availableLengths.includes(selectedLengthMm)) {
			setSelectedLengthMm(availableLengths[0] ?? 10.0);
		}
	}, [availableLengths, selectedLengthMm]);

	// Current active fixture specification
	const currentImplant: ImplantModel = useMemo(() => {
		const matches = filterImplantLibrary({
			brand: selectedBrand,
			diameterMm: selectedDiameterMm,
			lengthMm: selectedLengthMm,
		});
		if (matches.length > 0 && matches[0]) {
			return matches[0];
		}
		// Fallback to first fixture of the selected brand or generic fallback
		const brandMatches = filterImplantLibrary({ brand: selectedBrand });
		return brandMatches[0] ?? FULL_IMPLANT_LIBRARY[0]!;
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	// Safety corridor envelope geometry
	const corridorGeometry = useMemo(
		() => computeSafetyCorridorGeometry(currentImplant, safetyMarginMm),
		[currentImplant, safetyMarginMm],
	);

	// Apex coordinates in 2D cross-section
	const apexPos = useMemo(() => {
		const angRad = (angulationDeg * Math.PI) / 180.0;
		return {
			x: vestibularOffsetMm + currentImplant.lengthMm * Math.sin(angRad),
			y: entryDepthMm + currentImplant.lengthMm * Math.cos(angRad),
		};
	}, [vestibularOffsetMm, entryDepthMm, currentImplant.lengthMm, angulationDeg]);

	// Mandibular nerve clearance inspection (calm metrics, zero sirens per Mandate 8e)
	const nerveInspection = useMemo(() => {
		return inspectDistanceToMandibularCanal(
			apexPos,
			nerveCanalCenter,
			1.4,
			safetyMarginMm,
		);
	}, [apexPos, nerveCanalCenter, safetyMarginMm]);

	// Keyboard shortcut: Escape to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Export handlers
	const handleSaveToPlan = useCallback(() => {
		const clearance = nerveCanalCenter ? nerveInspection.netClearanceMm : null;
		onApplyToPlan?.({
			implant: currentImplant,
			toothFdi,
			clearanceMm: clearance,
			angulationDeg,
			safetyMarginMm,
			nerveStatus: nerveInspection.safetyStatus,
		});

		try {
			exportImplantToTreatmentPlan({
				patientId,
				patientName,
				toothFdi,
				implantSpec: currentImplant,
				angulationDeg,
				meanHU: null,
				nerveClearanceMm: clearance,
				isNerveWarning: nerveInspection.isWarning,
				isNerveDanger: nerveInspection.isDanger,
				recommendedTorqueNcm: "35–45 Н·см",
				drillingProtocol: "Стандартный хирургический протокол остеотомии ложа с охлаждением",
			});
		} catch {
			// ignore in headless test environments
		}

		onClose();
	}, [
		onApplyToPlan,
		currentImplant,
		toothFdi,
		nerveCanalCenter,
		nerveInspection,
		angulationDeg,
		safetyMarginMm,
		patientId,
		patientName,
		onClose,
	]);

	const handleRecordToDiary = useCallback(() => {
		const clearance = nerveCanalCenter ? nerveInspection.netClearanceMm : null;
		const diaryText =
			`Виртуальное планирование имплантации: установлен имплантат ${currentImplant.brandName} ${currentImplant.lineName} ` +
			`диам. ${currentImplant.diameterMm} мм, длина ${currentImplant.lengthMm} мм (арт. ${currentImplant.articleNumber}) в позицию зуба ${toothFdi}. ` +
			`Коридор безопасности ${safetyMarginMm.toFixed(1)} мм. ` +
			`${nerveInspection.telemetryTextRu}. Угол наклона: ${angulationDeg}°.`;
		onApplyToDiary043?.(diaryText);

		try {
			exportImplantToDiary043({
				patientId,
				patientName,
				toothFdi,
				implantSpec: currentImplant,
				angulationDeg,
				meanHU: null,
				nerveClearanceMm: clearance,
				isNerveWarning: nerveInspection.isWarning,
				isNerveDanger: nerveInspection.isDanger,
				recommendedTorqueNcm: "35–45 Н·см",
				drillingProtocol: "Стандартный хирургический протокол остеотомии ложа с охлаждением",
			});
		} catch {
			// ignore in headless test environments
		}

		onClose();
	}, [
		currentImplant,
		toothFdi,
		safetyMarginMm,
		nerveInspection,
		angulationDeg,
		onApplyToDiary043,
		patientId,
		patientName,
		nerveCanalCenter,
		onClose,
	]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			id={`cbct-implant-modal-${modalId}`}
			data-testid="cbct-implant-modal"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm select-none"
		>
			<div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl text-zinc-100 font-sans">
				{/* HEADER BAR */}
				<div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
							<DentalImplant className="w-4 h-4" />
						</div>
						<div>
							<h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
								<span>Планирование имплантации (3D Implant Studio)</span>
								<span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-mono">
									Зуб {toothFdi}
								</span>
							</h2>
							<p className="text-[11px] text-zinc-400">
								{patientName} • Планирование с коридором безопасности
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-implant-modal-close"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* MODAL BODY */}
				<div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-zinc-800">
					{/* LEFT COLUMN: Controls & Library Selection */}
					<div className="w-full md:w-1/2 p-4 flex flex-col gap-4 overflow-y-auto">
						{/* Brand Selector */}
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
								<Layers className="w-3.5 h-3.5 text-cyan-400" />
								<span>Производитель имплантата</span>
							</label>
							<div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
								{IMPLANT_BRANDS.map((b) => {
									const isSelected = b.key === selectedBrand;
									return (
										<button
											key={b.key}
											type="button"
											onClick={() => setSelectedBrand(b.key)}
											className={`px-2 py-1.5 rounded-md text-xs font-medium text-center transition-colors cursor-pointer border ${
												isSelected
													? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold shadow-sm"
													: "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
											}`}
											data-testid={`cbct-brand-btn-${b.key}`}
										>
											{b.name}
										</button>
									);
								})}
							</div>
						</div>

						{/* Diameter Selector */}
						<div className="flex flex-col gap-1.5">
							<div className="flex justify-between items-center text-xs">
								<span className="font-semibold text-zinc-300">Диаметр имплантата (Ø)</span>
								<span className="font-mono text-cyan-300 font-bold">{selectedDiameterMm.toFixed(1)} мм</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{availableDiameters.map((d) => {
									const isSelected = Math.abs(d - selectedDiameterMm) < 0.05;
									return (
										<button
											key={d}
											type="button"
											onClick={() => setSelectedDiameterMm(d)}
											className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
												isSelected
													? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
													: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
											}`}
											data-testid={`cbct-diameter-btn-${d}`}
										>
											Ø {d.toFixed(1)}
										</button>
									);
								})}
							</div>
						</div>

						{/* Length Selector */}
						<div className="flex flex-col gap-1.5">
							<div className="flex justify-between items-center text-xs">
								<span className="font-semibold text-zinc-300">Длина имплантата (L)</span>
								<span className="font-mono text-cyan-300 font-bold">{selectedLengthMm.toFixed(1)} мм</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{availableLengths.map((l) => {
									const isSelected = Math.abs(l - selectedLengthMm) < 0.05;
									return (
										<button
											key={l}
											type="button"
											onClick={() => setSelectedLengthMm(l)}
											className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
												isSelected
													? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
													: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
											}`}
											data-testid={`cbct-length-btn-${l}`}
										>
											{l.toFixed(1)} мм
										</button>
									);
								})}
							</div>
						</div>

						{/* Safety Margin Selector */}
						<div className="flex flex-col gap-1.5">
							<div className="flex justify-between items-center text-xs">
								<span className="font-semibold text-zinc-300 flex items-center gap-1">
									<Shield className="w-3.5 h-3.5 text-cyan-400" />
									<span>Коридор безопасности (Safety Zone)</span>
								</span>
								<span className="font-mono text-cyan-300 font-bold">{safetyMarginMm.toFixed(1)} мм</span>
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setSafetyMarginMm(MIN_SAFETY_CORRIDOR_MM)}
									className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer border text-center ${
										Math.abs(safetyMarginMm - MIN_SAFETY_CORRIDOR_MM) < 0.05
											? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
											: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									data-testid="cbct-safety-margin-15"
								>
									1.5 мм (Минимум)
								</button>
								<button
									type="button"
									onClick={() => setSafetyMarginMm(DEFAULT_SAFETY_CORRIDOR_MM)}
									className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer border text-center ${
										Math.abs(safetyMarginMm - DEFAULT_SAFETY_CORRIDOR_MM) < 0.05
											? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
											: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									data-testid="cbct-safety-margin-20"
								>
									2.0 мм (Стандарт Misch)
								</button>
							</div>
						</div>

						{/* Angulation & Pose Controls */}
						<div className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-2.5">
							<div className="text-xs font-semibold text-zinc-300">
								Пространственное позиционирование
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex justify-between items-center text-[11px] text-zinc-400">
									<span>Угол наклона (Ангуляция)</span>
									<span className="font-mono text-zinc-200">{angulationDeg}°</span>
								</div>
								<input
									type="range"
									min={-25}
									max={25}
									step={1}
									value={angulationDeg}
									onChange={(e) => setAngulationDeg(Number(e.target.value))}
									className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
									data-testid="cbct-implant-slider-angulation"
									aria-label="Угол наклона имплантата"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<div className="flex justify-between items-center text-[11px] text-zinc-400">
									<span>Глубина погружения гребня</span>
									<span className="font-mono text-zinc-200">{entryDepthMm.toFixed(1)} мм</span>
								</div>
								<input
									type="range"
									min={0}
									max={6}
									step={0.5}
									value={entryDepthMm}
									onChange={(e) => setEntryDepthMm(Number(e.target.value))}
									className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
									data-testid="cbct-implant-slider-depth"
									aria-label="Глубина погружения имплантата"
								/>
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN: Cross-section Diagram & Calm Telemetry */}
					<div className="w-full md:w-1/2 p-4 flex flex-col gap-4 bg-zinc-950/40 justify-between">
						{/* Active Fixture Specifications Card */}
						<div className="p-3.5 rounded-md bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-bold text-cyan-300">
									{currentImplant.brandName} {currentImplant.lineName}
								</span>
								<span className="text-xs font-mono text-zinc-400">
									арт. {currentImplant.articleNumber}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="flex flex-col text-zinc-400">
									<span>Диаметр тела:</span>
									<span className="text-zinc-200 font-mono font-semibold">Ø {currentImplant.diameterMm} мм</span>
								</div>
								<div className="flex flex-col text-zinc-400">
									<span>Длина имплантата:</span>
									<span className="text-zinc-200 font-mono font-semibold">{currentImplant.lengthMm} мм</span>
								</div>
								<div className="flex flex-col text-zinc-400">
									<span>Платформа:</span>
									<span className="text-zinc-200 font-mono">{currentImplant.platformDiameterMm} мм</span>
								</div>
								<div className="flex flex-col text-zinc-400">
									<span>Апекс:</span>
									<span className="text-zinc-200 font-mono">{currentImplant.apexDiameterMm} мм</span>
								</div>
							</div>

							<div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
								{currentImplant.clinicalIndicationRu}
							</div>
						</div>

						{/* 2D Cross-Section Schematic SVG */}
						<div className="flex-1 flex flex-col items-center justify-center p-2 rounded-md bg-black/60 border border-zinc-800/60 min-h-[160px] relative">
							<svg
								viewBox="-20 -5 40 45"
								className="w-full h-40 max-h-48 overflow-visible"
								aria-label="Схема коридора безопасности имплантата"
							>
								{/* Safety corridor outline (dashed cyan) */}
								<rect
									x={-corridorGeometry.cylinderRadiusMm}
									y={entryDepthMm}
									width={corridorGeometry.totalDiameterMm}
									height={corridorGeometry.totalLengthMm}
									rx={corridorGeometry.safetyMarginMm}
									fill="rgba(6, 182, 212, 0.08)"
									stroke="rgba(6, 182, 212, 0.6)"
									strokeWidth="0.5"
									strokeDasharray="1.5, 1"
									transform={`rotate(${angulationDeg}, ${vestibularOffsetMm}, ${entryDepthMm})`}
								/>

								{/* Implant body cylinder (solid ivory/cyan) */}
								<rect
									x={-currentImplant.diameterMm / 2}
									y={entryDepthMm}
									width={currentImplant.diameterMm}
									height={currentImplant.lengthMm}
									rx={0.8}
									fill="rgba(242, 232, 214, 0.85)"
									stroke="#06b6d4"
									strokeWidth="0.75"
									transform={`rotate(${angulationDeg}, ${vestibularOffsetMm}, ${entryDepthMm})`}
								/>

								{/* Nerve canal marker if present */}
								{nerveCanalCenter && (
									<g transform={`translate(${nerveCanalCenter.x}, ${nerveCanalCenter.y})`}>
										<circle r={1.4} fill="rgba(239, 68, 68, 0.5)" stroke="#ef4444" strokeWidth="0.5" />
										<circle r={1.4 + safetyMarginMm} fill="none" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="0.4" strokeDasharray="1, 1" />
									</g>
								)}
							</svg>

							<div className="absolute top-2 right-2 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
								Коридор: {safetyMarginMm.toFixed(1)} мм
							</div>
						</div>

						{/* Calm Nerve Telemetry Banner (Doctor Autonomy - Mandate 8e) */}
						<div
							className={`p-3 rounded-md border flex items-center justify-between text-xs ${
								nerveInspection.safetyStatus === "unmeasured"
									? "bg-zinc-900/60 border-zinc-800 text-zinc-300"
									: nerveInspection.isDanger
										? "bg-zinc-900 border-amber-500/40 text-amber-200"
										: nerveInspection.isWarning
											? "bg-zinc-900 border-amber-500/30 text-amber-300"
											: "bg-zinc-900 border-emerald-500/40 text-emerald-300"
							}`}
							data-testid="cbct-nerve-telemetry-banner"
						>
							<div className="flex items-center gap-2">
								<NerveCanal className="w-4 h-4 text-cyan-400" />
								<div className="flex flex-col">
									<span className="font-semibold">Нижнечелюстной канал (N. alveolaris inferior):</span>
									<span className="font-mono font-bold text-sm">
										{nerveInspection.telemetryTextRu}
									</span>
								</div>
							</div>

							<div className="text-[11px] text-right font-medium">
								{nerveInspection.safetyStatus === "safe" && (
									<span className="text-emerald-400">Коридор соблюден</span>
								)}
								{nerveInspection.safetyStatus === "warning" && (
									<span className="text-amber-400">Буферная зона</span>
								)}
								{nerveInspection.safetyStatus === "danger" && (
									<span className="text-amber-300">Приближение к каналу</span>
								)}
								{nerveInspection.safetyStatus === "unmeasured" && (
									<span className="text-zinc-400">Требуется разметка</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* FOOTER ACTION BUTTONS (MANDATE 8e: 100% DOCTOR AUTONOMY, NO DISABLED BUTTONS) */}
				<div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-t border-zinc-800">
					<div className="text-xs text-zinc-400">
						Стоимость: <span className="font-mono text-zinc-200 font-bold">{(currentImplant.priceKopecks / 100).toLocaleString("ru-RU")} ₽</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-700/60"
							data-testid="cbct-btn-cancel-implant"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleRecordToDiary}
							className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700"
							data-testid="cbct-btn-apply-to-diary"
						>
							В дневник 043/у
						</button>

						<button
							type="button"
							onClick={handleSaveToPlan}
							className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
							data-testid="cbct-btn-save-to-plan"
						>
							<Check className="w-3.5 h-3.5" />
							<span>В план лечения</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
