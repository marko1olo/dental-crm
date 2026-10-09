import React from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	CircleDot,
	ClipboardList,
	Crown,
	Flame,
	Plus,
	Scissors,
	Sparkles,
	XCircle,
	Zap,
} from "lucide-react";
import { TOOTH_804N_PRESETS } from "@dental/shared";
import {
	TOOTH_CLINICAL_PROTOCOLS,
	type ToothClinicalProtocol,
} from "./types";
import { ToothSurfacesSelector } from "./ToothSurfacesSelector";
import { ToothClinicalTestsSection } from "./ToothClinicalTestsSection";

export interface ToothDiagnosisTabProps {
	code: string;
	state: string;
	selectedSurfaces: string[];
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[] | undefined;
	selectedProtocolKey: "caries" | "pulpitis" | "extraction" | "hygiene";
	setSelectedProtocolKey: (key: "caries" | "pulpitis" | "extraction" | "hygiene") => void;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleAddClinicalProtocol: (proto: ToothClinicalProtocol) => void;
	// biome-ignore lint/suspicious/noExplicitAny: preset
	handleAdd804nService: (preset: any) => void;
	appendToEMKField: (field: string, text: string) => void;
	onSelectSurface?: (surface: string) => void;
}

export function ToothDiagnosisTab({
	code,
	state,
	selectedSurfaces,
	visitWarnings,
	selectedProtocolKey,
	setSelectedProtocolKey,
	handleSelectDiagnosis,
	handleAddClinicalProtocol,
	handleAdd804nService,
	appendToEMKField,
	onSelectSurface,
}: ToothDiagnosisTabProps) {
	const currentProtocol = TOOTH_CLINICAL_PROTOCOLS[selectedProtocolKey];

	return (
		<div className="_ccm-pane-section">
			{visitWarnings && visitWarnings.length > 0 && (
				<div className="_ccm-warn">
					<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<span className="truncate">
						Риски: {visitWarnings.map((w: any) => w.title).join(" · ")}
					</span>
				</div>
			)}

			{/* Селектор поверхностей MODBL */}
			<ToothSurfacesSelector
				code={code}
				selectedSurfaces={selectedSurfaces}
				onSelectSurface={onSelectSurface}
			/>

			<div className="_ccm-sub-label">Физиологическое состояние</div>
			<div className="_ccm-items-grid">
				<button
					type="button"
					className={`_ccm-action-item${state === "idle" ? " active" : ""}`}
					onClick={() => handleSelectDiagnosis("idle")}
				>
					<span className="_ccm-btn-dot _ccm-dot-idle" />
					<span className="_ccm-item-title">Здоров / Интактен</span>
					<CircleDot className="w-3.5 h-3.5 text-[var(--muted)] ml-auto shrink-0" />
				</button>
				<button
					type="button"
					className={`_ccm-action-item${state === "done" ? " active" : ""}`}
					onClick={() =>
						handleSelectDiagnosis(
							"done",
							"зуб санирован / здоров",
							"diagnosis",
						)
					}
				>
					<span className="_ccm-btn-dot _ccm-dot-done" />
					<span className="_ccm-item-title">Санирован / Ранее лечен</span>
					<CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)] ml-auto shrink-0" />
				</button>
				<button
					type="button"
					className={`_ccm-action-item${state === "missing" ? " active" : ""}`}
					onClick={() =>
						handleSelectDiagnosis(
							"missing",
							"зуб отсутствует",
							"diagnosis",
						)
					}
				>
					<span className="_ccm-btn-dot _ccm-dot-missing" />
					<span className="_ccm-item-title">Отсутствует / Удалён</span>
					<XCircle className="w-3.5 h-3.5 text-[var(--muted)] ml-auto shrink-0" />
				</button>
			</div>

			<div className="_ccm-sub-label">Патологии зубного ряда (МКБ-10)</div>
			<div className="_ccm-items-grid">
				<button
					type="button"
					className={`_ccm-action-item${state === "watch" ? " active" : ""}`}
					onClick={() => {
						const cavityNote =
							selectedSurfaces.length > 0
								? ` (${selectedSurfaces.join("")})`
								: "";
						handleSelectDiagnosis(
							"watch",
							`K02.1 Кариес дентина${cavityNote}`,
							"diagnosis",
						);
					}}
				>
					<span className="_ccm-btn-dot _ccm-dot-watch" />
					<span className="_ccm-item-title">
						K02.1 Кариес дентина
						{selectedSurfaces.length > 0
							? ` [${selectedSurfaces.join("")}]`
							: ""}
					</span>
					<AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
				</button>
				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"treatment",
							"K04.0 Острый пульпит",
							"diagnosis",
						)
					}
				>
					<span className="_ccm-btn-dot _ccm-dot-treatment" />
					<span className="_ccm-item-title">K04.0 Острый пульпит</span>
					<Flame className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
				</button>
				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"treatment",
							"K04.5 Хронический апикальный периодонтит / киста",
							"diagnosis",
						)
					}
				>
					<span className="_ccm-btn-dot _ccm-dot-treatment" />
					<span className="_ccm-item-title">
						K04.5 Периодонтит / Киста
					</span>
					<CircleDot className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
				</button>
				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"watch",
							"K03.1 Клиновидный дефект",
							"diagnosis",
						)
					}
				>
					<span className="_ccm-btn-dot _ccm-dot-watch" />
					<span className="_ccm-item-title">
						K03.1 Клиновидный дефект
					</span>
					<Activity className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
				</button>
			</div>

			{/* Клинические тесты */}
			<ToothClinicalTestsSection
				code={code}
				appendToEMKField={appendToEMKField}
			/>

			<div className="_ccm-sub-label">Клинический протокол лечения</div>
			<div
				className="_ccm-protocol-card"
				data-testid="clinical-treatment-protocol-card"
			>
				<div className="_ccm-protocol-header">
					<span className="_ccm-protocol-title">
						<ClipboardList className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						Пакет лечения
					</span>
					<span className="_ccm-protocol-total-badge">
						{currentProtocol.totalPriceRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div
					className="_ccm-protocol-selector"
					role="group"
					aria-label="Выбор клинического протокола"
				>
					{(
						Object.keys(
							TOOTH_CLINICAL_PROTOCOLS,
						) as (keyof typeof TOOTH_CLINICAL_PROTOCOLS)[]
					).map((key) => {
						const proto = TOOTH_CLINICAL_PROTOCOLS[key];
						const isSel = selectedProtocolKey === proto.key;
						return (
							<button
								key={proto.key}
								type="button"
								className={`_ccm-protocol-seg-btn${isSel ? " active" : ""}`}
								data-testid={`protocol-select-${proto.key}`}
								onClick={() => setSelectedProtocolKey(proto.key)}
							>
								{proto.title}
							</button>
						);
					})}
				</div>

				<div className="_ccm-protocol-services-list">
					{currentProtocol.services.map((svc) => (
						<div key={svc.serviceId} className="_ccm-protocol-svc-item">
							<div className="flex items-center gap-1.5 truncate">
								<span className="_ccm-protocol-code-badge font-mono">
									{svc.code804n}
								</span>
								<span className="truncate text-[var(--text)]">
									{svc.name}
								</span>
							</div>
							<span className="font-semibold text-[var(--text-strong)] shrink-0 ml-2">
								{svc.priceRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					))}
				</div>

				<button
					type="button"
					data-testid="btn-add-clinical-protocol-to-billing"
					className="_ccm-protocol-add-btn"
					onClick={() => handleAddClinicalProtocol(currentProtocol)}
				>
					<Plus className="w-4 h-4 shrink-0" />
					<span>+ Добавить протокол лечения в счет визита</span>
				</button>
			</div>

			<div className="_ccm-sub-label">Клинические пакеты услуг</div>
			<div className="_ccm-items-grid">
				{[
					{
						testId: "preset-caries-filling",
						icon: Sparkles,
						iconColor: "text-[var(--teal)]",
						title: "Кариес + Пломба",
						meta: "A16.07.002.010 · 4 500 ₽",
						action: () => {
							const cavityNote = selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : "";
							handleSelectDiagnosis("done", `K02.1 Кариес дентина${cavityNote}: пломба световая`, "diagnosis");
							handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
						},
					},
					{
						testId: "preset-pulpitis-endo",
						icon: Zap,
						iconColor: "text-amber-500",
						title: "Пульпит + Каналы + Пломба",
						meta: "A16.07.030 + A16.07.002.010 · 8 000 ₽",
						action: () => {
							handleSelectDiagnosis("treatment", "K04.0 Острый пульпит: эндодонтия 1-й этап + пломба", "diagnosis");
							handleAdd804nService(TOOTH_804N_PRESETS.endoCanals);
							handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
						},
					},
					{
						testId: "preset-crown-zirconia",
						icon: Crown,
						iconColor: "text-amber-500",
						title: "Коронка цирконий / МК",
						meta: "A16.07.004 · 24 000 ₽",
						action: () => {
							handleSelectDiagnosis("done", "K08.2 Коронка диоксид циркония / металлокерамика", "diagnosis");
							handleAdd804nService(TOOTH_804N_PRESETS.crownZirconia);
						},
					},
					{
						testId: "preset-extraction",
						icon: Scissors,
						iconColor: "text-red-500",
						title: "Удаление постоянного зуба",
						meta: "A16.07.001 · 3 500 ₽",
						action: () => {
							handleSelectDiagnosis("missing", "K08.1 Удаление постоянного зуба", "diagnosis");
							handleAdd804nService(TOOTH_804N_PRESETS.extractionPermanent);
						},
					},
				].map((item) => (
					<button
						key={item.title}
						type="button"
						data-testid={item.testId}
						className="_ccm-action-item highlight"
						onClick={item.action}
					>
						<item.icon className={`w-3.5 h-3.5 ${item.iconColor} shrink-0`} />
						<div className="flex flex-col text-left truncate">
							<span className="_ccm-item-title font-semibold">{item.title}</span>
							<span className="text-[10px] text-[var(--muted)] font-mono">{item.meta}</span>
						</div>
						<Plus className={`w-3.5 h-3.5 ${item.iconColor} ml-auto shrink-0`} />
					</button>
				))}
			</div>
		</div>
	);
}
