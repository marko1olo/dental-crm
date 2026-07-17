import React from "react";
import { createPortal } from "react-dom";
import { getToothConfig, getToothPath } from "../../utils/toothGeometry";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

export interface VisitToothContextMenuProps {
	selectedTooth: { code: string; state: string } | null;
	onClose: () => void;
	onSelectDiagnosis: (state: string, text?: string, fieldKey?: string) => void;
	onApplyMaterial: (materialLabel: string, textTemplate: string) => void;
}

const FILL: Record<string, string> = {
	idle: "#fff",
	planned: "#e0f2fe",
	treatment: "#fee2e2",
	watch: "#fef3c7",
	done: "#dcfce7",
	missing: "#f1f5f9",
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
	idle: "#f8fafc",
	planned: "#f0f9ff",
	treatment: "#fff5f5",
	watch: "#fffbeb",
	done: "#f0fdf4",
	missing: "#f1f5f9",
};
const ROOT_STROKE: Record<string, string> = {
	idle: "#cbd5e1",
	planned: "#38bdf8",
	treatment: "#f87171",
	watch: "#fbbf24",
	done: "#4ade80",
	missing: "#cbd5e1",
};

const STATE_LABEL: Record<string, string> = {
	idle: "Здоров",
	planned: "Запланировано",
	treatment: "Лечение",
	watch: "Наблюдение",
	done: "Вылечен",
	missing: "Отсутствует",
};

const DIAGNOSES = [
	{
		state: "idle",
		label: "Здоров / Сбросить",
		color: "green" as const,
		text: undefined,
		field: undefined,
	},
	{
		state: "treatment",
		label: "Пульпит — эндодонтия",
		color: "red" as const,
		text: "K04.0 Острый пульпит",
		field: "diagnosis",
	},
	{
		state: "treatment",
		label: "Кариес дентина",
		color: "amber" as const,
		text: "K02.1 Кариес дентина",
		field: "diagnosis",
	},
	{
		state: "watch",
		label: "Кариес эмали",
		color: "cyan" as const,
		text: "K02.0 Кариес эмали (пятно)",
		field: "diagnosis",
	},
	{
		state: "missing",
		label: "Удалён / Отсутствует",
		color: "slate" as const,
		text: "K08.1 Потеря зуба вследствие удаления",
		field: "diagnosis",
	},
	{
		state: "done",
		label: "Вылечен / Закрыт",
		color: "green" as const,
		text: "Лечение завершено",
		field: "objectiveStatus",
	},
];

const FILLING_MATERIALS = [
	"Estelite Asteria (Tokuyama, JP)",
	"3M Filtek Supreme (US)",
	"SDR Bulk-fill (Dentsply, DE)",
	"Ceram X Duo (Dentsply)",
	"Charisma (Kulzer)",
];

const CROWN_MATERIALS = [
	"Диоксид циркония",
	"Прессованная керамика E-max",
	"Металлокерамика (CoCr)",
	"CEREC CAD/CAM блок",
];

const IMPLANT_SYSTEMS = [
	"Straumann SLActive (CH)",
	"Osstem TSIII (KR)",
	"Nobel Biocare Active (SE)",
	"Alpha-Bio Tec (IL)",
	"MIS (IL)",
];

export function VisitToothContextMenu({
	selectedTooth,
	onClose,
	onSelectDiagnosis,
	onApplyMaterial,
}: VisitToothContextMenuProps) {
	const appLogic = useAppLogicContext();
	const { toothStateByCode, dashboard } = appLogic;
	const visitWarnings = appLogic.activeVisitClinicalRuleEvaluations;

	const [subMenu, setSubMenu] = React.useState<
		"filling" | "crown" | "implant" | null
	>(null);

	// Reset submenu when tooth changes
	React.useEffect(() => {
		setSubMenu(null);
	}, [selectedTooth?.code]);

	if (!selectedTooth) return null;

	const { code } = selectedTooth;
	const state = (toothStateByCode as Record<string, string>)[code] ?? "idle";
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));
	const isLower = Number(code) >= 30;

	const getActiveMaterials = () => {
		const catalog = dashboard?.serviceCatalog ?? [];
		if (subMenu === "filling") {
			const svc = catalog.filter((s) => s.category === "therapy");
			return svc.length > 0 ? svc.map((s) => s.title) : FILLING_MATERIALS;
		}
		if (subMenu === "crown") {
			const svc = catalog.filter((s) => s.category === "prosthetics");
			return svc.length > 0 ? svc.map((s) => s.title) : CROWN_MATERIALS;
		}
		if (subMenu === "implant") {
			const svc = catalog.filter(
				(s) =>
					s.category === "surgery" &&
					s.title.toLowerCase().includes("имплант"),
			);
			return svc.length > 0 ? svc.map((s) => s.title) : IMPLANT_SYSTEMS;
		}
		return [];
	};

	const getWorkLabel = () => {
		if (subMenu === "filling") return "Постановка пломбы";
		if (subMenu === "crown") return "Установка коронки/вкладки";
		if (subMenu === "implant") return "Установка имплантата";
		return "";
	};

	const toothSvg = (
		<svg
			width={cfg.width}
			height={cfg.height}
			viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			fill="none"
			aria-hidden="true"
			style={{ transform: isLower ? "scaleY(-1)" : "none" }}
		>
			{state === "missing" ? (
				<g>
					<path
						d={geom.root}
						fill="#f1f5f9"
						stroke="#cbd5e1"
						strokeWidth="1.2"
						opacity="0.15"
					/>
					<path
						d={geom.crown}
						fill="#f1f5f9"
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
						fill={ROOT_FILL[state] ?? "#f8fafc"}
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
						fill={FILL[state] ?? "#fff"}
						stroke={STROKE[state] ?? "#94a3b8"}
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
				</g>
			)}
		</svg>
	);

	return createPortal(
		<>
			{/* Backdrop */}
			<div
				className="_ccm-overlay"
				onClick={onClose}
				role="presentation"
				aria-hidden="true"
			/>
			{/* Modal container */}
			<div
				className="_ccm-content"
				role="dialog"
				aria-modal="true"
				aria-label={`Действия с зубом ${code}`}
			>
				{/* Left: Diagnoses panel */}
				<div className="_ccm-panel">
					<p className="_ccm-h">Зуб {code} · Статус</p>
					<p className="_ccm-label">Диагноз / Состояние</p>
					{DIAGNOSES.map((d, i) => (
						<button
							key={i}
							type="button"
							className={`_ccm-btn ${state === d.state ? "active" : ""}`}
							data-color={d.color}
							onClick={() => {
								onSelectDiagnosis(d.state, d.text, d.field);
							}}
						>
							{d.label}
						</button>
					))}
				</div>

				{/* Center: Tooth preview */}
				<div className="_ccm-center">
					<div className="_ccm-code-badge">Зуб {code}</div>
					<div className="_ccm-tooth-stage">{toothSvg}</div>
					<div
						style={{
							textAlign: "center",
							fontSize: "0.72rem",
							fontWeight: 700,
							color: "#64748b",
							marginTop: "0.5rem",
						}}
					>
						{STATE_LABEL[state] ?? state}
					</div>
					<button
						type="button"
						className="_ccm-close-btn"
						onClick={onClose}
						style={{ marginTop: "0.75rem" }}
					>
						Закрыть
					</button>
				</div>

				{/* Right: Work / materials panel */}
				<div className="_ccm-panel">
					{subMenu ? (
						<>
							<p className="_ccm-h">
								{subMenu === "filling"
									? "Пломбировочный материал"
									: subMenu === "crown"
										? "Коронка / вкладка"
										: "Имплантат"}
							</p>
							<button
								type="button"
								className="_ccm-btn"
								data-color="slate"
								style={{ marginBottom: "0.5rem" }}
								onClick={() => setSubMenu(null)}
							>
								← Назад к работам
							</button>
							{getActiveMaterials().map((mat) => (
								<button
									key={mat}
									type="button"
									className="_ccm-btn"
									data-color={
										subMenu === "filling"
											? "cyan"
											: subMenu === "crown"
												? "blue"
												: "violet"
									}
									onClick={() => onApplyMaterial(mat, getWorkLabel())}
								>
									{mat}
								</button>
							))}
						</>
					) : (
						<>
							<p className="_ccm-h">Работа</p>
							<p className="_ccm-label">Выполнить сегодня</p>
							<button
								type="button"
								className="_ccm-btn"
								data-color="cyan"
								onClick={() => setSubMenu("filling")}
							>
								Поставить пломбу <span style={{ color: "#94a3b8" }}>→</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="blue"
								onClick={() => setSubMenu("crown")}
							>
								Коронка / Вкладка <span style={{ color: "#94a3b8" }}>→</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="violet"
								onClick={() => {
									const hasBisphosphonate =
										visitWarnings &&
										visitWarnings.some((w: any) =>
											/бисфосф|bisph/i.test(
												(w.title ?? "") + (w.detail ?? ""),
											),
										);
									if (hasBisphosphonate) {
										showToast(
											`⛔ Блок безопасности: бисфосфонаты в анамнезе. Имплантация заблокирована. Требуется консультация ЧЛХ.`,
											"error",
										);
										return;
									}
									setSubMenu("implant");
								}}
							>
								Имплантат <span style={{ color: "#94a3b8" }}>→</span>
							</button>
							<p className="_ccm-label" style={{ marginTop: "1rem" }}>
								Экстракция
							</p>
							<button
								type="button"
								className="_ccm-btn"
								data-color="rose"
								onClick={() =>
									onSelectDiagnosis(
										"missing",
										"K08.1 Потеря зуба вследствие удаления",
										"diagnosis",
									)
								}
							>
								Удаление зуба
							</button>
						</>
					)}
				</div>
			</div>
		</>,
		document.body,
	);
}
