import type React from "react";
import { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { BarChart2, X } from "lucide-react";

const PeriodontogramChart = lazy(() =>
	import("../../../perio/PeriodontogramChart").then((m) => ({ default: m.PeriodontogramChart }))
);

export interface VisitDiaryPerioStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientFullName?: string | null;
	readonly doctorName?: string | null;
	readonly onInsertProtocol: (protocolText: string) => void;
}

export const VisitDiaryPerioStudioModal: React.FC<VisitDiaryPerioStudioModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientFullName,
	doctorName,
	onInsertProtocol,
}) => {
	if (!isOpen || typeof window === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-label="Кабинет врача-пародонтолога"
		>
			<div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#334155)]">
					<div className="flex items-center gap-2">
						<BarChart2 className="w-5 h-5 text-teal-400" />
						<h3 className="text-base font-bold text-[var(--ink,#f8fafc)]">
							Пародонтологическая карта пациента
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="icon-button shrink-0"
						title="Закрыть пародонтологическую карту"
						aria-label="Закрыть пародонтологическую карту"
					>
						<X size={16} />
					</button>
				</div>
				<Suspense
					fallback={
						<div className="p-8 text-center text-sm text-[var(--muted)] flex items-center justify-center gap-2">
							<BarChart2 className="w-5 h-5 animate-pulse text-teal-400" />
							<span>Загрузка кабинета пародонтологии...</span>
						</div>
					}
				>
					<PeriodontogramChart
						patientId={patientId || ""}
						patientName={patientFullName || "Пациент"}
						organizationId={undefined}
						doctorName={doctorName || undefined}
						onInsertToProtocol={onInsertProtocol}
					/>
				</Suspense>
			</div>
		</div>,
		document.body,
	);
};
