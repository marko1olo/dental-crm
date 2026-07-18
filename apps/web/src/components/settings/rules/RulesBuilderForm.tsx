import { Settings, ShieldCheck } from "lucide-react";

export function RulesBuilderForm({ mergedProps, derivations }: { mergedProps: any; derivations: any }) {
	const {
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCompletedServiceId,
		newRulePatientText,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		setNewRuleAction,
		setNewRuleBlockedServiceId,
		setNewRuleCompletedServiceId,
		setNewRulePatientText,
		setNewRuleRequiredServiceId,
		setNewRuleSeverity,
		setNewRuleTitle,
		setNewRuleTriggerServiceId,
		setNewRuleWarningText,
		isClinicalRuleSaving,
		createClinicalRuleFromSettings,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
	} = mergedProps;

	const { typedServiceCatalog } = derivations;

	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<string, string>;
	const typedClinicalRuleActions = Object.keys(typedClinicalRuleActionLabels);

	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<string, string>;
	const typedClinicalRuleSeverities = Object.keys(typedClinicalRuleSeverityLabels);

	return (
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
								typedServiceCatalog.find((s: any) => s.id === newRuleTriggerServiceId)?.title ?? ""
							}
							onChange={(e) => {
								const s = typedServiceCatalog.find((srv: any) => srv.title === e.target.value);
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
								typedServiceCatalog.find((s: any) => s.id === newRuleRequiredServiceId)?.title ?? ""
							}
							onChange={(e) => {
								const s = typedServiceCatalog.find((srv: any) => srv.title === e.target.value);
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
								typedServiceCatalog.find((s: any) => s.id === newRuleCompletedServiceId)?.title ?? ""
							}
							onChange={(e) => {
								const s = typedServiceCatalog.find((srv: any) => srv.title === e.target.value);
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
								typedServiceCatalog.find((s: any) => s.id === newRuleBlockedServiceId)?.title ?? ""
							}
							onChange={(e) => {
								const s = typedServiceCatalog.find((srv: any) => srv.title === e.target.value);
								setNewRuleBlockedServiceId(s ? s.id : "");
							}}
							placeholder="Запретить эту услугу"
						/>
					</div>
					<datalist id="trigger-services">
						{typedServiceCatalog.map((s: any) => (
							<option key={s.id} value={s.title} />
						))}
					</datalist>
					<datalist id="req-services">
						{typedServiceCatalog.map((s: any) => (
							<option key={s.id} value={s.title} />
						))}
					</datalist>
					<datalist id="comp-services">
						{typedServiceCatalog.map((s: any) => (
							<option key={s.id} value={s.title} />
						))}
					</datalist>
					<datalist id="block-services">
						{typedServiceCatalog.map((s: any) => (
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
	);
}
