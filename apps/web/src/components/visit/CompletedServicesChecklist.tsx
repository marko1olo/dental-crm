import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export const CompletedServicesChecklist: React.FC = () => {
	const context = (useAppLogicContext() || {}) as any;
	const { activeTreatmentPlanItems = [], visitNoteForm = {}, setVisitNoteForm } = context;

	// We only show items that are NOT cancelled
	const planItems = React.useMemo(() => {
		const items = Array.isArray(activeTreatmentPlanItems) ? activeTreatmentPlanItems : [];
		return items.filter((item: any) => item.status !== "cancelled");
	}, [activeTreatmentPlanItems]);

	const completedServices = (visitNoteForm && Array.isArray(visitNoteForm.completedServices)) ? visitNoteForm.completedServices : [];

	const handleToggle = (item: any) => {
		if (!setVisitNoteForm) return;
		const isCompleted = completedServices.some(
			(cs: any) =>
				cs.serviceId === item.priceId &&
				cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null),
		);

		let newServices = [...completedServices];
		if (isCompleted) {
			newServices = newServices.filter(
				(cs: any) =>
					!(
						cs.serviceId === item.priceId &&
						cs.toothCode ===
							(item.toothNumber ? String(item.toothNumber) : null)
					),
			);
		} else {
			newServices.push({
				serviceId: item.priceId,
				title: item.title || item.priceId || "Услуга",
				quantity: item.quantity || 1,
				priceRub: Number(item.price || 0),
				toothCode: item.toothNumber ? String(item.toothNumber) : null,
			});
		}

		setVisitNoteForm((prev: any) => ({
			...prev,
			completedServices: newServices,
		}));
	};

	if (planItems.length === 0) {
		return (
			<div data-testid="completed-services-checklist" className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3">
				<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
					В согласуемом плане лечения пока нет открытых позиций для отметки выполненных услуг.
				</p>
			</div>
		);
	}

	return (
		<div data-testid="completed-services-checklist" className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3">
			<h4 className="m-0 mb-2 text-sm font-semibold text-slate-900 dark:text-white" title="Быстрая отметка выполненных манипуляций для автоматического расчета начислений врачу и списывания материалов">
				Отметка выполненных услуг по плану
			</h4>
			<div className="flex flex-col gap-1.5">
				{planItems.map((item: any) => {
					const isCompleted = completedServices.some(
						(cs: any) =>
							cs.serviceId === item.priceId &&
							cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null),
					);
					return (
						<label key={`${item.priceId}-${item.toothNumber}`} className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 dark:text-slate-200">
							<input
								type="checkbox"
								checked={isCompleted}
								onChange={() => handleToggle(item)}
								className="rounded border-slate-300 dark:border-slate-700"
							/>
							<span>
								{item.title || item.priceId} {item.toothNumber ? `(зуб ${item.toothNumber})` : ""}
							</span>
						</label>
					);
				})}
			</div>
		</div>
	);
};
