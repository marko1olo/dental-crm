/**
 * DENTE CRM — 3D Virtual Implant Planning Studio Modal
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Anatomage
 *
 * Mandate 8e: Doctor Autonomy
 * - Exact fixture dimensions for Straumann, Nobel Biocare, Osstem, Dentium, MIS (3.0..5.5 mm, 7.0..15.0 mm).
 * - 1.5–2.0 mm safety corridor visualization.
 * - Calm clinical metrics: "Дистанция: 1.8 мм" or "Канал не размечен".
 * - 100% Doctor Autonomy: No modal locks, no disabled "Применить" button, no screaming audio sirens.
 * - Mandate 8am: Exactly 1 Primary CTA button (var(--teal)).
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { DentalImplant } from "../icons/DentalIcons";
import type { CbctVoxelVolume } from "./cbctMprMath";
import {
	DEFAULT_SAFETY_CORRIDOR_MM,
	FULL_IMPLANT_LIBRARY,
	type ImplantBrandKey,
	type ImplantModel,
	computeSafetyCorridorGeometry,
	filterImplantLibrary,
	getAvailableDiameters,
	getAvailableLengths,
	inspectDistanceToMandibularCanal,
} from "./implantLibrary";
import {
	exportImplantToDiary043,
	exportImplantToTreatmentPlan,
} from "./ctImplantIntegrationBridge";
import { CbctImplantSelectorControls } from "./cbctImplant/CbctImplantSelectorControls";
import { CbctImplantNerveInspectionCard } from "./cbctImplant/CbctImplantNerveInspectionCard";

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
	const [vestibularOffsetMm] = useState<number>(0.0);

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
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
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
					<CbctImplantSelectorControls
						selectedBrand={selectedBrand}
						setSelectedBrand={setSelectedBrand}
						selectedDiameterMm={selectedDiameterMm}
						setSelectedDiameterMm={setSelectedDiameterMm}
						availableDiameters={availableDiameters}
						selectedLengthMm={selectedLengthMm}
						setSelectedLengthMm={setSelectedLengthMm}
						availableLengths={availableLengths}
						safetyMarginMm={safetyMarginMm}
						setSafetyMarginMm={setSafetyMarginMm}
						angulationDeg={angulationDeg}
						setAngulationDeg={setAngulationDeg}
						entryDepthMm={entryDepthMm}
						setEntryDepthMm={setEntryDepthMm}
					/>

					<CbctImplantNerveInspectionCard
						currentImplant={currentImplant}
						corridorGeometry={corridorGeometry}
						entryDepthMm={entryDepthMm}
						angulationDeg={angulationDeg}
						vestibularOffsetMm={vestibularOffsetMm}
						safetyMarginMm={safetyMarginMm}
						nerveCanalCenter={nerveCanalCenter}
						nerveInspection={nerveInspection}
					/>
				</div>

				{/* FOOTER ACTION BUTTONS (MANDATE 8e: 100% DOCTOR AUTONOMY, NO DISABLED BUTTONS, EXACTLY 1 PRIMARY CTA) */}
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
							В дневник приёма
						</button>

						<button
							type="button"
							onClick={handleSaveToPlan}
							className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-zinc-100 bg-[var(--teal,#0d9488)] hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
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

export default CbctImplantModal;
