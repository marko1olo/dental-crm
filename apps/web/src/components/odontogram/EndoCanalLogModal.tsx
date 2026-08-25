import { isValidFdiToothNumber } from "@dental/shared";
import {
	Activity,
	Check,
	Clipboard,
	FileText,
	Plus,
	RotateCcw,
	Sparkles,
	Stethoscope,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";

export interface EndoCanalData {
	readonly id: string;
	canalName: string;
	referencePoint: string;
	workingLengthMm: number | string;
	masterApicalFile: string;
	taper: string;
	obturationTechnique: string;
	sealer?: string;
	notes?: string;
}

export interface EndoToothClinicalData {
	canals: EndoCanalData[];
	irrigation?: string;
	radiologyControl?: string;
	updatedAt?: string;
}

export interface EndoCanalLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (
		protocolText: string,
		canals: EndoCanalData[],
	) => void;
	readonly onSaveCanals?: (
		canals: EndoCanalData[],
		clinicalData: EndoToothClinicalData,
	) => Promise<void> | void;
}

/** Предустановленные варианты названий корневых каналов */
export const CANAL_NAME_OPTIONS = [
	{ value: "MB1", label: "MB1 (Медиально-щечный 1)" },
	{ value: "MB2", label: "MB2 (Медиально-щечный 2)" },
	{ value: "DB", label: "DB (Дистально-щечный)" },
	{ value: "P", label: "P (Нёбный / Palatal)" },
	{ value: "MB", label: "MB (Медиально-щечный)" },
	{ value: "ML", label: "ML (Медиально-язычный)" },
	{ value: "D", label: "D (Дистальный)" },
	{ value: "DB_L", label: "DB (Дистально-щечный нижний)" },
	{ value: "DL", label: "DL (Дистально-язычный)" },
	{ value: "B", label: "B (Щечный / Buccal)" },
	{ value: "L", label: "L (Язычный / Lingual)" },
	{ value: "Main", label: "Основной / Прямой (Central)" },
] as const;

/** Реперные ориентиры / реперные точки измерения рабочей длины */
export const REFERENCE_POINT_OPTIONS = [
	"Щечный бугор (MB cusp)",
	"Дистально-щечный бугор (DB cusp)",
	"Нёбный бугор (P cusp)",
	"Медиально-язычный бугор (ML cusp)",
	"Дистально-язычный бугор (DL cusp)",
	"Язычный бугор (L cusp)",
	"Режущий край (Incisal edge)",
	"Бугор клыка (Canine cusp)",
] as const;

/** Мастер-апикальный файл (Master Apical File, ISO 15–40) */
export const MAF_ISO_OPTIONS = [
	"ISO 15 (#15 белый)",
	"ISO 20 (#20 жёлтый)",
	"ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)",
	"ISO 35 (#35 зелёный)",
	"ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)",
	"ISO 50 (#50 жёлтый)",
] as const;

/** Конусность инструмента (Taper) */
export const TAPER_OPTIONS = [
	".02 (Стандартная 2%)",
	".04 (Конусность 4%)",
	".06 (Конусность 6%)",
	".07 (Конусность 7%)",
	".08 (Конусность 8%)",
] as const;

/** Методики трёхмерной обтурации корневых каналов */
export const OBTURATION_TECHNIQUE_OPTIONS = [
	"Гуттаперча + Силер (AH Plus)",
	"Биокерамика (BioRoot RCS / TotalFill)",
	"Вертикальная конденсация разогретой гуттаперчи",
	"Латеральная компакция холодной гуттаперчи",
	"Метод непрерывной волны (System B / Elements)",
	"Моноштифт + биокерамический силер",
	"Временная обтурация Ca(OH)2 (Каласепт / Metapex)",
] as const;

/**
 * Получить анатомический набор каналов по умолчанию на основе номера зуба FDI.
 * - Верхние моляры (16–18, 26–28): MB1, MB2, DB, P
 * - Нижние моляры (36–38, 46–48): MB, ML, D
 * - Верхние премоляры (14–15, 24–25): B, P
 * - Нижние премоляры (34–35, 44–45): B (или B, L)
 * - Фронтальная группа (резцы, клыки): Main (Основной)
 */
export function getDefaultCanalsForTooth(toothNumber: number): EndoCanalData[] {
	if (!isValidFdiToothNumber(toothNumber)) {
		return [
			{
				id: `canal-${Date.now()}-1`,
				canalName: "Main",
				referencePoint: "Режущий край (Incisal edge)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
	const isLower = quadrant === 3 || quadrant === 4 || quadrant === 7 || quadrant === 8;

	// Верхние моляры: постоянные (16, 17, 18, 26, 27, 28) и временные (54, 55, 64, 65) -> MB1, MB2, DB, P
	if (isUpper && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb1`,
				canalName: "MB1",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-mb2`,
				canalName: "MB2",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 20 (#20 жёлтый)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-db`,
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 20.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние моляры: постоянные (36, 37, 38, 46, 47, 48) и временные (74, 75, 84, 85) -> MB, ML, D
	if (isLower && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb`,
				canalName: "MB",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-ml`,
				canalName: "ML",
				referencePoint: "Медиально-язычный бугор (ML cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-d`,
				canalName: "D",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Верхние премоляры (14, 15, 24, 25) -> B, P
	if (isUpper && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние премоляры (34, 35, 44, 45) -> B
	if (isLower && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Фронтальная группа: резцы и клыки (11–13, 21–23, 31–33, 41–43)
	const isCanine = pos === 3;
	return [
		{
			id: `canal-${toothNumber}-main`,
			canalName: "Main",
			referencePoint: isCanine
				? "Бугор клыка (Canine cusp)"
				: "Режущий край (Incisal edge)",
			workingLengthMm: isCanine ? 24.0 : 21.0,
			masterApicalFile: isCanine
				? "ISO 35 (#35 зелёный)"
				: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
		},
	];
}

/**
 * Генерация текстовой таблицы учета рабочей длины корневых каналов для Формы 043/у.
 */
export function generateEndoCanalsTable043(canals: readonly EndoCanalData[]): string {
	const header = [
		"┌──────────────┬─────────────────────────────┬─────────────┬─────────────┬──────────────────────────────┐",
		"│ Канал        │ Реперный ориентир           │ Длина (WL)  │ Мастер-файл │ Метод обтурации / Силер      │",
		"├──────────────┼─────────────────────────────┼─────────────┼─────────────┼──────────────────────────────┤",
	];

	const rows = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile).match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : c.masterApicalFile;
		const taperMatch = String(c.taper).match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : c.taper;
		const mafFormatted = `${mafClean || "—"}/${taperClean || ""}`.trim();
		const lengthStr = c.workingLengthMm ? `${c.workingLengthMm} мм` : "—";
		const obt = c.obturationTechnique
			? `${c.obturationTechnique}${c.sealer ? ` + ${c.sealer}` : ""}`
			: "—";

		const colCanal = (c.canalName || "—").padEnd(12);
		const colRef = (c.referencePoint || "—").slice(0, 27).padEnd(27);
		const colWl = lengthStr.padEnd(11);
		const colMaf = mafFormatted.padEnd(11);
		const colObt = obt.slice(0, 28).padEnd(28);

		return `│ ${colCanal} │ ${colRef} │ ${colWl} │ ${colMaf} │ ${colObt} │`;
	});

	const footer = "└──────────────┴─────────────────────────────┴─────────────┴─────────────┴──────────────────────────────┘";

	return [
		"ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ (ЭНДОДОНТИЯ 043/у):",
		...header,
		...rows,
		footer,
	].join("\n");
}

/**
 * Форматирует полную таблицу корневых каналов с апекслокацией и рентген-контролем для Формы 043/у.
 */
export function formatEndoCanalsTable043(
	canals: readonly EndoCanalData[],
	options?: {
		readonly apexLocatorModel?: string | undefined;
		readonly radiologyControl?: string | undefined;
	},
): string {
	const table = generateEndoCanalsTable043(canals);
	const apex = options?.apexLocatorModel || "Электронный апекслокатор (Apex 0.0)";
	const rad = options?.radiologyControl || "Контрольная визиография: каналы обтурированы гомогенно до физиологического апекса";

	return [
		table,
		`Контроль рабочей длины: ${apex}`,
		`Рентгенологический контроль: ${rad}`,
	].join("\n");
}

/**
 * Генерация структурированного клинического текста для Формы 043/у (Приказ МЗ РФ 834н).
 */
export function generateEndoProtocol043(params: {
	toothNumber: number;
	canals: readonly EndoCanalData[];
	irrigation?: string;
	rotarySystem?: string;
	apexLocator?: string;
	radiologyControl?: string;
}): string {
	const { toothNumber, canals } = params;
	const toothTitle = getToothAnatomicalNameRu(toothNumber);

	const canalLines = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile).match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : c.masterApicalFile;
		const taperMatch = String(c.taper).match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : c.taper;
		const lengthStr = c.workingLengthMm ? `${c.workingLengthMm} мм` : "—";
		const refStr = c.referencePoint ? ` (репер: ${c.referencePoint})` : "";
		const sealerStr = c.sealer ? `, силер: ${c.sealer}` : "";
		const notesStr = c.notes ? ` [${c.notes}]` : "";
		return `  • Канал ${c.canalName}${refStr}: WL = ${lengthStr} (апекслокатор), MAF = ${mafClean}/${taperClean}, обтурация: ${c.obturationTechnique}${sealerStr}${notesStr}`;
	});

	const table = generateEndoCanalsTable043(canals);
	const irrigation =
		params.irrigation ||
		"3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)";
	const radiology =
		params.radiologyControl ||
		"Контрольная визиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса, без выведения материала за верхушку.";
	const apexLocatorText = params.apexLocator || "Электронный апекслокатор (Apex 0.0)";

	return [
		`ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (Зуб ${toothTitle}):`,
		"Изоляция операционного поля: коффердам. Препарирование эндодонтического доступа, раскрытие устьев каналов.",
		"Параметры инструментальной и медикаментозной обработки каналов:",
		...canalLines,
		"",
		table,
		"",
		`Апекслокация и контроль длины: ${apexLocatorText}.`,
		`Медикаментозная обработка: ${irrigation}. Высушивание бумажными штифтами.`,
		`Рентгенологический контроль: ${radiology}`,
	].join("\n");
}

export function EndoCanalLogModal({
	isOpen,
	onClose,
	toothNumber,
	toothState,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRadiologyControl,
	onInsertToProtocol,
	onSaveCanals,
}: EndoCanalLogModalProps) {
	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (initialCanals && initialCanals.length > 0) {
			return initialCanals.map((c) => ({ ...c }));
		}
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [irrigation, setIrrigation] = useState<string>(
		initialIrrigation || "3% NaOCl + 17% EDTA с ультразвуковой активацией",
	);
	const [radiologyControl, setRadiologyControl] = useState<string>(
		initialRadiologyControl ||
			"Контрольная визиография: каналы обтурированы плотно, гомогенно до апекса.",
	);
	const [copied, setCopied] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

	// При смене номера зуба, переоткрытии окна или передаче initialCanals
	useEffect(() => {
		if (!isOpen) return;

		if (initialCanals && initialCanals.length > 0) {
			setCanals(initialCanals.map((c) => ({ ...c })));
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			return;
		}

		// Если initialCanals не переданы, но известен patientId — пробуем загрузить сохранённые данные из БД
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
		if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
	}, [isOpen, toothNumber, initialCanals, initialIrrigation, initialRadiologyControl, patientId]);

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

	const generatedProtocolText = useMemo(() => {
		return generateEndoProtocol043({
			toothNumber,
			canals,
			irrigation,
			radiologyControl,
		});
	}, [toothNumber, canals, irrigation, radiologyControl]);

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
							radiologyControl,
						}),
					},
				);
				if (!res.ok) {
					showToast("Не удалось сохранить параметры каналов в БД", "error");
					return false;
				}
				return true;
			} catch (err) {
				showToast("Ошибка сохранения параметров каналов в БД", "error");
				return false;
			}
		}

		return true;
	};

	const handleSaveCanalsOnly = async () => {
		setIsSaving(true);
		const clinicalData: EndoToothClinicalData = {
			canals,
			irrigation,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		const ok = await persistCanalsToBackend(clinicalData);
		setIsSaving(false);
		if (ok) {
			showToast(
				`Параметры каналов зуба #${toothNumber} успешно сохранены в карту!`,
				"success",
			);
			onClose();
		}
	};

	const handleInsertToProtocol = async () => {
		setIsSaving(true);
		const clinicalData: EndoToothClinicalData = {
			canals,
			irrigation,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		await persistCanalsToBackend(clinicalData);
		setIsSaving(false);

		if (onInsertToProtocol) {
			onInsertToProtocol(generatedProtocolText, canals);
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

	if (!isOpen) return null;

	const toothAnatomicalName = getToothAnatomicalNameRu(toothNumber);

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
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
						aria-label="Закрыть модальное окно"
					>
						<X size={22} />
					</button>
				</header>

				{/* Scrollable Content Body */}
				<div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
					{/* Actions row: Reset + Add canal */}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm font-black text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2">
							<Stethoscope size={18} className="text-rose-600 dark:text-rose-400" />
							<span>Корневые каналы ({canals.length}):</span>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={handleResetToDefaults}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
								title="Сбросить каналы к анатомическому стандарту FDI для этого зуба"
							>
								<RotateCcw size={15} />
								<span>Анатомический стандарт FDI</span>
							</button>

							<button
								type="button"
								onClick={handleAddCanal}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
							>
								<Plus size={16} />
								<span>Добавить канал</span>
							</button>
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

											{/* Working Length in mm */}
											<td className="py-2.5 px-3">
												<div className="relative flex items-center">
													<input
														type="number"
														step="0.5"
														min="10"
														max="35"
														aria-label={`Рабочая длина в мм для канала ${c.canalName}`}
														value={c.workingLengthMm}
														onChange={(e) =>
															handleCanalChange(
																c.id,
																"workingLengthMm",
																Number.parseFloat(e.target.value) || e.target.value,
															)
														}
														className="w-full min-h-[44px] pl-3 pr-8 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none"
													/>
													<span className="absolute right-2.5 text-xs text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
														мм
													</span>
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
													className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
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

					{/* Additional Clinical Details: Irrigation & X-Ray */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
								className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500"
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
								className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500"
								placeholder="Контрольная визиография: каналы обтурированы до апекса."
							/>
						</div>
					</div>

					{/* Live Structured Protocol Preview for Form 043/y */}
					<div className="p-4 bg-[var(--surface,#f8fafc)] dark:bg-slate-950/60 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-2xl">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
								<FileText size={16} />
								<span>Форма 043/у · Предпросмотр протокола лечения:</span>
							</div>

							<button
								type="button"
								onClick={handleCopyText}
								className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								{copied ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
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
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="min-h-[50px] px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<div className="flex items-center gap-3 flex-wrap">
						<button
							type="button"
							data-testid="save-endo-canals-btn"
							disabled={isSaving || isLoadingFromDb}
							onClick={handleSaveCanalsOnly}
							className="min-h-[50px] px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 border border-rose-400/50 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
						>
							<Check size={18} className="text-rose-600 dark:text-rose-400" />
							<span>Сохранить в карту</span>
						</button>

						<button
							type="button"
							data-testid="insert-endo-protocol-btn"
							disabled={isSaving || isLoadingFromDb}
							onClick={handleInsertToProtocol}
							className="min-h-[50px] px-6 py-2.5 rounded-xl text-sm font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center gap-2.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
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
