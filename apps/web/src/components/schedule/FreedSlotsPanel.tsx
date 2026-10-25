import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useFreedSlotsReport } from "./freedSlots/useFreedSlotsReport";
import { FreedSlotRow } from "./freedSlots/FreedSlotRow";
import { FreedSlotsEmptyState, FreedSlotsErrorNotice } from "./freedSlots/FreedSlotsEmptyOrError";

export const FreedSlotsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const { report, error, loading, reload } = useFreedSlotsReport();
	const [called, setCalled] = useState<Set<string>>(new Set());
	const [openSlot, setOpenSlot] = useState<string | null>(null);

	const handleMarkCalled = (key: string) => {
		setCalled((prev) => new Set(prev).add(key));
	};

	if (report !== null && (report?.slots ?? []).length === 0 && !error) {
		return <FreedSlotsEmptyState />;
	}

	return (
		<section className="panel ops-panel" data-testid="freed-slots-panel">
			<div className="panel-heading">
				<h2>Освободившиеся окна</h2>
				{report ? (
					<span className={`status-pill ${(report?.slots ?? []).length > 0 ? "status-arrived" : "status-planned"}`}>
						{(report?.slots ?? []).length}
					</span>
				) : null}
			</div>

			{error ? <FreedSlotsErrorNotice error={error} loading={loading} onRetry={() => void reload()} /> : null}

			{report === null && !error ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				<>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<caption className="sr-only">Окна, освободившиеся после отмены или неявки</caption>
							<thead>
								<tr>
									<th scope="col">Когда</th>
									<th scope="col">Врач</th>
									<th scope="col">Почему освободилось</th>
									<th scope="col">Кому предложить</th>
								</tr>
							</thead>
							<tbody>
								{(report?.slots ?? []).map((slot) => (
									<FreedSlotRow
										key={slot.appointmentId}
										slot={slot}
										isOpen={openSlot === slot.appointmentId}
										onToggleOpen={() => setOpenSlot((curr) => (curr === slot.appointmentId ? null : slot.appointmentId))}
										called={called}
										onMarkCalled={handleMarkCalled}
										onSelectPatientId={appLogic?.setSelectedPatientId}
									/>
								))}
							</tbody>
						</table>
					</div>
					<p className="ops-hint">{report.note}</p>
				</>
			) : null}
		</section>
	);
};

export default FreedSlotsPanel;
