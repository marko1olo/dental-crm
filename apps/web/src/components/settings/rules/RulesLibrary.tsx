import { Library, Power, PowerOff, ShieldCheck, Trash2 } from "lucide-react";

export function RulesLibrary({ mergedProps, derivations }: { mergedProps: any; derivations: any }) {
	const {
		toggleClinicalRule,
		removeClinicalRule,
		isClinicalRuleSaving,
		serviceTitle,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
	} = mergedProps;

	const { typedClinicalRules } = derivations;

	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<string, string>;
	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<string, string>;

	return (
		<section className="rules-section-card">
			<div className="rules-section-header">
				<div className="rules-section-icon">
					<Library size={24} />
				</div>
				<div className="rules-section-title">
					<h3>Библиотека правил</h3>
					<p>Управление активными и отключенными протоколами</p>
				</div>
			</div>

			<div className="rules-library-grid">
				{typedClinicalRules.map((rule: any) => (
					<article
						className={`premium-rule-card severity-${rule.severity} ${rule.active ? "" : "disabled"}`}
						key={rule.id}
					>
						<div className="premium-rule-header">
							<div className="premium-rule-title">
								<h4>{rule.title}</h4>
								<div className="premium-rule-badges">
									<span className="status-pill status-neutral">
										{typedClinicalRuleSeverityLabels[rule.severity]}
									</span>
									<span className="status-pill status-confirmed">
										{typedClinicalRuleActionLabels[rule.action]}
									</span>
								</div>
							</div>
						</div>

						<div className="premium-rule-body">
							<p>
								<strong>Для врача:</strong>{" "}
								{rule.warningText || "Нет предупреждения"}
							</p>
							<div className="premium-rule-conditions">
								{rule.triggerServiceIds.map((serviceId: string) => (
									<span key={`${rule.id}-t-${serviceId}`}>
										🔥 Если: {serviceTitle(serviceId)}
									</span>
								))}
								{rule.requiredServiceIds.map((serviceId: string) => (
									<span key={`${rule.id}-r-${serviceId}`}>
										➕ Добавить: {serviceTitle(serviceId)}
									</span>
								))}
								{rule.requiresCompletedServiceIds.map((serviceId: string) => (
									<span key={`${rule.id}-c-${serviceId}`}>
										✅ Нужно: {serviceTitle(serviceId)}
									</span>
								))}
								{rule.blockedServiceIds.map((serviceId: string) => (
									<span className="blocked" key={`${rule.id}-b-${serviceId}`}>
										⛔ Блок: {serviceTitle(serviceId)}
									</span>
								))}
							</div>
							{rule.patientText && (
								<p style={{ marginTop: "4px", fontSize: "12px" }}>
									<strong>Пациенту:</strong> {rule.patientText}
								</p>
							)}
						</div>

						<div className="premium-rule-actions">
							<button
								className="secondary-button btn--sm"
								type="button"
								onClick={() => toggleClinicalRule(rule)}
								disabled={isClinicalRuleSaving}
							>
								{rule.active ? (
									<>
										<PowerOff size={14} style={{ marginRight: "6px" }} /> Выключить
									</>
								) : (
									<>
										<Power size={14} style={{ marginRight: "6px" }} /> Включить
									</>
								)}
							</button>
							<button
								className="icon-button"
								style={{ color: "var(--danger-color)" }}
								type="button"
								onClick={() => removeClinicalRule(rule.id)}
								disabled={isClinicalRuleSaving}
								title="Удалить правило"
							>
								<Trash2 size={16} />
							</button>
						</div>
					</article>
				))}
				{typedClinicalRules.length === 0 && (
					<div className="rules-empty-state">
						<ShieldCheck size={32} style={{ opacity: 0.3 }} />
						<p>Правил пока нет. Создайте первое правило выше.</p>
					</div>
				)}
			</div>
		</section>
	);
}
