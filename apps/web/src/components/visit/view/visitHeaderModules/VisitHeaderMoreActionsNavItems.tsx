import { AlertTriangle, Columns2, FlaskConical, UserCheck } from "lucide-react";
import type { VisitPatientEntity } from "../VisitViewProps";

export interface VisitHeaderMoreActionsNavItemsProps {
	activePatient: VisitPatientEntity | null | undefined;
	onCloseMenu: () => void;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	appLogic?: any;
	setIsEmergencyModalOpen: (open: boolean) => void;
	handleOpenLabOrder: () => void;
	onOpenVisiographComparison?: (() => void) | undefined;
	setIsVisiographComparisonModalOpen?: ((open: boolean) => void) | undefined;
}

export function VisitHeaderMoreActionsNavItems({
	activePatient,
	onCloseMenu,
	setIsQueueCockpitForced,
	setSelectedPatientId,
	appLogic,
	setIsEmergencyModalOpen,
	handleOpenLabOrder,
	onOpenVisiographComparison,
	setIsVisiographComparisonModalOpen,
}: VisitHeaderMoreActionsNavItemsProps) {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsQueueCockpitForced(true);
					if (typeof setSelectedPatientId === "function") setSelectedPatientId(null);
					else if (typeof appLogic?.setSelectedPatientId === "function") appLogic.setSelectedPatientId(null);
				}}
				data-testid="visit-more-action-change-patient"
				id="btn-visit-change-patient"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<UserCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Сменить пациента / Очередь</span>
					<span className="text-[10px] text-[var(--muted)]">Открыть клинический кокпит смены</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsEmergencyModalOpen(true);
				}}
				data-testid="visit-more-action-emergency"
				className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold text-rose-700 dark:text-rose-300">Экстренная помощь у кресла</span>
					<span className="text-[10px] text-[var(--muted)]">Шпаргалка 112, аптечка первой линии</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					handleOpenLabOrder();
				}}
				data-testid="visit-more-action-lab-order"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<FlaskConical className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Наряд в зуботехническую лабораторию (ЗТЛ)</span>
					<span className="text-[10px] text-[var(--muted)]">Заказ коронок, мостов, вкладок, All-on-4</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					if (onOpenVisiographComparison) onOpenVisiographComparison();
					else if (setIsVisiographComparisonModalOpen) setIsVisiographComparisonModalOpen(true);
					else if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dente-open-visiograph-comparison"));
				}}
				data-testid="visit-more-action-compare-visiograph"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Columns2 className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Сравнить снимки визиографа (До/После)</span>
					<span className="text-[10px] text-[var(--muted)]">Сплит-контроль эндодонтии и пломбировки каналов</span>
				</div>
			</button>
		</>
	);
}
