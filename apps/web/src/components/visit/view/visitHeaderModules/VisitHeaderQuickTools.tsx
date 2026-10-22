import { FlaskConical, Sparkles, UserCheck } from "lucide-react";
import type { VisitPatientEntity } from "../VisitViewProps";

export interface VisitHeaderQuickToolsProps {
	activePatient: VisitPatientEntity | null | undefined;
	handleOpenLabOrder: () => void;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	appLogic?: any;
}

export function VisitHeaderQuickTools({
	activePatient,
	handleOpenLabOrder,
	setIsQueueCockpitForced,
	setSelectedPatientId,
	appLogic,
}: VisitHeaderQuickToolsProps) {
	const onOpenQueue = () => {
		setIsQueueCockpitForced(true);
		if (typeof setSelectedPatientId === "function") setSelectedPatientId(null);
		else if (typeof appLogic?.setSelectedPatientId === "function") appLogic.setSelectedPatientId(null);
	};

	return (
		<>
			<button
				type="button"
				onClick={handleOpenLabOrder}
				data-testid="btn-visit-lab-order-fast"
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
				title="Оформить заказ-наряд в зуботехническую лабораторию (ЗТЛ)"
				aria-label="Наряд в ЗТЛ"
			>
				<FlaskConical className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="hidden 2xl:inline">+ Наряд в ЗТЛ</span>
				<span className="2xl:hidden text-[11px]">ЗТЛ</span>
			</button>

			<button
				type="button"
				onClick={() => window.dispatchEvent(new CustomEvent("dente:open-agent-cockpit", { detail: { patientId: activePatient?.id } }))}
				id="btn-visit-ai-agent-cockpit"
				data-testid="btn-visit-ai-agent-cockpit"
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
				title="Открыть клинический ассистент у кресла"
			>
				<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="hidden 2xl:inline">Ассистент</span>
			</button>

			<button
				type="button"
				onClick={onOpenQueue}
				id="btn-visit-switch-to-queue"
				data-testid="btn-visit-switch-to-queue"
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] !hidden md:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
				title="Открыть очередь смены и список пациентов"
			>
				<UserCheck className="w-4 h-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
				<span className="hidden 2xl:inline">Очередь смены</span>
			</button>
		</>
	);
}
