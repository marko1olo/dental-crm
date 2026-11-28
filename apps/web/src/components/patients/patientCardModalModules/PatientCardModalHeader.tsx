/**
 * apps/web/src/components/patients/patientCardModalModules/PatientCardModalHeader.tsx
 * Header toolbar and patient status header for PatientCardModal.
 * Mandate 8b: decomposed modular component <= 200 lines.
 */

import React, { useEffect, useRef, useState } from "react";
import {
	Award, CalendarCheck, Camera, ClipboardList, ExternalLink,
	FileCheck, MoreHorizontal, Plus, Printer, User, X,
} from "lucide-react";
import { formatKopecksToRub, rublesToKopecks } from "@dental/shared";
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
		const [isMoreOpen, setIsMoreOpen] = useState(false);
		const moreRef = useRef<HTMLDivElement | null>(null);

		useEffect(() => {
			if (!isMoreOpen) return;
			const onDocClick = (e: MouseEvent) => {
				if (moreRef.current && e.target instanceof Node && !moreRef.current.contains(e.target)) {
					setIsMoreOpen(false);
				}
			};
			const onKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") setIsMoreOpen(false);
			};
			document.addEventListener("mousedown", onDocClick);
			document.addEventListener("keydown", onKeyDown);
			return () => {
				document.removeEventListener("mousedown", onDocClick);
				document.removeEventListener("keydown", onKeyDown);
			};
		}, [isMoreOpen]);

		const rawBalanceKopecks =
			typeof patientData.balanceKopecks === "number" && Number.isFinite(patientData.balanceKopecks)
				? Math.trunc(patientData.balanceKopecks)
				: rublesToKopecks(Number(patientData.patientBalanceRub ?? 0));

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
				className={`flex flex-wrap sm:flex-nowrap items-center justify-between px-4 sm:px-6 min-h-14 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] gap-2.5 sm:gap-3 min-w-0 shrink-0 print:hidden ${
					isAnySubModalOpen ? "max-sm:hidden" : ""
				}`}
			>
				<div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 order-1">
					<div className="w-9 h-9 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center shrink-0">
						<User className="w-4 h-4 shrink-0" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
							<h2
								id="patient-card-modal-title"
								data-testid="patient-card-modal-title"
								className="text-base font-semibold tracking-tight text-[var(--ink)] m-0 leading-tight truncate min-w-0"
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
									className={`h-6 px-2 text-xs font-mono font-medium tracking-tight text-right tabular-nums rounded-full border inline-flex items-center shrink-0 ${
										rawBalanceKopecks < 0
											? "bg-[var(--danger-soft)] text-[var(--danger-ink)] border-[var(--danger-line)]"
											: rawBalanceKopecks > 0
												? "bg-[var(--success-soft)] text-[var(--success-ink)] border-[var(--success-line)]"
												: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]"
									}`}
								>
									{formatKopecksToRub(rawBalanceKopecks)}
								</span>
							)}
						</div>
						<div className="text-xs text-[var(--ink-muted)] m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-normal truncate">
							{isCreateMode ? (
								<span>Быстрое оформление пациента без лишних полей</span>
							) : (
								<>
									{patientData.phone ? (
										<span className="font-mono font-medium text-[var(--ink)] whitespace-nowrap">
											Тел: {patientData.phone}
										</span>
									) : (
										<span>Паспортная карточка и клинический статус</span>
									)}
									{patientData.birthDate && <span className="whitespace-nowrap">• {patientData.birthDate}</span>}
									{(patientData.medicalCardNumber || patientData.cardNumber) && (
										<span className="whitespace-nowrap">
											• Карта: №{patientData.medicalCardNumber || patientData.cardNumber}
										</span>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Единая кнопка закрытия в DOM: на mobile справа в 1-й строке (order-2), на desktop в правом краю (sm:order-3) */}
				<button
					type="button"
					data-testid="btn-close-patient-card-modal"
					onClick={onClose}
					className="order-2 sm:order-3 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] h-11 w-11 sm:h-9 sm:w-9 rounded-xl sm:rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть окно"
				>
					<span data-testid="patient-studio-close-btn" className="sr-only">Закрыть</span>
					<X className="w-4 h-4 shrink-0" />
				</button>

				{/* Шапка действий: Secondary переходы + меню «... Ещё» (единственная Primary CTA — «Сохранить» в футере) */}
				<div className="order-3 sm:order-2 flex items-center gap-2 shrink-0 w-full sm:w-auto">
					{!isCreateMode ? (
						<>
							<button
								type="button"
								data-testid="btn-patient-open-emr-studio"
								onClick={onOpenMedicalRecordStudio}
								className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] h-11 sm:h-9 min-h-[44px] sm:min-h-0 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer max-sm:flex-1 sm:flex-none shrink-0 shadow-xs transition-colors"
								title="Открыть электронную карту (ЭМК)"
							>
								<ClipboardList className="w-4 h-4 shrink-0" />
								<span>ЭМК</span>
							</button>

							<button
								type="button"
								data-testid="patient-studio-new-btn"
								onClick={() => onSetActiveMode("create")}
								className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] h-11 sm:h-9 min-h-[44px] sm:min-h-0 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer max-sm:flex-1 sm:flex-none shrink-0 transition-colors"
								title="Регистрация нового пациента"
							>
								<Plus className="w-4 h-4 shrink-0" />
								<span className="sm:hidden">Новый</span>
								<span className="hidden sm:inline">Новый пациент</span>
							</button>

							<div className="relative shrink-0" ref={moreRef}>
								<button
									type="button"
									data-testid="btn-patient-header-more"
									onClick={() => setIsMoreOpen((prev) => !prev)}
									aria-expanded={isMoreOpen}
									aria-haspopup="menu"
									className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] h-11 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 px-3 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 transition-colors"
									title="Дополнительные действия с картой пациента"
								>
									<MoreHorizontal className="w-4 h-4 shrink-0" />
									<span className="hidden md:inline">Ещё</span>
								</button>

								{isMoreOpen && (
									<div
										role="menu"
										className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl z-50 py-1.5 text-sm text-[var(--ink)]"
									>
										<button
											type="button"
											role="menuitem"
											data-testid="btn-print-patient-card"
											onClick={() => {
												setIsMoreOpen(false);
												onPrintPatientCard();
											}}
											className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer"
										>
											<Printer className="w-4 h-4 shrink-0" />
											<span>Печать карты</span>
										</button>

										<button
											type="button"
											role="menuitem"
											data-testid="btn-patient-recalls-hub"
											onClick={() => {
												setIsMoreOpen(false);
												window.dispatchEvent(
													new CustomEvent("dente:open-recalls-hub", { detail: { patientId: patientData.id } }),
												);
											}}
											className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer"
										>
											<CalendarCheck className="w-4 h-4 shrink-0" />
											<span>Профосмотры</span>
										</button>

										<button
											type="button"
											role="menuitem"
											data-testid="btn-patient-photo-protocol"
											onClick={() => {
												setIsMoreOpen(false);
												onOpenPhotoModal();
											}}
											className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer"
										>
											<Camera className="w-4 h-4 shrink-0" />
											<span>Фотопротокол</span>
										</button>

										<button
											type="button"
											role="menuitem"
											data-testid="btn-patient-tax-deduction"
											onClick={() => {
												setIsMoreOpen(false);
												handleOpenTax();
											}}
											className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer"
										>
											<FileCheck className="w-4 h-4 shrink-0" />
											<span>Справка для вычета (13%)</span>
										</button>

										{isChildPatient && (
											<button
												type="button"
												role="menuitem"
												data-testid="btn-patient-card-diploma"
												onClick={() => {
													setIsMoreOpen(false);
													onOpenDiplomaModal();
												}}
												className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer"
											>
												<Award className="w-4 h-4 shrink-0" />
												<span>Диплом за храбрость</span>
											</button>
										)}

										{patientData.id && (
											<button
												type="button"
												role="menuitem"
												data-testid="btn-open-patient-workspace"
												onClick={() => {
													setIsMoreOpen(false);
													usePatientStore.getState().setSelectedPatientId(patientData.id ?? null);
													useAppStore.getState().setCurrentView("patients");
													onClose();
												}}
												className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer border-t border-[var(--line-subtle)] mt-1 pt-1"
											>
												<ExternalLink className="w-4 h-4 shrink-0" />
												<span>Открыть в «Пациентах»</span>
											</button>
										)}
									</div>
								)}
							</div>
						</>
					) : (
						<>
							<button
								type="button"
								data-testid="patient-creation-print-blank-contract-btn"
								onClick={onPrintBlankContract}
								className="hidden sm:inline-flex bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] h-9 px-3.5 rounded-lg text-sm font-medium items-center justify-center gap-2 cursor-pointer shrink-0 transition-colors"
								title="Распечатать чистый бланк договора"
							>
								<Printer className="w-4 h-4 shrink-0" />
								<span>Бланк договора</span>
							</button>

							<button
								type="button"
								onClick={() => onSetActiveMode("view")}
								className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] h-11 sm:h-9 min-h-[44px] sm:min-h-0 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
							>
								Отмена
							</button>
						</>
					)}
				</div>
			</div>
		);
	},
);
