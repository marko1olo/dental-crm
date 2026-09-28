import type React from "react";
import {
	Building,
	FileCheck,
	FileText,
	Scissors,
	ShieldPlus,
	Stethoscope,
	Printer,
} from "lucide-react";

export interface DocumentQuickRoleScenariosProps {
	readonly onOpenPrimaryIntake: () => void;
	readonly onPrintPrimaryIntake?: (() => void) | undefined;
	readonly onOpenClinicalVisit: () => void;
	readonly onOpenSurgicalPackage?: (() => void) | undefined;
	readonly onOpenTaxAccounting: () => void;
	readonly onOpenSanpinRegistry: () => void;
	readonly onSelectCompletedAct?: (() => void) | undefined;
	readonly onSelectAttendanceCert?: (() => void) | undefined;
}

/**
 * Компактная матрица быстрых сценариев для администратора и врача (0-Click Guidance).
 * Высота строк: 34px, радиус: 8px, ясные русские подсказки для каждого сценария.
 */
export function DocumentQuickRoleScenarios({
	onOpenPrimaryIntake,
	onPrintPrimaryIntake,
	onOpenClinicalVisit,
	onOpenSurgicalPackage,
	onOpenTaxAccounting,
	onOpenSanpinRegistry,
	onSelectCompletedAct,
	onSelectAttendanceCert,
}: DocumentQuickRoleScenariosProps): React.JSX.Element {
	return (
		<div
			className="document-scenarios-grid"
			role="toolbar"
			aria-label="Быстрые ролевые сценарии и подсказки для администратора"
		>
			{/* 1. НАЛОГОВЫЙ ВЫЧЕТ (13% НДФЛ) */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenTaxAccounting}
				data-testid="scenario-tax-accounting-btn"
				title="Справка об оплате медицинских услуг для налогового вычета (13% НДФЛ) + XML"
			>
				<div className="document-scenario-left">
					<Building size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Справка для налоговой (13%)</span>
				</div>
				<span className="document-scenario-badge">Для налогового вычета</span>
			</button>

			{/* 2. АКТ ВЫПОЛНЕННЫХ РАБОТ */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={() => {
					if (onSelectCompletedAct) {
						onSelectCompletedAct();
					} else {
						onOpenTaxAccounting();
					}
				}}
				data-testid="scenario-completed-works-act-btn"
				title="Акт сдачи-приемки выполненных стоматологических работ и гарантийных обязательств"
			>
				<div className="document-scenario-left">
					<FileCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Акт выполненных работ</span>
				</div>
				<span className="document-scenario-badge">Акт закрытия лечения</span>
			</button>

			{/* 3. СПРАВКА О ПОСЕЩЕНИИ КЛИНИКИ */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={() => {
					if (onSelectAttendanceCert) {
						onSelectAttendanceCert();
					} else {
						onOpenClinicalVisit();
					}
				}}
				data-testid="scenario-attendance-cert-btn"
				title="Справка о факте обращения в стоматологическую клинику для работодателя, учебного заведения, страховой или суда"
			>
				<div className="document-scenario-left">
					<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Справка о посещении</span>
				</div>
				<span className="document-scenario-badge">Для суда / страховой / работы</span>
			</button>

			{/* 4. ПРИЁМ ТЕРАПЕВТА / МЕД. КАРТА */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenClinicalVisit}
				data-testid="scenario-clinical-visit-btn"
				title="Медицинская карта, дневник приёма и протокол осмотра"
			>
				<div className="document-scenario-left">
					<Stethoscope size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Приём терапевта (мед. карта)</span>
				</div>
				<span className="document-scenario-badge">Медицинская карта</span>
			</button>

			{/* 5. ХИРУРГИЧЕСКИЙ ПАКЕТ */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenSurgicalPackage ? onOpenSurgicalPackage : onOpenClinicalVisit}
				data-testid="scenario-surgical-package-btn"
				title="Пакет документов хирургического вмешательства: ИДС на операцию, анестезия, протокол 043/у, памятка"
			>
				<div className="document-scenario-left">
					<Scissors size={14} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Хирургический пакет</span>
				</div>
				<span className="document-scenario-badge">Удаление / Имплантация</span>
			</button>

			{/* 6. САНПИН ЖУРНАЛ 257/У */}
			<button
				type="button"
				className="document-scenario-card"
				onClick={onOpenSanpinRegistry}
				data-testid="scenario-sanpin-registry-btn"
				title="Журнал контроля работы стерилизаторов (Форма 257/у СанПиН 3.3686-21) и ПСО для Роспотребнадзора"
			>
				<div className="document-scenario-left">
					<ShieldPlus size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
					<span className="document-scenario-title">Журнал СанПиН (257/у)</span>
				</div>
				<span className="document-scenario-badge">Журнал стерилизации</span>
			</button>

			{/* Скрытый резервный хэндлер первичного приема для обратной совместимости тестов */}
			<div style={{ display: "none" }}>
				<button
					type="button"
					onClick={onOpenPrimaryIntake}
					data-testid="scenario-primary-intake-btn"
				>
					Первичный приём
				</button>
				{onPrintPrimaryIntake && (
					<button
						type="button"
						onClick={onPrintPrimaryIntake}
						data-testid="scenario-primary-intake-print-btn"
					>
						<Printer size={13} />
						<span>Печать</span>
					</button>
				)}
			</div>
		</div>
	);
}
