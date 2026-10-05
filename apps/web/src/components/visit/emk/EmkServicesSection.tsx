import React from "react";
import { Boxes, ChevronDown, Search, Tag, Zap } from "lucide-react";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	CompletedServicesChecklist,
} from "../CompletedServicesChecklist";
import { VisitServiceBillingWidget } from "../VisitServiceBillingWidget";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { showToast } from "../../GlobalToast";

export interface EmkServicesSectionProps extends EmkSectionProps {
	visitId?: string | undefined;
	onOpenPriceSearchModal?: (() => void) | undefined;
	activePatient?: {
		id?: string;
		fullName?: string;
		phone?: string;
		balanceRub?: number;
	} | null;
	activeDoctorName?: string;
	clinicLegalName?: string;
}

export function EmkServicesSection({
	visitId,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
	onOpenPriceSearchModal = () => {},
	activePatient,
	activeDoctorName,
	clinicLegalName,
}: EmkServicesSectionProps) {
	const defaultPriceServices = [
		{ id: "srv-cons", title: "Консультация врача-стоматолога", shortLabel: "Консультация", basePriceRub: 1500, code804n: "B01.065.001" },
		{ id: "srv-caries", title: "Лечение кариеса с постановкой световой пломбы", shortLabel: "Кариес (пломба)", basePriceRub: 4500, code804n: "A16.07.002" },
		{ id: "srv-anes", title: "Анестезия инфильтрационная / проводниковая", shortLabel: "Анестезия", basePriceRub: 800, code804n: "B01.003.004.004" },
		{ id: "srv-hygiene", title: "Комплексная профессиональная гигиена AirFlow + ультразвук", shortLabel: "Профгигиена", basePriceRub: 5500, code804n: "A16.07.051" },
		{ id: "srv-xray", title: "Внутриротовая прицельная радиовизиография", shortLabel: "Снимок (визиограф)", basePriceRub: 600, code804n: "A06.07.003" },
		{ id: "srv-optg", title: "Панорамная томография (ОПТГ)", shortLabel: "ОПТГ", basePriceRub: 1800, code804n: "A06.07.004" },
	];

	const handleAddServiceToPlan = (srv: typeof defaultPriceServices[0]) => {
		const curr = visitNoteForm?.treatmentPlan || "";
		const targetTooth = activeTooth ? ` (зуб ${activeTooth})` : "";
		const line = `• [${srv.code804n}] ${srv.title}${targetTooth} — 1 усл. (${srv.basePriceRub} ₽)`;
		updateVisitNoteField("treatmentPlan", appendClinicalText(curr, line, "\n"));

		// 1-клик передача в кассовый счёт визита без блокирующих диалогов (Мандаты 8e, 8n, 8v)
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services: [
							{
								serviceId: srv.id,
								title: srv.title,
								unitPriceRub: srv.basePriceRub,
								quantity: 1,
								code804n: srv.code804n,
								toothCode: activeTooth ? String(activeTooth) : undefined,
							},
						],
					},
				}),
			);
		}

		showToast(`Услуга «${srv.shortLabel}» добавлена в протокол и счёт`, "success", 2000);
	};

	const handleAddBundleToPlan = (bundle: ClinicalServiceBundle) => {
		const curr = visitNoteForm?.treatmentPlan || "";
		const targetTooth = activeTooth ? ` (зуб ${activeTooth})` : "";
		const lines = bundle.services
			.map((s) => `• [${s.code804n}] ${s.title}${targetTooth} — 1 усл. (${s.priceRub} ₽)`)
			.join("\n");
		updateVisitNoteField("treatmentPlan", appendClinicalText(curr, `\nПакет «${bundle.title}»:\n${lines}`, "\n"));

		// 1-клик передача пакета услуг в кассовый счёт визита (Мандаты 8e, 8n, 8v)
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services: bundle.services.map((s) => ({
							serviceId: s.code804n,
							title: s.title,
							unitPriceRub: s.priceRub,
							quantity: 1,
							code804n: s.code804n,
							toothCode: activeTooth ? String(activeTooth) : undefined,
						})),
					},
				}),
			);
		}

		showToast(`Пакет «${bundle.shortLabel}» добавлен в протокол и счёт`, "success", 2000);
	};

	return (
		<div className="flex flex-col gap-3 min-w-0 max-w-full">
			<details className="group border-t border-[var(--line)] pt-2 bg-transparent overflow-hidden">
				<summary className="flex items-center justify-between py-2 px-1 cursor-pointer font-bold text-xs sm:text-sm select-none list-none text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors">
					<div className="flex items-center gap-2">
						<Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
						<span>Подбор услуг из прайса клиники (1 клик в протокол и счет)</span>
					</div>
					<ChevronDown
						size={16}
						className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
					/>
				</summary>
				<div className="py-2.5 px-1 flex flex-col gap-2.5 border-t border-[var(--line)]/50">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="text-xs text-[var(--muted)]">Быстрое добавление услуг в дневник приёма:</span>
						<button
							type="button"
							onClick={onOpenPriceSearchModal}
							className="min-h-[32px] h-8 px-3.5 py-1 text-xs font-extrabold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
							data-testid="btn-open-price-search-treatment-plan"
						>
							<Search size={14} />
							<span>+ Каталог прайса</span>
						</button>
					</div>

					<div className="flex flex-wrap gap-1.5">
						{defaultPriceServices.map((srv) => (
							<button
								key={srv.id}
								type="button"
								onClick={() => handleAddServiceToPlan(srv)}
								className="h-8 !min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-indigo-500 hover:bg-[var(--paper-strong)] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation shrink-0"
								title={`Добавить «${srv.title}» (${srv.basePriceRub.toLocaleString("ru-RU")} ₽) в протокол`}
								data-testid={`fast-price-chip-${srv.id}`}
							>
								<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">+</span>
								<span>{srv.shortLabel}</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--ok-bg)] text-[var(--ok-fg)] font-black">
									{srv.basePriceRub.toLocaleString("ru-RU")} ₽
								</span>
							</button>
						))}
					</div>

					{/* Быстрые клинические пакеты */}
					<div className="pt-2.5 border-t border-[var(--line)]">
						<div className="flex items-center justify-between gap-1 mb-1.5">
							<span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
								<Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
								Стандартные клинические пакеты (1 клик):
							</span>
							<span className="text-[10px] text-[var(--muted)]">Каталог услуг</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
							{CLINICAL_SERVICE_BUNDLES.map((bundle) => (
								<button
									key={bundle.id}
									type="button"
									onClick={() => handleAddBundleToPlan(bundle)}
									className="flex items-center justify-between p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-indigo-500 hover:bg-[var(--paper-strong)] active:scale-98 transition-all cursor-pointer text-left shadow-2xs touch-manipulation group"
									data-testid={`clinical-bundle-btn-${bundle.id}`}
								>
									<div className="flex flex-col min-w-0 pr-1">
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
											{bundle.shortLabel}
										</span>
										<span className="text-[10px] text-[var(--muted)] truncate">{bundle.badge}</span>
									</div>
									<span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0">
										{bundle.totalPriceRub.toLocaleString("ru-RU")} ₽
									</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</details>

			<CompletedServicesChecklist />

			{/* Автоматическое списание ТМЦ по услугам (Мандаты 8e, 8n, 8v, 8z) */}
			<div
				className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5 text-xs shadow-2xs"
				data-testid="emk-services-bom-tracking"
			>
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<Boxes size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>Списание материалов по услуге</span>
					</div>
					<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 font-semibold">
						Автосписание материалов
					</span>
				</div>
				<p className="text-[11px] text-[var(--muted)] leading-relaxed">
					Расходные материалы (композит, карпулы анестетика, иглы, боры, штифты) автоматически списываются со склада по каталогу услуг без лишних окон. При отмене или удалении услуги со счёта остатки автоматически возвращаются на склад.
				</p>
			</div>

			<div className="mt-2">
				<VisitServiceBillingWidget
					visitId={visitId || visitNoteForm?.visitId}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
					patientPhone={activePatient?.phone}
					patientDepositRub={activePatient?.balanceRub}
					doctorName={activeDoctorName || "Врач-стоматолог"}
					clinicLegalName={clinicLegalName}
				/>
			</div>
		</div>
	);
}
