/**
 * PeriodontalPocketDepthModal.tsx — Модальное окно зондирования пародонтальных карманов
 *
 * Клинические стандарты:
 * - Зондирование пародонтальных карманов по 6 точкам (вестибулярно и орально)
 * - Расчет потери зубодесневого прикрепления (CAL = PD + GM)
 * - Фиксация кровоточивости при зондировании (BOP) и зубного налета (PLQ)
 * - Мандат 8e (Автономия врача): прямое сохранение без блокировок
 * - Мандат 8b: строго <= 800 строк
 * - 0% эмодзи, отсутствие dev-жаргона
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	calculateClinicalAttachmentLevel,
	PERIO_SITES_CONFIG,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { Check, X, Droplets } from "lucide-react";
import { PerioProbe } from "../icons/DentalIcons";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { probingDepthTone, probingDepthClasses } from "./perioHeatmap";
import { showToast } from "../GlobalToast";

export interface PeriodontalPocketDepthModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly initialToothRecord?: PerioToothRecord | undefined;
	readonly onSaveToothRecord?: ((toothRecord: PerioToothRecord) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export const PeriodontalPocketDepthModal: React.FC<PeriodontalPocketDepthModalProps> = ({
	isOpen,
	onClose,
	toothNumber,
	initialToothRecord,
	onSaveToothRecord,
	readOnly = false,
}) => {
	const [activeSiteKey, setActiveSiteKey] = useState<PerioSiteKey>("midBuccal");
	const [toothData, setToothData] = useState<PerioToothRecord>(() => {
		if (initialToothRecord) return { ...initialToothRecord };
		return {
			toothNumber,
			isMissing: false,
			isImplant: false,
			mobility: 0,
			furcation: 0,
			distoBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
			midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
			mesioBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
			distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
			midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
			mesioLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false, calMm: 2 },
		};
	});

	useEffect(() => {
		if (initialToothRecord) {
			setToothData({ ...initialToothRecord });
		} else {
			setToothData((prev) => ({ ...prev, toothNumber }));
		}
	}, [initialToothRecord, toothNumber]);

	if (!isOpen) return null;

	const handleDepthChange = (siteKey: PerioSiteKey, depth: number) => {
		if (readOnly) return;
		setToothData((prev) => {
			const site = prev[siteKey] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
			const gm = site.gingivalMarginMm ?? 0;
			const calMm = calculateClinicalAttachmentLevel(depth, gm);
			return {
				...prev,
				[siteKey]: {
					...site,
					probingDepthMm: depth,
					calMm,
				},
			};
		});
	};

	const handleToggleBop = (siteKey: PerioSiteKey) => {
		if (readOnly) return;
		setToothData((prev) => {
			const site = prev[siteKey] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
			return {
				...prev,
				[siteKey]: {
					...site,
					bleedingOnProbing: !site.bleedingOnProbing,
				},
			};
		});
	};

	const handleTogglePlaque = (siteKey: PerioSiteKey) => {
		if (readOnly) return;
		setToothData((prev) => {
			const site = prev[siteKey] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
			return {
				...prev,
				[siteKey]: {
					...site,
					plaque: !site.plaque,
				},
			};
		});
	};

const SITE_NAMES_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "Дистально-вестибулярно (ДВ)",
	midBuccal: "Вестибулярно по центру (В)",
	mesioBuccal: "Медиально-вестибулярно (МВ)",
	distoLingual: "Дистально-орально (ДО)",
	midLingual: "Орально по центру (О)",
	mesioLingual: "Медиально-орально (МО)",
};

	const handleApplyToothPreset = (depth: number, bop = false, plq = false, name = "") => {
		if (readOnly) return;
		setToothData((prev) => {
			const updated = { ...prev };
			for (const siteCfg of PERIO_SITES_CONFIG) {
				const existing = prev[siteCfg.key] ?? {
					probingDepthMm: 2,
					gingivalMarginMm: 0,
					bleedingOnProbing: false,
					suppuration: false,
					plaque: false,
					calculus: false,
				};
				const calMm = calculateClinicalAttachmentLevel(depth, existing.gingivalMarginMm ?? 0);
				updated[siteCfg.key] = {
					...existing,
					probingDepthMm: depth,
					bleedingOnProbing: bop,
					plaque: plq,
					calMm,
				};
			}
			return updated;
		});
		showToast(`Установлен пресет: ${name}`, "info", 1500);
	};

	const handleSave = () => {
		if (onSaveToothRecord) {
			onSaveToothRecord(toothData);
		}
		showToast(`Зондирование пародонтальных карманов зуба #${toothNumber} сохранено`, "success");
		onClose();
	};

	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-label={`Зондирование пародонтальных карманов зуба ${toothNumber}`}
			data-testid="periodontal-pocket-depth-modal"
		>
			<div className="relative w-full max-w-3xl bg-[var(--paper)] border border-[var(--line)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				{/* Header */}
				<header className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
							<PerioProbe size={20} />
						</div>
						<div className="min-w-0">
							<span className="text-xs uppercase font-black tracking-wider text-teal-700 dark:text-teal-300">
								Зондирование пародонтальных карманов
							</span>
							<h3 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 truncate">
								Зуб #{toothNumber} • {toothName}
							</h3>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="icon-button shrink-0"
						aria-label="Закрыть модальное окно"
					>
						<X size={16} />
					</button>
				</header>

				{/* Quick 1-Click Tooth Presets (Mandates 8e, 8k) */}
				<div className="px-4 sm:px-5 pt-3 pb-0 flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
						Пресеты глубины карманов:
					</span>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyToothPreset(2, false, false, "Здоровый пародонт (1–2 мм)")}
						className="secondary-button shrink-0 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
						data-testid="btn-perio-preset-norm"
						title="1–2 мм норма (нет карманов, десна здорова)"
					>
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
						<span>1–2 мм (Норма)</span>
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyToothPreset(3, true, false, "Гингивит / лёгкий пародонтит (3–4 мм)")}
						className="secondary-button shrink-0 text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
						data-testid="btn-perio-preset-gingivitis"
						title="3–4 мм гингивит / лёгкий пародонтит + BOP"
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
						<span>3–4 мм (Гингивит / лёгкий)</span>
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyToothPreset(4, true, true, "Пародонтит средней степени (4 мм)")}
						className="secondary-button shrink-0 text-orange-700 dark:text-orange-300 border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20"
						data-testid="btn-perio-preset-pocket-4"
						title="4 мм пародонтит средней степени + BOP + зубной камень"
					>
						<span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
						<span>Карман 4 мм</span>
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyToothPreset(5, true, true, "Тяжелый пародонтит (5+ мм)")}
						className="secondary-button shrink-0 text-rose-700 dark:text-rose-300 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20"
						data-testid="btn-perio-preset-pocket-5"
						title="5+ мм тяжелый пародонтит + глубокие карманы"
					>
						<span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
						<span>5+ мм (Тяжелый)</span>
					</button>
				</div>

				{/* Body: 6 Points Probing Matrix */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-4">
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						{PERIO_SITES_CONFIG.map((siteCfg) => {
							const site = toothData[siteCfg.key] ?? {
								probingDepthMm: 2,
								gingivalMarginMm: 0,
								bleedingOnProbing: false,
								plaque: false,
								calMm: 2,
							};
							const pd = site.probingDepthMm ?? 0;
							const isSelected = activeSiteKey === siteCfg.key;
							const tone = probingDepthTone(pd);

							return (
								<div
									key={siteCfg.key}
									onClick={() => setActiveSiteKey(siteCfg.key)}
									className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
										isSelected
											? "ring-2 ring-teal-500 border-teal-500 bg-teal-500/15"
											: "bg-[var(--paper-soft)] border-[var(--line)]"
									}`}
								>
									<div className="flex items-center justify-between text-[12px] font-bold text-teal-600 dark:text-teal-400">
										<span>{siteCfg.shortKey}</span>
										<span className="text-[11.5px] text-[var(--muted)] font-medium">
											CAL: {site.calMm ?? pd} мм
										</span>
									</div>

									<div className="flex items-center justify-between">
										<span className="text-[11.5px] text-[var(--muted)] font-medium">Глубина:</span>
										<span
											className={`text-sm font-black font-mono ${
												tone === "success"
													? "text-emerald-500"
													: tone === "warning-low"
														? "text-amber-500"
														: tone === "warning-high"
															? "text-orange-500"
															: "text-rose-500"
											}`}
										>
											{pd} мм
										</span>
									</div>

									<div className="flex items-center gap-1.5 pt-1.5 border-t border-[var(--line)]">
										<button
											type="button"
											disabled={readOnly}
											onClick={(e) => {
												e.stopPropagation();
												handleToggleBop(siteCfg.key);
											}}
											className={`flex-1 h-7 rounded-md text-[12.5px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
												site.bleedingOnProbing
													? "bg-rose-500 text-white shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
											}`}
											title="Кровоточивость десны (BOP)"
										>
											<Droplets size={12} className={site.bleedingOnProbing ? "text-white" : "text-rose-500"} />
											<span>BOP</span>
										</button>
										<button
											type="button"
											disabled={readOnly}
											onClick={(e) => {
												e.stopPropagation();
												handleTogglePlaque(siteCfg.key);
											}}
											className={`flex-1 h-7 rounded-md text-[12.5px] font-semibold flex items-center justify-center cursor-pointer transition-all ${
												site.plaque
													? "bg-amber-500 text-slate-950 shadow-xs font-bold"
													: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
											}`}
											title="Зубной налет (PLQ)"
										>
											PLQ
										</button>
									</div>
								</div>
							);
						})}
					</div>

					{/* Fast Depth Numeric Input for Selected Site */}
					<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
						<div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
							<span className="text-[12.5px]">Ввод глубины кармана для точки: <strong className="text-teal-700 dark:text-teal-300">{SITE_NAMES_RU[activeSiteKey] || activeSiteKey}</strong></span>
							<span className="text-[12px] text-[var(--muted)] font-normal">Диапазон: 1–12 мм</span>
						</div>
						<div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((numVal) => {
								const currentSite = toothData[activeSiteKey];
								const isSelectedVal = currentSite?.probingDepthMm === numVal;
								return (
									<button
										key={numVal}
										type="button"
										disabled={readOnly}
										onClick={() => handleDepthChange(activeSiteKey, numVal)}
										className={`h-9 rounded-lg font-black text-[13px] transition-all cursor-pointer flex items-center justify-center border ${
											isSelectedVal
												? "bg-teal-600 text-white border-teal-500 shadow-xs ring-1 ring-teal-400"
												: probingDepthClasses(numVal)
										}`}
									>
										{numVal}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Footer */}
				<footer className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="secondary-button"
					>
						<span>Отмена</span>
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="primary-button"
					>
						<Check size={16} />
						<span>Сохранить зондирование</span>
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default PeriodontalPocketDepthModal;
