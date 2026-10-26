/**
 * RecallListPanel.tsx
 * Facade component for Patient Recall List Panel.
 * Decomposed into modular components in recallListModules/ (Mandate 8b <= 120 lines).
 */

import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { countLabel } from "../../lib/russianPlural";
import { useRecallListState } from "./recallListModules/useRecallListState";
import { RecallListMetricsBar } from "./recallListModules/RecallListMetricsBar";
import { RecallListTable } from "./recallListModules/RecallListTable";

export const RecallListPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const clinicName =
		appLogic?.clinicName ||
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(appLogic?.dashboard as any)?.clinic?.name ||
		"Клиника";

	const {
		report,
		error,
		notice,
		busyPatient,
		called,
		activeBand,
		setActiveBand,
		setDisplayLimit,
		invite,
		markCalled,
		candidateSlice,
	} = useRecallListState(auth, clinicName);

	return (
		<section className="panel ops-panel" data-testid="recall-list-panel">
			<div className="panel-heading">
				<h2>Пора пригласить</h2>
				{report && (
					<span className="status-pill status-planned">
						просмотрено карточек: {report.examinedPatients ?? 0}
					</span>
				)}
			</div>

			{error && (
				<p className="ops-notice ops-notice--error" role="alert">
					Список не построен: {error}
				</p>
			)}

			{notice && (
				<p className="ops-notice" role="status" aria-live="polite">
					{notice}
				</p>
			)}

			{report === null && !error && (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			)}

			{report && (
				(report.candidates?.length ?? 0) === 0 ? (
					<p className="ops-empty ops-empty--good">
						Звать некого: все, кто лечился, либо были недавно, либо уже
						записаны. Просмотрено{" "}
						{countLabel(
							report.examinedPatients ?? 0,
							"карточка",
							"карточки",
							"карточек",
						)}
						.
					</p>
				) : (
					<>
						<RecallListMetricsBar
							report={report}
							activeBand={activeBand}
							onSelectBand={setActiveBand}
							onResetLimit={() => setDisplayLimit(40)}
						/>
						<RecallListTable
							candidates={candidateSlice.visibleItems}
							busyPatient={busyPatient}
							called={called}
							onInvite={invite}
							onMarkCalled={markCalled}
							onSelectPatient={(id) => {
								if (typeof appLogic?.setSelectedPatientId === "function") {
									appLogic.setSelectedPatientId(id);
								}
							}}
							clinicName={clinicName}
							hasMore={candidateSlice.hasMore}
							remainingCount={candidateSlice.remainingCount}
							onShowMore={() => setDisplayLimit((prev) => prev + 40)}
						/>
						{report.note && <p className="ops-hint">{report.note}</p>}
					</>
				)
			)}
		</section>
	);
};

export default RecallListPanel;
