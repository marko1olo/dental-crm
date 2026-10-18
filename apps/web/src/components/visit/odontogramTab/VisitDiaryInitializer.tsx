import React from "react";
import { FileText, Stethoscope } from "lucide-react";

interface VisitDiaryInitializerProps {
	appointmentId: string | null;
	isOpeningVisit: boolean;
	onOpenVisitNow: () => void;
}

export const VisitDiaryInitializer: React.FC<VisitDiaryInitializerProps> = React.memo(
	function VisitDiaryInitializer({ appointmentId, isOpeningVisit, onOpenVisitNow }) {
		return (
			<div className="text-center py-8 px-6 rounded-2xl border border-[var(--teal-subtle,#0d948833)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col items-center justify-center gap-3">
				<FileText className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto" />
				<div className="max-w-md">
					<h4 className="text-base font-bold text-[var(--ink,#0f172a)] m-0">
						{appointmentId ? "Готов к открытию дневника приёма" : "Консультационный приём"}
					</h4>
					<p className="text-sm text-[var(--muted,#64748b)] m-0 mt-1">
						{appointmentId
							? "Приём в кресле начат. Нажмите кнопку ниже для немедленного входа в медицинскую карту пациента."
							: "Зубная формула активна. Откройте визит для оформления медицинской карты приёма."}
					</p>
				</div>
				{appointmentId && (
					<button
						type="button"
						onClick={onOpenVisitNow}
						className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-md"
						data-testid="btn-open-diary-visit-chairside"
					>
						<Stethoscope size={16} />
						<span>Открыть дневник приёма (в 1 клик)</span>
					</button>
				)}
			</div>
		);
	},
);

VisitDiaryInitializer.displayName = "VisitDiaryInitializer";
