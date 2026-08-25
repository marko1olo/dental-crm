import React, { useState, useMemo } from "react";
import {
	Activity,
	Check,
	Coins,
	FileText,
	Layers,
	Plus,
	RotateCcw,
	Sparkles,
	Trash2,
	Wrench,
} from "lucide-react";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import {
	type EndoCanalData,
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	getDefaultCanalsForTooth,
	generateEndoProtocol043,
	generateEndoCanalsTable043,
} from "../odontogram/EndoCanalLogModal";
import type { RestorativeMaterialKey } from "../odontogram/anatomicalToothGeometries";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";

export interface ToothSurfacesAndEndoMatrixProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export type SurfaceKey = "M" | "O" | "D" | "V" | "L";

export interface BlackClassificationMacro {
	id: string;
	label: string;
	titleRu: string;
	surfaces: readonly SurfaceKey[];
	suggestedState: ToothState;
}

export const BLACK_MACROS: readonly BlackClassificationMacro[] = [
	{ id: "class_1", label: "Класс I (O)", titleRu: "Окклюзионная поверхность (фиссуры)", surfaces: ["O"], suggestedState: "Caries" },
	{ id: "class_2_mo", label: "Класс II (MO)", titleRu: "Медиально-окклюзионная полость", surfaces: ["M", "O"], suggestedState: "Caries" },
	{ id: "class_2_od", label: "Класс II (OD)", titleRu: "Окклюзионно-дистальная полость", surfaces: ["O", "D"], suggestedState: "Caries" },
	{ id: "class_2_mod", label: "Класс II (MOD)", titleRu: "Медиально-окклюзионно-дистальная полость", surfaces: ["M", "O", "D"], suggestedState: "Caries" },
	{ id: "class_3", label: "Класс III (M/D)", titleRu: "Контактная поверхность резцов без режущего края", surfaces: ["M"], suggestedState: "Caries" },
	{ id: "class_4", label: "Класс IV (MOD+Край)", titleRu: "Контактная полость с дефектом режущего края", surfaces: ["M", "O", "D"], suggestedState: "Caries" },
	{ id: "class_5", label: "Класс V (Пришеечный)", titleRu: "Пришеечная область вестибулярной поверхности", surfaces: ["V"], suggestedState: "Caries" },
	{ id: "class_6", label: "Класс VI (Бугры)", titleRu: "Вершины бугров моляров / режущие края", surfaces: ["O"], suggestedState: "Caries" },
];

export const RESTORATIVE_MATERIALS: ReadonlyArray<{ id: RestorativeMaterialKey; label: string; subLabel: string }> = [
	{ id: "composite", label: "Композит", subLabel: "Светоотверждаемый наногибрид" },
	{ id: "ceramic_emax", label: "Керамика E.max", subLabel: "Вкладка / Накладка" },
	{ id: "zirconia", label: "Диоксид циркония", subLabel: "Prettau CAD/CAM" },
	{ id: "amalgam", label: "Амальгама", subLabel: "Серебряная пломба" },
	{ id: "gold", label: "Золотой сплав", subLabel: "Литой благородный металл" },
];

export const TOOTH_STATES: ReadonlyArray<{ id: ToothState; label: string; color: string }> = [
	{ id: "Healthy", label: "Здоров", color: "var(--brand-primary, var(--teal))" },
	{ id: "Caries", label: "Кариес", color: "#ef4444" },
	{ id: "Pulpitis", label: "Пульпит", color: "#dc2626" },
	{ id: "Periodontitis", label: "Периодонтит", color: "#ea580c" },
	{ id: "Filled", label: "Пломба", color: "var(--brand-primary, var(--teal))" },
	{ id: "Crown", label: "Коронка", color: "#2563eb" },
	{ id: "Implant", label: "Имплантат", color: "#64748b" },
	{ id: "Missing", label: "Удален", color: "#e11d48" },
];

export const ToothSurfacesAndEndoMatrix: React.FC<ToothSurfacesAndEndoMatrixProps> = ({
	toothNumber,
	toothData,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const currentSurfaces = useMemo<SurfaceKey[]>(() => {
		const raw = toothData?.surfaces ?? [];
		const set = new Set<SurfaceKey>();
		for (const s of raw) {
			const upper = s.toUpperCase();
			if (upper === "M" || upper === "O" || upper === "D" || upper === "V" || upper === "L") {
				set.add(upper as SurfaceKey);
			} else if (upper === "B") {
				set.add("V");
			} else if (upper === "P") {
				set.add("L");
			} else if (upper === "MOD") {
				set.add("M");
				set.add("O");
				set.add("D");
			} else if (upper === "MO") {
				set.add("M");
				set.add("O");
			} else if (upper === "DO" || upper === "OD") {
				set.add("O");
				set.add("D");
			}
		}
		return Array.from(set);
	}, [toothData?.surfaces]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [showEndoTable, setShowEndoTable] = useState<boolean>(
		toothData?.state === "Pulpitis" || toothData?.state === "Periodontitis",
	);

	const isFrontal = (toothNumber % 10) <= 3;

	const handleToggleSurface = (surface: SurfaceKey) => {
		const next = currentSurfaces.includes(surface)
			? currentSurfaces.filter((s) => s !== surface)
			: [...currentSurfaces, surface];

		onUpdateTooth?.({
			surfaces: next,
			state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
		});
	};

	const handleApplyMacro = (macro: BlackClassificationMacro) => {
		onUpdateTooth?.({
			surfaces: [...macro.surfaces],
			state: macro.suggestedState,
		});
		showToast(`Применен макрос: ${macro.label} (${macro.titleRu})`, "info");
	};

	const handleStateChange = (state: ToothState) => {
		onUpdateTooth?.({ state });
		if (state === "Pulpitis" || state === "Periodontitis") {
			setShowEndoTable(true);
		}
	};

	const handleMaterialChange = (material: RestorativeMaterialKey) => {
		onUpdateTooth?.({ material });
	};

	const handleCanalChange = (id: string, field: keyof EndoCanalData, value: string | number) => {
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
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
		setCanals((prev) => [...prev, newCanal]);
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы 1 корневой канал", "warning");
			return;
		}
		setCanals((prev) => prev.filter((c) => c.id !== id));
	};

	const handleResetCanals = () => {
		setCanals(getDefaultCanalsForTooth(toothNumber));
		showToast(`Каналы сброшены к стандарту зуба #${toothNumber}`, "info");
	};

	const handleInsertEndoProtocol = () => {
		const protocolText = generateEndoProtocol043({
			toothNumber,
			canals,
		});
		if (onInsertToProtocol) {
			onInsertToProtocol(protocolText);
			showToast(`Эндодонтический протокол зуба #${toothNumber} вставлен в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(protocolText);
				showToast("Протокол каналов скопирован в буфер обмена", "success");
			} catch {
				showToast("Не удалось скопировать протокол", "error");
			}
		}
	};

	const iropzCalculated = useMemo(() => {
		const surfacesCount = currentSurfaces.length;
		if (surfacesCount === 0) return 0;
		if (surfacesCount === 1) return 0.2;
		if (surfacesCount === 2) return 0.45;
		if (surfacesCount === 3) return 0.65;
		if (surfacesCount === 4) return 0.85;
		return 1.0;
	}, [currentSurfaces]);

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-surfaces-endo-matrix">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Layers size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Анатомический статус и матрица поверхностей (MOD)
					</h3>
				</div>
				{iropzCalculated > 0 && (
					<span
						className={`dente-warm-tag ${iropzCalculated >= 0.6 ? "warning" : "ok"}`}
						title="Индекс разрушения окклюзионной поверхности зуба"
					>
						ИРОПЗ: {iropzCalculated.toFixed(2)} {iropzCalculated >= 0.6 ? "(Коронка Z51.8)" : ""}
					</span>
				)}
			</div>

			{/* 1-Click Tooth Status Buttons */}
			<div className="dente-status-chips-grid">
				{TOOTH_STATES.map((st) => {
					const isSelected = (toothData?.state ?? "Healthy") === st.id;
					return (
						<button
							key={st.id}
							type="button"
							onClick={() => handleStateChange(st.id)}
							className={`dente-touch-chip ${isSelected ? "active" : ""}`}
							style={{
								borderColor: isSelected ? st.color : undefined,
								color: isSelected ? "#ffffff" : undefined,
								backgroundColor: isSelected ? st.color : undefined,
							}}
							data-testid={`state-chip-${st.id}`}
						>
							<span>{st.label}</span>
							{isSelected && <Check size={13} />}
						</button>
					);
				})}
			</div>

			{/* MOD 5-Surface Interactive Matrix */}
			<div className="dente-surface-interactive-box">
				<div className="dente-surface-label-row">
					<span className="dente-surface-label">
						Выбор поверхностей поражения: <strong>{currentSurfaces.length > 0 ? currentSurfaces.join("") : "Интактно"}</strong>
					</span>
					<button
						type="button"
						onClick={() => onUpdateTooth?.({ surfaces: [] })}
						className="dente-text-action-btn"
						title="Очистить поверхности"
					>
						Сбросить
					</button>
				</div>

				<div className="dente-surface-diagram-container">
					{/* Cross 5-surface layout: Top=V, Left=M, Center=O/I, Right=D, Bottom=L */}
					<div className="dente-surface-cross-layout">
						{/* Vestibular / Buccal */}
						<button
							type="button"
							onClick={() => handleToggleSurface("V")}
							className={`dente-surface-tile tile-top ${currentSurfaces.includes("V") ? "selected" : ""}`}
							title="Вестибулярная / Щечная поверхность (V/B)"
							data-testid="surface-btn-V"
						>
							<span className="tile-letter">V</span>
							<span className="tile-name">Вестиб.</span>
						</button>

						<div className="dente-surface-middle-row">
							{/* Mesial */}
							<button
								type="button"
								onClick={() => handleToggleSurface("M")}
								className={`dente-surface-tile tile-left ${currentSurfaces.includes("M") ? "selected" : ""}`}
								title="Медиальная поверхность (M)"
								data-testid="surface-btn-M"
							>
								<span className="tile-letter">M</span>
								<span className="tile-name">Медиал.</span>
							</button>

							{/* Occlusal / Incisal */}
							<button
								type="button"
								onClick={() => handleToggleSurface("O")}
								className={`dente-surface-tile tile-center ${currentSurfaces.includes("O") ? "selected" : ""}`}
								title={isFrontal ? "Режущий край (Incisal)" : "Окклюзионная поверхность (Occlusal)"}
								data-testid="surface-btn-O"
							>
								<span className="tile-letter">{isFrontal ? "I" : "O"}</span>
								<span className="tile-name">{isFrontal ? "Реж." : "Окклюз."}</span>
							</button>

							{/* Distal */}
							<button
								type="button"
								onClick={() => handleToggleSurface("D")}
								className={`dente-surface-tile tile-right ${currentSurfaces.includes("D") ? "selected" : ""}`}
								title="Дистальная поверхность (D)"
								data-testid="surface-btn-D"
							>
								<span className="tile-letter">D</span>
								<span className="tile-name">Дистал.</span>
							</button>
						</div>

						{/* Lingual / Palatal */}
						<button
							type="button"
							onClick={() => handleToggleSurface("L")}
							className={`dente-surface-tile tile-bottom ${currentSurfaces.includes("L") ? "selected" : ""}`}
							title="Язычная / Нёбная поверхность (L/P)"
							data-testid="surface-btn-L"
						>
							<span className="tile-letter">L</span>
							<span className="tile-name">Язычн.</span>
						</button>
					</div>
				</div>

				{/* Black Quick Classification Macros */}
				<div className="dente-macros-chips-row">
					<span className="dente-macros-title">По Блэку:</span>
					{BLACK_MACROS.map((macro) => (
						<button
							key={macro.id}
							type="button"
							onClick={() => handleApplyMacro(macro)}
							className="dente-macro-chip"
							title={macro.titleRu}
						>
							{macro.label}
						</button>
					))}
				</div>
			</div>

			{/* Restorative Material Selection */}
			<div className="dente-material-selection-box">
				<label className="dente-field-label">Пломбировочный / ортопедический материал:</label>
				<div className="dente-materials-grid">
					{RESTORATIVE_MATERIALS.map((mat) => {
						const isSelected = (toothData?.material ?? "composite") === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => handleMaterialChange(mat.id)}
								className={`dente-material-btn ${isSelected ? "selected" : ""}`}
							>
								<span className="material-title">{mat.label}</span>
								<span className="material-sub">{mat.subLabel}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Root Canal & Apex Metrics Accordion */}
			<div className="dente-endo-section">
				<div className="dente-endo-header" onClick={() => setShowEndoTable(!showEndoTable)}>
					<div className="dente-endo-title">
						<Wrench size={16} color="#ef4444" />
						<span>Эндодонтия & Апекслокация каналов ({canals.length})</span>
					</div>
					<button
						type="button"
						className="dente-text-action-btn"
						onClick={(e) => {
							e.stopPropagation();
							setShowEndoTable(!showEndoTable);
						}}
					>
						{showEndoTable ? "Свернуть" : "Развернуть..."}
					</button>
				</div>

				{showEndoTable && (
					<div className="dente-endo-body">
						<div className="dente-endo-controls-row">
							<button
								type="button"
								onClick={handleResetCanals}
								className="dente-secondary-btn"
								title="Сбросить к стандарту FDI"
							>
								<RotateCcw size={14} />
								<span>Анатомический стандарт FDI</span>
							</button>

							<button
								type="button"
								onClick={handleAddCanal}
								className="dente-secondary-btn"
							>
								<Plus size={14} />
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
										<th style={{ width: 36 }}></th>
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
													<Trash2 size={13} />
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
								<FileText size={15} />
								<span>Вставить протокол эндодонтии в карту 043/у</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ToothSurfacesAndEndoMatrix;
