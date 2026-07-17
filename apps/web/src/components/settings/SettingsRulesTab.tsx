import type {
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ServiceCategory,
	StaffRole,
} from "@dental/shared";
import {
	Activity,
	Library,
	Plus,
	Power,
	PowerOff,
	Settings,
	ShieldCheck,
	Stethoscope,
	Trash2,
} from "lucide-react";
import "./SettingsRulesTab.css";
import type React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

const clinicalRuleOwnerRoles: StaffRole[] = [
	"doctor",
	"assistant",
	"administrator",
	"manager",
];

export function SettingsRulesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCategory,
		newRuleCompletedServiceId,
		newRuleOwnerRole,
		newRulePatientText,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleSpecialty,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		setNewRuleAction,
		setNewRuleBlockedServiceId,
		setNewRuleCategory,
		setNewRuleCompletedServiceId,
		setNewRuleOwnerRole,
		setNewRulePatientText,
		setNewRuleRequiredServiceId,
		setNewRuleSeverity,
		setNewRuleSpecialty,
		setNewRuleTitle,
		setNewRuleTriggerServiceId,
		setNewRuleWarningText,
		submitClinicalRule,
		removeClinicalRule,
		specialtyLabels,
		toggleClinicalRule,
		isClinicalRuleSaving,
		createClinicalRuleFromSettings,
		serviceTitle,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		serviceCategoryLabels,
		staffRoleLabels,
		clinicalRuleSummary,
	} = mergedProps;
	const { typedServiceCatalog, typedClinicalRules } = derivations;

	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<
		ClinicalRuleAction,
		string
	>;
	const typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels,
	) as ClinicalRuleAction[];

	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<
		ClinicalRuleSeverity,
		string
	>;
	const typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels,
	) as ClinicalRuleSeverity[];

	const typedServiceCategoryLabels = serviceCategoryLabels as Record<
		ServiceCategory,
		string
	>;
	const typedServiceCategories = Object.keys(
		typedServiceCategoryLabels,
	) as ServiceCategory[];

	return (
		<div className="rules-studio-container animate-fade-in">
			{/* Dashboard Summary */}
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

			{/* Builder Form */}
			<section className="rules-section-card">
				<div className="rules-section-header">
					<div className="rules-section-icon">
						<Settings size={24} />
					</div>
					<div className="rules-section-title">
						<h3>Конструктор правил</h3>
						<p>Создайте новый триггер, ограничение или обязательный протокол</p>
					</div>
				</div>

				<div className="rules-builder-grid">
					<div className="rules-builder-group full-width">
						<label>
							Название правила
							<input
								className="rules-builder-input"
								placeholder="Например: Обязательный снимок КТ перед имплантацией"
								value={newRuleTitle}
								onChange={(e) => setNewRuleTitle(e.target.value)}
							/>
						</label>
					</div>

					<div className="rules-builder-group">
						<label>
							Действие правила
							<div className="rules-chip-group">
								{typedClinicalRuleActions.map((action) => (
									<button
										key={action}
										type="button"
										className={`rules-chip ${newRuleAction === action ? "active" : ""}`}
										onClick={() => setNewRuleAction(action)}
									>
										{typedClinicalRuleActionLabels[action]}
									</button>
								))}
							</div>
						</label>
					</div>

					<div className="rules-builder-group">
						<label>
							Уровень строгости
							<div className="rules-chip-group">
								{typedClinicalRuleSeverities.map((severity) => (
									<button
										key={severity}
										type="button"
										className={`rules-chip ${newRuleSeverity === severity ? "active" : ""}`}
										onClick={() => setNewRuleSeverity(severity)}
									>
										{typedClinicalRuleSeverityLabels[severity]}
									</button>
								))}
							</div>
						</label>
					</div>

					<div className="rules-builder-group full-width rules-service-grid">
						<div className="rules-service-item">
							<span>🔥 Услуга-триггер</span>
							<input
								className="rules-builder-input"
								type="text"
								list="trigger-services"
								value={
									typedServiceCatalog.find(
										(s) => s.id === newRuleTriggerServiceId,
									)?.title ?? ""
								}
								onChange={(e) => {
									const s = typedServiceCatalog.find(
										(srv) => srv.title === e.target.value,
									);
									setNewRuleTriggerServiceId(s ? s.id : "");
								}}
								placeholder="При планировании этой услуги..."
							/>
						</div>
						<div className="rules-service-item">
							<span>➕ Обязательно добавить</span>
							<input
								className="rules-builder-input"
								type="text"
								list="req-services"
								value={
									typedServiceCatalog.find(
										(s) => s.id === newRuleRequiredServiceId,
									)?.title ?? ""
								}
								onChange={(e) => {
									const s = typedServiceCatalog.find(
										(srv) => srv.title === e.target.value,
									);
									setNewRuleRequiredServiceId(s ? s.id : "");
								}}
								placeholder="Автоматически добавим..."
							/>
						</div>
						<div className="rules-service-item">
							<span>✅ Должно быть завершено</span>
							<input
								className="rules-builder-input"
								type="text"
								list="comp-services"
								value={
									typedServiceCatalog.find(
										(s) => s.id === newRuleCompletedServiceId,
									)?.title ?? ""
								}
								onChange={(e) => {
									const s = typedServiceCatalog.find(
										(srv) => srv.title === e.target.value,
									);
									setNewRuleCompletedServiceId(s ? s.id : "");
								}}
								placeholder="Без этой услуги не дадим продолжить"
							/>
						</div>
						<div className="rules-service-item">
							<span>⛔ Блокировать услугу</span>
							<input
								className="rules-builder-input"
								type="text"
								list="block-services"
								value={
									typedServiceCatalog.find(
										(s) => s.id === newRuleBlockedServiceId,
									)?.title ?? ""
								}
								onChange={(e) => {
									const s = typedServiceCatalog.find(
										(srv) => srv.title === e.target.value,
									);
									setNewRuleBlockedServiceId(s ? s.id : "");
								}}
								placeholder="Запретить эту услугу"
							/>
						</div>
						<datalist id="trigger-services">
							{typedServiceCatalog.map((s) => (
								<option key={s.id} value={s.title} />
							))}
						</datalist>
						<datalist id="req-services">
							{typedServiceCatalog.map((s) => (
								<option key={s.id} value={s.title} />
							))}
						</datalist>
						<datalist id="comp-services">
							{typedServiceCatalog.map((s) => (
								<option key={s.id} value={s.title} />
							))}
						</datalist>
						<datalist id="block-services">
							{typedServiceCatalog.map((s) => (
								<option key={s.id} value={s.title} />
							))}
						</datalist>
					</div>

					<div className="rules-builder-group">
						<label>
							Предупреждение для врача (внутреннее)
							<textarea
								className="rules-builder-textarea"
								value={newRuleWarningText}
								onChange={(e) => setNewRuleWarningText(e.target.value)}
								placeholder="Что увидит врач при срабатывании правила?"
							/>
						</label>
						<div className="rules-chip-group">
							{[
								"Сначала сделайте снимок",
								"Проверьте аллергию",
								"Требуется согласие",
							].map((chip) => (
								<button
									key={chip}
									type="button"
									className="rules-chip"
									onClick={() => setNewRuleWarningText(chip)}
								>
									{chip}
								</button>
							))}
						</div>
					</div>

					<div className="rules-builder-group">
						<label>
							Объяснение для пациента (в плане лечения)
							<textarea
								className="rules-builder-textarea"
								value={newRulePatientText}
								onChange={(e) => setNewRulePatientText(e.target.value)}
								placeholder="Как аргументировать это пациенту?"
							/>
						</label>
						<div className="rules-chip-group">
							{[
								"Обязательное требование Минздрава",
								"Без этого нет гарантии",
								"Для вашей безопасности",
							].map((chip) => (
								<button
									key={chip}
									type="button"
									className="rules-chip"
									onClick={() => setNewRulePatientText(chip)}
								>
									{chip}
								</button>
							))}
						</div>
					</div>

					<div
						className="rules-builder-group full-width"
						style={{ marginTop: "12px" }}
					>
						<button
							className="primary-button"
							style={{
								alignSelf: "flex-start",
								padding: "0 24px",
								height: "44px",
							}}
							type="button"
							onClick={createClinicalRuleFromSettings}
							disabled={isClinicalRuleSaving}
						>
							<ShieldCheck size={18} style={{ marginRight: "8px" }} />
							{isClinicalRuleSaving ? "Сохраняю..." : "Создать правило"}
						</button>
					</div>
				</div>
			</section>

			{/* Rule Library */}
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
					{typedClinicalRules.map((rule) => (
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
									{rule.triggerServiceIds.map((serviceId) => (
										<span key={`${rule.id}-t-${serviceId}`}>
											🔥 Если: {serviceTitle(serviceId)}
										</span>
									))}
									{rule.requiredServiceIds.map((serviceId) => (
										<span key={`${rule.id}-r-${serviceId}`}>
											➕ Добавить: {serviceTitle(serviceId)}
										</span>
									))}
									{rule.requiresCompletedServiceIds.map((serviceId) => (
										<span key={`${rule.id}-c-${serviceId}`}>
											✅ Нужно: {serviceTitle(serviceId)}
										</span>
									))}
									{rule.blockedServiceIds.map((serviceId) => (
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
											<PowerOff size={14} style={{ marginRight: "6px" }} />{" "}
											Выключить
										</>
									) : (
										<>
											<Power size={14} style={{ marginRight: "6px" }} />{" "}
											Включить
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
				</div>
			</section>
		</div>
	);
}
