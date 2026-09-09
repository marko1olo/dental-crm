import {
	Activity,
	Check,
	Clipboard,
	Copy,
	FileText,
	Plus,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	type EndoCanalData,
	type EndoToothClinicalData,
	type EndoProtocolPreset,
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	QUICK_LENGTH_PRESETS,
	PRIMARY_ENDO_PRESET,
	RETREATMENT_ENDO_PRESET,
	OBTURATION_PERMANENT_PRESET,
	EXPRESS_APICAL_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	STANDARD_ENDO_PRESET,
	CAOH2_ENDO_PRESET,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	applyAnatomicalWorkingLengths,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyExpressApicalEndoProtocol,
	applyPulpitisVisit1Protocol,
	applyPulpitisObturationProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyStandardEndoProtocol,
	applyCaOh2EndoProtocol,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	formatEndoCanalsTable043,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

// Re-export for complete backward compatibility across existing views & tests
export type { EndoCanalData, EndoToothClinicalData, EndoProtocolPreset };
export {
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	QUICK_LENGTH_PRESETS,
	PRIMARY_ENDO_PRESET,
	RETREATMENT_ENDO_PRESET,
	OBTURATION_PERMANENT_PRESET,
	EXPRESS_APICAL_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	STANDARD_ENDO_PRESET,
	CAOH2_ENDO_PRESET,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	applyAnatomicalWorkingLengths,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyExpressApicalEndoProtocol,
	applyPulpitisVisit1Protocol,
	applyPulpitisObturationProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyStandardEndoProtocol,
	applyCaOh2EndoProtocol,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	formatEndoCanalsTable043,
};

export interface EndoPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly toothNumber: number;
	readonly toothAnatomicalNameRu?: string | undefined;
	readonly isTemporaryCaOh2?: boolean | undefined;
	readonly isPermanentObturation?: boolean | undefined;
	readonly nextVisitDays?: number | string | undefined;
	readonly date?: string | undefined;
}

export function formatEndoPatientMemo(params: EndoPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone.trim() || "+7 (495) 123-45-67";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Врач-стоматолог-терапевт (эндодонтист)";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const toothName = params.toothAnatomicalNameRu
		? `${params.toothNumber} (${params.toothAnatomicalNameRu})`
		: `зуб ${params.toothNumber}`;
	const stage = params.isPermanentObturation
		? "Постоянная трёхмерная обтурация корневых каналов гуттаперчей с герметиком"
		: "Антисептическая обработка каналов и временное пломбирование гидроксидом кальция Ca(OH)2";
	const nextVisit = params.nextVisitDays
		? `${params.nextVisitDays}`
		: params.isPermanentObturation
			? "через 10-14 дней (контрольный снимок и постоянная реставрация/коронка)"
			: "через 10-14 дней для замены лекарства или постоянной пломбировки каналов";

	return [
		`Памятка пациенту после эндодонтического лечения корневых каналов (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата приёма: ${date}`,
		`Пролеченный зуб: ${toothName}`,
		`Этап лечения: ${stage}`,
		`Памятка и правила ухода:`,
		`1. Не принимайте пищу в течение 2 часов до полного затвердевания временной пломбы.`,
		`2. Не нагружайте зуб твёрдой или липкой пищей (сухари, орехи, ириски) во избежание скола стенок зуба до покрытия коронкой.`,
		`3. Умеренная болезненность при накусывании в течение 2–5 дней является естественной реакцией тканей периодонта на механическую и медикаментозную обработку. При дискомфорте примите назначенное врачом обезболивающее средство (Парацетамол / Ибупрофен).`,
		`4. Срок следующего визита: ${nextVisit}.`,
		`5. При появлении отёка десны или пульсирующей боли немедленно свяжитесь с клиникой: ${clinicPhone}.`,
	].join("\n");
}

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
	readonly onSave?: (
		savedCanals: EndoCanalData[],
		noteText?: string,
	) => void;
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
	clinicPhone = "+7 (495) 123-45-67",
	doctorName = "Врач-стоматолог-терапевт (эндодонтист)",
	patientName = "Пациент",
}: EndoCanalLogModalProps) {
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
	const [, setIsLoadingFromDb] = useState(false);

	// При смене номера зуба, переоткрытии окна или передаче initialCanals
	useEffect(() => {
		if (!isOpen) return;

		if (initialCanals && initialCanals.length > 0) {
			setCanals(initialCanals.map((c) => ({ ...c })));
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRotarySystem) setRotarySystem(initialRotarySystem);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			return;
		}

		if (patientId) {
			let cancelled = false;
			setIsLoadingFromDb(true);

			fetch(`/api/patients/${patientId}/tooth-states/${toothNumber}/endo`, {
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
						setCanals(data.clinicalData.canals.map((c: EndoCanalData) => ({ ...c })));
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
						setCanals(getDefaultCanalsForTooth(toothNumber));
					}
				})
				.catch(() => {
					if (!cancelled) {
						setCanals(getDefaultCanalsForTooth(toothNumber));
					}
				})
				.finally(() => {
					if (!cancelled) setIsLoadingFromDb(false);
				});

			return () => {
				cancelled = true;
			};
		}

		setCanals(getDefaultCanalsForTooth(toothNumber));
		if (initialIrrigation) setIrrigation(initialIrrigation);
		if (initialRotarySystem) setRotarySystem(initialRotarySystem);
		if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
	}, [
		isOpen,
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
			const customEvent = e as CustomEvent<{ toothCode?: string; lengthMm: number }>;
			const { toothCode, lengthMm } = customEvent.detail || {};
			if (toothCode && Number(toothCode) !== toothNumber) return;

			// Apply to the first active/selected canal or all canals
			setCanals((prev) => {
				if (prev.length === 0) return prev;
				const updated = [...prev];
				// Update first unmeasured canal or first canal
				const targetIdx = updated.findIndex((c) => !c.workingLengthMm || Number(c.workingLengthMm) === 0);
				const applyIdx = targetIdx >= 0 ? targetIdx : 0;
				if (updated[applyIdx]) {
					updated[applyIdx] = { ...updated[applyIdx], workingLengthMm: Math.round(lengthMm * 2) / 2 };
				}
				return updated;
			});
			showToast(`Длина ${lengthMm.toFixed(1)} мм перенесена с визиографа в канал!`, "success");
		};

		window.addEventListener("dente-endo-wl-measured", handleMeasuredWl);
		return () => window.removeEventListener("dente-endo-wl-measured", handleMeasuredWl);
	}, [isOpen, toothNumber]);

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

	const handleAdjustCanalLength = (id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const curr =
					typeof c.workingLengthMm === "number"
						? c.workingLengthMm
						: Number.parseFloat(String(c.workingLengthMm)) || 21.0;
				const next = Math.max(10, Math.min(35, Math.round((curr + delta) * 2) / 2));
				return { ...c, workingLengthMm: next };
			}),
		);
	};

	const handleSetCanalLength = (id: string, length: number | string) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, workingLengthMm: length } : c)),
		);
	};

	// 1-клик протоколы (Мандаты 8e, 8k, 8n)
	const handleApplyPrimaryEndoPreset = () => {
		const preset = applyPrimaryEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Первичное эндо (ProTaper Gold + Metapex/Calcept)", "success");
	};

	const handleApplyRetreatmentPreset = () => {
		const preset = applyRetreatmentEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Повторное эндо (D-RaCe/Retreatment + Metapex)", "info");
	};

	const handleApplyObturationPreset = () => {
		const preset = applyObturationPermanentProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Постоянная обтурация (латеральная/горячая гуттаперча + AH Plus)", "success");
	};

	const handleApplyExpressApicalPreset = () => {
		const preset = applyExpressApicalEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast(
			"Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором и снимком)",
			"success",
		);
	};

	const handleApplyPulpitisObturationPreset = () => {
		const preset = applyPulpitisObturationProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Пульпит 2-е посещение / Обтурация (AH Plus)", "success");
	};

	const handleApplyPeriodontitisDestructivePreset = () => {
		const preset = applyPeriodontitisDestructiveProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Периодонтит деструктивный (Metapex/Calcept)", "info");
	};

	const handleApplyPulpitisPreset = () => {
		const preset = applyPulpitisProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен 1-клик протокол: Пульпит (ProTaper F2 + AH Plus)", "success");
	};

	const handleApplyStandardProtocol = () => {
		const preset = applyStandardEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен стандартный протокол обтурации (ProTaper + AH Plus)", "success");
	};

	const handleApplyCaOh2Protocol = () => {
		const preset = applyCaOh2EndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		showToast("Применен протокол временной повязки Ca(OH)2 (Каласепт)", "info");
	};

	const sanitizeCanalsForSubmission = (inputCanals: EndoCanalData[]): EndoCanalData[] => {
		return inputCanals.map((c) => ({
			...c,
			workingLengthMm: c.workingLengthMm || getAnatomicalWorkingLength(toothNumber, c.canalName),
			masterApicalFile: c.masterApicalFile || "ISO 25 (#25 красный)",
			taper: c.taper || ".06 (Конусность 6%)",
			referencePoint: c.referencePoint || "Реперный ориентир",
			obturationTechnique: c.obturationTechnique || "Гуттаперча + Силер (AH Plus)",
		}));
	};

	const handleApplyAnatomicalLengths = () => {
		const updated = applyAnatomicalWorkingLengths(canals, toothNumber);
		setCanals(updated);
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${toothNumber}`, "info");
	};

	const handleAddCanal = () => {
		const newId = `canal-custom-${Date.now()}`;
		const newCanal: EndoCanalData = {
			id: newId,
			canalName: `Canal ${canals.length + 1}`,
			referencePoint: REFERENCE_POINT_OPTIONS[0],
			workingLengthMm: 21.0,
			masterApicalFile: MAF_ISO_OPTIONS[2],
			taper: TAPER_OPTIONS[2],
			obturationTechnique: OBTURATION_TECHNIQUE_OPTIONS[0],
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
		setCanals(getDefaultCanalsForTooth(toothNumber));
		showToast(`Параметры сброшены к стандарту зуба #${toothNumber}`, "info");
	};

	const toothAnatomicalName = getToothAnatomicalNameRu(toothNumber);

	const generatedProtocolText = useMemo(() => {
		return generateEndoProtocol043({
			toothNumber,
			toothTitle: toothAnatomicalName,
			canals,
			irrigation,
			rotarySystem,
			radiologyControl,
		});
	}, [toothNumber, toothAnatomicalName, canals, irrigation, rotarySystem, radiologyControl]);

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
					`/api/patients/${patientId}/tooth-states/${toothNumber}/endo`,
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
					`Параметры каналов зуба #${toothNumber} успешно сохранены в карту!`,
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
		const protocolTextToInsert = generateEndoProtocol043({
			toothNumber,
			toothTitle: toothAnatomicalName,
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
			console.warn("Background persistence failed, proceeding with protocol insertion", err);
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
			`Эндодонтический протокол для зуба #${toothNumber} сохранен и вставлен в карту 043/у!`,
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
				canals.some((c) => c.obturationTechnique && c.obturationTechnique !== "none") ||
				radiologyControl.toLowerCase().includes("обтурирован"),
			);

			const isTemporaryCaOh2 = Boolean(
				!isPermanent ||
				irrigation.toLowerCase().includes("ca(oh)2") ||
				rotarySystem.toLowerCase().includes("ca(oh)2") ||
				canals.some((c) => c.notes && c.notes.toLowerCase().includes("ca(oh)2")),
			);

			const text = formatEndoPatientMemo({
				clinicName,
				clinicPhone,
				patientName,
				doctorName,
				toothNumber,
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

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-label={`Эндодонтический журнал каналов зуба ${toothNumber}`}
			data-testid="endo-canal-log-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				{/* Top Header */}
				<header className="flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90">
					<div className="flex items-center gap-3.5">
						<div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
							<Activity size={26} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs uppercase font-black tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-500/30">
									Эндодонтический журнал каналов
								</span>
								{toothState && (
									<span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-500/30">
										{toothState}
									</span>
								)}
							</div>
							<h2 className="text-lg sm:text-xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1">
								{toothAnatomicalName}
							</h2>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="endo-modal-close-btn"
						className="min-h-[48px] min-w-[48px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
						aria-label="Закрыть модальное окно"
					>
						<X size={22} />
					</button>
				</header>

				{/* Scrollable Content Body */}
				<div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
					{/* 1-Click Fast Clinical Protocols & Actions Bar (Мандаты 8e, 8k, 8n) */}
					<div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
								<Sparkles size={16} />
								<span>Быстрые 1-клик протоколы эндодонтии (30 сек у кресла):</span>
							</div>

							<button
								type="button"
								data-testid="btn-endo-anatomical-autofill"
								onClick={handleApplyAnatomicalLengths}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-950 dark:text-indigo-200 border border-indigo-500/30 flex items-center gap-2 transition-all cursor-pointer active:scale-98"
								title="Автозаполнение анатомической рабочей длины по номеру зуба в 1 клик (резцы 22 мм, клыки 25 мм, премоляры 21 мм, моляры щечные 20 мм / нёбный 22 мм)"
							>
								<Zap size={15} className="text-indigo-600 dark:text-indigo-400" />
								<span>Авто-РД по анатомии (FDI)</span>
							</button>
						</div>

						{/* Primary Mandate Protocols */}
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								data-testid="btn-endo-preset-primary"
								onClick={handleApplyPrimaryEndoPreset}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-sm shadow-rose-600/20 transition-all cursor-pointer active:scale-98"
								title="1-клик: Первичное эндо (ProTaper Gold SX-F2, 3% NaOCl + 17% EDTA с УЗ, Ca(OH)2 Metapex/Calcept на 7–14 дней)"
							>
								<Zap size={16} />
								<span>Первичное эндо (ProTaper Gold + Metapex)</span>
							</button>

							<button
								type="button"
								data-testid="btn-endo-preset-retreatment"
								onClick={handleApplyRetreatmentPreset}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 shadow-sm shadow-amber-600/20 transition-all cursor-pointer active:scale-98"
								title="1-клик: Повторное эндо (распломбировка D-RaCe/Retreatment, ревизия устьев, временное пломбирование Metapex)"
							>
								<RotateCcw size={16} />
								<span>Повторное эндо (D-RaCe + ревизия)</span>
							</button>

							<button
								type="button"
								data-testid="btn-endo-preset-obturation"
								onClick={handleApplyObturationPreset}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
								title="1-клик: Постоянная обтурация (латеральная компакция / горячая гуттаперча GuttaCore/System B + AH Plus)"
							>
								<Check size={16} />
								<span>Постоянная обтурация (GuttaCore / AH Plus)</span>
							</button>

							<button
								type="button"
								data-testid="btn-express-apical-endo-protocol"
								onClick={handleApplyExpressApicalPreset}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 shadow-sm shadow-teal-600/20 transition-all cursor-pointer active:scale-98"
								title="1-клик: Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором Apex 0.0 и снимком)"
							>
								<Check size={16} />
								<span>Обтурированы до апекса (Apex 0.0 + RVG)</span>
							</button>

							<button
								type="button"
								data-testid="btn-endo-preset-pulpitis-obturation"
								onClick={handleApplyPulpitisObturationPreset}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
								title="1-клик: Пульпит 2-е посещение (распломбирование, AH Plus / BioRoot, RVG контроль)"
							>
								<Check size={14} />
								<span>Пульпит 2 эт. (AH Plus)</span>
							</button>

							<button
								type="button"
								data-testid="btn-endo-preset-periodontitis-destructive"
								onClick={handleApplyPeriodontitisDestructivePreset}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
								title="1-клик: Периодонтит деструктивный (УЗ дезинфекция + Metapex на 14 дней)"
							>
								<ShieldCheck size={14} />
								<span>Периодонтит (Metapex 14 дн)</span>
							</button>

							<button
								type="button"
								data-testid="btn-endo-preset-pulpitis-complete"
								onClick={handleApplyPulpitisPreset}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
								title="1-клик: Пульпит полный цикл (ProTaper F2 + AH Plus)"
							>
								<Zap size={14} />
								<span>Пульпит: ProTaper F2</span>
							</button>

							<button
								type="button"
								data-testid="btn-standard-endo-protocol"
								onClick={handleApplyStandardProtocol}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
								title="Стандартный эндо-протокол (ProTaper + AH Plus)"
							>
								<Sparkles size={14} />
								<span>Стандарт (AH Plus)</span>
							</button>

							<button
								type="button"
								data-testid="btn-caoh2-endo-protocol"
								onClick={handleApplyCaOh2Protocol}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
								title="Временная лечебная повязка Ca(OH)2 (Каласепт)"
							>
								<ShieldCheck size={14} />
								<span>Повязка Ca(OH)2</span>
							</button>
						</div>

						{/* Bottom helper row: status + reset + add canal */}
						<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800/80 flex-wrap">
							<div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Stethoscope size={16} className="text-rose-600 dark:text-rose-400" />
								<span>Корневые каналы ({canals.length}):</span>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleResetToDefaults}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
									title="Сбросить каналы к анатомическому стандарту FDI для этого зуба"
								>
									<RotateCcw size={14} />
									<span>Анатомический стандарт FDI</span>
								</button>

								<button
									type="button"
									onClick={handleAddCanal}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition-all cursor-pointer touch-manipulation"
								>
									<Plus size={15} />
									<span>Добавить канал</span>
								</button>
							</div>
						</div>
					</div>

					{/* Multi-canal Table / Matrix */}
					<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-[var(--paper,#ffffff)] dark:bg-slate-900/60">
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 text-[var(--muted,#64748b)] text-xs font-bold border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<tr>
										<th className="py-3 px-3">Канал</th>
										<th className="py-3 px-3">Реперный ориентир</th>
										<th className="py-3 px-3">Длина (WL)</th>
										<th className="py-3 px-3">MAF (ISO)</th>
										<th className="py-3 px-3">Конусность</th>
										<th className="py-3 px-3">Метод обтурации</th>
										<th className="py-3 px-2 text-center w-12" />
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
									{canals.map((c, index) => (
										<tr
											key={c.id}
											className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
										>
											{/* Canal Name */}
											<td className="py-2.5 px-3">
												<input
													type="text"
													aria-label={`Название канала ${index + 1}`}
													value={c.canalName}
													onChange={(e) =>
														handleCanalChange(c.id, "canalName", e.target.value)
													}
													className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none"
												/>
											</td>

											{/* Reference Point */}
											<td className="py-2.5 px-3">
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
													className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
												>
													{REFERENCE_POINT_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Working Length in mm (со степперами >=44px и быстрыми пресетами) */}
											<td className="py-2.5 px-3 min-w-[220px]">
												<div className="space-y-1.5">
													<div className="relative flex items-center gap-1">
														<button
															type="button"
															onClick={() => handleAdjustCanalLength(c.id, -0.5)}
															className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
																value={c.workingLengthMm}
																placeholder="—"
																onChange={(e) =>
																	handleCanalChange(
																		c.id,
																		"workingLengthMm",
																		Number.parseFloat(e.target.value) || e.target.value,
																	)
																}
																className="w-full min-h-[44px] pl-2 pr-7 py-1 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none text-center"
															/>
															<span className="absolute right-2 text-xs text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
																мм
															</span>
														</div>
														<button
															type="button"
															onClick={() => handleAdjustCanalLength(c.id, 0.5)}
															className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
															title="+0.5 мм"
														>
															+0.5
														</button>
													</div>
													{/* Quick Length Chips (1-tap fast input) */}
													<div className="flex items-center gap-1.5 flex-wrap">
														{QUICK_LENGTH_PRESETS.map((presetLen) => (
															<button
																key={presetLen}
																type="button"
																onClick={() => handleSetCanalLength(c.id, presetLen)}
																className={`min-h-[44px] min-w-[40px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
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

											{/* Master Apical File (MAF) */}
											<td className="py-2.5 px-3">
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
													className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none font-semibold"
												>
													{MAF_ISO_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Taper */}
											<td className="py-2.5 px-3">
												<select
													aria-label={`Конусность для канала ${c.canalName}`}
													value={c.taper}
													onChange={(e) =>
														handleCanalChange(c.id, "taper", e.target.value)
													}
													className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
												>
													{TAPER_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Obturation Technique */}
											<td className="py-2.5 px-3">
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
													className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none font-medium"
												>
													{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</td>

											{/* Remove Canal */}
											<td className="py-2.5 px-2 text-center">
												<button
													type="button"
													onClick={() => handleRemoveCanal(c.id)}
													className="min-h-[48px] min-w-[48px] rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
													title={`Удалить канал ${c.canalName}`}
												>
													<Trash2 size={18} />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Additional Clinical Details: Rotary, Irrigation & X-Ray */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label
								htmlFor="endo-rotary-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
							>
								Инструментальная система (NiTi):
							</label>
							<input
								id="endo-rotary-input"
								type="text"
								value={rotarySystem}
								onChange={(e) => setRotarySystem(e.target.value)}
								className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-rose-500 font-medium"
								placeholder="Машинная обработка NiTi ProTaper Gold (SX, S1, S2, F1, F2)"
							/>
						</div>

						<div>
							<label
								htmlFor="endo-irrigation-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
							>
								Растворы и протокол ирригации:
							</label>
							<input
								id="endo-irrigation-input"
								type="text"
								value={irrigation}
								onChange={(e) => setIrrigation(e.target.value)}
								className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-rose-500 font-medium"
								placeholder="3% NaOCl + 17% EDTA с ультразвуковой активацией"
							/>
						</div>

						<div>
							<label
								htmlFor="endo-radiology-input"
								className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
							>
								Рентген-контроль (визиография):
							</label>
							<input
								id="endo-radiology-input"
								type="text"
								value={radiologyControl}
								onChange={(e) => setRadiologyControl(e.target.value)}
								className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-rose-500 font-medium"
								placeholder="Контрольная визиография: каналы обтурированы до апекса."
							/>
						</div>
					</div>

					{/* Live Structured Protocol Preview for Form 043/y (Zero Emojis) */}
					<div className="p-4 bg-[var(--surface,#f8fafc)] dark:bg-slate-950/60 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-2xl">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
								<FileText size={16} />
								<span>Форма 043/у · Предпросмотр протокола лечения:</span>
							</div>

							<button
								type="button"
								onClick={handleCopyText}
								className="min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								{copied ? <Check size={16} className="text-emerald-500" /> : <Clipboard size={16} />}
								<span>{copied ? "Скопировано!" : "Копировать текст"}</span>
							</button>
						</div>

						<pre
							data-testid="endo-protocol-preview-text"
							className="text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed m-0 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto select-text"
						>
							{generatedProtocolText}
						</pre>
					</div>
				</div>

				{/* Bottom Action Footer */}
				<footer className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90">
					<div className="flex items-center gap-2.5 flex-wrap">
						<button
							type="button"
							onClick={handleCopyPatientMemo}
							data-testid="endo-copy-patient-memo-btn"
							className="min-h-[50px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
							title="Скопировать памятку по уходу после лечения каналов для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span>Скопировать для пациента</span>
						</button>

						<button
							type="button"
							onClick={handlePrintWorksheet}
							data-testid="endo-print-worksheet-btn"
							className="min-h-[50px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
							title="Распечатать эндодонтическую карту (А4) для истории болезни"
						>
							<Printer size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span>Печать эндо-карты (А4)</span>
						</button>
					</div>

					<div className="flex items-center gap-3 flex-wrap">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="min-h-[50px] px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer"
						>
							Отмена
						</button>

						<button
							type="button"
							data-testid="save-endo-canals-btn"
							disabled={isSaving}
							onClick={handleSaveCanalsOnly}
							className="min-h-[50px] px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 border border-rose-400/50 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
						>
							<Check size={18} className="text-rose-600 dark:text-rose-400" />
							<span>Сохранить в карту</span>
						</button>

						<button
							type="button"
							data-testid="insert-endo-protocol-btn"
							disabled={isSaving}
							onClick={handleInsertToProtocol}
							className="min-h-[50px] px-6 py-2.5 rounded-xl text-sm font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center gap-2.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
						>
							<Sparkles size={18} />
							<span>Вставить в протокол Формы 043/у</span>
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
