/**
 * DENTE Dental CRM — Patient Duplicate Merge Queues Widget
 * Mandate 8b (<= 120 lines Facade), Mandate 8e, Mandate 8n
 */

import type React from "react";
import { DOUBTFUL_BELOW, duplicatePairKey } from "../../lib/patientDuplicatesApi";
import { PatientDuplicateTableRow } from "./patientDuplicates/PatientDuplicateTableRow";
import { usePatientDuplicates } from "./patientDuplicates/usePatientDuplicates";

export const PatientDuplicateMergeQueuesWidget: React.FC = () => {
	const {
		report,
		error,
		loading,
		busyPair,
		notice,
		confirming,
		setConfirming,
		merge,
		dismiss,
	} = usePatientDuplicates();

	return (
		<section
			className="panel ops-panel"
			data-testid="patient-duplicate-merge-queues-widget"
		>
			<div className="panel-heading">
				<h2>Дубли карточек пациентов</h2>
				{report ? (
					<span className="status-pill status-planned">
						просмотрено карточек: {report.examinedPatients}
					</span>
				) : null}
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Список не построен: {error}
				</p>
			) : null}

			{notice ? (
				<p className="ops-notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			{loading && report === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				(report?.candidates ?? []).length === 0 ? (
					<p className="ops-empty ops-empty--good">
						Похожих карточек не найдено: просмотрено {report.examinedPatients}. Картотека чистая.
					</p>
				) : (
					<>
						<div className="ops-table-wrap">
							<table className="ops-table">
								<caption className="sr-only">Пары похожих карточек пациентов</caption>
								<thead>
									<tr>
										<th scope="col">Первая карточка</th>
										<th scope="col">Вторая карточка</th>
										<th scope="col">Чем похожи</th>
										<th scope="col">Что делать</th>
									</tr>
								</thead>
								<tbody>
									{(report?.candidates ?? []).map((candidate) => {
										const key = duplicatePairKey(candidate);
										const doubtful = candidate.confidence < DOUBTFUL_BELOW;
										const isBusy = busyPair === key;
										const pendingConfirm = confirming?.key === key ? confirming : null;

										return (
											<PatientDuplicateTableRow
												key={key}
												candidate={candidate}
												doubtful={doubtful}
												isBusy={isBusy}
												pendingConfirm={pendingConfirm}
												onStartConfirm={(k, keepLeft) => setConfirming({ key: k, keepLeft })}
												onCancelConfirm={() => setConfirming(null)}
												onMerge={merge}
												onDismiss={dismiss}
											/>
										);
									})}
								</tbody>
							</table>
						</div>

						<p className="ops-hint">
							{report.note}
							{report.dismissedPairs > 0
								? ` Скрыто пар по решению «это разные люди»: ${report.dismissedPairs}.`
								: ""}{" "}
							При объединении вторая карточка не удаляется: она остаётся архивной ссылкой на первую, а все записи, оплаты и снимки переносятся.
						</p>
					</>
				)
			) : null}
		</section>
	);
};

export default PatientDuplicateMergeQueuesWidget;
