/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLANT SURGICAL PASSPORT & ISQ OSSEOINTEGRATION TRACKER MODAL
 * Clinical Dental Implantology · Misch Bone Density · RFA ISQ · Form 043/u
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useId } from "react";
import {
	Activity,
	CheckCircle2,
	X,
	ShieldCheck,
	Sparkles,
	Sliders,
	FileText,
	Copy,
	Check,
	Layers,
	ChevronRight,
	TrendingUp,
	TrendingDown,
	Info,
	Calendar,
	QrCode,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import "./implantSurgicalPassport.css";

export type MischBoneClass = "D1" | "D2" | "D3" | "D4";

export interface ImplantSpec {
	brand: string;
	model: string;
	diameterMm: number;
	lengthMm: number;
	lotNumber: string;
	serialNumber: string;
}

export interface IsqStageReading {
	stageId: "day_0" | "week_4" | "week_8" | "week_12";
	labelRu: string;
	weeksPostOp: number;
	vestibular: number;
	lingual: number;
	mesial: number;
	distal: number;
	meanIsq: number;
	recordedAtIso?: string | undefined;
}

export interface ImplantSurgicalPassportData {
	passportId: string;
	patientId: string;
	patientName: string;
	doctorId: string;
	doctorName: string;
	toothFdi: number;
	surgeryDateIso: string;
	implant: ImplantSpec;
	boneDensity: MischBoneClass;
	drillingProtocolRu: string;
	insertionTorqueNcm: number;
	graftMaterials: {
		boneGraft: string;
		membrane: string;
		fixationPins: string;
		boneGraftRu?: string;
		membraneRu?: string;
		fixationPinsRu?: string;
	};
	isqTimeline: IsqStageReading[];
	currentMeanIsq: number;
	secondaryStabilityDelta: number;
	loadingRecommendationRu: string;
	form043DiaryProtocolRu: string;
}

export interface ImplantSurgicalPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly onSavePassport?: ((data: ImplantSurgicalPassportData) => void) | undefined;
	readonly onInsertIntoDiary?: ((protocolText: string) => void) | undefined;
	readonly className?: string | undefined;
}

const BONE_DENSITY_DEFINITIONS: Record<
	MischBoneClass,
	{ title: string; desc: string; structure: string; drillNote: string }
> = {
	D1: {
		title: "D1 — Плотная кортикальная кость",
		desc: "Гомогенная плотная кость, напоминающая дуб или слоновую кость (передний отдел н/ч).",
		structure: "> 1250 HU · Высокий риск перегрева",
		drillNote: "Обязателен костный метчик (Bone Tap) и кортикальная развертка (Countersink)",
	},
	D2: {
		title: "D2 — Плотная кортикальная + пористая губчатая",
		desc: "Толстый кортикальный слой с плотной трабекулярной структурой (дистальный отдел н/ч, фронт в/ч).",
		structure: "850–1250 HU · Идеальная первичная стабильность",
		drillNote: "Стандартный ступенчатый протокол сверления с обильной ирригацией",
	},
	D3: {
		title: "D3 — Тонкая кортикальная + пористая губчатая",
		desc: "Тонкая кортикальная пластинка с рыхлой губчатой сердцевиной (дистальный отдел в/ч).",
		structure: "350–850 HU · Умеренная стабильность",
		drillNote: "Недопрепарирование ложа (Underdrilling на 0.5–1.0 мм) для остеокомпрессии",
	},
	D4: {
		title: "D4 — Очень мягкая губчатая кость",
		desc: "Тончайшая кортикальная стенка, напоминающая пенопласт (бугор верхней челюсти).",
		structure: "< 350 HU · Низкая первичная стабильность",
		drillNote: "Остеотомы Саммерса / костная конденсация, отказ от окончательного сверла",
	},
};

const IMPLANT_PRESETS: Array<{ brand: string; model: string; defaultDia: number; defaultLen: number }> = [
	{ brand: "Straumann", model: "BLX Roxolid SLActive", defaultDia: 4.0, defaultLen: 10.0 },
	{ brand: "Nobel Biocare", model: "NobelActive TiUltra", defaultDia: 4.3, defaultLen: 11.5 },
	{ brand: "Osstem", model: "TS III CA Ultra-Clean", defaultDia: 4.0, defaultLen: 10.0 },
	{ brand: "Dentium", model: "SuperLine SLA", defaultDia: 4.5, defaultLen: 10.0 },
	{ brand: "Astra Tech", model: "OsseoSpeed EV", defaultDia: 4.2, defaultLen: 11.0 },
	{ brand: "MegaGen", model: "AnyRidge Xpeed", defaultDia: 4.5, defaultLen: 10.0 },
];

export const ImplantSurgicalPassportModal: React.FC<ImplantSurgicalPassportModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "",
	doctorName = "Лечащий врач (Хирург)",
	doctorId = "",
	initialTooth = 46,
	onSavePassport,
	onInsertIntoDiary,
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<"protocol" | "isq" | "diary" | "passport">("protocol");
	const [toothNumber, setToothNumber] = useState<number>(initialTooth);
	const [implantBrandIndex, setImplantBrandIndex] = useState<number>(2); // Osstem
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [lotNumber, setLotNumber] = useState<string>("LOT-2026-OSS-8842");
	const [serialNumber, setSerialNumber] = useState<string>("SN-991428");
	const [boneDensity, setBoneDensity] = useState<MischBoneClass>("D2");
	const [torqueNcm, setTorqueNcm] = useState<number>(40);

	// Graft Materials
	const [boneGraft, setBoneGraft] = useState<string>("Geistlich Bio-Oss гранулы 0.5 г (0.25–1.0 мм)");
	const [membrane, setMembrane] = useState<string>("Geistlich Bio-Gide резорбируемая 25×25 мм");
	const [fixationPins, setFixationPins] = useState<string>("Master-Pin титановые пины 3 мм (2 шт.)");
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(true);

	// ISQ Dynamics (Day 0, Week 4, Week 8, Week 12)
	const [isqDay0, setIsqDay0] = useState<IsqStageReading>({
		stageId: "day_0",
		labelRu: "День 0 (Установка)",
		weeksPostOp: 0,
		vestibular: 74,
		lingual: 76,
		mesial: 72,
		distal: 75,
		meanIsq: 74,
		recordedAtIso: new Date().toISOString(),
	});

	const [isqWeek4, setIsqWeek4] = useState<IsqStageReading>({
		stageId: "week_4",
		labelRu: "4-я неделя (Ремоделирование)",
		weeksPostOp: 4,
		vestibular: 68,
		lingual: 70,
		mesial: 66,
		distal: 68,
		meanIsq: 68,
		recordedAtIso: undefined,
	});

	const [isqWeek8, setIsqWeek8] = useState<IsqStageReading>({
		stageId: "week_8",
		labelRu: "8-я неделя (Вторичная стабильность)",
		weeksPostOp: 8,
		vestibular: 78,
		lingual: 80,
		mesial: 77,
		distal: 79,
		meanIsq: 78.5,
		recordedAtIso: undefined,
	});

	const [isqWeek12, setIsqWeek12] = useState<IsqStageReading>({
		stageId: "week_12",
		labelRu: "12-я неделя (Зрелая остеоинтеграция)",
		weeksPostOp: 12,
		vestibular: 82,
		lingual: 84,
		mesial: 81,
		distal: 83,
		meanIsq: 82.5,
		recordedAtIso: undefined,
	});

	const titleId = useId();

	const selectedImplantPreset = IMPLANT_PRESETS[implantBrandIndex] || IMPLANT_PRESETS[0]!;

	// Calculate Current ISQ and Delta
	const latestIsq = isqWeek12.recordedAtIso
		? isqWeek12.meanIsq
		: isqWeek8.recordedAtIso
			? isqWeek8.meanIsq
			: isqWeek4.recordedAtIso
				? isqWeek4.meanIsq
				: isqDay0.meanIsq;

	const secondaryStabilityDelta = Math.round((latestIsq - isqDay0.meanIsq) * 10) / 10;

	// Loading Recommendation
	const loadingRecommendation = useMemo(() => {
		if (latestIsq >= 75 && torqueNcm >= 35) {
			return {
				statusRu: "Готов к постоянному протезированию",
				badgeColor: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300",
				desc: "Высокий коэффициент стабильности (ISQ ≥ 75). Интеграция завершена, разрешена постоянная ортопедическая нагрузка.",
			};
		}
		if (latestIsq >= 65) {
			return {
				statusRu: "Ранняя нагрузка / Временная коронка",
				badgeColor: "text-sky-700 bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300",
				desc: "Достаточная стабильность (ISQ 65–74). Разрешена установка формирователя десны или временной разгруженной коронки.",
			};
		}
		return {
			statusRu: "Отсроченная нагрузка (Требуется созревание)",
			badgeColor: "text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300",
			desc: "Идет фаза активного остеогенеза. Рекомендовано выждать дополнительно 4–6 недель до ортопедического этапа.",
		};
	}, [latestIsq, torqueNcm]);

	// Surgery Protocol Form 043/u Generator
	const generatedSurgeryProtocol = useMemo(() => {
		const gbrText = isGbrPerformed
			? `Проведена направленная костная регенерация (НКР): аугментация костным графтом ${boneGraft}, уложена и фиксирована барьерная мембрана ${membrane} с фиксацией пинами (${fixationPins}).`
			: "Костная пластика не проводилась.";

		return (
			`ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (Форма 043/у)\n` +
			`Дата операции: ${new Date().toLocaleDateString("ru-RU")}\n` +
			`Пациент: ${patientName} (ID: ${patientId})\n` +
			`Хирург-имплантолог: ${doctorName}\n` +
			`Область вмешательства: зуб ${toothNumber} (FDI)\n\n` +
			`1. АНЕСТЕЗИЯ: Инфильтрационная и проводниковая анестезия Sol. Ubistesini forte 4% (1:100 000) — 1.7 мл. Анестезия глубокая, безболезненная.\n` +
			`2. ДОСТУП: Разрез по гребню альвеолярного отростка с внутрибороздковыми разрезами. Сформирован и отслоен слизисто-надкостничный лоскут. Скелетирована костная площадка. Тип кости: ${boneDensity} (${BONE_DENSITY_DEFINITIONS[boneDensity].title}).\n` +
			`3. ОСТЕОТОМИЯ: Препарирование имплантационного ложа согласно хирургическому протоколу ${selectedImplantPreset.brand} с обильной внешней и внутренней ирригацией стерильным охлажденным 0.9% NaCl (800 об/мин).\n` +
			`4. ПОЗИЦИОНИРОВАНИЕ ИМПЛАНТАТА: Установлен дентальный имплантат ${selectedImplantPreset.brand} ${selectedImplantPreset.model} Ø ${diameterMm} мм, длина ${lengthMm} мм. Торк первичной стабилизации: ${torqueNcm} Ncm. Локализация платформы: субкрестально 0.5 мм. Серийный номер / LOT: ${lotNumber}.\n` +
			`5. RFA СТАБИЛОМЕТРИЯ (ISQ): Первичная стабильность (SmartPeg) = ${isqDay0.meanIsq} ISQ (V: ${isqDay0.vestibular}, L: ${isqDay0.lingual}, M: ${isqDay0.mesial}, D: ${isqDay0.distal}).\n` +
			`6. АУГМЕНТАЦИЯ: ${gbrText}\n` +
			`7. УШИВАНИЕ: Мобилизация надкостницы. Рана послойно ушита без натяжения монофиламентным шовным материалом Prolene 5-0 (узловые и матрацные швы). Гемостаз полный. Назначена антибактериальная и противовоспалительная терапия.`
		);
	}, [
		patientName,
		patientId,
		doctorName,
		toothNumber,
		boneDensity,
		selectedImplantPreset,
		diameterMm,
		lengthMm,
		torqueNcm,
		lotNumber,
		isqDay0,
		isGbrPerformed,
		boneGraft,
		membrane,
		fixationPins,
	]);

	const assembledPassportData: ImplantSurgicalPassportData = useMemo(() => {
		return {
			passportId: `PASSPORT-${toothNumber}-${Date.now().toString().slice(-6)}`,
			patientId,
			patientName,
			doctorId,
			doctorName,
			toothFdi: toothNumber,
			surgeryDateIso: new Date().toISOString(),
			implant: {
				brand: selectedImplantPreset.brand,
				model: selectedImplantPreset.model,
				diameterMm,
				lengthMm,
				lotNumber,
				serialNumber,
			},
			boneDensity,
			drillingProtocolRu: BONE_DENSITY_DEFINITIONS[boneDensity].drillNote,
			insertionTorqueNcm: torqueNcm,
			graftMaterials: {
				boneGraft,
				membrane,
				fixationPins,
				boneGraftRu: boneGraft,
				membraneRu: membrane,
				fixationPinsRu: fixationPins,
			},
			isqTimeline: [isqDay0, isqWeek4, isqWeek8, isqWeek12],
			currentMeanIsq: latestIsq,
			secondaryStabilityDelta,
			loadingRecommendationRu: loadingRecommendation.statusRu,
			form043DiaryProtocolRu: generatedSurgeryProtocol,
		};
	}, [
		toothNumber,
		patientId,
		patientName,
		doctorId,
		doctorName,
		selectedImplantPreset,
		diameterMm,
		lengthMm,
		lotNumber,
		serialNumber,
		boneDensity,
		torqueNcm,
		boneGraft,
		membrane,
		fixationPins,
		isqDay0,
		isqWeek4,
		isqWeek8,
		isqWeek12,
		latestIsq,
		secondaryStabilityDelta,
		loadingRecommendation,
		generatedSurgeryProtocol,
	]);

	const handleCopyProtocol = useCallback(() => {
		navigator.clipboard?.writeText(generatedSurgeryProtocol);
		showToast("Протокол операции скопирован в буфер обмена", "success");
	}, [generatedSurgeryProtocol]);

	const handleInsertDiary = useCallback(() => {
		if (onInsertIntoDiary) {
			onInsertIntoDiary(generatedSurgeryProtocol);
		}
		showToast("Протокол имплантации успешно внесен в карту 043/у", "success");
	}, [generatedSurgeryProtocol, onInsertIntoDiary]);

	const handleSavePassport = useCallback(() => {
		if (onSavePassport) {
			onSavePassport(assembledPassportData);
		}
		showToast(`Паспорт имплантата #${toothNumber} сохранен в историю пациента`, "success");
	}, [assembledPassportData, toothNumber, onSavePassport]);

	if (!isOpen) return null;

	return (
		<div className="implant-passport-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
			<div className={"implant-passport-modal " + className} data-testid="implant-surgical-passport-modal">
				{/* Modal Header */}
				<header className="implant-passport-header">
					<div className="implant-passport-title-group">
						<div className="implant-passport-icon-badge">
							<Activity size={24} />
						</div>
						<div>
							<h2 id={titleId} className="implant-passport-title">
								<span>Хирургический паспорт имплантации & ISQ</span>
								<span className="implant-passport-badge">Зуб {toothNumber} (FDI)</span>
							</h2>
							<p className="implant-passport-subtitle">
								Пациент: <span className="font-bold text-slate-800 dark:text-slate-200">{patientName}</span> · Хирург: {doctorName} · {selectedImplantPreset.brand}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="implant-passport-close-btn"
						aria-label="Закрыть хирургический паспорт"
						data-testid="implant-passport-close-btn"
					>
						<X size={20} />
					</button>
				</header>

				{/* Nav Tabs (Touch-First >= 48px) */}
				<nav className="implant-passport-nav-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "protocol"}
						onClick={() => setActiveTab("protocol")}
						className={"implant-passport-tab-btn " + (activeTab === "protocol" ? "active" : "")}
						data-testid="implant-tab-protocol"
					>
						<Sliders size={18} />
						<span>1. Хирургический протокол & Кость</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "isq"}
						onClick={() => setActiveTab("isq")}
						className={"implant-passport-tab-btn " + (activeTab === "isq" ? "active" : "")}
						data-testid="implant-tab-isq"
					>
						<TrendingUp size={18} />
						<span>2. Динамика ISQ ({latestIsq})</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "diary"}
						onClick={() => setActiveTab("diary")}
						className={"implant-passport-tab-btn " + (activeTab === "diary" ? "active" : "")}
						data-testid="implant-tab-diary"
					>
						<FileText size={18} />
						<span>3. Протокол в Карту 043/у</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "passport"}
						onClick={() => setActiveTab("passport")}
						className={"implant-passport-tab-btn " + (activeTab === "passport" ? "active" : "")}
						data-testid="implant-tab-passport"
					>
						<ShieldCheck size={18} />
						<span>4. Гарантийный паспорт</span>
					</button>
				</nav>

				{/* Modal Body */}
				<div className="implant-passport-body">
					{/* TAB 1: Surgical Protocol & Bone */}
					{activeTab === "protocol" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-protocol">
							{/* Implant System Preset Selection */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Имплантационная система и спецификация:
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{IMPLANT_PRESETS.map((imp, idx) => {
										const isSel = implantBrandIndex === idx;
										return (
											<button
												key={imp.brand}
												type="button"
												onClick={() => {
													setImplantBrandIndex(idx);
													setDiameterMm(imp.defaultDia);
													setLengthMm(imp.defaultLen);
												}}
												className={
													"min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all " +
													(isSel
														? "bg-sky-600 text-white border-sky-600 shadow-sm"
														: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-sky-500")
												}
												data-testid={"implant-preset-btn-" + imp.brand}
											>
												<div className="font-extrabold">{imp.brand}</div>
												<div className="text-[11px] opacity-80">{imp.model}</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Dimensions & Lot */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div className="flex flex-col gap-1">
									<label htmlFor="implant-dia" className="text-xs font-bold text-slate-600 dark:text-slate-400">
										Диаметр (Ø мм):
									</label>
									<input
										id="implant-dia"
										type="number"
										step="0.1"
										value={diameterMm}
										onChange={(e) => setDiameterMm(Number(e.target.value))}
										className="min-h-[48px] px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
										data-testid="input-diameter"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="implant-len" className="text-xs font-bold text-slate-600 dark:text-slate-400">
										Длина (мм):
									</label>
									<input
										id="implant-len"
										type="number"
										step="0.5"
										value={lengthMm}
										onChange={(e) => setLengthMm(Number(e.target.value))}
										className="min-h-[48px] px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
										data-testid="input-length"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="implant-lot" className="text-xs font-bold text-slate-600 dark:text-slate-400">
										LOT / Партия:
									</label>
									<input
										id="implant-lot"
										type="text"
										value={lotNumber}
										onChange={(e) => setLotNumber(e.target.value)}
										className="min-h-[48px] px-3 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
										data-testid="input-lot"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="implant-sn" className="text-xs font-bold text-slate-600 dark:text-slate-400">
										Серийный №:
									</label>
									<input
										id="implant-sn"
										type="text"
										value={serialNumber}
										onChange={(e) => setSerialNumber(e.target.value)}
										className="min-h-[48px] px-3 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
										data-testid="input-sn"
									/>
								</div>
							</div>

							{/* Bone Density Selection (Misch D1-D4) */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Плотность костной ткани (Классификация Misch D1–D4):
								</div>
								<div className="implant-bone-grid">
									{(["D1", "D2", "D3", "D4"] as MischBoneClass[]).map((b) => {
										const isSel = boneDensity === b;
										const def = BONE_DENSITY_DEFINITIONS[b];
										return (
											<div
												key={b}
												onClick={() => setBoneDensity(b)}
												className={"implant-bone-card " + (isSel ? "selected" : "")}
												data-testid={"bone-card-" + b}
											>
												<div className="flex items-center justify-between">
													<span className="font-black text-sm text-sky-700 dark:text-sky-400">{b}</span>
													{isSel && <CheckCircle2 size={16} className="text-sky-600 shrink-0" />}
												</div>
												<div className="text-xs font-bold text-slate-900 dark:text-slate-100">{def.title}</div>
												<div className="text-[11px] text-slate-500">{def.structure}</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Insertion Torque Slider */}
							<div className="implant-torque-gauge">
								<div className="flex items-center justify-between">
									<span className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">
										Торк первичной стабилизации при установке:
									</span>
									<span className="text-sm font-black font-mono text-sky-700 dark:text-sky-400">
										{torqueNcm} Ncm ({torqueNcm >= 35 && torqueNcm <= 45 ? "Оптимальный" : torqueNcm > 45 ? "Высокий" : "Низкий"})
									</span>
								</div>

								<input
									type="range"
									min="15"
									max="60"
									step="5"
									value={torqueNcm}
									onChange={(e) => setTorqueNcm(Number(e.target.value))}
									className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
									data-testid="torque-slider"
								/>

								<div className="flex justify-between text-[11px] font-bold text-slate-400">
									<span>15 Ncm (Суб-оптим.)</span>
									<span className="text-emerald-600">35–45 Ncm (Идеал)</span>
									<span>60 Ncm (Макс.)</span>
								</div>
							</div>

							{/* GBR / Bone Grafting Accordion */}
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
								<label className="flex items-center gap-3 cursor-pointer select-none">
									<input
										type="checkbox"
										checked={isGbrPerformed}
										onChange={(e) => setIsGbrPerformed(e.target.checked)}
										className="w-5 h-5 rounded text-sky-600 accent-sky-600"
										data-testid="checkbox-gbr"
									/>
									<span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
										Направленная костная регенерация (НКР / Графтинг):
									</span>
								</label>

								{isGbrPerformed && (
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-bold text-slate-500">Остеопластический материал:</span>
											<input
												type="text"
												value={boneGraft}
												onChange={(e) => setBoneGraft(e.target.value)}
												className="p-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
											/>
										</div>

										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-bold text-slate-500">Барьерная мембрана:</span>
											<input
												type="text"
												value={membrane}
												onChange={(e) => setMembrane(e.target.value)}
												className="p-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
											/>
										</div>

										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-bold text-slate-500">Фиксация мембраны:</span>
											<input
												type="text"
												value={fixationPins}
												onChange={(e) => setFixationPins(e.target.value)}
												className="p-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
											/>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* TAB 2: ISQ Remodeling Dynamics */}
					{activeTab === "isq" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-isq">
							{/* Loading Readiness Banner */}
							<div className={"p-4 rounded-xl border flex items-center justify-between gap-4 " + loadingRecommendation.badgeColor}>
								<div className="flex items-center gap-3">
									<Zap size={22} className="shrink-0" />
									<div>
										<div className="text-sm font-black">{loadingRecommendation.statusRu}</div>
										<div className="text-xs opacity-90">{loadingRecommendation.desc}</div>
									</div>
								</div>
								<div className="text-right shrink-0">
									<div className="text-2xl font-black font-mono">{latestIsq} ISQ</div>
									<div className="text-[11px] font-bold">
										{secondaryStabilityDelta >= 0 ? `+${secondaryStabilityDelta}` : secondaryStabilityDelta} Δ с момента установки
									</div>
								</div>
							</div>

							{/* 4 Timeline Stage Cards */}
							<div className="implant-isq-timeline">
								{[isqDay0, isqWeek4, isqWeek8, isqWeek12].map((st) => {
									const isRecorded = st.recordedAtIso !== undefined;
									const isDip = st.stageId === "week_4";
									return (
										<div
											key={st.stageId}
											className={"implant-isq-card " + (isRecorded ? "mature" : "")}
											data-testid={"isq-card-" + st.stageId}
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
													{st.labelRu}
												</span>
												{isRecorded ? (
													<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
														Зафиксировано
													</span>
												) : (
													<span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
														Ожидается
													</span>
												)}
											</div>

											<div className={"implant-isq-card-score " + (isDip ? "dip" : st.meanIsq >= 75 ? "high" : "")}>
												<span>{st.meanIsq}</span>
												<span className="text-xs font-bold text-slate-400">ISQ</span>
											</div>

											<div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
												<div>Вестиб: {st.vestibular}</div>
												<div>Язычно: {st.lingual}</div>
												<div>Медиал: {st.mesial}</div>
												<div>Дистал: {st.distal}</div>
											</div>
										</div>
									);
								})}
							</div>

							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								<div className="font-extrabold text-slate-900 dark:text-slate-100 mb-1">
									Биологическая кривая стабильности имплантата:
								</div>
								На 3–4 неделе происходит физиологический спад первичной механической стабильности из-за остеокластической резорбции кости и переход к вторичной биологической стабильности за счёт формирования остеобластами зрелого матрикса.
							</div>
						</div>
					)}

					{/* TAB 3: Surgery Protocol 043/u */}
					{activeTab === "diary" && (
						<div className="flex flex-col gap-4" data-testid="tab-content-diary">
							<div className="flex items-center justify-between">
								<span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
									Сформированный текст протокола для формы 043/у:
								</span>
								<button
									type="button"
									onClick={handleCopyProtocol}
									className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
									data-testid="btn-copy-protocol"
								>
									<Copy size={14} />
									<span>Скопировать текст</span>
								</button>
							</div>

							<div className="implant-protocol-preview-box" data-testid="protocol-preview-text">
								{generatedSurgeryProtocol}
							</div>
						</div>
					)}

					{/* TAB 4: Patient Warranty Passport */}
					{activeTab === "passport" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-passport">
							<div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl flex flex-col gap-4">
								<div className="flex items-center justify-between border-b border-slate-700 pb-3">
									<div className="flex items-center gap-2">
										<ShieldCheck size={24} className="text-sky-400" />
										<span className="text-sm font-black uppercase tracking-wider">
											Гарантийный паспорт имплантации DENTE
										</span>
									</div>
									<span className="text-xs font-mono text-sky-300">
										PASSPORT-{toothNumber}-{Date.now().toString().slice(-4)}
									</span>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
									<div>
										<span className="text-slate-400 block mb-0.5">Пациент:</span>
										<span className="font-extrabold text-sm">{patientName}</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Имплантат:</span>
										<span className="font-extrabold text-sm text-sky-300">
											{selectedImplantPreset.brand} {selectedImplantPreset.model}
										</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Размер:</span>
										<span className="font-mono font-extrabold text-sm">
											Ø {diameterMm} × {lengthMm} мм
										</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Позиция (FDI):</span>
										<span className="font-mono font-extrabold text-sm text-amber-300">
											Зуб {toothNumber}
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-700/80">
									<div>
										<span className="text-slate-400 block mb-0.5">LOT / Партия:</span>
										<span className="font-mono">{lotNumber}</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Серийный номер:</span>
										<span className="font-mono">{serialNumber}</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Первичный торк:</span>
										<span className="font-mono font-bold">{torqueNcm} Ncm</span>
									</div>
									<div>
										<span className="text-slate-400 block mb-0.5">Стабильность ISQ:</span>
										<span className="font-mono font-bold text-emerald-400">{latestIsq} ISQ</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer (Touch-First >= 48px) */}
				<footer className="implant-passport-footer">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						<span>{selectedImplantPreset.brand} Ø {diameterMm}×{lengthMm} · </span>
						<span className="font-bold text-sky-600 dark:text-sky-400">
							{latestIsq} ISQ ({torqueNcm} Ncm)
						</span>
					</div>

					<div className="implant-footer-btn-group">
						<button
							type="button"
							onClick={handleInsertDiary}
							className="implant-action-btn implant-action-btn-secondary"
							data-testid="implant-insert-diary-btn"
						>
							<FileText size={18} />
							<span>Внести в карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSavePassport}
							className="implant-action-btn implant-action-btn-primary"
							data-testid="implant-save-passport-btn"
						>
							<CheckCircle2 size={18} />
							<span>Сохранить паспорт</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantSurgicalPassportModal;
