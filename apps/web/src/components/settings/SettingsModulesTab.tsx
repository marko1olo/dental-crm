import { Blocks, ToggleLeft, Activity, Briefcase, Pill, Stethoscope, LineChart, Banknote, ShieldAlert } from "lucide-react";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function SettingsModulesTab() {
	const {
		hasPayrollModule,
		hasMarketingModule,
		hasAnalyticsModule,
		hasAssistants,
		hasDentalLab,
		hasInsuranceCoPay,
		hasInstallments,
		hasOrthodontics,
		hasTasks,
		hasReclamations,
		hasPediatricMode,
		setFlag,
	} = useWorkspaceProfileStore();

	return (
		<section className="settings-zone animate-fade-in" id="settings-modules">
			<header className="zone-header">
				<div className="zone-title-group">
					<div className="zone-icon-box">
						<Blocks aria-hidden="true" />
					</div>
					<div className="zone-title-text">
						<h2>Модули и функции</h2>
						<p>Включайте только те инструменты, которые нужны вашей клинике</p>
					</div>
				</div>
			</header>

			<div className="settings-grid">
				{/* Основные модули */}
				<div className="settings-card">
					<div className="card-header">
						<h3><Briefcase aria-hidden="true" size={18} /> Системные модули</h3>
						<p>Крупные разделы CRM</p>
					</div>
					<div className="card-body form-stack">
						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Расчет ЗП (Payroll)</span>
								<span className="toggle-description">
									Комиссии врачей, оклады и автоматический расчет смен
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasPayrollModule}
								onChange={(e) => setFlag("hasPayrollModule", e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Сквозная аналитика (Marketing)</span>
								<span className="toggle-description">
									Интеграция с рекламными каналами, LTV и ROMI
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasMarketingModule}
								onChange={(e) => setFlag("hasMarketingModule", e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">BI Дашборды (Analytics)</span>
								<span className="toggle-description">
									Продвинутые отчеты и графики загрузки клиники
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasAnalyticsModule}
								onChange={(e) => setFlag("hasAnalyticsModule", e.target.checked)}
								className="toggle-switch"
							/>
						</label>
						
						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Детский прием</span>
								<span className="toggle-description">
									Детская зубная формула, анимация и особые протоколы
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasPediatricMode}
								onChange={(e) => setFlag("hasPediatricMode", e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Клинические функции */}
				<div className="settings-card">
					<div className="card-header">
						<h3><Stethoscope aria-hidden="true" size={18} /> Клинические функции</h3>
						<p>Узкие специальности и лаборатория</p>
					</div>
					<div className="card-body form-stack">
						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Своя зуботехническая лаборатория</span>
								<span className="toggle-description">
									Наряды техникам, статусы изготовления коронок
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasDentalLab}
								onChange={(e) => setFlag("hasDentalLab", e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Ортодонтия</span>
								<span className="toggle-description">
									График активации брекетов, галерея прогресса
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasOrthodontics}
								onChange={(e) => setFlag("hasOrthodontics", e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Ассистенты в смене</span>
								<span className="toggle-description">
									Учет рабочего времени ассистентов и их привязка к креслу
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasAssistants}
								onChange={(e) => setFlag("hasAssistants", e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Финансовые инструменты */}
				<div className="settings-card">
					<div className="card-header">
						<h3><Banknote aria-hidden="true" size={18} /> Финансовые инструменты</h3>
						<p>Оплаты и гарантии</p>
					</div>
					<div className="card-body form-stack">
						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Страховые и ДМС</span>
								<span className="toggle-description">
									Частичная оплата и реестры страховых компаний
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasInsuranceCoPay}
								onChange={(e) => setFlag("hasInsuranceCoPay", e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Рассрочка на лечение</span>
								<span className="toggle-description">
									График платежей для комплексных планов
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasInstallments}
								onChange={(e) => setFlag("hasInstallments", e.target.checked)}
								className="toggle-switch"
							/>
						</label>
						
						<label className="toggle-row">
							<div className="toggle-text">
								<span className="toggle-title">Рекламации</span>
								<span className="toggle-description">
									Учет гарантийных переделок и списаний
								</span>
							</div>
							<input
								type="checkbox"
								checked={hasReclamations}
								onChange={(e) => setFlag("hasReclamations", e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>
			</div>
		</section>
	);
}
