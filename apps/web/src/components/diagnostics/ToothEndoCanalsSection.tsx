import React, { useState, useEffect } from "react";
import {
	Check,
	Plus,
	RotateCcw,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import { ApexLocator, EndoFileCanal, DentalForm043 } from "../icons/DentalIcons";
import type { ToothData } from "../odontogram/ToothChart";
import {
	type EndoCanalData,
	type EndoToothClinicalData,
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	applyAnatomicalWorkingLengths,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	getDefaultCanalsForTooth,
	generateEndoProtocol043,
} from "../endo/EndoCanalLogModal";
import { showToast } from "../GlobalToast";

export interface ToothEndoCanalsSectionProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	showEndoTable: boolean;
	onToggleShowEndoTable: () => void;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothEndoCanalsSection: React.FC<ToothEndoCanalsSectionProps> = ({
	toothNumber,
	toothData,
	showEndoTable,
	onToggleShowEndoTable,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		const clinical = toothData?.clinicalData as EndoToothClinicalData | undefined;
		if (clinical?.canals && clinical.canals.length > 0) {
			return clinical.canals;
		}
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [endoRotarySystem, setEndoRotarySystem] = useState<string>("ProTaper Gold");
	const [endoIrrigation, setEndoIrrigation] = useState<string>("NaOCl 3.0% + EDTA 17%");
	const [endoRadiologyControl, setEndoRadiologyControl] = useState<string>("RVG контроль апекслокатором");

	useEffect(() => {
		const clinical = toothData?.clinicalData as EndoToothClinicalData | undefined;
		if (clinical?.canals && clinical.canals.length > 0) {
			setCanals(clinical.canals);
		} else {
			setCanals(getDefaultCanalsForTooth(toothNumber));
		}
		if (clinical?.rotarySystem) {
			setEndoRotarySystem(clinical.rotarySystem);
		}
		if (clinical?.irrigation) {
			setEndoIrrigation(clinical.irrigation);
		}
		if (clinical?.radiologyControl) {
			setEndoRadiologyControl(clinical.radiologyControl);
		}
	}, [toothNumber, toothData?.clinicalData]);

	const handleCanalChange = (id: string, field: keyof EndoCanalData, value: string | number) => {
		setCanals((prev) => {
			const next = prev.map((c) => (c.id === id ? { ...c, [field]: value } : c));
			onUpdateTooth?.({
				canalCount: next.length,
				clinicalData: {
					...(toothData?.clinicalData as EndoToothClinicalData | undefined),
					canals: next,
					rotarySystem: endoRotarySystem,
					irrigation: endoIrrigation,
					radiologyControl: endoRadiologyControl,
					updatedAt: new Date().toISOString(),
				},
			});
			return next;
		});
	};

	const handleAddCanal = () => {
		const newCanal: EndoCanalData = {
			id: `canal-${Date.now()}`,
			canalName: `Canal ${canals.length + 1}`,
			referencePoint: REFERENCE_POINT_OPTIONS[0],
			workingLengthMm: 21.0,
			masterApicalFile: MAF_ISO_OPTIONS[2],
			taper: TAPER_OPTIONS[2],
			obturationTechnique: OBTURATION_TECHNIQUE_OPTIONS[0],
		};
		setCanals((prev) => {
			const next = [...prev, newCanal];
			onUpdateTooth?.({
				canalCount: next.length,
				clinicalData: {
					...(toothData?.clinicalData as EndoToothClinicalData | undefined),
					canals: next,
					rotarySystem: endoRotarySystem,
					irrigation: endoIrrigation,
					radiologyControl: endoRadiologyControl,
					updatedAt: new Date().toISOString(),
				},
			});
			return next;
		});
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы 1 корневой канал", "warning");
			return;
		}
		setCanals((prev) => {
			const next = prev.filter((c) => c.id !== id);
			onUpdateTooth?.({
				canalCount: next.length,
				clinicalData: {
					...(toothData?.clinicalData as EndoToothClinicalData | undefined),
					canals: next,
					rotarySystem: endoRotarySystem,
					irrigation: endoIrrigation,
					radiologyControl: endoRadiologyControl,
					updatedAt: new Date().toISOString(),
				},
			});
			return next;
		});
	};

	const handleResetCanals = () => {
		const defaultCanals = getDefaultCanalsForTooth(toothNumber);
		setCanals(defaultCanals);
		onUpdateTooth?.({
			canalCount: defaultCanals.length,
			clinicalData: {
				...(toothData?.clinicalData as EndoToothClinicalData | undefined),
				canals: defaultCanals,
				rotarySystem: endoRotarySystem,
				irrigation: endoIrrigation,
				radiologyControl: endoRadiologyControl,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Каналы сброшены к стандарту зуба #${toothNumber}`, "info");
	};

	const handleApplyPulpitisPreset = () => {
		const preset = applyPulpitisProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setEndoRotarySystem(preset.rotarySystem);
		setEndoIrrigation(preset.irrigation);
		setEndoRadiologyControl(preset.radiologyControl);

		onUpdateTooth?.({
			state: toothData?.state === "Healthy" || toothData?.state === "Caries" ? "Pulpitis" : (toothData?.state ?? "Pulpitis"),
			canalCount: preset.canals.length,
			canalObturation: "gutta_percha",
			clinicalData: {
				canals: preset.canals,
				rotarySystem: preset.rotarySystem,
				irrigation: preset.irrigation,
				radiologyControl: preset.radiologyControl,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Зуб #${toothNumber}: применён 1-клик протокол Пульпит (ProTaper F2 + AH Plus)`, "success", 3000);
	};

	const handleApplyPeriodontitisTempPreset = () => {
		const preset = applyPeriodontitisTempProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setEndoRotarySystem(preset.rotarySystem);
		setEndoIrrigation(preset.irrigation);
		setEndoRadiologyControl(preset.radiologyControl);

		onUpdateTooth?.({
			state: "Periodontitis",
			canalCount: preset.canals.length,
			canalObturation: "calcium_hydroxide",
			clinicalData: {
				canals: preset.canals,
				rotarySystem: preset.rotarySystem,
				irrigation: preset.irrigation,
				radiologyControl: preset.radiologyControl,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Зуб #${toothNumber}: применён 1-клик протокол Периодонтит (Каласепт Ca(OH)2)`, "info", 3000);
	};

	const handleApplyObturationPermanentPreset = () => {
		const preset = applyObturationPermanentProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setEndoRotarySystem(preset.rotarySystem);
		setEndoIrrigation(preset.irrigation);
		setEndoRadiologyControl(preset.radiologyControl);

		onUpdateTooth?.({
			state: toothData?.state === "Periodontitis" ? "Periodontitis" : "Filled",
			canalCount: preset.canals.length,
			canalObturation: "gutta_percha",
			clinicalData: {
				canals: preset.canals,
				rotarySystem: preset.rotarySystem,
				irrigation: preset.irrigation,
				radiologyControl: preset.radiologyControl,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Зуб #${toothNumber}: применён 1-клик протокол постоянной обтурации до апекса`, "success", 3000);
	};

	const handleApplyAnatomicalLengths = () => {
		const updated = applyAnatomicalWorkingLengths(canals, toothNumber);
		setCanals(updated);
		onUpdateTooth?.({
			canalCount: updated.length,
			clinicalData: {
				...(toothData?.clinicalData as EndoToothClinicalData | undefined),
				canals: updated,
				rotarySystem: endoRotarySystem,
				irrigation: endoIrrigation,
				radiologyControl: endoRadiologyControl,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${toothNumber}`, "info", 3000);
	};

	const handleApplyExpressProTaper = handleApplyPulpitisPreset;
	const handleApplyCalaseptCaOh2 = handleApplyPeriodontitisTempPreset;

	const handleApplyRetreatmentRevision = () => {
		const baseCanals = canals.length > 0 ? canals : getDefaultCanalsForTooth(toothNumber);
		const defaultCanals = getDefaultCanalsForTooth(toothNumber);
		const updated: EndoCanalData[] = baseCanals.map((c, idx) => {
			const def = defaultCanals[idx] || defaultCanals[0];
			return {
				...c,
				workingLengthMm: c.workingLengthMm ? Number(c.workingLengthMm) : (def?.workingLengthMm || 21.0),
				masterApicalFile: "30.04 (Ревизия)",
				taper: "0.06 (Стандарт)",
				obturationTechnique: "Временная Ca(OH)2 на 14 дней",
			};
		});

		const nextRotary = "ProTaper Retreatment D1-D3 (Дезобтурация)";
		const nextIrrigation = "Хлороформ / Эвкалиптол (Сольвент) + NaOCl 3.0%";
		const nextRadiology = "RVG контроль полной дезобтурации канала";

		setCanals(updated);
		setEndoRotarySystem(nextRotary);
		setEndoIrrigation(nextIrrigation);
		setEndoRadiologyControl(nextRadiology);

		onUpdateTooth?.({
			state: "Periodontitis",
			canalCount: updated.length,
			canalObturation: "calcium_hydroxide",
			clinicalData: {
				canals: updated,
				rotarySystem: nextRotary,
				irrigation: nextIrrigation,
				radiologyControl: nextRadiology,
				updatedAt: new Date().toISOString(),
			},
		});
		showToast(`Зуб #${toothNumber}: применён 1-клик протокол Ревизии/Распломбировки`, "warning", 3000);
	};

	const handleInsertEndoProtocol = () => {
		const clinicalData: EndoToothClinicalData = {
			canals,
			rotarySystem: endoRotarySystem,
			irrigation: endoIrrigation,
			radiologyControl: endoRadiologyControl,
			updatedAt: new Date().toISOString(),
		};
		const text = generateEndoProtocol043({ toothNumber, ...clinicalData });
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Протокол эндодонтии зуба #${toothNumber} вставлен в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол эндо скопирован в буфер", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-endo-section">
			<div className="dente-endo-header" onClick={onToggleShowEndoTable}>
				<div className="dente-endo-title">
					<ApexLocator size={16} style={{ color: "var(--bad-fg)" }} />
					<span>Эндодонтия & Апекслокация каналов ({canals.length})</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					{!showEndoTable && (
						<button
							type="button"
							className="dente-quick-endo-trigger-btn"
							onClick={(e) => {
								e.stopPropagation();
								handleApplyExpressProTaper();
							}}
							title="Быстрый протокол ProTaper 25.06 (1 клик)"
						>
							<EndoFileCanal size={12} />
							<span>Экспресс ProTaper</span>
						</button>
					)}
					<button
						type="button"
						className="dente-text-action-btn"
						onClick={(e) => {
							e.stopPropagation();
							onToggleShowEndoTable();
						}}
					>
						{showEndoTable ? "Свернуть" : "Развернуть..."}
					</button>
				</div>
			</div>

			{showEndoTable && (
				<div className="dente-endo-body">
					{/* 1-Click Express Endodontic Presets Bar */}
					<div className="dente-endo-presets-bar" data-testid="endo-presets-bar">
						<div className="dente-endo-presets-label-row">
							<span className="dente-endo-presets-title">
								<EndoFileCanal size={14} />
								<span>Экспресс-протоколы эндодонтии (1 клик):</span>
							</span>
						</div>
						<div className="dente-endo-presets-actions min-w-0">
							<button
								type="button"
								onClick={handleApplyExpressProTaper}
								className="dente-endo-preset-btn protaper"
								title="Заполнить все каналы: ProTaper Gold 25.06, NaOCl 3% + EDTA, обтурация AH Plus + гуттаперча"
								data-testid="endo-preset-protaper"
							>
								<EndoFileCanal size={14} className="shrink-0" />
								<span className="truncate min-w-0">Экспресс ProTaper: 25.06 + NaOCl + AH Plus</span>
							</button>
							<button
								type="button"
								onClick={handleApplyCalaseptCaOh2}
								className="dente-endo-preset-btn calasept"
								title="Временная лечебная повязка гидроксидом кальция Ca(OH)2 при деструктивных периодонтитах"
								data-testid="endo-preset-calasept"
							>
								<ShieldAlert size={14} className="shrink-0" />
								<span className="truncate min-w-0">Временная обтурация: Каласепт (Ca(OH)2)</span>
							</button>
							<button
								type="button"
								onClick={handleApplyRetreatmentRevision}
								className="dente-endo-preset-btn revision"
								title="Распломбировка каналов ProTaper Retreatment D1-D3 с сольвентом"
								data-testid="endo-preset-revision"
							>
								<RotateCcw size={14} className="shrink-0" />
								<span className="truncate min-w-0">Распломбировка / Ревизия (D1-D3, Сольвент)</span>
							</button>
							<button
								type="button"
								onClick={handleApplyObturationPermanentPreset}
								className="dente-endo-preset-btn obturation"
								title="Постоянная обтурация каналов гуттаперчей до апекса (AH Plus)"
								data-testid="endo-preset-obturation"
							>
								<Check size={14} className="shrink-0" />
								<span className="truncate min-w-0">Обтурация до апекса (AH Plus)</span>
							</button>
						</div>
					</div>

					<div className="dente-endo-controls-row">
						<button
							type="button"
							onClick={handleApplyAnatomicalLengths}
							className="dente-secondary-btn"
							title="Автоматический расчет рабочей длины каналов по формуле FDI (мм)"
							data-testid="btn-endo-anatomical-lengths"
						>
							<ApexLocator size={14} className="shrink-0" />
							<span>Авто-длина по FDI</span>
						</button>

						<button
							type="button"
							onClick={handleResetCanals}
							className="dente-secondary-btn"
							title="Сбросить к стандарту FDI"
						>
							<RotateCcw size={14} className="shrink-0" />
							<span>Анатомический стандарт FDI</span>
						</button>

						<button
							type="button"
							onClick={handleAddCanal}
							className="dente-secondary-btn"
						>
							<Plus size={14} className="shrink-0" />
							<span>Добавить канал</span>
						</button>
					</div>

					{/* Table of Canals */}
					<div className="dente-canals-table-wrapper">
						<table className="dente-canals-table">
							<thead>
								<tr>
									<th>Канал</th>
									<th>Репер</th>
									<th>WL (мм)</th>
									<th>MAF (ISO)</th>
									<th>Конусность</th>
									<th>Обтурация</th>
									<th style={{ width: 48 }}></th>
								</tr>
							</thead>
							<tbody>
								{canals.map((c) => (
									<tr key={c.id}>
										<td>
											<select
												value={c.canalName}
												onChange={(e) => handleCanalChange(c.id, "canalName", e.target.value)}
												className="dente-table-select font-bold"
											>
												{CANAL_NAME_OPTIONS.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.value}
													</option>
												))}
											</select>
										</td>
										<td>
											<select
												value={c.referencePoint}
												onChange={(e) => handleCanalChange(c.id, "referencePoint", e.target.value)}
												className="dente-table-select"
											>
												{REFERENCE_POINT_OPTIONS.map((refOpt) => (
													<option key={refOpt} value={refOpt}>
														{refOpt.split(" ")[0]}
													</option>
												))}
											</select>
										</td>
										<td>
											<input
												type="number"
												step="0.5"
												min="10"
												max="35"
												value={c.workingLengthMm}
												onChange={(e) => handleCanalChange(c.id, "workingLengthMm", Number(e.target.value))}
												className="dente-table-input font-mono font-bold"
											/>
										</td>
										<td>
											<select
												value={c.masterApicalFile}
												onChange={(e) => handleCanalChange(c.id, "masterApicalFile", e.target.value)}
												className="dente-table-select"
											>
												{MAF_ISO_OPTIONS.map((maf) => (
													<option key={maf} value={maf}>
														{maf.slice(0, 7)}
													</option>
												))}
											</select>
										</td>
										<td>
											<select
												value={c.taper}
												onChange={(e) => handleCanalChange(c.id, "taper", e.target.value)}
												className="dente-table-select"
											>
												{TAPER_OPTIONS.map((tap) => (
													<option key={tap} value={tap}>
														{tap.slice(0, 4)}
													</option>
												))}
											</select>
										</td>
										<td>
											<select
												value={c.obturationTechnique}
												onChange={(e) => handleCanalChange(c.id, "obturationTechnique", e.target.value)}
												className="dente-table-select"
											>
												{OBTURATION_TECHNIQUE_OPTIONS.map((obt) => (
													<option key={obt} value={obt}>
														{obt.slice(0, 18)}...
													</option>
												))}
											</select>
										</td>
										<td>
											<button
												type="button"
												onClick={() => handleRemoveCanal(c.id)}
												className="dente-row-del-btn"
												title="Удалить канал"
											>
												<Trash2 size={16} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* 1-Click Export to 043/u */}
					<div className="dente-endo-footer">
						<button
							type="button"
							onClick={handleInsertEndoProtocol}
							className="dente-primary-action-btn"
						>
							<DentalForm043 size={15} />
							<span>Вставить протокол эндодонтии в карту 043/у</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ToothEndoCanalsSection;
