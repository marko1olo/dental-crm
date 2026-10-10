import {
	Activity,
	Camera,
	Eye,
	FileSpreadsheet,
	FileText,
	Gift,
	MoreVertical,
	Plus,
	Printer,
	Receipt,
	Shield,
	UserCheck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "../blankContractPrint";
import type { WorkspaceTabKey } from "./types";

export interface PatientWorkspaceToolbarProps {
	patientId: string;
	patientName?: string | null | undefined;
	dashboard?: any;
	onOpenPlan?: ((planId: string) => void) | undefined;
	handleCreateNewPlanCallback: () => void;
	setActiveTab: (tab: WorkspaceTabKey) => void;
	setIsCbctModalOpen: (v: boolean) => void;
	setIsPhotoProtocolOpen: (v: boolean) => void;
	setIsOrthoPhotoModalOpen: (v: boolean) => void;
	setIsLoyaltyModalOpen: (v: boolean) => void;
	setIsDmsLetterOpen: (v: boolean) => void;
	setIsDmsRegistryOpen: (v: boolean) => void;
}

export const PatientWorkspaceToolbar: React.FC<PatientWorkspaceToolbarProps> = React.memo(
	({
		patientId,
		patientName,
		dashboard,
		onOpenPlan,
		handleCreateNewPlanCallback,
		setActiveTab,
		setIsCbctModalOpen,
		setIsPhotoProtocolOpen,
		setIsOrthoPhotoModalOpen,
		setIsLoyaltyModalOpen,
		setIsDmsLetterOpen,
		setIsDmsRegistryOpen,
	}) => {
		const appLogic = useAppLogicContext();
		const [isDocsMenuOpen, setIsDocsMenuOpen] = useState(false);
		const docsMenuRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					docsMenuRef.current &&
					!docsMenuRef.current.contains(event.target as Node)
				) {
					setIsDocsMenuOpen(false);
				}
			};
			if (isDocsMenuOpen) {
				document.addEventListener("mousedown", handleClickOutside);
			}
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}, [isDocsMenuOpen]);

		return (
			<div className="flex items-center gap-1.5 flex-wrap">
				{/* Первичная кнопка прямого действия 1: «+ Новый визит» */}
				<button
					type="button"
					className="primary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-xs"
					onClick={() => {
						if (patientId) {
							appLogic?.setSelectedPatientId?.(patientId);
						}
						window.location.hash = "visit";
					}}
					title="Создать новый клинический визит для пациента"
					data-testid="btn-patient-create-visit"
				>
					<Plus className="w-3.5 h-3.5 shrink-0" />
					<span>Новый визит</span>
				</button>

				{/* Первичная кнопка прямого действия 2: «+ План лечения» */}
				<button
					type="button"
					className="secondary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
					onClick={() => {
						setActiveTab("plans");
						if (onOpenPlan) {
							onOpenPlan("new");
						} else {
							handleCreateNewPlanCallback();
						}
					}}
					title="Составить новый план лечения или открыть раздел планов"
					data-testid="btn-patient-create-treatment-plan"
				>
					<Plus className="w-3.5 h-3.5 shrink-0" />
					<span>План лечения</span>
				</button>

				{/* Вторичные действия: аккуратное выпадающее меню [⋮ Документы и ДМС] */}
				<div
					className="relative inline-block text-left"
					ref={docsMenuRef}
				>
					<button
						type="button"
						className="secondary-button min-h-[34px] h-8 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
						onClick={() => setIsDocsMenuOpen((prev) => !prev)}
						title="Документы, ДМС и программа лояльности"
						aria-haspopup="true"
						aria-expanded={isDocsMenuOpen}
						data-testid="btn-patient-docs-dms-menu"
					>
						<MoreVertical className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">Документы и ДМС</span>
					</button>

					{isDocsMenuOpen && (
						<div
							className="absolute right-0 mt-1 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
							role="menu"
							data-testid="patient-docs-dms-dropdown"
						>
							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
									}
									window.location.hash = "patients";
								}}
								title="Открыть медицинскую карту пациента"
								data-testid="patient-workspace-open-043u-btn"
							>
								{/* Карта пациента (043/у) - амбулаторный стандарт стоматологии */}
								<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
								<span>Медицинская карта</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									if (typeof window !== "undefined") {
										window.print();
									}
									showToast(
										"Печать и экспорт медицинской карты запущены",
										"info",
									);
								}}
								title="Распечатать медицинскую карту пациента"
								data-testid="patient-workspace-print-043u-btn"
							>
								<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Печать медицинской карты</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
									}
									window.location.hash = "finance";
								}}
								title="Открыть счета, услуги и кассу"
								data-testid="patient-workspace-open-finance-btn"
							>
								<Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Счета и касса</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									showToast(
										"Семейный баланс и распределение авансов",
										"info",
									);
								}}
								title="Семейный баланс и распределение авансовых платежей"
								data-testid="patient-workspace-family-balance-btn"
							>
								<UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
								<span>Семейный баланс</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors text-cyan-700 dark:text-cyan-300"
								onClick={() => {
									setIsDocsMenuOpen(false);
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
										usePatientStore.getState().setSelectedPatientId(patientId);
									}
									setIsCbctModalOpen(true);
								}}
								title="Открыть 3D КЛКТ / КТ-исследование (MPR & Имплантация)"
								data-testid="patient-workspace-open-cbct-modal-btn"
							>
								<Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
								<span>3D КТ / КЛКТ Студия</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
										usePatientStore.getState().setSelectedPatientId(patientId);
									}
									window.location.hash = "imaging";
								}}
								title="Открыть рентгенологические и КТ исследования"
								data-testid="patient-workspace-open-radiology-btn"
							>
								<Camera className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Рентген и КТ снимки</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									setIsPhotoProtocolOpen(true);
								}}
								title="Открыть клинический фотопротокол (12/8/6/3 слота, сравнение До/После и VITA шкала)"
								data-testid="patient-workspace-open-photo-protocol-btn"
							>
								<Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Фотопротокол & До/После</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									setIsOrthoPhotoModalOpen(true);
								}}
								title="Открыть ортодонтический фотопротокол (8 стандартных клинических проекций)"
								data-testid="patient-workspace-open-ortho-photo-btn"
							>
								<Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span>Орто-фотопротокол (8 проекций)</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									setIsLoyaltyModalOpen(true);
								}}
								title="Программа лояльности и бонусы"
								data-testid="open-loyalty-program-modal-btn"
							>
								<Gift className="w-4 h-4 text-amber-500 shrink-0" />
								<span>Программа лояльности</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									setIsDmsLetterOpen(true);
								}}
								title="Управление полисами ДМС и гарантийными письмами"
								data-testid="patient-dms-manager-btn"
							>
								<Shield className="w-4 h-4 text-[var(--teal)] shrink-0" />
								<span>Управление ДМС</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									setIsDmsRegistryOpen(true);
								}}
								title="Экспорт реестра услуг ДМС"
								data-testid="patient-dms-registry-btn"
							>
								<FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
								<span>Реестр ДМС</span>
							</button>

							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									void printBlankMedicalContract(
										{ id: patientId, fullName: patientName },
										{
											clinicName:
												dashboard?.clinicSettings?.profile?.legalName,
										},
									);
								}}
								title="Распечатать пустой договор со строками _______ для ручного заполнения"
								data-testid="patient-print-blank-contract-btn"
							>
								<FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
								<span>Бланк договора (_______)</span>
							</button>
							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-teal-500/10 text-teal-900 dark:text-teal-200 flex items-center gap-2 cursor-pointer transition-colors"
								onClick={() => {
									setIsDocsMenuOpen(false);
									void printBlankMedicalConsent(
										{ id: patientId, fullName: patientName },
										{
											clinicName:
												dashboard?.clinicSettings?.profile?.legalName,
										},
									);
								}}
								title="Распечатать пустой бланк ИДС со строками _______ для ручного заполнения"
								data-testid="patient-print-blank-consent-btn"
							>
								<Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Бланк ИДС / согласий (_______)</span>
							</button>
						</div>
					)}
				</div>
			</div>
		);
	},
);
PatientWorkspaceToolbar.displayName = "PatientWorkspaceToolbar";
