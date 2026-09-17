import {
	ALL_ISO_ENDO_OPTIONS,
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	CANAL_NAME_OPTIONS,
	CAOH2_ENDO_PRESET,
	type EndoCanalData,
	type EndoPatientMemoParams,
	type EndoProtocolPreset,
	type EndoToothClinicalData,
	EXPRESS_APICAL_OBTURATION_PRESET,
	EXTENDED_MAF_ISO_OPTIONS,
	formatEndoCanalsTable043,
	formatEndoPatientMemo,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	getIsoEndoColorInfo,
	ISO_ENDO_COLORS,
	ISO_ENDO_COLORS_MAP,
	type IsoEndoColorInfo,
	type IsoEndoSize,
	MAF_ISO_OPTIONS,
	OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS,
	RETREATMENT_ENDO_PRESET,
	STANDARD_ENDO_PRESET,
	TAPER_OPTIONS,
} from "@dental/shared";
import {
	Activity,
	Check,
	ChevronDown,
	Clipboard,
	Copy,
	FileText,
	MoreHorizontal,
	Plus,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";

/**
 * Расширенная практическая линейка MAF файлов ISO (ISO 3630-1),
 * включающая малые ручные патфайндинг-номера (06, 08, 10) и основные мастер-файлы (15..60).
 */
export const CURATED_ISO_MAF_OPTIONS = [
	"ISO 06 (#06 розовый)",
	"ISO 08 (#08 серый)",
	"ISO 10 (#10 фиолетовый)",
	"ISO 15 (#15 белый)",
	"ISO 20 (#20 жёлтый)",
	"ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)",
	"ISO 35 (#35 зелёный)",
	"ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)",
	"ISO 50 (#50 жёлтый)",
	"ISO 55 (#55 красный)",
	"ISO 60 (#60 синий)",
] as const;

/** Клинический штамп этапа эндодонтического лечения (Мандат 8e) */
export type EndoStageStamp = "COMPLETED" | "TEMP_CAOH2" | "DRAFT";

/**
 * Безопасное форматирование рабочей длины корневого канала:
 * Гарантирует точность до 0.5 мм (Мандат 8b) и 100% исключает утечки NaN/undefined.
 */
export function formatWorkingLengthDisplay(wl: unknown): string {
	if (wl === null || wl === undefined || wl === "" || wl === 0) return "—";
	const num = typeof wl === "number" ? wl : Number.parseFloat(String(wl));
	if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) return "—";
	const rounded = Math.round(num * 2) / 2;
	return `${rounded.toFixed(1)} мм`;
}

// Re-export for complete backward compatibility across existing views & tests
export type {
	EndoCanalData,
	EndoPatientMemoParams,
	EndoProtocolPreset,
	EndoToothClinicalData,
	IsoEndoColorInfo,
	IsoEndoSize,
};
export {
	ALL_ISO_ENDO_OPTIONS,
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	CANAL_NAME_OPTIONS,
	CAOH2_ENDO_PRESET,
	EXPRESS_APICAL_OBTURATION_PRESET,
	EXTENDED_MAF_ISO_OPTIONS,
	formatEndoCanalsTable043,
	formatEndoPatientMemo,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	getIsoEndoColorInfo,
	ISO_ENDO_COLORS,
	ISO_ENDO_COLORS_MAP,
	MAF_ISO_OPTIONS,
	OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS,
	RETREATMENT_ENDO_PRESET,
	STANDARD_ENDO_PRESET,
	TAPER_OPTIONS,
};

export interface EndoCanalLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (
		protocolText: string,
		canals: EndoCanalData[],
	) => void;
	readonly onSaveCanals?: (
		canals: EndoCanalData[],
		clinicalData: EndoToothClinicalData,
	) => Promise<void> | void;
	readonly onSave?: (savedCanals: EndoCanalData[], noteText?: string) => void;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export function EndoCanalLogModal({
	isOpen,
	onClose,
	toothNumber,
	toothState,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRotarySystem,
	initialRadiologyControl,
	onInsertToProtocol,
	onSaveCanals,
	onSave,
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "",
	doctorName = "Врач-стоматолог-терапевт (эндодонтист)",
	patientName = "Пациент",
}: EndoCanalLogModalProps) {
	const [activeTooth, setActiveTooth] = useState<number>(toothNumber);

	useEffect(() => {
		setActiveTooth(toothNumber);
	}, [toothNumber]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (initialCanals && initialCanals.length > 0) {
			return initialCanals.map((c) => ({ ...c }));
		}
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [irrigation, setIrrigation] = useState<string>(
		initialIrrigation || PRIMARY_ENDO_PRESET.irrigation,
	);
	const [rotarySystem, setRotarySystem] = useState<string>(
		initialRotarySystem || PRIMARY_ENDO_PRESET.rotarySystem,
	);
	const [radiologyControl, setRadiologyControl] = useState<string>(
		initialRadiologyControl || PRIMARY_ENDO_PRESET.radiologyControl,
	);
	const [copied, setCopied] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

	// Clinical Stage Stamp (Мандат 8e п. 3 — свобода сохранения на любом этапе)
	const [stageStamp, setStageStamp] = useState<EndoStageStamp>(() => {
		if (
			initialIrrigation?.toLowerCase().includes("ca(oh)2") ||
			initialRotarySystem?.toLowerCase().includes("ca(oh)2")
		) {
			return "TEMP_CAOH2";
		}
		return "COMPLETED";
	});

	// UI menus state (Мандаты 8c, 8d)
	const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
	const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false);

	// Анатомические подсказки названий каналов зуба FDI
	const suggestedCanalNames = useMemo(() => {
		const defaultCanals = getDefaultCanalsForTooth(activeTooth);
		const names = defaultCanals.map((dc) => dc.canalName);
		const extra =
			activeTooth >= 16 && activeTooth <= 28
				? ["MB1", "MB2", "DB", "P"]
				: activeTooth >= 36 && activeTooth <= 48
					? ["MB", "ML", "D", "DL"]
					: ["Main", "B", "L"];
		return Array.from(new Set([...names, ...extra])).slice(0, 5);
	}, [activeTooth]);

	const handleSwitchTooth = (newTooth: number) => {
		setActiveTooth(newTooth);
		const newCanals = getDefaultCanalsForTooth(newTooth);
		setCanals(newCanals);
		showToast(
			`Выбран зуб #${newTooth}. Анатомические каналы автозаполнены`,
			"info",
		);
	};

	// При смене номера зуба, переоткрытии окна или передаче initialCanals
	useEffect(() => {
		if (!isOpen) return;

		if (initialCanals && initialCanals.length > 0 && activeTooth === toothNumber) {
			setCanals(initialCanals.map((c) => ({ ...c })));
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRotarySystem) setRotarySystem(initialRotarySystem);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			return;
		}

		if (patientId) {
			let cancelled = false;
			setIsLoadingFromDb(true);

			fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (cancelled) return;
					if (
						data?.success &&
						data?.clinicalData?.canals &&
						Array.isArray(data.clinicalData.canals) &&
						data.clinicalData.canals.length > 0
					) {
						setCanals(
							data.clinicalData.canals.map((c: EndoCanalData) => ({ ...c })),
						);
						if (data.clinicalData.irrigation) {
							setIrrigation(data.clinicalData.irrigation);
						}
						if (data.clinicalData.rotarySystem) {
							setRotarySystem(data.clinicalData.rotarySystem);
						}
						if (data.clinicalData.radiologyControl) {
							setRadiologyControl(data.clinicalData.radiologyControl);
						}
					} else {
						setCanals(getDefaultCanalsForTooth(activeTooth));
					}
				})
				.catch(() => {
					if (!cancelled) {
						setCanals(getDefaultCanalsForTooth(activeTooth));
					}
				})
				.finally(() => {
					if (!cancelled) setIsLoadingFromDb(false);
				});

			return () => {
				cancelled = true;
			};
		}

		setCanals(getDefaultCanalsForTooth(activeTooth));
		if (initialIrrigation) setIrrigation(initialIrrigation);
		if (initialRotarySystem) setRotarySystem(initialRotarySystem);
		if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
	}, [
		isOpen,
		activeTooth,
		toothNumber,
		initialCanals,
		initialIrrigation,
		initialRotarySystem,
		initialRadiologyControl,
		patientId,
	]);

	// Listen for measured lengths from radiovisiograph endo-ruler tool
	useEffect(() => {
		if (!isOpen) return;

		const handleMeasuredWl = (e: Event) => {
			const customEvent = e as CustomEvent<{
				toothCode?: string;
				lengthMm: number;
			}>;
			const { toothCode, lengthMm } = customEvent.detail || {};
			if (toothCode && Number(toothCode) !== activeTooth) return;

			// Apply to the first active/selected canal or all canals
			setCanals((prev) => {
				if (prev.length === 0) return prev;
				const updated = [...prev];
				// Update first unmeasured canal or first canal
				const targetIdx = updated.findIndex(
					(c) => !c.workingLengthMm || Number(c.workingLengthMm) === 0,
				);
				const applyIdx = targetIdx >= 0 ? targetIdx : 0;
				if (updated[applyIdx]) {
					updated[applyIdx] = {
						...updated[applyIdx],
						workingLengthMm: Math.round(lengthMm * 2) / 2,
					};
				}
				return updated;
			});
			showToast(
				`Длина ${lengthMm.toFixed(1)} мм перенесена с визиографа в канал!`,
				"success",
			);
		};

		window.addEventListener("dente-endo-wl-measured", handleMeasuredWl);
		return () =>
			window.removeEventListener("dente-endo-wl-measured", handleMeasuredWl);
	}, [isOpen, activeTooth]);

	// ESC to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleCanalChange = (
		id: string,
		field: keyof EndoCanalData,
		value: string | number,
	) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
		);
	};

	const handleCanalLengthInputChange = (id: string, rawVal: string) => {
		const trimmed = rawVal.trim();
		if (!trimmed) {
			setCanals((prev) =>
				prev.map((c) => (c.id === id ? { ...c, workingLengthMm: "" } : c)),
			);
			return;
		}
		const num = Number.parseFloat(trimmed);
		if (Number.isNaN(num) || !Number.isFinite(num)) {
			return;
		}
		const clamped = Math.max(0, Math.min(35, Math.round(num * 2) / 2));
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, workingLengthMm: clamped } : c)),
		);
	};

	const handleAdjustCanalLength = (id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const curr =
					typeof c.workingLengthMm === "number" &&
					!Number.isNaN(c.workingLengthMm)
						? c.workingLengthMm
						: Number.parseFloat(String(c.workingLengthMm)) || 21.0;
				const next = Math.max(
					10,
					Math.min(35, Math.round((curr + delta) * 2) / 2),
				);
				return { ...c, workingLengthMm: next };
			}),
		);
	};

	const handleSetCanalLength = (id: string, length: number) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, workingLengthMm: length } : c)),
		);
	};

	// ─── 1-КЛИК ПРЕСЕТЫ (МАНДАТЫ 8e п. 3, 8k, 8n) ──────────────────────────────
	const handleApplyExpressApicalPreset = () => {
		const preset = applyExpressApicalEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast(
			"Применен 1-клик протокол: Каналы пройдены и обтурированы до апекса",
			"success",
		);
	};

	const handleApplyCaOh2Protocol = () => {
		const preset = applyCaOh2EndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast(
			"Применен 1-клик протокол: Временная повязка Ca(OH)2 (Каласепт)",
			"info",
		);
	};

	const handleApplyPulpitisPreset = () => {
		const preset = applyPulpitisProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast(
			"Применен 1-клик протокол: Эндодонтия пульпита в 1 визит (ProTaper F2 + AH Plus)",
			"success",
		);
	};

	const handleApplyPrimaryEndoPreset = () => {
		const preset = applyPrimaryEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast(
			"Применен 1-клик протокол: Первичное эндо (ProTaper Gold + Metapex)",
			"success",
		);
	};

	const handleApplyRetreatmentPreset = () => {
		const preset = applyRetreatmentEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast(
			"Применен 1-клик протокол: Повторное эндо (D-RaCe + ревизия)",
			"info",
		);
	};

	const handleApplyObturationPreset = () => {
		const preset = applyObturationPermanentProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast(
			"Применен 1-клик протокол: Постоянная обтурация (GuttaCore / AH Plus)",
			"success",
		);
	};

	const handleApplyPulpitisObturationPreset = () => {
		const preset = applyPulpitisObturationProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Применен протокол: Пульпит 2-е посещение (AH Plus)", "success");
	};

	const handleApplyPeriodontitisDestructivePreset = () => {
		const preset = applyPeriodontitisDestructiveProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast(
			"Применен протокол: Периодонтит деструктивный (Metapex 14 дн)",
			"info",
		);
	};

	const handleApplyStandardProtocol = () => {
		const preset = applyStandardEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast(
			"Применен стандартный протокол обтурации (ProTaper + AH Plus)",
			"success",
		);
	};

	const sanitizeCanalsForSubmission = (
		inputCanals: EndoCanalData[],
	): EndoCanalData[] => {
		return inputCanals.map((c) => {
			let safeWl: number | string = c.workingLengthMm;
			if (typeof safeWl === "number") {
				if (Number.isNaN(safeWl) || !Number.isFinite(safeWl) || safeWl <= 0) {
					safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
				} else {
					safeWl = Math.round(safeWl * 2) / 2;
				}
			} else if (typeof safeWl === "string" && safeWl.trim()) {
				const parsed = Number.parseFloat(safeWl);
				if (!Number.isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
					safeWl = Math.round(parsed * 2) / 2;
				} else {
					safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
				}
			} else {
				safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
			}

			return {
				...c,
				workingLengthMm: safeWl,
				masterApicalFile: c.masterApicalFile || "ISO 25 (#25 красный)",
				taper: c.taper || ".06 (Конусность 6%)",
				referencePoint: c.referencePoint || "Реперный ориентир",
				obturationTechnique:
					c.obturationTechnique ||
					(stageStamp === "TEMP_CAOH2"
						? "Временная обтурация Ca(OH)2 (Metapex / Calcept)"
						: "Гуттаперча + Силер (AH Plus)"),
			};
		});
	};

	const handleApplyAnatomicalLengths = () => {
		const updated = applyAnatomicalWorkingLengths(canals, activeTooth);
		setCanals(updated);
		showToast(
			`Анатомическая длина каналов автозаполнена для зуба #${activeTooth}`,
			"info",
		);
	};

	const handleAddCanal = () => {
		const newId = `canal-custom-${Date.now()}`;
		const defaultAnatomy = getDefaultCanalsForTooth(activeTooth);
		const existingNames = new Set(
			canals.map((c) => c.canalName.trim().toUpperCase()),
		);
		const missingDefault = defaultAnatomy.find(
			(dc) => !existingNames.has(dc.canalName.trim().toUpperCase()),
		);

		const canalName = missingDefault
			? missingDefault.canalName
			: `Канал ${canals.length + 1}`;

		const referencePoint = missingDefault
			? missingDefault.referencePoint
			: REFERENCE_POINT_OPTIONS[0];

		const workingLengthMm = missingDefault
			? missingDefault.workingLengthMm
			: 21.0;

		const newCanal: EndoCanalData = {
			id: newId,
			canalName,
			referencePoint,
			workingLengthMm,
			masterApicalFile: missingDefault?.masterApicalFile || "ISO 25 (#25 красный)",
			taper: missingDefault?.taper || TAPER_OPTIONS[2],
			obturationTechnique:
				stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2 (Metapex / Calcept)"
					: OBTURATION_TECHNIQUE_OPTIONS[0],
		};
		setCanals((prev) => [...prev, newCanal]);
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы один корневой канал", "warning");
			return;
		}
		setCanals((prev) => prev.filter((c) => c.id !== id));
	};

	const handleResetToDefaults = () => {
		setCanals(getDefaultCanalsForTooth(activeTooth));
		showToast(`Параметры сброшены к стандарту зуба #${activeTooth}`, "info");
	};

	const toothAnatomicalName = getToothAnatomicalNameRu(activeTooth);

	const generatedProtocolText = useMemo(() => {
		let stampedTitle = toothAnatomicalName;
		if (stageStamp === "DRAFT") {
			stampedTitle = `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]`;
		} else if (stageStamp === "TEMP_CAOH2") {
			stampedTitle = `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]`;
		} else {
			stampedTitle = `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		}

		return generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: canals.map((c) => ({
				...c,
				workingLengthMm:
					typeof c.workingLengthMm === "number" &&
					!Number.isNaN(c.workingLengthMm)
						? Math.round(c.workingLengthMm * 2) / 2
						: c.workingLengthMm,
			})),
			irrigation,
			rotarySystem,
			radiologyControl,
		});
	}, [
		activeTooth,
		toothAnatomicalName,
		canals,
		irrigation,
		rotarySystem,
		radiologyControl,
		stageStamp,
	]);

	const persistCanalsToBackend = async (
		clinicalData: EndoToothClinicalData,
	): Promise<boolean> => {
		if (onSaveCanals) {
			await onSaveCanals(canals, clinicalData);
			return true;
		}

		if (patientId) {
			try {
				const res = await fetch(
					`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`,
					{
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							canals,
							irrigation,
							rotarySystem,
							radiologyControl,
						}),
					},
				);
				if (!res.ok) {
					showToast("Не удалось сохранить параметры каналов в БД", "error");
					return false;
				}
				return true;
			} catch {
				showToast("Ошибка сохранения параметров каналов в БД", "error");
				return false;
			}
		}

		return true;
	};

	const handleSaveCanalsOnly = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals);
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		try {
			const ok = await persistCanalsToBackend(clinicalData);
			if (ok) {
				showToast(
					`Параметры каналов зуба #${activeTooth} успешно сохранены в карту!`,
					"success",
				);
				onClose();
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleInsertToProtocol = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals);
		const stampedTitle =
			stageStamp === "DRAFT"
				? `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]`
				: stageStamp === "TEMP_CAOH2"
					? `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]`
					: `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		const protocolTextToInsert = generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
		});
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		try {
			await persistCanalsToBackend(clinicalData);
		} catch (err) {
			console.warn(
				"Background persistence failed, proceeding with protocol insertion",
				err,
			);
		} finally {
			setIsSaving(false);
		}

		// 1. Direct injection into useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existingObj = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existingObj
						? `${existingObj}\n\n${protocolTextToInsert}`
						: protocolTextToInsert,
				};
			});
		} catch {
			// fallback
		}

		// 2. Callback if provided
		if (onInsertToProtocol) {
			onInsertToProtocol(protocolTextToInsert, effectiveCanals);
		}
		if (onSave) {
			onSave(effectiveCanals, protocolTextToInsert);
		}

		// 3. Global custom event for visit diary listeners
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: protocolTextToInsert,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast(
			`Эндодонтический протокол для зуба #${activeTooth} сохранен и вставлен в карту 043/у!`,
			"success",
		);
		onClose();
	};

	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(generatedProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	// 1-Click Patient Endo Memo for Messengers (Feature 243, Mandates 8e, 8k, 8n)
	const handleCopyPatientMemo = async () => {
		try {
			const isPermanent = Boolean(
				stageStamp === "COMPLETED" ||
					canals.some(
						(c) => c.obturationTechnique && c.obturationTechnique !== "none",
					) ||
					radiologyControl.toLowerCase().includes("обтурирован"),
			);

			const isTemporaryCaOh2 = Boolean(
				stageStamp === "TEMP_CAOH2" ||
					!isPermanent ||
					irrigation.toLowerCase().includes("ca(oh)2") ||
					rotarySystem.toLowerCase().includes("ca(oh)2") ||
					canals.some((c) => c.notes?.toLowerCase().includes("ca(oh)2")),
			);

			const text = formatEndoPatientMemo({
				clinicName,
				clinicPhone,
				patientName,
				doctorName,
				toothNumber: activeTooth,
				toothAnatomicalNameRu: toothAnatomicalName,
				isTemporaryCaOh2,
				isPermanentObturation: isPermanent,
			});

			await navigator.clipboard.writeText(text);
			showToast(
				"Памятка по уходу после лечения каналов скопирована для пациента",
				"success",
			);
		} catch {
			showToast("Не удалось скопировать памятку для пациента", "error");
		}
	};

	// Print official Endodontic Worksheet / Form 043/u attachment (A4)
	const handlePrintWorksheet = () => {
		showToast("Отправка эндо-карты на печать...", "info");
		window.print();
	};

	// ISO 3630-1 color swatch badge with high-contrast light/dark theme borders
	const renderIsoColorBadge = (fileVal: string | undefined) => {
		const isoColor = getIsoEndoColorInfo(fileVal);
		const hex = isoColor?.hex || "#94a3b8";
		const isWhite =
			isoColor?.size === 15 || isoColor?.size === 45 || isoColor?.size === 90;
		const isBlack =
			isoColor?.size === 40 || isoColor?.size === 80 || isoColor?.size === 140;

		return (
			<span
				className="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 rounded-full border shadow-xs transition-transform"
				style={{
					backgroundColor: hex,
					borderColor: isWhite
						? "#94a3b8"
						: isBlack
							? "#64748b"
							: "rgba(0,0,0,0.25)",
					boxShadow: isBlack ? "0 0 0 1px rgba(255,255,255,0.3)" : undefined,
				}}
				title={
					isoColor
						? `${isoColor.labelRu} (${isoColor.colorRu})`
						: "ISO цвет инструмента"
				}
			>
				{isWhite && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
			</span>
		);
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-label={`Эндодонтический журнал каналов зуба ${activeTooth}`}
			data-testid="endo-canal-log-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				{/* Top Header */}
				<header className="flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90">
					<div className="flex items-center gap-3.5">
						<div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
							<Activity size={26} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs uppercase font-black tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-500/30">
									{isLoadingFromDb ? "Загрузка каналов..." : "Эндодонтический журнал каналов"}
								</span>
								{toothState && (
									<span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-500/30">
										{toothState}
									</span>
								)}
							</div>
							<h2 className="text-lg sm:text-xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1 truncate">
								{toothAnatomicalName}
							</h2>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="endo-modal-close-btn"
						className="min-h-[48px] min-w-[48px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:text-slate-400 dark:hover:text-white hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
						aria-label="Закрыть модальное окно"
					>
						<X size={22} />
					</button>
				</header>

				{/* Scrollable Content Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
					{/* 1-Click Fast Clinical Protocols & Actions Bar (Мандаты 8c, 8d п. 2, 8e, 8p, 8n) — EXACTLY 1 ROW (h-8 sm:h-9, 32–36px) */}
					<div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-800 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] max-h-[36px] overflow-visible shrink-0 relative">
						<div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar flex-nowrap shrink min-w-0">
							{/* FDI Tooth Switcher in 1-row toolbar (Закон Хика, 32-36px) */}
							<div className="flex items-center gap-1 shrink-0 bg-[var(--paper,#ffffff)] dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 h-6 sm:h-7">
								<span className="text-[11px] font-black text-rose-600 dark:text-rose-400 shrink-0">Зуб:</span>
								<select
									value={activeTooth}
									onChange={(e) => handleSwitchTooth(Number(e.target.value))}
									aria-label="Выбор зуба FDI"
									className="h-full text-xs font-black bg-transparent text-[var(--ink,#0f172a)] dark:text-white outline-none cursor-pointer pr-0.5"
								>
									<optgroup label="Верхняя челюсть (18-28)">
										{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
											<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
												#{t}
											</option>
										))}
									</optgroup>
									<optgroup label="Нижняя челюсть (48-38)">
										{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
											<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
												#{t}
											</option>
										))}
									</optgroup>
								</select>
							</div>

							<div className="hidden xl:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 shrink-0 mr-0.5">
								<Sparkles size={14} className="shrink-0" />
								<span>1-клик:</span>
							</div>

							{/* Preset 1: Каналы пройдены и обтурированы */}
							<button
								type="button"
								data-testid="btn-express-apical-endo-protocol"
								onClick={handleApplyExpressApicalPreset}
								className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-[var(--teal,#0d9488)] hover:brightness-110 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
								title="1-клик: Каналы обработаны и обтурированы до апекса (Apex 0.0 + RVG + AH Plus)"
							>
								<Check size={13} className="shrink-0" />
								<span className="truncate">Пройдены и обтурированы</span>
							</button>

							{/* Preset 2: Временная пломбировка Ca(OH)2 */}
							<button
								type="button"
								data-testid="btn-caoh2-endo-protocol"
								onClick={handleApplyCaOh2Protocol}
								className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
								title="1-клик: Временная повязка Ca(OH)2 (Каласепт / Metapex) на 7–14 дней"
							>
								<ShieldCheck size={13} className="shrink-0" />
								<span className="truncate">Временная Ca(OH)2</span>
							</button>

							{/* Preset 3: Эндодонтия пульпита в 1 визит */}
							<button
								type="button"
								data-testid="btn-endo-preset-pulpitis-complete"
								onClick={handleApplyPulpitisPreset}
								className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
								title="1-клик: Эндодонтия пульпита в 1 визит (ProTaper F2 + AH Plus)"
							>
								<Zap size={13} className="shrink-0" />
								<span className="truncate">Пульпит в 1 визит</span>
							</button>

							{/* Secondary Presets Popover Menu */}
							<div className="relative shrink-0">
								<button
									type="button"
									onClick={() => setIsPresetsMenuOpen((v) => !v)}
									className="h-6 sm:h-7 px-1.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
									title="Другие протоколы эндодонтии (Первичное, Повторное D-RaCe, Периодонтит деструктивный...)"
								>
									<span className="text-[11px]">Другие</span>
									<ChevronDown size={12} />
								</button>

								{isPresetsMenuOpen && (
									<div
										className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
										role="menu"
									>
										<button
											type="button"
											data-testid="btn-endo-preset-primary"
											onClick={() => {
												handleApplyPrimaryEndoPreset();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<Zap size={14} className="text-rose-500 shrink-0" />
											<span className="truncate">
												Первичное эндо (ProTaper + Metapex)
											</span>
										</button>
										<button
											type="button"
											data-testid="btn-endo-preset-retreatment"
											onClick={() => {
												handleApplyRetreatmentPreset();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<RotateCcw
												size={14}
												className="text-amber-500 shrink-0"
											/>
											<span className="truncate">
												Повторное эндо (D-RaCe + ревизия)
											</span>
										</button>
										<button
											type="button"
											data-testid="btn-endo-preset-obturation"
											onClick={() => {
												handleApplyObturationPreset();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<Check size={14} className="text-emerald-500 shrink-0" />
											<span className="truncate">
												Постоянная обтурация (GuttaCore / AH Plus)
											</span>
										</button>
										<button
											type="button"
											data-testid="btn-endo-preset-pulpitis-obturation"
											onClick={() => {
												handleApplyPulpitisObturationPreset();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<Check size={14} className="text-slate-500 shrink-0" />
											<span className="truncate">Пульпит 2 эт. (AH Plus)</span>
										</button>
										<button
											type="button"
											data-testid="btn-endo-preset-periodontitis-destructive"
											onClick={() => {
												handleApplyPeriodontitisDestructivePreset();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<ShieldCheck
												size={14}
												className="text-purple-500 shrink-0"
											/>
											<span className="truncate">
												Периодонтит (Metapex 14 дн)
											</span>
										</button>
										<button
											type="button"
											data-testid="btn-standard-endo-protocol"
											onClick={() => {
												handleApplyStandardProtocol();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
										>
											<Sparkles
												size={14}
												className="text-indigo-500 shrink-0"
											/>
											<span className="truncate">Стандарт (AH Plus)</span>
										</button>
										<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />
										<button
											type="button"
											onClick={() => {
												handleResetToDefaults();
												setIsPresetsMenuOpen(false);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-400 font-medium flex items-center gap-2 cursor-pointer"
										>
											<RotateCcw size={14} className="shrink-0" />
											<span>Сброс к анатомическому стандарту</span>
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Right toolbar controls: Autofill WL + Add Canal */}
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								data-testid="btn-endo-anatomical-autofill"
								onClick={handleApplyAnatomicalLengths}
								className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-950 dark:text-indigo-200 border border-indigo-500/30 flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-98"
								title="Автозаполнение анатомической рабочей длины по FDI в 1 клик"
							>
								<Zap
									size={13}
									className="text-indigo-600 dark:text-indigo-400 shrink-0"
								/>
								<span className="hidden sm:inline">Авто-РД (FDI)</span>
								<span className="sm:hidden">РД</span>
							</button>

							<button
								type="button"
								onClick={handleAddCanal}
								className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
								title="Добавить дополнительный корневой канал"
							>
								<Plus size={13} className="shrink-0" />
								<span className="hidden sm:inline">Канал</span>
							</button>
						</div>
					</div>

					{/* Datalist for fast canal name autocomplete */}
					<datalist id="endo-canal-names-list">
						{CANAL_NAME_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</datalist>

					{/* Multi-canal Table / Matrix (Dense desktop ergonomics h-8/h-9, Mandate 8c) */}
					<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-[var(--paper,#ffffff)] dark:bg-slate-900/60">
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 text-[var(--muted,#64748b)] text-[11px] font-bold border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<tr>
										<th className="py-2 px-3 truncate min-w-0">Канал</th>
										<th className="py-2 px-3 truncate min-w-0">Реперный ориентир</th>
										<th className="py-2 px-3 min-w-[200px] truncate">
											Длина (WL, 0.5 мм)
										</th>
										<th className="py-2 px-3 truncate min-w-0">MAF (ISO 3630-1)</th>
										<th className="py-2 px-3 truncate min-w-0">Конусность</th>
										<th className="py-2 px-3 truncate min-w-0">Метод обтурации</th>
										<th className="py-2 px-2 text-center w-10" />
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
									{canals.map((c, index) => (
										<tr
											key={c.id}
											className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
										>
											{/* Canal Name */}
											<td className="py-1.5 px-3">
												<input
													type="text"
													list="endo-canal-names-list"
													aria-label={`Название канала ${index + 1}`}
													value={c.canalName}
													onChange={(e) =>
														handleCanalChange(c.id, "canalName", e.target.value)
													}
													className="w-full h-8 sm:h-8.5 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
												/>
												{/* Suggested anatomical canal quick-pick chips */}
												{suggestedCanalNames.length > 0 && (
													<div className="flex items-center gap-1 mt-1 flex-wrap">
														{suggestedCanalNames.map((sName) => (
															<button
																key={sName}
																type="button"
																onClick={() =>
																	handleCanalChange(c.id, "canalName", sName)
																}
																className={`h-4 px-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
																	c.canalName === sName
																		? "bg-rose-600 text-white shadow-xs"
																		: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
																}`}
																title={`Выбрать анатомический канал ${sName}`}
															>
																{sName}
															</button>
														))}
													</div>
												)}
											</td>

											{/* Reference Point */}
											<td className="py-1.5 px-3">
												<select
													aria-label={`Реперный ориентир канала ${c.canalName}`}
													value={c.referencePoint}
													onChange={(e) =>
														handleCanalChange(
															c.id,
															"referencePoint",
															e.target.value,
														)
													}
													className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
												>
													{REFERENCE_POINT_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Working Length in mm (степперы 0.5 мм и быстрые пресеты) */}
											<td className="py-1.5 px-3 min-w-[200px]">
												<div className="space-y-1">
													<div className="relative flex items-center gap-1">
														<button
															type="button"
															onClick={() =>
																handleAdjustCanalLength(c.id, -0.5)
															}
															className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
															title="-0.5 мм"
														>
															-0.5
														</button>
														<div className="relative flex-1 flex items-center">
															<input
																type="number"
																step="0.5"
																min="10"
																max="35"
																aria-label={`Рабочая длина в мм для канала ${c.canalName}`}
																value={
																	c.workingLengthMm === 0
																		? ""
																		: c.workingLengthMm
																}
																placeholder="—"
																onChange={(e) =>
																	handleCanalLengthInputChange(
																		c.id,
																		e.target.value,
																	)
																}
																className="w-full h-7 pl-1.5 pr-6 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none text-center"
															/>
															<span className="absolute right-1.5 text-[10px] text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
																мм
															</span>
														</div>
														<button
															type="button"
															onClick={() => handleAdjustCanalLength(c.id, 0.5)}
															className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
															title="+0.5 мм"
														>
															+0.5
														</button>
													</div>
													{/* Quick Length Chips */}
													<div className="flex items-center gap-1 flex-wrap">
														{QUICK_LENGTH_PRESETS.map((presetLen) => (
															<button
																key={presetLen}
																type="button"
																onClick={() =>
																	handleSetCanalLength(c.id, presetLen)
																}
																className={`h-5 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
																	Number(c.workingLengthMm) === presetLen
																		? "bg-rose-600 text-white shadow-xs"
																		: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
																}`}
																title={`Установить длину ${presetLen} мм`}
															>
																{presetLen}
															</button>
														))}
													</div>
												</div>
											</td>

											{/* Master Apical File (MAF) with ISO 3630-1 color swatch */}
											<td className="py-1.5 px-3">
												<div className="flex items-center gap-1.5">
													{renderIsoColorBadge(c.masterApicalFile)}
													<select
														aria-label={`Мастер-апикальный файл для канала ${c.canalName}`}
														value={c.masterApicalFile}
														onChange={(e) =>
															handleCanalChange(
																c.id,
																"masterApicalFile",
																e.target.value,
															)
														}
														className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none font-semibold truncate min-w-0"
													>
														{CURATED_ISO_MAF_OPTIONS.map((opt) => (
															<option key={opt} value={opt}>
																{opt}
															</option>
														))}
													</select>
												</div>
											</td>

											{/* Taper */}
											<td className="py-1.5 px-3">
												<select
													aria-label={`Конусность для канала ${c.canalName}`}
													value={c.taper}
													onChange={(e) =>
														handleCanalChange(c.id, "taper", e.target.value)
													}
													className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
												>
													{TAPER_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Obturation Technique */}
											<td className="py-1.5 px-3">
												<select
													aria-label={`Метод обтурации для канала ${c.canalName}`}
													value={c.obturationTechnique}
													onChange={(e) =>
														handleCanalChange(
															c.id,
															"obturationTechnique",
															e.target.value,
														)
													}
													className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none font-medium truncate min-w-0"
												>
													{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Remove Canal */}
											<td className="py-1.5 px-2 text-center">
												<button
													type="button"
													onClick={() => handleRemoveCanal(c.id)}
													className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
													title={`Удалить канал ${c.canalName}`}
												>
													<Trash2 size={16} />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Additional Clinical Details: Rotary, Irrigation & X-Ray */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<label
								htmlFor="endo-rotary-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
							>
								Инструментальная система (NiTi):
							</label>
							<input
								id="endo-rotary-input"
								type="text"
								value={rotarySystem}
								onChange={(e) => setRotarySystem(e.target.value)}
								className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
								placeholder="Машинная обработка NiTi ProTaper Gold (SX, S1, S2, F1, F2)"
							/>
						</div>

						<div>
							<label
								htmlFor="endo-irrigation-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
							>
								Растворы и протокол ирригации:
							</label>
							<input
								id="endo-irrigation-input"
								type="text"
								value={irrigation}
								onChange={(e) => setIrrigation(e.target.value)}
								className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
								placeholder="3% NaOCl + 17% EDTA с ультразвуковой активацией"
							/>
						</div>

						<div>
							<label
								htmlFor="endo-radiology-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
							>
								Рентген-контроль (визиография):
							</label>
							<input
								id="endo-radiology-input"
								type="text"
								value={radiologyControl}
								onChange={(e) => setRadiologyControl(e.target.value)}
								className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
								placeholder="Контрольная визиография: каналы обтурированы до апекса."
							/>
						</div>
					</div>

					{/* Live Structured Protocol Preview for Form 043/y (Zero Emojis) */}
					<div className="p-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-950/60 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-2xl">
						<div className="flex items-center justify-between mb-1.5">
							<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
								<FileText size={15} />
								<span className="truncate">Форма 043/у · Предпросмотр протокола лечения:</span>
							</div>

							<button
								type="button"
								onClick={handleCopyText}
								className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
							>
								{copied ? (
									<Check size={14} className="text-emerald-500" />
								) : (
									<Clipboard size={14} />
								)}
								<span>{copied ? "Скопировано!" : "Копировать текст"}</span>
							</button>
						</div>

						<pre
							data-testid="endo-protocol-preview-text"
							className="text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed m-0 p-2.5 bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 max-h-36 overflow-y-auto select-text"
						>
							{generatedProtocolText}
						</pre>
					</div>
				</div>

				{/* Bottom Action Footer (Miller's Law: strictly <= 2 direct action buttons, secondary in menu '...') */}
				<footer className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					{/* Left Group: Print A4 + Secondary actions menu '...' + Clinical Stage Stamp */}
					<div className="flex items-center gap-2 flex-wrap">
						{/* Print A4 Worksheet Button (Wave 54 / Mandate 8e: Печать в любой момент) */}
						<button
							type="button"
							onClick={handlePrintWorksheet}
							data-testid="endo-print-worksheet-btn"
							className="min-h-[50px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
							title="Распечатать эндодонтическую карту (А4) для истории болезни"
						>
							<Printer
								size={16}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span>Печать эндо-карты (А4)</span>
						</button>

						{/* Menu '...' for secondary actions (Draft save, Copy 043, Reset) */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsFooterMenuOpen((v) => !v)}
								className="min-h-[44px] px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
								title="Дополнительные действия (сохранение черновика, сброс параметров)"
								aria-label="Дополнительные действия"
							>
								<MoreHorizontal size={18} />
								<span className="hidden sm:inline">Действия</span>
							</button>

							{isFooterMenuOpen && (
								<div
									className="absolute left-0 bottom-full mb-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
									role="menu"
								>
									<button
										type="button"
										data-testid="save-endo-canals-btn"
										onClick={() => {
											handleSaveCanalsOnly();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer"
										title="Сохранить параметры каналов в БД без вставки в дневник визита"
									>
										<Check
											size={15}
											className="text-emerald-600 dark:text-emerald-400 shrink-0"
										/>
										<span>Сохранить только каналы</span>
									</button>

									<button
										type="button"
										onClick={() => {
											handleCopyText();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer"
									>
										<Clipboard size={15} className="text-slate-500 shrink-0" />
										<span>Копировать текст 043/у</span>
									</button>

									<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />

									<button
										type="button"
										onClick={() => {
											handleResetToDefaults();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 transition-colors cursor-pointer"
									>
										<RotateCcw size={15} className="shrink-0" />
										<span>Сбросить к стандарту FDI</span>
									</button>
								</div>
							)}
						</div>

						{/* Clinical Stage Stamp Selector (Мандат 8e п. 3: черновик / временная / полная) */}
						<div className="flex items-center gap-1.5">
							<span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
								Штамп:
							</span>
							<select
								value={stageStamp}
								onChange={(e) =>
									setStageStamp(e.target.value as EndoStageStamp)
								}
								aria-label="Клинический штамп этапа лечения"
								className="h-9 px-2 rounded-xl text-xs font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 outline-none cursor-pointer"
							>
								<option value="COMPLETED">ОБТУРИРОВАНО</option>
								<option value="TEMP_CAOH2">ВРЕМЕННАЯ ОБТУРАЦИЯ</option>
								<option value="DRAFT">ЧЕРНОВИК</option>
							</select>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="h-9 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
						>
							Отмена
						</button>
					</div>

					{/* Right Group (Miller's Law: strictly <= 2 direct action buttons) */}
					<div className="flex items-center gap-2.5 flex-wrap">
						{/* Primary Action 1: Памятка пациенту */}
						<button
							type="button"
							onClick={handleCopyPatientMemo}
							data-testid="endo-copy-patient-memo-btn"
							className="min-h-[50px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer active:scale-98"
							title="Скопировать памятку по уходу после лечения каналов для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy
								size={16}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span>Скопировать для пациента</span>
						</button>

						{/* Primary Action 2: Сохранить в карту 043/у (0 disabled buttons, Mandate 8e) */}
						<button
							type="button"
							data-testid="insert-endo-protocol-btn"
							onClick={handleInsertToProtocol}
							className="min-h-[50px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
							title="Сохранить параметры каналов и вставить официальный протокол в карту 043/у"
						>
							<Check size={18} />
							<span>
								{isSaving ? "Сохранение..." : "Сохранить в карту 043/у"}
							</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
