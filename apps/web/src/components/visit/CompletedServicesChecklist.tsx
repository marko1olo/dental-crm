import React from "react";
import { useAppLogicContext } from "../../useAppLogicContext";
import type { VisitServiceItem } from "@dental/shared";

export const CompletedServicesChecklist: React.FC = () => {
	const { activeTreatmentPlanItems, visitNoteForm, setVisitNoteForm } = useAppLogicContext();

	// We only show items that are NOT cancelled
	const planItems = React.useMemo(() => {
		return activeTreatmentPlanItems.filter((item) => item.status !== "cancelled");
	}, [activeTreatmentPlanItems]);

	const completedServices = visitNoteForm.completedServices || [];

	const handleToggle = (item: any) => {
		const isCompleted = completedServices.some((cs: any) => cs.serviceId === item.priceId && cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null));
		
		let newServices = [...completedServices];
		if (isCompleted) {
			newServices = newServices.filter((cs: any) => !(cs.serviceId === item.priceId && cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null)));
		} else {
			newServices.push({
				serviceId: item.priceId,
				title: item.priceId, // We should use real service title, but we might only have priceId here if it's not joined. Actually we should look up service name!
				quantity: item.quantity,
				priceRub: Number(item.price),
				toothCode: item.toothNumber ? String(item.toothNumber) : null
			});
		}

		setVisitNoteForm((prev: any) => ({
			...prev,
			completedServices: newServices
		}));
	};

	if (planItems.length === 0) {
		return null;
	}

	return (
		<div className="emk-field-container" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1rem", padding: "1rem", background: "var(--slate-50)", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
			<strong style={{ fontSize: "0.95rem", color: "var(--slate-800)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
				Оказанные услуги (списание материалов)
			</strong>
			<p style={{ fontSize: "0.8rem", color: "var(--slate-500)", margin: 0 }}>
				Отметьте услуги, выполненные на данном приеме. Материалы будут списаны автоматически при подписании дневника.
			</p>
			
			<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "250px", overflowY: "auto", paddingRight: "0.5rem" }}>
				{planItems.map((item) => {
					const isCompleted = completedServices.some((cs: any) => cs.serviceId === item.priceId && cs.toothCode === (item.toothNumber ? String(item.toothNumber) : null));
					return (
						<label 
							key={item.id} 
							style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: "0.75rem", 
								padding: "0.6rem 0.8rem", 
								background: isCompleted ? "var(--brand-50)" : "white", 
								border: isCompleted ? "1px solid var(--brand-300)" : "1px solid var(--slate-200)", 
								borderRadius: "6px",
								cursor: "pointer",
								transition: "all 0.2s ease"
							}}
						>
							<input 
								type="checkbox" 
								checked={isCompleted}
								onChange={() => handleToggle(item)}
								style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer", accentColor: "var(--brand-600)" }}
							/>
							<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
								<span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--slate-800)" }}>
									{item.priceId} {item.toothNumber ? `(Зуб ${item.toothNumber})` : ""}
								</span>
								<span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
									Количество: {item.quantity} | Сумма: {Number(item.price) * item.quantity} ₽
								</span>
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
};
