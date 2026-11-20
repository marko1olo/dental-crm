/**
 * apps/web/src/components/patients/patientCardModalModules/PatientCardModalHeader.tsx
 * Header toolbar and patient status header for PatientCardModal.
 * Mandate 8b: decomposed modular component <= 200 lines.
 */

import React from "react";
import {
	Award, CalendarCheck, Camera, ClipboardList, ExternalLink,
	FileCheck, Plus, Printer, User, X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientModalMode } from "./patientCardModalTypes";

export interface PatientCardModalHeaderProps {
	readonly isCreateMode: boolean;
	readonly mode?: PatientModalMode | undefined;
	readonly patientData: PatientGeneralInfo;
	readonly isChildPatient: boolean;
	readonly isAnySubModalOpen: boolean;
	readonly onSetActiveMode: (mode: PatientModalMode) => void;
	readonly onOpenDiplomaModal: () => void;
	readonly onOpenPhotoModal: () => void;
	readonly onOpenTaxDeductionModal: () => void;
	readonly onOpenMedicalRecordStudio: () => void;
	readonly onPrintBlankContract?: (() => void) | undefined;
	readonly onPrintPatientCard: () => void;
	readonly onClose: () => void;
}

export const PatientCardModalHeader: React.FC<PatientCardModalHeaderProps> = React.memo(
	function PatientCardModalHeader({
		isCreateMode,
		mode,
		patientData,
		isChildPatient,
		isAnySubModalOpen,
		onSetActiveMode,
		onOpenDiplomaModal,
		onOpenPhotoModal,
		onOpenTaxDeductionModal,
		onOpenMedicalRecordStudio,
		onPrintBlankContract,
		onPrintPatientCard,
		onClose,
	}) {
		const handleOpenTax = () => {
			if (
				patientData.fullName?.startsWith("UUID_ANON") ||
				patientData.fullName?.toLowerCase().includes("аноним")
			) {
				showToast(
					"Формирование справки для налогового вычета на анонимных пациентов запрещено: укажите паспортные данные пациента.",
					"error",
					5000,
				);
				return;
			}
			onOpenTaxDeductionModal();
		};

		return (
			<div
				className={`flex items-center justify-between px-3.5 py-2.5 sm:p-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] gap-3 min-w-0 print:hidden ${
					isAnySubModalOpen ? "max-sm:hidden" : ""
				}`}
			>
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--primary,var(--brand-primary))] text-white flex items-center justify-center shrink-0 shadow-2xs">
						<User className="w-4 h-4 sm:w-5 sm:h-5" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
							<h2
								id="patient-card-modal-title"
								data-testid="patient-card-modal-title"
								className="text-sm sm:text-base font-black text-[var(--ink)] m-0 leading-tight whitespace-nowrap"
								title={
									isCreateMode
										? "Первичная регистрация пациента"
										: patientData.fullName || "Медицинская карта пациента"
								}
							>
								<span data-testid="patient-studio-title">
									{isCreateMode
										? "Первичная регистрация пациента"
										: patientData.fullName || "Медицинская карта пациента"}
								</span>
							</h2>
							{!isCreateMode && mode !== "create" && Boolean(patientData.id) && (
								<span
									data-testid="patient-studio-balance"
									className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border shrink-0 ${
										Number(patientData.patientBalanceRub ?? 0) < 0
											? "bg-rose-500/10 text-rose-600 border-rose-500/20"
											: Number(patientData.patientBalanceRub ?? 0) > 0
												? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
												: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									{Number(patientData.patientBalanceRub ?? 0) < 0
										? `-${Math.abs(Number(patientData.patientBalanceRub ?? 0)).toLocaleString("ru-RU")} ₽`
										: `${Number(patientData.patientBalanceRub ?? 0).toLocaleString("ru-RU")} ₽`}
								</span>
							)}
						</div>
						<div className="text-xs text-[var(--muted)] m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-normal">
							{isCreateMode ? (
								<span>Быстрое оформление за 10 секунд без бюрократии</span>
							) : (
								<>
									{patientData.phone ? (
										<span className="font-mono font-medium text-[var(--ink)]">
											Тел: {patientData.phone}
										</span>
									) : (
										<span>Паспортная карточка и клинический статус</span>
									)}
									{patientData.birthDate && <span>• {patientData.birthDate}</span>}
									{(patientData.medicalCardNumber || patientData.cardNumber) && (
										<span>
											• Карта: №{patientData.medicalCardNumber || patientData.cardNumber}
										</span>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Тулбар быстрых действий в шапке (Мандат 8am: компактные secondary-кнопки без карнавала) */}
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
					{!isCreateMode ? (
						<button
							type="button"
							data-testid="patient-studio-new-btn"
							onClick={() => onSetActiveMode("create")}
							className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-0 cursor-pointer shadow-2xs"
							title="Экспресс-регистрация нового пациента"
						>
							<Plus size={14} className="shrink-0" />
							<span className="hidden sm:inline">Новый пациент</span>
						</button>
					) : (
						<button
							type="button"
							onClick={() => onSetActiveMode("view")}
							className="h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] sm:min-h-0"
						>
							Отмена
						</button>
					)}

					{!isCreateMode && isChildPatient && (
						<button
							type="button"
							data-testid="btn-patient-card-diploma"
							onClick={onOpenDiplomaModal}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[32px] h-8 w-8 p-0 text-xs font-semibold rounded-lg items-center justify-center cursor-pointer shrink-0 select-none transition-all shadow-2xs"
							title="Распечатать «Диплом за храбрость» маленькому пациенту"
						>
							<Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
						</button>
					)}

					{!isCreateMode && (
						<button
							type="button"
							data-testid="btn-patient-photo-protocol"
							onClick={onOpenPhotoModal}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[32px] h-8 w-8 p-0 text-xs font-semibold rounded-lg items-center justify-center cursor-pointer shrink-0 select-none transition-all shadow-2xs"
							title="Клинический фотопротокол (12 ракурсов, QR-мост)"
						>
							<Camera className="w-4 h-4 text-[var(--primary)] shrink-0" />
						</button>
					)}

					{!isCreateMode && (
						<button
							type="button"
							data-testid="btn-patient-tax-deduction"
							onClick={handleOpenTax}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[32px] h-8 w-8 p-0 text-xs font-semibold rounded-lg items-center justify-center cursor-pointer shrink-0 select-none transition-all shadow-2xs"
							title="Справка об оплате медицинских услуг для налогового вычета (13%)"
						>
							<FileCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span className="sr-only">Справка для вычета (13%)</span>
						</button>
					)}

					{!isCreateMode && (
						<button
							type="button"
							data-testid="btn-patient-open-emr-studio"
							onClick={onOpenMedicalRecordStudio}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none transition-all shadow-2xs"
							title="Открыть электронную карту (ЭМК)"
						>
							<ClipboardList className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>ЭМК</span>
						</button>
					)}

					{!isCreateMode && (
						<button
							type="button"
							data-testid="btn-patient-recalls-hub"
							onClick={() => {
								window.dispatchEvent(
									new CustomEvent("dente:open-recalls-hub", { detail: { patientId: patientData.id } }),
								);
							}}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none transition-all shadow-2xs"
							title="Плановые профосмотры и профгигиена"
						>
							<CalendarCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>Профосмотры</span>
						</button>
					)}

					{isCreateMode ? (
						<button
							type="button"
							data-testid="patient-creation-print-blank-contract-btn"
							onClick={onPrintBlankContract}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none"
							title="Распечатать чистый бланк договора"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать бланка договора</span>
						</button>
					) : (
						<button
							type="button"
							data-testid="btn-print-patient-card"
							onClick={onPrintPatientCard}
							className="mobile-hide hidden sm:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg h-8 px-2.5 shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[44px] sm:min-h-[32px] text-xs items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none"
							title="Печать карты пациента"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать</span>
						</button>
					)}

					{!isCreateMode && patientData.id && (
						<button
							type="button"
							data-testid="btn-open-patient-workspace"
							onClick={() => {
								usePatientStore.getState().setSelectedPatientId(patientData.id ?? null);
								useAppStore.getState().setCurrentView("patients");
								if (typeof window !== "undefined") window.location.hash = "patients";
								onClose();
							}}
							className="mobile-hide hidden md:inline-flex border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg h-8 w-8 p-0 shadow-2xs hover:border-[var(--line-strong)] transition-colors min-h-[32px] text-xs items-center justify-center cursor-pointer shrink-0 select-none"
							title="Перейти в полную рабочую область пациента (PatientWorkspace)"
						>
							<ExternalLink className="w-4 h-4 shrink-0" />
						</button>
					)}

					<button
						type="button"
						data-testid="btn-close-patient-card-modal"
						onClick={onClose}
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
						aria-label="Закрыть окно"
					>
						<span data-testid="patient-studio-close-btn" className="sr-only">Закрыть</span>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		);
	},
);
