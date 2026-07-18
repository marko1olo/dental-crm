import { Activity } from "lucide-react";

export function RulesDashboardSummary({ dashboard }: { dashboard: any }) {
	return (
		<section className="rules-section-card">
			<div className="rules-section-header">
				<div className="rules-section-icon">
					<Activity size={24} />
				</div>
				<div className="rules-section-title">
					<h3>Панель управления правилами</h3>
					<p>Сводка активности автоматических протоколов и ограничений</p>
				</div>
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "16px",
				}}
			>
				<div
					style={{
						padding: "16px",
						background: "var(--paper-soft)",
						borderRadius: "12px",
						border: "1px solid var(--line)",
					}}
				>
					<span
						style={{
							fontSize: "13px",
							color: "var(--muted)",
							fontWeight: 600,
						}}
					>
						Активные правила
					</span>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							color: "var(--teal)",
							margin: "4px 0",
						}}
					>
						{dashboard.clinicalRuleSummary.activeRules}
					</div>
					<p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
						из {dashboard.clinicalRules.length} в библиотеке
					</p>
				</div>
				<div
					style={{
						padding: "16px",
						background:
							dashboard.clinicalRuleSummary.blockers > 0
								? "rgba(239, 68, 68, 0.05)"
								: "var(--paper-soft)",
						borderRadius: "12px",
						border:
							dashboard.clinicalRuleSummary.blockers > 0
								? "1px solid rgba(239, 68, 68, 0.2)"
								: "1px solid var(--line)",
					}}
				>
					<span
						style={{
							fontSize: "13px",
							color:
								dashboard.clinicalRuleSummary.blockers > 0
									? "rgb(220, 38, 38)"
									: "var(--muted)",
							fontWeight: 600,
						}}
					>
						Блокировки и Важное
					</span>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							color:
								dashboard.clinicalRuleSummary.blockers > 0
									? "rgb(220, 38, 38)"
									: "var(--ink)",
							margin: "4px 0",
						}}
					>
						{dashboard.clinicalRuleSummary.blockers}
					</div>
					<p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
						{dashboard.clinicalRuleSummary.unresolved} нерешенных оценок
					</p>
				</div>
				<div
					style={{
						padding: "16px",
						background: "var(--paper-soft)",
						borderRadius: "12px",
						border: "1px solid var(--line)",
					}}
				>
					<span
						style={{
							fontSize: "13px",
							color: "var(--muted)",
							fontWeight: 600,
						}}
					>
						Обязательные услуги
					</span>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							color: "var(--ink)",
							margin: "4px 0",
						}}
					>
						{dashboard.clinicalRuleSummary.requiredServices}
					</div>
					<p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
						добавлено в планы лечения
					</p>
				</div>
			</div>
		</section>
	);
}
