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
			<div className="completed-services-checklist" style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--line)" }}>
				<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
					В согласуемом плане лечения пока нет открытых позиций для отметки выполненных услуг.
				</p>
			</div>
		);
	}

	return (
		<div className="completed-services-checklist" style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--line)" }}>
			<h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--ink)" }}>Отметка выполненных услуг по плану</h4>
			<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
				{planItems.map((item: any) => {
					const isCompleted = completedServices.some(
						(cs: any) =>
							cs.serviceId === item.priceId &&
							cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null),
					);
					return (
						<label key={`${item.priceId}-${item.toothNumber}`} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
							<input
								type="checkbox"
								checked={isCompleted}
								onChange={() => handleToggle(item)}
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
