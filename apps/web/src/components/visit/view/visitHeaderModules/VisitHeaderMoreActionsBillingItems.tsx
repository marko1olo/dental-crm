import { CheckCircle2, Clock, Lock, Pill, Tablet } from "lucide-react";
import type { VisitPatientEntity } from "../VisitViewProps";

export interface VisitHeaderMoreActionsBillingItemsProps {
	activePatient: VisitPatientEntity | null | undefined;
	onCloseMenu: () => void;
	setIsDoctorShiftModalOpen: (open: boolean) => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
	setIsPrescriptionModalOpen?: ((open: boolean) => void) | undefined;
}

export function VisitHeaderMoreActionsBillingItems({
	activePatient,
	onCloseMenu,
	setIsDoctorShiftModalOpen,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
	setIsPrescriptionModalOpen,
}: VisitHeaderMoreActionsBillingItemsProps) {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsDoctorShiftModalOpen(true);
				}}
				data-testid="visit-more-action-doctor-shift"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Clock className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<span className="font-semibold">Смена врача</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsPriceValidatorModalOpen(true);
				}}
				data-testid="visit-more-action-price-lock"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Lock className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<span className="font-semibold">Контроль цен</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsStagePaymentModalOpen(true);
				}}
				data-testid="visit-more-action-stage-payment"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<CheckCircle2 className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<span className="font-semibold">Поэтапная оплата</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-open-treatment-plan-presenter", {
								detail: { patientId: activePatient?.id },
							}),
						);
					}
				}}
				data-testid="visit-more-action-treatment-presenter"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Tablet className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Презентация планов (3-Tier)</span>
					<span className="text-[10px] text-[var(--muted)]">Студия у кресла: 3 тарифа, одонтограмма, смета</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					setIsPrescriptionModalOpen?.(true);
				}}
				data-testid="visit-more-action-prescription"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Pill className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--teal)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Выписать рецепт</span>
					<span className="text-[10px] text-[var(--muted)]">Рецептурные бланки, антибиотики, НПВС</span>
				</div>
			</button>
		</>
	);
}
