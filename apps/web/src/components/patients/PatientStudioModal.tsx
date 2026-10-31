/**
 * PatientStudioModal.tsx — Канонический фасад студии картотеки пациентов, экспресс-регистрации
 * у стойки ресепшн и семейного баланса в DENTE CRM.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): экспресс-регистрация за 10 секунд (ФИО + телефон).
 *   Кнопка «Сохранить» НИКОГДА не блокируется (disabled={false}). Ноль требований паспорта до кресла врача.
 * - Мандат 8n (Семейный баланс в 1 клик): единый семейный кошелек родственников, покрытие долгов без бюрократии.
 * - Мандат 8am (Единый дизайн-код): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран!
 * - Apple HIG (390×844): стиль iOS Contacts, нативный Bottom Sheet, сенсорные зоны >= 44×44px, 0px horizontal scroll.
 * - Мандат 8b / 8zi (Sweet Spot: 100–160 строк).
 */

import React from "react";
import { createPortal } from "react-dom";
import type { PatientCatalogItem } from "./patientCatalogData";
import {
	usePatientStudioState,
	PatientStudioHeader,
	PatientExpressRegistrationForm,
	PatientProfileDetailView,
	PatientStudioFooterActions,
} from "./studioModal";

export interface PatientStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | null;
	readonly initialMode?: "view" | "edit" | "create";
	readonly onSavePatient?: (patient: PatientCatalogItem) => void;
	readonly onNewAppointment?: (patientId: string) => void;
	readonly className?: string;
}

export const PatientStudioModal: React.FC<PatientStudioModalProps> = React.memo(
	function PatientStudioModal({
		isOpen,
		onClose,
		initialPatientId,
		initialMode = "view",
		onSavePatient,
		onNewAppointment,
	}) {
		const {
			currentPatient,
			currentFamily,
			mode,
			setMode,
			activeTab,
			setActiveTab,
			searchQuery,
			setSearchQuery,
			filteredPatients,
			showDocFields,
			setShowDocFields,
			guidanceMessage,
			draftName,
			setDraftName,
			draftPhone,
			setDraftPhone,
			draftBirthDate,
			setDraftBirthDate,
			draftCategory,
			setDraftCategory,
			draftIsSomaticNorm,
			setDraftIsSomaticNorm,
			draftNotes,
			setDraftNotes,
			draftPassportSeries,
			setDraftPassportSeries,
			draftPassportNumber,
			setDraftPassportNumber,
			draftSnils,
			setDraftSnils,
			nameInputRef,
			phoneInputRef,
			handleStartCreate,
			handleSelectPatient,
			handleSave,
			handlePayDebtFromRelative,
		} = usePatientStudioState({
			initialPatientId,
			initialMode,
			onSavePatient,
		});

		if (!isOpen) return null;

		const modalContent = (
			<div
				className="patient-studio-overlay fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-x-clip"
				data-testid="patient-studio-modal"
			>
				<div
					className="patient-studio-card w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
					role="dialog"
					aria-modal="true"
					aria-labelledby="patient-studio-title"
				>
					{/* Apple HIG iOS Handle for mobile */}
					<div className="sm:hidden pt-2 pb-1 flex justify-center">
						<div className="w-9 h-1 bg-[var(--line-strong)] rounded-full" />
					</div>

					{/* 1-Строчная эргономичная шапка студии с поиском и табами */}
					<PatientStudioHeader
						mode={mode}
						currentPatient={currentPatient}
						activeTab={activeTab}
						onSelectTab={setActiveTab}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						filteredPatients={filteredPatients}
						onSelectPatient={handleSelectPatient}
						onStartCreate={handleStartCreate}
						onCancelCreate={() => setMode("view")}
						onClose={onClose}
					/>

					{/* Основное скроллируемое тело */}
					<div className="patient-studio-body flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
						{mode === "create" ? (
							<PatientExpressRegistrationForm
								draftName={draftName}
								onDraftNameChange={setDraftName}
								draftPhone={draftPhone}
								onDraftPhoneChange={setDraftPhone}
								draftBirthDate={draftBirthDate}
								onDraftBirthDateChange={setDraftBirthDate}
								draftCategory={draftCategory}
								onDraftCategoryChange={setDraftCategory}
								draftIsSomaticNorm={draftIsSomaticNorm}
								onDraftIsSomaticNormChange={setDraftIsSomaticNorm}
								draftNotes={draftNotes}
								onDraftNotesChange={setDraftNotes}
								draftPassportSeries={draftPassportSeries}
								onDraftPassportSeriesChange={setDraftPassportSeries}
								draftPassportNumber={draftPassportNumber}
								onDraftPassportNumberChange={setDraftPassportNumber}
								draftSnils={draftSnils}
								onDraftSnilsChange={setDraftSnils}
								showDocFields={showDocFields}
								onToggleDocFields={() => setShowDocFields((prev) => !prev)}
								guidanceMessage={guidanceMessage}
								nameInputRef={nameInputRef}
								phoneInputRef={phoneInputRef}
							/>
						) : (
							<PatientProfileDetailView
								currentPatient={currentPatient}
								currentFamily={currentFamily}
								activeTab={activeTab}
								onPayDebtFromRelative={handlePayDebtFromRelative}
							/>
						)}
					</div>

					{/* Floating Bottom Bar со стеклянным размытием и РОВНО ОДНОЙ Primary CTA (Мандат 8am, 8e) */}
					<PatientStudioFooterActions
						mode={mode}
						currentPatient={currentPatient}
						onSave={handleSave}
						onNewAppointment={onNewAppointment}
					/>
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
	},
);

export default PatientStudioModal;
