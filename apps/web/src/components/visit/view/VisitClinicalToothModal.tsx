import React from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertTriangle,
	Anchor,
	CheckCircle2,
	CircleDot,
	ClipboardList,
	Crown,
	Edit3,
	Eye,
	FileCheck2,
	Flame,
	Scissors,
	Sparkles,
	Stethoscope,
	Syringe,
	XCircle,
	Zap,
} from "lucide-react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { showToast } from "../../GlobalToast";

export interface VisitClinicalToothModalProps {
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	closeClinicalModal: () => void;
	toothStateByCode: Record<string, string>;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleSelectSurface: (surf: string) => void;
	selectedSurfaces: string[];
	isSurfaceMode: boolean;
	setIsSurfaceMode: React.Dispatch<React.SetStateAction<boolean>>;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	appendToEMKField: (field: string, text: string) => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[];
}

export function VisitClinicalToothModal({
	selectedToothForMenu,
	closeClinicalModal,
	toothStateByCode,
	materialCategory,
	setMaterialCategory,
	handleSelectDiagnosis,
	handleSelectSurface,
	selectedSurfaces,
	isSurfaceMode,
	setIsSurfaceMode,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	appendToEMKField,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
}: VisitClinicalToothModalProps) {
	if (!selectedToothForMenu || typeof document === "undefined") return null;

	const { code } = selectedToothForMenu;
	// biome-ignore lint/suspicious/noExplicitAny: state lookup
	const state = (toothStateByCode as any)[code] ?? "idle";
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));

	const FILL: Record<string, string> = {
		idle: "var(--paper)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const STROKE: Record<string, string> = {
		idle: "#94a3b8",
		planned: "#0284c7",
		treatment: "#dc2626",
		watch: "#d97706",
		done: "#166534",
		missing: "#cbd5e1",
	};
	const ROOT_FILL: Record<string, string> = {
		idle: "var(--paper-soft)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const ROOT_STROKE: Record<string, string> = {
		idle: "#cbd5e1",
		planned: "#38bdf8",
		treatment: "#f87171",
		watch: "#fbbf24",
		done: "#4ade80",
		missing: "#cbd5e1",
	};

	const isLower = Number(code) >= 30;

	const toothSvg = (
		<svg
			aria-hidden="true"
			width={cfg.width}
			height={cfg.height}
			viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			fill="none"
			style={{ transform: isLower ? "scaleY(-1)" : "none" }}
		>
			{state === "missing" ? (
				<g>
					<path
						d={geom.root}
						fill="var(--paper-soft)"
						stroke="#cbd5e1"
						strokeWidth="1.2"
						opacity="0.15"
					/>
					<path
						d={geom.crown}
						fill="var(--paper-soft)"
						stroke="#cbd5e1"
						strokeWidth="1.2"
						opacity="0.15"
					/>
					<path
						d="M20 20L80 130M80 20L20 130"
						stroke="#ef4444"
						strokeWidth="5"
						strokeLinecap="round"
						opacity="0.7"
					/>
				</g>
			) : (
				<g>
					<path
						d={geom.root}
						fill={ROOT_FILL[state] ?? "var(--paper-soft)"}
						stroke={ROOT_STROKE[state] ?? "#cbd5e1"}
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
					{geom.canals && (state === "treatment" || state === "done") && (
						<path
							d={geom.canals}
							fill="none"
							stroke={state === "done" ? "#ec4899" : "#dc2626"}
							strokeWidth="2.5"
							strokeLinecap="round"
							opacity="0.85"
						/>
					)}
					<path
						d={geom.crown}
						fill={FILL[state] ?? "var(--paper)"}
						stroke={STROKE[state] ?? "#94a3b8"}
						strokeWidth="2.2"
						strokeLinejoin="round"
					/>
					{geom.fissures && (
						<path
							d={geom.fissures}
							fill="none"
							stroke="rgba(0,0,0,0.15)"
							strokeWidth="0.8"
						/>
					)}
				</g>
			)}
		</svg>
	);

	return createPortal(
		<>
			<button
				type="button"
				className="_ccm-overlay"
				onClick={closeClinicalModal}
				onKeyDown={(e) =>
					(e.key === "Enter" || e.key === " ") && closeClinicalModal()
				}
			/>
			<div
				className="_ccm-content"
				role="dialog"
				aria-modal="true"
				aria-label={`Зуб ${code}`}
			>
				{/* ── LEFT: Diagnosis ── */}
				<div className="_ccm-panel">
					<h4 className="_ccm-h flex items-center gap-1.5">
						<Stethoscope className="w-4 h-4 text-indigo-500 shrink-0" />
						<span>Диагностика</span>
					</h4>

					{visitWarnings && visitWarnings.length > 0 && (
						<div className="_ccm-warn flex items-center gap-1 flex-wrap">
							<strong className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
								<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
								Риски:
							</strong>{" "}
							{visitWarnings.map((w: any) => w.title).join(" · ")}
						</div>
					)}

					<div className="_ccm-label">Состояние</div>

					<button
						type="button"
						className={`_ccm-btn${state === "idle" ? " active" : ""}`}
						data-color="green"
						onClick={() => handleSelectDiagnosis("idle")}
					>
						<span>Здоров / Норма</span>{" "}
						<CircleDot className="w-4 h-4 text-emerald-500 shrink-0" />
					</button>

					<button
						type="button"
						className={`_ccm-btn${state === "done" ? " active" : ""}`}
						data-color="green"
						onClick={() =>
							handleSelectDiagnosis(
								"done",
								"зуб санирован / здоров",
								"diagnosis",
							)
						}
					>
						<span>Санирован / Готово</span>{" "}
						<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
					</button>

					<button
						type="button"
						className={`_ccm-btn${state === "missing" ? " active" : ""}`}
						data-color="slate"
						onClick={() =>
							handleSelectDiagnosis(
								"missing",
								"зуб отсутствует",
								"diagnosis",
							)
						}
					>
						<span>Отсутствует / Удалён</span>{" "}
						<XCircle className="w-4 h-4 text-slate-400 shrink-0" />
					</button>

					<div className="_ccm-label">Патологии</div>

					<button
						type="button"
						className={`_ccm-btn${state === "watch" ? " active" : ""}`}
						data-color="amber"
						onClick={() => {
							const cavityNote = selectedSurfaces.length > 0 ? ` (${selectedSurfaces.join("")})` : "";
							handleSelectDiagnosis(
								"watch",
								`K02.1 Кариес дентина${cavityNote}`,
								"diagnosis",
							);
						}}
					>
						<span>Кариес дентина (K02.1){selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : ""}</span>{" "}
						<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
					</button>

					<button
						type="button"
						className="_ccm-btn"
						data-color="red"
						onClick={() =>
							handleSelectDiagnosis(
								"treatment",
								"K04.0 Острый пульпит",
								"diagnosis",
							)
						}
					>
						<span>Острый пульпит (K04.0)</span>{" "}
						<Flame className="w-4 h-4 text-red-500 shrink-0" />
					</button>

					<button
						type="button"
						className="_ccm-btn"
						data-color="rose"
						onClick={() =>
							handleSelectDiagnosis(
								"treatment",
								"K04.5 Хронический апикальный периодонтит / киста",
								"diagnosis",
							)
						}
					>
						<span>Периодонтит / Киста (K04.5)</span>{" "}
						<CircleDot className="w-4 h-4 text-rose-500 shrink-0" />
					</button>

					<button
						type="button"
						className="_ccm-btn"
						data-color="amber"
						onClick={() =>
							handleSelectDiagnosis(
								"watch",
								"K03.1 Клиновидный дефект",
								"diagnosis",
							)
						}
					>
						<span>Клиновидный дефект (K03.1)</span>{" "}
						<Activity className="w-4 h-4 text-amber-500 shrink-0" />
					</button>
				</div>

				{/* ── CENTER: Tooth preview ── */}
				<div className="_ccm-center">
					<div className="_ccm-code-badge">Зуб {code}</div>
					<div className="_ccm-tooth-stage" aria-hidden="true">
						{toothSvg}
					</div>

					{/* Селектор полостей (Класс по Блэку: O, MO, OD, MOD, V) */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "4px",
							width: "100%",
							marginTop: "6px",
							marginBottom: "8px",
						}}
					>
						<span
							style={{
								fontSize: "11px",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "var(--muted)",
							}}
						>
							Полость (Класс по Блэку)
						</span>
						<div
							style={{
								display: "flex",
								gap: "4px",
								flexWrap: "wrap",
								justifyContent: "center",
							}}
						>
							{["O", "MO", "OD", "MOD", "V"].map((cavity) => {
								const isSelected = selectedSurfaces.includes(cavity);
								return (
									<button
										key={cavity}
										type="button"
										data-testid={`btn-cavity-${cavity.toLowerCase()}`}
										onClick={() => handleSelectSurface(cavity)}
										style={{
											padding: "2px 8px",
											fontSize: "11px",
											fontWeight: 700,
											borderRadius: "4px",
											border: isSelected
												? "1px solid var(--amber, #f59e0b)"
												: "1px solid var(--line)",
											backgroundColor: isSelected
												? "var(--warn-bg, #fef3c7)"
												: "var(--paper-soft)",
											color: isSelected ? "var(--warn-ink, #b45309)" : "var(--ink)",
											cursor: "pointer",
											transition: "all 0.15s ease",
										}}
									>
										{cavity}
									</button>
								);
							})}
						</div>
					</div>

					<button
						type="button"
						className="_ccm-close-btn"
						onClick={closeClinicalModal}
					>
						Закрыть
					</button>
				</div>

				{/* ── RIGHT: Treatment ── */}
				<div className="_ccm-panel">
					<h4
						className="_ccm-h"
						style={{ display: "flex", alignItems: "center", gap: "6px" }}
					>
						<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
						<span>Лечение (Зуб {code})</span>
					</h4>

					{materialCategory ? (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: ".45rem",
								animation: "_ccm-fade .15s ease-out",
							}}
						>
							<div className="_ccm-label">
								{materialCategory === "filling"
									? "Пломбировочный материал"
									: materialCategory === "crown"
										? "Коронка (Ортопедия)"
										: materialCategory === "veneer"
											? "Винир (Ортопедия)"
											: "Имплантат"}
							</div>

							{materialCategory === "filling" && (
								<button
									type="button"
									className="_ccm-btn"
									data-color="teal"
									onClick={() => {
										const cavityNote = selectedSurfaces.length > 0 ? ` (полость ${selectedSurfaces.join("")})` : "";
										handleSelectDiagnosis(
											"done",
											`установлена пломба${cavityNote} (светоотверждаемый композит Filtek Z250 / Gradia Direct), шлифовка, полировка`,
											"treatmentPlan",
										);
										setMaterialCategory(null);
									}}
								>
									<span>Световой композит{selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : ""}</span>{" "}
									<Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
								</button>
							)}

							{materialCategory === "crown" && (
								<>
									<button
										type="button"
										className="_ccm-btn"
										data-color="teal"
										onClick={() => {
											setLabOrderModalToothNumber(selectedToothForMenu?.code);
											setIsLabOrderModalOpen(true);
											closeClinicalModal();
										}}
									>
										<span>1-Клик: Наряд в ЗТЛ на коронку (ZrO2, А2)</span>{" "}
										<FileCheck2 className="w-4 h-4 text-teal-500 shrink-0" />
									</button>
									<button
										type="button"
										className="_ccm-btn"
										data-color="teal"
										onClick={() => {
											handleSelectDiagnosis(
												"done",
												`установлена металлокерамическая / диоксид циркония коронка с фиксацией на постоянный цемент`,
												"treatmentPlan",
											);
											setMaterialCategory(null);
										}}
									>
										<span>Коронка зафиксирована (Цирконий / Керула)</span>{" "}
										<Crown className="w-4 h-4 text-amber-500 shrink-0" />
									</button>
								</>
							)}

							{materialCategory === "veneer" && (
								<>
									<button
										type="button"
										className="_ccm-btn"
										data-color="teal"
										onClick={() => {
											setLabOrderModalToothNumber(selectedToothForMenu?.code);
											setIsLabOrderModalOpen(true);
											closeClinicalModal();
										}}
									>
										<span>1-Клик: Наряд в ЗТЛ на винир (E.max, А1)</span>{" "}
										<FileCheck2 className="w-4 h-4 text-teal-500 shrink-0" />
									</button>
									<button
										type="button"
										className="_ccm-btn"
										data-color="teal"
										onClick={() => {
											handleSelectDiagnosis(
												"done",
												`установлен керамический винир IPS e.max Press с адгезивной фиксацией (Variolink Esthetic)`,
												"treatmentPlan",
											);
											setMaterialCategory(null);
										}}
									>
										<span>Винир E.max зафиксирован</span>{" "}
										<Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
									</button>
								</>
							)}

							<button
								type="button"
								className="_ccm-btn"
								data-color="slate"
								onClick={() => setMaterialCategory(null)}
							>
								<span>← Назад к видам лечения</span>
							</button>
						</div>
					) : (
						<>
							<div className="_ccm-label">Терапия</div>
							<button
								type="button"
								className="_ccm-btn"
								data-color="teal"
								onClick={() => {
									const cavityNote = selectedSurfaces.length > 0 ? ` полости [${selectedSurfaces.join("")}]` : " кариозной полости";
									handleSelectDiagnosis(
										"treatment",
										`препарирование${cavityNote}, медикаментозная обработка, пломбирование`,
										"treatmentPlan",
									);
								}}
							>
								<span>Лечение кариеса{selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : ""}</span>{" "}
								<Edit3 className="w-4 h-4 text-teal-500 shrink-0" />
							</button>

							<button
								type="button"
								className="_ccm-btn"
								data-color="teal"
								onClick={() => setMaterialCategory("filling")}
							>
								<span>Поставить пломбу...</span>{" "}
								<Crown className="w-4 h-4 text-emerald-500 shrink-0" />
							</button>

							<button
								type="button"
								className="_ccm-btn"
								data-color="pink"
								onClick={() =>
									handleSelectDiagnosis(
										"treatment",
										"депульпирование, обтурация каналов",
										"treatmentPlan",
									)
								}
							>
								<span>Лечение каналов (Эндо)</span>{" "}
								<Zap className="w-4 h-4 text-pink-500 shrink-0" />
							</button>

							<button
								type="button"
								data-testid="visit-view-endo-canal-log-btn"
								className="_ccm-btn"
								data-color="pink"
								style={{
									borderColor: "var(--teal, var(--line))",
									backgroundColor: "var(--surface-muted, var(--paper))",
									color: "var(--ink)",
									fontWeight: "bold",
								}}
								onClick={() => {
									setEndoModalToothNumber(Number(code));
									setEndoModalToothState(
										state === "treatment"
											? "Пульпит / Периодонтит"
											: state,
									);
									setIsEndoModalOpen(true);
								}}
							>
								<span className="flex-1 text-left">
									Журнал каналов (MB1, MB2, DB, P)
								</span>{" "}
								<ClipboardList className="w-4 h-4 text-pink-500 shrink-0" />
							</button>

							<button
								type="button"
								data-testid="visit-view-anesthesia-dosage-btn"
								className="_ccm-btn"
								data-color="sky"
								style={{
									borderColor: "var(--teal, var(--line))",
									backgroundColor: "var(--surface-muted, var(--paper))",
									color: "var(--ink)",
									fontWeight: "bold",
								}}
								onClick={() => {
									appendToEMKField(
										"treatmentPlan",
										`Анестезия зуба ${code}: Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
									);
									showToast(
										`Анестезия зуба ${code} (1 карп.) внесена в протокол`,
										"success",
										2500,
									);
									closeClinicalModal();
								}}
							>
								<span className="flex-1 text-left">
									Анестезия зуба {code} (1 карп.)
								</span>{" "}
								<Syringe className="w-4 h-4 text-sky-500 shrink-0" />
							</button>

							<div className="_ccm-label">Ортопедия</div>
							<button
								type="button"
								className="_ccm-btn"
								data-color="violet"
								onClick={() => setMaterialCategory("crown")}
							>
								<span>Коронка</span>{" "}
								<Crown className="w-4 h-4 text-violet-500 shrink-0" />
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="violet"
								onClick={() => setMaterialCategory("veneer")}
							>
								<span>Винир</span>{" "}
								<Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="teal"
								onClick={() => {
									setLabOrderModalToothNumber(selectedToothForMenu?.code);
									setIsLabOrderModalOpen(true);
									closeClinicalModal();
								}}
							>
								<span>Наряд в ЗТЛ (CAD/CAM)</span>{" "}
								<FileCheck2 className="w-4 h-4 text-teal-500 shrink-0" />
							</button>

							<div className="_ccm-label">Хирургия</div>
							<button
								type="button"
								className="_ccm-btn"
								data-color="red"
								onClick={() =>
									handleSelectDiagnosis(
										"treatment",
										"удаление зуба: анестезия, синдесмотомия, экстракция, ревизия лунки",
										"treatmentPlan",
									)
								}
							>
								<span>Удаление зуба</span>{" "}
								<Scissors className="w-4 h-4 text-red-500 shrink-0" />
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="violet"
								onClick={() => {
									if (
										visitWarnings?.some((w: any) =>
											/бисфосф|bisph/i.test(w.title + w.detail),
										)
									) {
										showToast(
											`Предупреждение: у пациента бисфосфонаты в анамнезе (риск остеонекроза челюсти). Окончательное решение принимает лечащий хирург.`,
											"warning",
										);
									}
									setMaterialCategory("implant");
								}}
							>
								<span>Имплантация</span>{" "}
								<Anchor className="w-4 h-4 text-violet-500 shrink-0" />
							</button>
						</>
					)}
				</div>
			</div>
		</>,
		document.body,
	);
}
