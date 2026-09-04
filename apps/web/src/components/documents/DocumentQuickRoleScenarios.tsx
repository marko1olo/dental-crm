import type React from "react";
import { ArrowRight, FileCheck, Stethoscope, Building, ShieldPlus, Scissors, Printer } from "lucide-react";

export interface DocumentQuickRoleScenariosProps {
	readonly onOpenPrimaryIntake: () => void;
	readonly onPrintPrimaryIntake?: (() => void) | undefined;
	readonly onOpenClinicalVisit: () => void;
	readonly onOpenSurgicalPackage?: (() => void) | undefined;
	readonly onOpenTaxAccounting: () => void;
	readonly onOpenHospitalSanpin: () => void;
}

export function DocumentQuickRoleScenarios({
	onOpenPrimaryIntake,
	onPrintPrimaryIntake,
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
						<span className="document-scenario-icon"><FileCheck className="w-5 h-5 text-teal-600" /></span>
						<span>Первичный пациент</span>
					</div>
					<span className="document-scenario-badge">4 документа</span>
				</div>
				<p className="document-scenario-desc">
					Договор (Пост. 736) + ИДС (323-ФЗ) + Согласие ОПД (152-ФЗ) + Анкета здоровья
				</p>
				<div className="document-scenario-footer">
					<div className="flex items-center gap-2">
						{onPrintPrimaryIntake && (
							<button
								type="button"
								className="scenario-quick-print-btn"
								onClick={(e) => {
									e.stopPropagation();
									onPrintPrimaryIntake();
								}}
								title="Сформировать и напечатать пакет первичного приёма (Договор + общий ИДС + согласие ОПД) в 1 клик"
								data-testid="scenario-primary-intake-print-btn"
							>
								<Printer size={13} aria-hidden="true" />
								<span>Печать (1 клик)</span>
							</button>
						)}
						<span>Сформировать пакет</span>
					</div>
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
							<span className="document-scenario-icon"><Scissors className="w-5 h-5 text-rose-600" /></span>
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
						<span className="document-scenario-icon"><Stethoscope className="w-5 h-5 text-teal-600" /></span>
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
						<span className="document-scenario-icon"><Building className="w-5 h-5 text-indigo-600" /></span>
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
						<span className="document-scenario-icon"><ShieldPlus className="w-5 h-5 text-emerald-600" /></span>
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
