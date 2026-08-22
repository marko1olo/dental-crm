import type React from "react";
import { ArrowRight, FileCheck, Stethoscope, Building, ShieldPlus, Scissors } from "lucide-react";

export interface DocumentQuickRoleScenariosProps {
	readonly onOpenPrimaryIntake: () => void;
	readonly onOpenClinicalVisit: () => void;
	readonly onOpenSurgicalPackage?: (() => void) | undefined;
	readonly onOpenTaxAccounting: () => void;
	readonly onOpenHospitalSanpin: () => void;
}

export function DocumentQuickRoleScenarios({
	onOpenPrimaryIntake,
	onOpenClinicalVisit,
	onOpenSurgicalPackage,
	onOpenTaxAccounting,
	onOpenHospitalSanpin,
}: DocumentQuickRoleScenariosProps): React.JSX.Element {
	return (
		<section
			className="document-scenarios-grid"
			aria-label="Быстрые ролевые сценарии в 1 клик"
		>
			{/* 1. ЭКСПРЕСС-ПАКЕТ ПЕРВИЧНОГО ПАЦИЕНТА */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenPrimaryIntake}
				data-testid="scenario-primary-intake-btn"
			>
				<div className="document-scenario-card-header">
					<div className="document-scenario-icon-title">
						<span className="document-scenario-icon">🚀</span>
						<span>Первичный пациент</span>
					</div>
					<span className="document-scenario-badge">4 документа</span>
				</div>
				<p className="document-scenario-desc">
					Договор (Пост. 736) + ИДС (323-ФЗ) + Согласие ОПД (152-ФЗ) + Анкета здоровья
				</p>
				<div className="document-scenario-footer">
					<span>Сформировать пакет</span>
					<ArrowRight size={14} aria-hidden="true" />
				</div>
			</button>

			{/* 2. ХИРУРГИЧЕСКИЙ ПАКЕТ ПРИЁМА И ОПЕРАЦИЙ */}
			{onOpenSurgicalPackage && (
				<button
					type="button"
					className="document-scenario-card"
					onClick={onOpenSurgicalPackage}
					data-testid="scenario-surgical-package-btn"
				>
					<div className="document-scenario-card-header">
						<div className="document-scenario-icon-title">
							<span className="document-scenario-icon">🔪</span>
							<span>Хирургический пакет</span>
						</div>
						<span className="document-scenario-badge">6 документов</span>
					</div>
					<p className="document-scenario-desc">
						ИДС хирургия + Анестезия + Протокол 043/у + КЛКТ + Рецепт 107-1/у + Памятка
					</p>
					<div className="document-scenario-footer">
						<span>Хирургический пакет</span>
						<ArrowRight size={14} aria-hidden="true" />
					</div>
				</button>
			)}

			{/* 3. КЛИНИЧЕСКИЙ ПАКЕТ ПРИЁМА ВРАЧА */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenClinicalVisit}
				data-testid="scenario-clinical-visit-btn"
			>
				<div className="document-scenario-card-header">
					<div className="document-scenario-icon-title">
						<span className="document-scenario-icon">🩺</span>
						<span>Приём терапевта</span>
					</div>
					<span className="document-scenario-badge">5 документов</span>
				</div>
				<p className="document-scenario-desc">
					Карта 043/у (Приказ 834н) + SOAP + Рецепт 107-1/у + КЛКТ/ОПТГ + Памятка
				</p>
				<div className="document-scenario-footer">
					<span>Клинический пакет</span>
					<ArrowRight size={14} aria-hidden="true" />
				</div>
			</button>

			{/* 4. НАЛОГОВЫЙ ВЫЧЕТ И БУХГАЛТЕРИЯ */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenTaxAccounting}
				data-testid="scenario-tax-accounting-btn"
			>
				<div className="document-scenario-card-header">
					<div className="document-scenario-icon-title">
						<span className="document-scenario-icon">🏛️</span>
						<span>Налоговый вычет</span>
					</div>
					<span className="document-scenario-badge">3 документа</span>
				</div>
				<p className="document-scenario-desc">
					Справка ИФНС (КНД 1151156) + Акт выполненных работ + Чеки оплат + XML
				</p>
				<div className="document-scenario-footer">
					<span>Налоговый пакет</span>
					<ArrowRight size={14} aria-hidden="true" />
				</div>
			</button>

			{/* 5. ГОСПИТАЛИЗАЦИЯ, САНПИН И ЭКСПЕРТИЗА */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenHospitalSanpin}
				data-testid="scenario-hospital-sanpin-btn"
			>
				<div className="document-scenario-card-header">
					<div className="document-scenario-icon-title">
						<span className="document-scenario-icon">🏥</span>
						<span>СанПиН и Экспертиза</span>
					</div>
					<span className="document-scenario-badge">4 бланка</span>
				</div>
				<p className="document-scenario-desc">
					Направление 057/у-04 + Больничный ЭЛН 1089н + Дозы 2.6.1 + Автоклав 257/у
				</p>
				<div className="document-scenario-footer">
					<span>СанПиН и Госпитализация</span>
					<ArrowRight size={14} aria-hidden="true" />
				</div>
			</button>
		</section>
	);
}
