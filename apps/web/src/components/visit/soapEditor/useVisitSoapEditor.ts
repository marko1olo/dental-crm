import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	formatFullSoapFromProtocol,
	type OutpatientProtocolTemplate,
	type OutpatientSpecialty,
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
	searchAll448Templates,
	type StomxOutpatientTemplateMetadata,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	buildChairsideSmartProtocol,
	type ChairsideSmartProtocolKey,
	saveChairsideVisitDraft,
} from "../clinicalVisitWorkflow";
import { apply1ClickDoctorAutopilot } from "../presets/autopilotPresets";
import { resolveProtocolFromTemplate } from "./protocolsResolver";
import type {
	VisitSoapEditorProps,
	VisitSoapNoteValues,
} from "./types";
import { useVisitSoapDraft } from "./useVisitSoapDraft";

export function useVisitSoapEditor({
	visitId,
	patientId,
	initialValues,
	activeTooth = null,
	onSelectActiveTooth,
	onSave,
	onChange,
	onApplyFullDiary,
	isLocked = false,
	isTemplatesOpen: isTemplatesOpenProp,
	onToggleTemplates,
}: VisitSoapEditorProps) {
	// ── Локальное состояние полей SOAP ──
	const [values, setValues] = useState<VisitSoapNoteValues>({
		complaint: initialValues?.complaint || "",
		anamnesis: initialValues?.anamnesis || "",
		objectiveStatus: initialValues?.objectiveStatus || "",
		diagnosis: initialValues?.diagnosis || "",
		treatmentPlan: initialValues?.treatmentPlan || "",
		recommendations: initialValues?.recommendations || "",
		icd10: initialValues?.icd10 || "",
	});

	const [selectedTooth, setSelectedTooth] = useState<number | null>(
		activeTooth ?? 16,
	);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string>("");
	const [activeViewMode, setActiveViewMode] = useState<"fields" | "full_text">(
		"fields",
	);
	const [localTemplatesOpen, setLocalTemplatesOpen] = useState<boolean>(false);
	const isTemplatesOpen =
		isTemplatesOpenProp !== undefined ? isTemplatesOpenProp : localTemplatesOpen;
	const setIsTemplatesOpen = useCallback(
		(val: boolean | ((prev: boolean) => boolean)) => {
			const next = typeof val === "function" ? val(isTemplatesOpen) : val;
			setLocalTemplatesOpen(next);
			onToggleTemplates?.(next);
		},
		[isTemplatesOpen, onToggleTemplates],
	);

	const [activeSpecialty, setActiveSpecialty] = useState<
		OutpatientSpecialty | "all"
	>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [copied, setCopied] = useState<boolean>(false);
	const [previewProtocol, setPreviewProtocol] =
		useState<OutpatientProtocolTemplate | null>(null);
	const [templatesLimit, setTemplatesLimit] = useState<number>(30);
	const [apiTemplates, setApiTemplates] = useState<
		StomxOutpatientTemplateMetadata[] | null
	>(null);
	const [isIcd10SelectorOpen, setIsIcd10SelectorOpen] =
		useState<boolean>(false);
	const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);
	const [isSoapMoreOpen, setIsSoapMoreOpen] = useState<boolean>(false);
	const soapMoreRef = useRef<HTMLDivElement>(null);

	// Подключаем хук синхронизации черновика и автосохранения
	const {
		saveStatus,
		setSaveStatus,
		soapStorageKey,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
		flushDraft,
		saveDraftToStorage,
		valuesRef,
	} = useVisitSoapDraft({
		visitId: visitId || "",
		patientId: patientId || "",
		selectedTooth,
		initialValues,
		values,
		setValues,
		onSave,
		onChange,
	} as any);

	// Загрузка шаблонов из реального API бэкенда (таблица outpatient_templates в PostgreSQL 18)
	// с надежным офлайн-фоллбэком на локальный кэш и встроенные пресеты (Мандаты 8e, 8s, 8t)
	useEffect(() => {
		let isMounted = true;
		const fetchTemplates = async () => {
			try {
				const res = await fetch("/api/clinical/outpatient-templates?limit=500");
				if (res.ok) {
					const data = await res.json();
					if (
						isMounted &&
						data?.templates &&
						Array.isArray(data.templates) &&
						data.templates.length > 0
					) {
						const formatted: StomxOutpatientTemplateMetadata[] =
							data.templates.map((t: any) => ({
								id: Number(t.id),
								categoryId: Number(t.categoryId),
								categoryName: t.categoryName || "Клинический протокол",
								specialty:
									(t.categorySpecialty as OutpatientSpecialty) || "therapy",
								name: t.name || "",
								mkbCode: t.mkbCode || "K02",
							}));
						setApiTemplates(formatted);
					}
				}
			} catch {
				// Офлайн-режим: тихий фоллбэк на локальный кэш/статику без блокировки UI
			}
		};
		void fetchTemplates();
		return () => {
			isMounted = false;
		};
	}, []);

	// Low-Spec memory guard: сброс лимита видимых шаблонов при смене фильтра/поиска
	useEffect(() => {
		setTemplatesLimit(30);
	}, [searchQuery, activeSpecialty]);

	useEffect(() => {
		if (!isSoapMoreOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				soapMoreRef.current &&
				!soapMoreRef.current.contains(e.target as Node)
			) {
				setIsSoapMoreOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSoapMoreOpen]);

	// Синхронизация при внешних изменениях activeTooth
	useEffect(() => {
		if (activeTooth !== undefined && activeTooth !== null) {
			setSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	// Синхронизация с внешними изменениями initialValues
	useEffect(() => {
		if (initialValues) {
			setValues((prev) => {
				const isDifferent =
					(initialValues.complaint !== undefined &&
						initialValues.complaint !== prev.complaint) ||
					(initialValues.anamnesis !== undefined &&
						initialValues.anamnesis !== prev.anamnesis) ||
					(initialValues.objectiveStatus !== undefined &&
						initialValues.objectiveStatus !== prev.objectiveStatus) ||
					(initialValues.diagnosis !== undefined &&
						initialValues.diagnosis !== prev.diagnosis) ||
					(initialValues.treatmentPlan !== undefined &&
						initialValues.treatmentPlan !== prev.treatmentPlan) ||
					(initialValues.recommendations !== undefined &&
						initialValues.recommendations !== prev.recommendations) ||
					(initialValues.icd10 !== undefined &&
						initialValues.icd10 !== prev.icd10);

				if (!isDifferent) return prev;

				const next: VisitSoapNoteValues = { ...prev };
				if (initialValues.complaint !== undefined)
					next.complaint = initialValues.complaint;
				if (initialValues.anamnesis !== undefined)
					next.anamnesis = initialValues.anamnesis;
				if (initialValues.objectiveStatus !== undefined)
					next.objectiveStatus = initialValues.objectiveStatus;
				if (initialValues.diagnosis !== undefined)
					next.diagnosis = initialValues.diagnosis;
				if (initialValues.treatmentPlan !== undefined)
					next.treatmentPlan = initialValues.treatmentPlan;
				if (initialValues.recommendations !== undefined)
					next.recommendations = initialValues.recommendations;
				if (initialValues.icd10 !== undefined)
					next.icd10 = initialValues.icd10;
				return next;
			});
		}
	}, [initialValues]);

	// Слушатель внешней установки физиологической нормы или протокола SOAP (Мандат 8e, 8n)
	useEffect(() => {
		const handleExternalSoapProtocol = (e: Event) => {
			const customEvent = e as CustomEvent<
				{
					soap?: Partial<VisitSoapNoteValues> & {
						statusLocalis?: string;
						complaints?: string;
						diagnosisIcd10?: string;
					};
					mode?: "replace" | "smart_append";
					immediate?: boolean;
				} & Partial<VisitSoapNoteValues> & {
					statusLocalis?: string;
					complaints?: string;
					diagnosisIcd10?: string;
				}
			>;
			if (!customEvent?.detail) return;
			const detail = customEvent.detail;
			const incoming = detail.soap || detail;
			if (!incoming || typeof incoming !== "object") return;
			const statusLocalis = incoming.statusLocalis || incoming.objectiveStatus;
			const complaint = incoming.complaint || incoming.complaints;

			setValues((prev) => {
				const isSmartAppend = detail.mode === "smart_append";
				const appendField = (
					baseVal: string | undefined,
					incomingVal: string | undefined,
					sep = "\n\n",
				): string => {
					const base = (baseVal || "").trim();
					const inc = (incomingVal || "").trim();
					if (!inc) return base;
					if (!base) return inc;
					if (base.includes(inc)) return base;
					return `${base}${sep}${inc}`;
				};

				const next: VisitSoapNoteValues = isSmartAppend
					? {
							...prev,
							anamnesis: appendField(prev.anamnesis, incoming.anamnesis),
							objectiveStatus: appendField(prev.objectiveStatus, statusLocalis),
							complaint: appendField(prev.complaint, complaint),
							diagnosis: appendField(prev.diagnosis, incoming.diagnosis, "; "),
							treatmentPlan: appendField(
								prev.treatmentPlan,
								incoming.treatmentPlan,
							),
							recommendations: appendField(
								prev.recommendations,
								incoming.recommendations,
							),
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  }
					: {
							...prev,
							anamnesis: incoming.anamnesis ?? prev.anamnesis,
							objectiveStatus: statusLocalis ?? prev.objectiveStatus,
							complaint: complaint ?? prev.complaint,
							diagnosis: incoming.diagnosis ?? prev.diagnosis,
							treatmentPlan: incoming.treatmentPlan ?? prev.treatmentPlan,
							recommendations:
								incoming.recommendations ?? prev.recommendations,
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  };
				valuesRef.current = next;
				setSaveStatus("saved");
				saveDraftToStorage(next);
				onSave?.(next);
				onChange?.(next);
				return next;
			});
		};

		window.addEventListener(
			"dente-apply-soap-protocol",
			handleExternalSoapProtocol,
		);
		return () => {
			window.removeEventListener(
				"dente-apply-soap-protocol",
				handleExternalSoapProtocol,
			);
		};
	}, [saveDraftToStorage, setSaveStatus, valuesRef, onSave, onChange]);

	// Мандат 8e: Автономия врача и версионный аудит («Исправленному верить»)
	const handleEnableCorrection = useCallback(() => {
		setIsCorrectionMode(true);
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const stamp = `[Исправленному верить: ${dateStr}]`;
		setValues((prev) => {
			if (
				prev.treatmentPlan?.includes("Исправленному верить") ||
				prev.objectiveStatus?.includes("Исправленному верить")
			) {
				return prev;
			}
			const next: VisitSoapNoteValues = {
				...prev,
				treatmentPlan: prev.treatmentPlan
					? `${prev.treatmentPlan}\n\n${stamp}`
					: stamp,
			};
			valuesRef.current = next;
			setSaveStatus("saved");
			saveDraftToStorage(next);
			onSave?.(next);
			onChange?.(next);
			return next;
		});
	}, [onSave, onChange, saveDraftToStorage, setSaveStatus, valuesRef]);

	const handleFieldChange = useCallback(
		(field: keyof VisitSoapNoteValues, val: string) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
				const dateStr = new Date().toLocaleDateString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
				const stamp = `[Исправленному верить: ${dateStr}]`;
				setSaveStatus("saving");
				setValues((prev) => {
					const next = { ...prev, [field]: val };
					if (!next.treatmentPlan?.includes("Исправленному верить")) {
						next.treatmentPlan = next.treatmentPlan
							? `${next.treatmentPlan}\n\n${stamp}`
							: stamp;
					}
					valuesRef.current = next;
					saveDraftToStorage(next);
					return next;
				});
				return;
			}
			setSaveStatus("saving");
			setValues((prev) => {
				const next = { ...prev, [field]: val };
				valuesRef.current = next;
				saveDraftToStorage(next);
				return next;
			});
		},
		[isLocked, isCorrectionMode, saveDraftToStorage, setSaveStatus, valuesRef],
	);

	// Фильтрация протоколов StomX среди 448 шаблонов (реальный API бэкенда с офлайн-фоллбэком)
	const filteredProtocols = useMemo(() => {
		const specFilter = activeSpecialty === "all" ? undefined : activeSpecialty;
		if (apiTemplates && apiTemplates.length > 0) {
			const q = searchQuery.toLowerCase().trim();
			const matched = apiTemplates.filter((t) => {
				if (specFilter && t.specialty !== specFilter) return false;
				if (!q) return true;
				return (
					t.name.toLowerCase().includes(q) ||
					t.mkbCode.toLowerCase().includes(q) ||
					t.categoryName.toLowerCase().includes(q)
				);
			});
			return matched.map(resolveProtocolFromTemplate);
		}
		const matchingTemplates = searchAll448Templates(searchQuery, specFilter);
		return matchingTemplates.map(resolveProtocolFromTemplate);
	}, [apiTemplates, searchQuery, activeSpecialty]);

	// Применение протокола StomX
	const handleApplyProtocol = useCallback(
		(
			protocol: OutpatientProtocolTemplate,
			mode: "replace" | "append" = "replace",
		) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
			const targetTooth = selectedTooth ?? protocol.defaultTooth ?? 16;
			const params: PopulateTemplateParams = {
				toothNumber: targetTooth,
				surfaces: selectedSurfaces || undefined,
			};

			const popComplaint = populateOutpatientTemplateText(
				protocol.complaint,
				params,
			);
			const popAnamnesis = populateOutpatientTemplateText(
				protocol.anamnesis,
				params,
			);
			const popObjective = populateOutpatientTemplateText(
				protocol.objectiveStatus,
				params,
			);
			const popDiagnosis = populateOutpatientTemplateText(
				protocol.diagnosis,
				params,
			);
			const popTreatment = populateOutpatientTemplateText(
				protocol.treatmentProtocol,
				params,
			);
			const popRecs = populateOutpatientTemplateText(
				protocol.recommendations,
				params,
			);

			const formattedDiagnosis = `${protocol.mkbCode} ${popDiagnosis}`.trim();
			const dateStr = new Date().toLocaleDateString("ru-RU", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";

			if (mode === "replace") {
				// Mandate 8e: preserve custom somatic/allergy notes if already entered by doctor
				const preservedAnamnesis =
					values.anamnesis &&
					!values.anamnesis.includes("Соматически здоров") &&
					!values.anamnesis.includes(popAnamnesis)
						? `${values.anamnesis}; ${popAnamnesis}`
						: popAnamnesis;

				const nextValues: VisitSoapNoteValues = {
					complaint: popComplaint,
					anamnesis: preservedAnamnesis,
					objectiveStatus: popObjective,
					diagnosis: formattedDiagnosis,
					treatmentPlan: `${popTreatment}${auditStamp}`,
					recommendations: popRecs,
					icd10: protocol.mkbCode,
				};
				setValues(nextValues);
				setSaveStatus("saved");
				saveDraftToStorage(nextValues);
				onSave?.(nextValues);
				onChange?.(nextValues);

				const formattedFull = formatFullSoapFromProtocol(protocol, params);
				onApplyFullDiary?.(formattedFull);
			} else {
				setValues((prev) => {
					const appendText = (current?: string, add?: string, sep = "; ") => {
						if (!current || !current.trim()) return add || "";
						if (!add || !add.trim()) return current;
						return `${current}${sep}${add}`;
					};
					const next: VisitSoapNoteValues = {
						complaint: appendText(prev.complaint, popComplaint),
						anamnesis: appendText(prev.anamnesis, popAnamnesis),
						objectiveStatus: appendText(
							prev.objectiveStatus,
							popObjective,
							"\n",
						),
						diagnosis: prev.diagnosis
							? `${prev.diagnosis}, ${formattedDiagnosis}`
							: formattedDiagnosis,
						treatmentPlan: appendText(
							prev.treatmentPlan,
							`${popTreatment}${auditStamp}`,
							"\n\n",
						),
						recommendations: appendText(
							prev.recommendations,
							popRecs,
							"\n",
						),
						icd10: prev.icd10 || protocol.mkbCode,
					};
					setSaveStatus("saved");
					saveDraftToStorage(next);
					onSave?.(next);
					onChange?.(next);
					return next;
				});
			}

			setIsTemplatesOpen(false);
			setPreviewProtocol(null);
		},
		[
			selectedTooth,
			selectedSurfaces,
			values.anamnesis,
			isLocked,
			isCorrectionMode,
			onSave,
			onChange,
			onApplyFullDiary,
			setIsTemplatesOpen,
			saveDraftToStorage,
			setSaveStatus,
		],
	);

	// Физиологическая норма (Мандат 8e, 8n, 8s)
	const handleApplyNorm = useCallback(() => {
		const targetTooth = selectedTooth ?? 16;
		if (isLocked && !isCorrectionMode) {
			setIsCorrectionMode(true);
		}
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const autopilot = apply1ClickDoctorAutopilot("norm", {
			toothNumber: targetTooth,
		});
		const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";
		// Мандат 8e: соматическая норма врача (Doctor Autonomy)
		// Эталонные формулировки: «Жалоб на момент осмотра не предъявляет», «Соматически здоров. Аллергологический анамнез не отягощен.»
		const defaultNormComplaint =
			"Жалоб на момент осмотра не предъявляет. Обратился(лась) с целью профилактического осмотра и гигиены.";
		const defaultNormAnamnesis =
			"Соматически здоров. Аллергологический анамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает.";
		const normValues: VisitSoapNoteValues = {
			complaint: autopilot.preset.complaint || defaultNormComplaint,
			anamnesis: autopilot.preset.anamnesis || defaultNormAnamnesis,
			objectiveStatus: `Прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Зуб ${targetTooth}: интактен, зондирование и перкуссия безболезненны, реакция на термопробу адекватная, подвижность отсутствует. Зубные отложения умеренные.`,
			diagnosis: "Z01.2 Стоматологическое обследование (Здоров)",
			treatmentPlan: `${autopilot.diary.treatmentDescription}${auditStamp}`,
			recommendations: autopilot.preset.recommendations ?? "",
			icd10: autopilot.preset.icd10,
		};
		setValues(normValues);
		valuesRef.current = normValues;
		setSaveStatus("saved");
		saveDraftToStorage(normValues);
		onSave?.(normValues);
		onChange?.(normValues);

		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
			`[Жалобы]: ${normValues.complaint}`,
			`[Анамнез]: ${normValues.anamnesis}`,
			`[Объективный статус]: ${normValues.objectiveStatus}`,
			`[Диагноз]: [${normValues.icd10}] ${normValues.diagnosis}`,
			`[Протокол лечения]: ${normValues.treatmentPlan}`,
			`[Рекомендации]: ${normValues.recommendations}`,
		].join("\n\n");
		onApplyFullDiary?.(fullText);
	}, [
		selectedTooth,
		isLocked,
		isCorrectionMode,
		onSave,
		onChange,
		onApplyFullDiary,
		saveDraftToStorage,
		setSaveStatus,
		valuesRef,
	]);

	// 5 Экспресс-протоколов дневника у кресла на русском языке (Кариес K02.1, Пульпит K04.0, Периодонтит K04.5, Профгигиена K05.1, Удаление K01.1)
	const handleApplyExpressProtocol = useCallback(
		(presetType: ChairsideSmartProtocolKey) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
			const protocol = buildChairsideSmartProtocol(presetType, selectedTooth, {
				surfaces: selectedSurfaces,
				isLocked: isLocked && !isCorrectionMode,
			});

			const next: VisitSoapNoteValues = {
				complaint: protocol.complaint,
				anamnesis: protocol.anamnesis,
				objectiveStatus: protocol.objectiveStatus,
				diagnosis: protocol.diagnosis,
				treatmentPlan: protocol.treatmentPlan,
				recommendations: protocol.recommendations,
				icd10: protocol.icd10,
			};

			setValues(next);
			valuesRef.current = next;
			setSaveStatus("saved");
			saveDraftToStorage(next);
			if (visitId) {
				saveChairsideVisitDraft(visitId, {
					chairId: undefined,
					patientId,
					savedAtIso: new Date().toISOString(),
					version: 1,
					diary: {
						...next,
						toothNumber: selectedTooth ?? undefined,
					},
				});
			}
			onSave?.(next);
			onChange?.(next);

			const targetTooth = selectedTooth ?? 16;
			const fullText = [
				`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
				`[Жалобы]: ${next.complaint}`,
				`[Анамнез]: ${next.anamnesis}`,
				`[Объективный статус]: ${next.objectiveStatus}`,
				`[Диагноз]: [${next.icd10}] ${next.diagnosis}`,
				`[Протокол лечения]: ${next.treatmentPlan}`,
				`[Рекомендации]: ${next.recommendations}`,
			].join("\n\n");
			onApplyFullDiary?.(fullText);

			showToast(
				`Экспресс-протокол «${protocol.title}» применён`,
				"success",
				3000,
			);
		},
		[
			isLocked,
			isCorrectionMode,
			selectedTooth,
			selectedSurfaces,
			visitId,
			patientId,
			saveDraftToStorage,
			setSaveStatus,
			valuesRef,
			onSave,
			onChange,
			onApplyFullDiary,
		],
	);

	// Ручное сохранение дневника (Мандат 8e: никогда не disabled)
	const handleExplicitSave = useCallback(() => {
		onChange?.(values);
		onSave?.(values);
		saveDraftToStorage(values);
		setSaveStatus("saved");
	}, [saveDraftToStorage, setSaveStatus, values, onChange, onSave]);

	// Копирование целостной записи в буфер
	const handleCopyFullText = useCallback(() => {
		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${selectedTooth ?? "Общий"}) ===`,
			`[Жалобы]: ${values.complaint || "Не указаны"}`,
			`[Анамнез]: ${values.anamnesis || "Соматически здоров"}`,
			`[Объективный статус]: ${values.objectiveStatus || "Без патологии"}`,
			`[Диагноз]: ${values.icd10 ? `[${values.icd10}] ` : ""}${values.diagnosis || "Не установлен"}`,
			`[Протокол лечения]: ${values.treatmentPlan || "Лечение и гигиена"}`,
			`[Рекомендации]: ${values.recommendations || "Стандартная гигиена"}`,
		].join("\n\n");

		navigator.clipboard.writeText(fullText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [values, selectedTooth]);

	// Плавный скролл при открытии виртуальной клавиатуры на мобильных устройствах
	const handleInputFocus = useCallback(
		(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
			const target = e.currentTarget;
			setTimeout(() => {
				target.scrollIntoView({ behavior: "smooth", block: "center" });
			}, 300);
		},
		[],
	);

	return {
		values,
		selectedTooth,
		setSelectedTooth,
		selectedSurfaces,
		setSelectedSurfaces,
		activeViewMode,
		setActiveViewMode,
		isTemplatesOpen,
		setIsTemplatesOpen,
		activeSpecialty,
		setActiveSpecialty,
		searchQuery,
		setSearchQuery,
		saveStatus,
		copied,
		previewProtocol,
		setPreviewProtocol,
		templatesLimit,
		setTemplatesLimit,
		filteredProtocols,
		isIcd10SelectorOpen,
		setIsIcd10SelectorOpen,
		isCorrectionMode,
		isSoapMoreOpen,
		setIsSoapMoreOpen,
		soapMoreRef,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
		flushDraft,
		handleEnableCorrection,
		handleFieldChange,
		handleApplyProtocol,
		handleApplyNorm,
		handleApplyExpressProtocol,
		handleExplicitSave,
		handleCopyFullText,
		handleInputFocus,
	};
}
