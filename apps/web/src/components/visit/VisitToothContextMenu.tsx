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

export function VisitToothContextMenu({
	selectedTooth,
	onClose,
	onSelectDiagnosis,
	onApplyMaterial,
}: VisitToothContextMenuProps) {
	const appLogic = useAppLogicContext();
	const { toothStateByCode, dashboard } = appLogic;

	const [materialCategory, setMaterialCategory] = React.useState<
		"filling" | "crown" | "implant" | null
	>(null);

	const THERAPY_MATERIALS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter((s) => s.category === "therapy") || [];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Estelite", label: "Estelite Asteria (Tokuyama, JP)" },
			{ id: "Filtek", label: "3M Filtek Supreme (US)" },
			{ id: "SDR", label: "SDR Bulk-fill (Dentsply, DE)" },
		];
	}, [dashboard?.serviceCatalog]);

	const ORTHO_MATERIALS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter((s) => s.category === "prosthetics") ||
			[];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Zirconia", label: "Диоксид циркония" },
			{ id: "E-max", label: "Прессованная керамика E-max" },
			{ id: "PFM", label: "Металлокерамика (CoCr)" },
		];
	}, [dashboard?.serviceCatalog]);

	const IMPLANT_SYSTEMS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter(
				(s) =>
					s.category === "surgery" && s.title.toLowerCase().includes("имплант"),
			) || [];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Straumann", label: "Straumann SLActive (CH)" },
			{ id: "Osstem", label: "Osstem TSIII (KR)" },
			{ id: "Nobel", label: "Nobel Biocare Active (SE)" },
		];
	}, [dashboard?.serviceCatalog]);

    if (!selectedTooth) return null;

	const { code } = selectedTooth;
	const state = (toothStateByCode as any)[code] ?? "idle";
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));

	// state → fill/stroke colors (same as tooth map)
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

	const isLower = Number(code) >= 30;

	const toothSvg = (
		<svg
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
					{geom.canals &&
						(state === "treatment" || state === "done") && (
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

    const visitWarnings = appLogic.activeVisitClinicalRuleEvaluations;

	return createPortal(
		<>
			<div
				className="clinical-context-backdrop"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				className="clinical-context-modal"
				role="dialog"
				aria-label={`Действия с зубом ${code}`}
			>
				<div className="ccm-header">
					<div className="ccm-title">
						<h3>Зуб {code}</h3>
						<span className="ccm-badge">Adult</span>
					</div>
					<button
						type="button"
						className="ccm-close"
						onClick={onClose}
						title="Закрыть"
					>
						×
					</button>
				</div>

				<div className="ccm-body">
					<div className="ccm-tooth-preview">{toothSvg}</div>

					{materialCategory ? (
						<div className="ccm-actions fade-in">
							<button
								type="button"
								className="_ccm-btn-back"
								onClick={() => setMaterialCategory(null)}
							>
								← Назад
							</button>
							{materialCategory === "filling" &&
								THERAPY_MATERIALS.map((m) => (
									<button
										key={m.id}
										type="button"
										className="_ccm-btn"
										data-color="teal"
										onClick={() =>
											onApplyMaterial(m.label, "Постановка пломбы")
										}
									>
										{m.label}
									</button>
								))}
							{materialCategory === "crown" &&
								ORTHO_MATERIALS.map((m) => (
									<button
										key={m.id}
										type="button"
										className="_ccm-btn"
										data-color="blue"
										onClick={() =>
											onApplyMaterial(m.label, "Установка коронки")
										}
									>
										{m.label}
									</button>
								))}
							{materialCategory === "implant" &&
								IMPLANT_SYSTEMS.map((m) => (
									<button
										key={m.id}
										type="button"
										className="_ccm-btn"
										data-color="violet"
										onClick={() =>
											onApplyMaterial(m.label, "Установка имплантата")
										}
									>
										{m.label}
									</button>
								))}
						</div>
					) : (
						<div className="ccm-actions">
							<button
								type="button"
								className="_ccm-btn"
								onClick={() => onSelectDiagnosis("idle")}
							>
								Сбросить статус <span>—</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="red"
								onClick={() =>
									onSelectDiagnosis(
										"treatment",
										"K04.0 Острый пульпит",
										"diagnosis",
									)
								}
							>
								Пульпит (Эндодонтия) <span>Лечение</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="amber"
								onClick={() =>
									onSelectDiagnosis(
										"watch",
										"K02.0 Кариес эмали (в стадии пятна)",
										"diagnosis",
									)
								}
							>
								Кариес эмали <span>Наблюдение</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="slate"
								onClick={() =>
									onSelectDiagnosis(
										"missing",
										"K08.1 Потеря зуба вследствие удаления",
										"diagnosis",
									)
								}
							>
								Удален / Отсутствует <span>Нет</span>
							</button>

							<div className="ccm-divider" />
							<span className="ccm-label">Выполнить работу</span>

							<button
								type="button"
								className="_ccm-btn"
								data-color="teal"
								onClick={() => setMaterialCategory("filling")}
							>
								Поставить пломбу <span>+</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="blue"
								onClick={() => setMaterialCategory("crown")}
							>
								Коронка / Вкладка <span>+</span>
							</button>
							<button
								type="button"
								className="_ccm-btn"
								data-color="violet"
								onClick={() => {
									if (
										visitWarnings &&
										visitWarnings.some((w: any) =>
											/бисфосф|bisph/i.test(w.title + w.detail),
										)
									) {
										showToast(
											`Блок безопасности: У пациента в анамнезе прием бисфосфонатов. Установка имплантата заблокирована. Требуется консультация челюстно-лицевого хирурга.`,
											"error",
										);
										return;
									}
									setMaterialCategory("implant");
								}}
							>
								Имплантат <span>+</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</>,
		document.body,
	);
}
