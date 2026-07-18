import { SlidersHorizontal } from "lucide-react";

export function AuditLocalBridgePanel({
	localBridgeStatusState,
	localBridgeReadiness,
	localBridgeUsePlans,
}: {
	localBridgeStatusState: string;
	localBridgeReadiness: any;
	localBridgeUsePlans: any;
}) {
	const typedLocalBridgeReadiness = localBridgeReadiness as any;
	const localBridgeStatusValue =
		localBridgeStatusState === "ready"
			? "Готово"
			: localBridgeStatusState === "degraded"
				? "Ограничено"
				: "Отключено";
	const typedLocalBridgeUsePlans = localBridgeUsePlans as any;

	return (
		<div className="panel bridge-panel">
			<div className="panel-heading">
				<h2>Модули рабочей станции</h2>
				<span className={`status-pill status-${localBridgeStatusState}`}>
					{localBridgeStatusValue}
				</span>
			</div>
			<div className="ops-list">
				<div className="local-bridge-grid">
					{(typedLocalBridgeReadiness?.bridges || []).map((bridge: any) => (
						<article key={bridge.kind} className="ops-row">
							<SlidersHorizontal aria-hidden="true" />
							<div>
								<h3>{bridge.localBridgeEndpointSummary}</h3>
								<p>
									Граница: {bridge.privacyBoundary} | Задержка:{" "}
									{bridge.latencyMs}мс
								</p>
							</div>
							<span>{bridge.warning ? "Внимание" : "Норма"}</span>
						</article>
					))}
				</div>
				{typedLocalBridgeUsePlans ? (
					<div className="local-bridge-plan-grid">
						{(typedLocalBridgeUsePlans.plans || []).map((plan: any) => (
							<article key={plan.scenario} className="ops-row">
								<SlidersHorizontal aria-hidden="true" />
								<div>
									<h3>Сценарий: {plan.scenario}</h3>
									<p>
										Блокировка врача: {plan.doctorBlocking ? "Да" : "Нет"}
									</p>
								</div>
								<span>Надежность: {plan.confidence * 100}%</span>
							</article>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
