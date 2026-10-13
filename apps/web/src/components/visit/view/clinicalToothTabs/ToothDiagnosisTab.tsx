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
import { TOOTH_804N_PRESETS, getClinicalDiagnosisByIcd10 } from "@dental/shared";
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
				{([
					{
						icd10: "K02.1",
						fallbackTitle: "K02.1 Кариес дентина",
						icon: AlertTriangle,
						iconColor: "text-amber-500",
						dotClass: "_ccm-dot-watch",
						targetState: "watch" as const,
						hasSurfaces: true,
					},
					{
						icd10: "K02.0",
						fallbackTitle: "K02.0 Кариес эмали",
						icon: Sparkles,
						iconColor: "text-amber-400",
						dotClass: "_ccm-dot-watch",
						targetState: "watch" as const,
						hasSurfaces: true,
					},
					{
						icd10: "K02.2",
						fallbackTitle: "K02.2 Кариес цемента",
						icon: AlertTriangle,
						iconColor: "text-amber-600",
						dotClass: "_ccm-dot-watch",
						targetState: "watch" as const,
						hasSurfaces: true,
					},
					{
						icd10: "K04.0",
						fallbackTitle: "K04.0 Острый пульпит",
						icon: Flame,
						iconColor: "text-red-500",
						dotClass: "_ccm-dot-treatment",
						targetState: "treatment" as const,
						hasSurfaces: false,
					},
					{
						icd10: "K04.5",
						fallbackTitle: "K04.5 Периодонтит / Киста",
						icon: CircleDot,
						iconColor: "text-red-500",
						dotClass: "_ccm-dot-treatment",
						targetState: "treatment" as const,
						hasSurfaces: false,
					},
					{
						icd10: "K05.1",
						fallbackTitle: "K05.1 Хронический гингивит",
						icon: Activity,
						iconColor: "text-orange-500",
						dotClass: "_ccm-dot-watch",
						targetState: "watch" as const,
						hasSurfaces: false,
					},
					{
						icd10: "K05.3",
						fallbackTitle: "K05.3 Хронический пародонтит",
						icon: Activity,
						iconColor: "text-red-400",
						dotClass: "_ccm-dot-treatment",
						targetState: "treatment" as const,
						hasSurfaces: false,
					},
					{
						icd10: "K03.1",
						fallbackTitle: "K03.1 Клиновидный дефект",
						icon: Activity,
						iconColor: "text-amber-500",
						dotClass: "_ccm-dot-watch",
						targetState: "watch" as const,
						hasSurfaces: false,
					},
					{
						icd10: "K01.1",
						fallbackTitle: "K01.1 Ретинированный зуб",
						icon: Scissors,
						iconColor: "text-purple-500",
						dotClass: "_ccm-dot-treatment",
						targetState: "treatment" as const,
						hasSurfaces: false,
					},
					{
						icd10: "Z01.2",
						fallbackTitle: "Z01.2 Стоматологическое обследование (Здоров)",
						icon: CheckCircle2,
						iconColor: "text-emerald-500",
						dotClass: "_ccm-dot-healthy",
						targetState: "healthy" as const,
						hasSurfaces: false,
					},
				] as const).map((item) => {
					const ssotDiag = getClinicalDiagnosisByIcd10(item.icd10);
					const rawTitle = ssotDiag?.title.split("(")[0]?.trim() || ssotDiag?.title || "";
					const title = ssotDiag ? `${ssotDiag.icd10} ${rawTitle}` : item.fallbackTitle;
					const Icon = item.icon;
					const isWatchActive = item.targetState === "watch" && state === "watch" && item.hasSurfaces;
					return (
						<button
							key={item.icd10}
							type="button"
							className={`_ccm-action-item${isWatchActive ? " active" : ""}`}
							onClick={() => {
								const cavityNote =
									item.hasSurfaces && selectedSurfaces.length > 0
										? ` (${selectedSurfaces.join("")})`
										: "";
								handleSelectDiagnosis(
									item.targetState,
									`${title}${cavityNote}`,
									"diagnosis",
								);
							}}
						>
							<span className={`_ccm-btn-dot ${item.dotClass}`} />
							<span className="_ccm-item-title">
								{item.fallbackTitle}
								{item.hasSurfaces && selectedSurfaces.length > 0
									? ` [${selectedSurfaces.join("")}]`
									: ""}
							</span>
							<Icon className={`w-3.5 h-3.5 ${item.iconColor} ml-auto shrink-0`} />
						</button>
					);
				})}
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
						meta: `${TOOTH_804N_PRESETS.cariesFilling.code804n} · ${TOOTH_804N_PRESETS.cariesFilling.priceRub.toLocaleString("ru-RU")} ₽`,
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
						meta: `${TOOTH_804N_PRESETS.endoCanals.code804n} + ${TOOTH_804N_PRESETS.cariesFilling.code804n} · ${(TOOTH_804N_PRESETS.endoCanals.priceRub + TOOTH_804N_PRESETS.cariesFilling.priceRub).toLocaleString("ru-RU")} ₽`,
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
						meta: `${TOOTH_804N_PRESETS.crownZirconia.code804n} · ${TOOTH_804N_PRESETS.crownZirconia.priceRub.toLocaleString("ru-RU")} ₽`,
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
						meta: `${TOOTH_804N_PRESETS.extractionPermanent.code804n} · ${TOOTH_804N_PRESETS.extractionPermanent.priceRub.toLocaleString("ru-RU")} ₽`,
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
