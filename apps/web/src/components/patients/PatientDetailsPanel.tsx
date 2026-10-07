import type {
	Dashboard,
	Patient,
} from "@dental/shared";
import {
	ArrowLeft,
	Clock,
	FileText,
	ShieldCheck,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import React, { lazy, Suspense } from "react";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { PatientAvatar } from "../PatientAvatar";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "./blankContractPrint";
import { PatientAdministrativeForm } from "./PatientAdministrativeForm";
import { PatientOverviewTab } from "./PatientOverviewTab";
import { PatientCardSavePill } from "./patientCardSavePill";
import { PatientCoreEditorForm, type PatientCoreDraft } from "./PatientCoreEditorForm";
import { PatientFamilyAndInsuranceWidget } from "./PatientFamilyAndInsuranceWidget";
import { PatientSecondaryActionsMenu } from "./PatientSecondaryActionsMenu";
import type {
	PatientAdministrativeProfileDraft,
	PatientAdministrativeProfileSaveState,
	PatientCoreSaveState,
	WeekdayOption,
} from "../../PatientsView";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { showToast } from "../GlobalToast";

const VisiographAnalyzer = lazy(() =>
	import("../imaging/VisiographAnalyzer").then((module) => ({
		default: module.VisiographAnalyzer,
	})),
);

export interface PatientDetailsPanelProps {
	readonly selectedPatient: Patient | null | undefined;
	readonly onBackToList: () => void;
	readonly onOpenVisit: () => void;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly patientCoreDraft: PatientCoreDraft;
	readonly updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	readonly patientCoreSaveState: PatientCoreSaveState;
	readonly patientCoreDirty: boolean;
	readonly savePatientCore: () => void;
	readonly patientCoreSaveGuidance: string | null;
	readonly patientCoreSaveGuidanceId: string;
	readonly patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	readonly updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	readonly patientAdministrativeProfileSaveState: PatientAdministrativeProfileSaveState;
	readonly patientAdministrativeProfileDirty: boolean;
	readonly patientAdministrativeProfileValidationMessage: string | null;
	readonly savePatientAdministrativeProfile: () => void;
	readonly patientAdministrativeSaveGuidance: string | null;
	readonly patientAdministrativeSaveGuidanceId: string;
	readonly weekdayOptions: WeekdayOption[];
	readonly normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	readonly dashboard?: Dashboard | null | undefined;
	readonly executePatientSomaticNorm: () => void;
	readonly executeBookAppointment: () => void;
}

export function PatientDetailsPanel({
	selectedPatient,
	onBackToList,
	onOpenVisit,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	patientCoreDraft,
	updatePatientCoreDraft,
	patientCoreSaveState,
	patientCoreDirty,
	savePatientCore,
	patientCoreSaveGuidance,
	patientCoreSaveGuidanceId,
	patientAdministrativeProfileDraft,
	updatePatientAdministrativeProfileDraft,
	patientAdministrativeProfileSaveState,
	patientAdministrativeProfileDirty,
	patientAdministrativeProfileValidationMessage,
	savePatientAdministrativeProfile,
	patientAdministrativeSaveGuidance,
	patientAdministrativeSaveGuidanceId,
	weekdayOptions,
	normalizeOptionalWorkingDaysDraft,
	dashboard,
	executePatientSomaticNorm,
	executeBookAppointment,
}: PatientDetailsPanelProps) {
	const patientBalance = Number(
		(selectedPatient as any)?.balanceRub ??
			(selectedPatient as any)?.balance ??
			0,
	);

	const nextPatientAppointment = React.useMemo(() => {
		if (!selectedPatient?.id || !dashboard?.appointments) return null;
		const nowTime = Date.now();
		const upcoming = (
			dashboard.appointments as Array<{
				id: string;
				patientId?: string;
				startsAt?: string;
				status?: string;
				reason?: string;
			}>
		)
			.filter(
				(a) =>
					a.patientId === selectedPatient.id &&
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= nowTime - 60 * 60 * 1000,
			)
			.sort(
				(a, b) =>
					new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
			);
		return upcoming[0] || null;
	}, [selectedPatient?.id, dashboard?.appointments]);

	return (
		<section
			className="patient-admin-panel max-md:!bg-transparent max-md:!border-none max-md:!shadow-none max-md:!p-2 max-md:!rounded-none pb-6"
			aria-label="Карточка активного пациента"
		>
			{/* Mobile back to list navigation header */}
			<div className="patient-mobile-back-header md:hidden flex items-center justify-between gap-2 flex-wrap w-full mb-3">
				<button
					type="button"
					className="mobile-back-to-list-btn min-h-[36px] h-9 px-3 py-1.5"
					onClick={onBackToList}
					aria-label="Вернуться к списку пациентов"
				>
					<ArrowLeft size={15} aria-hidden="true" />
					<span>← Назад</span>
				</button>
				{selectedPatient && (
					<div className="flex items-center gap-1.5 flex-wrap shrink-0">
						<button
							type="button"
							onClick={onOpenVisit}
							className="min-h-[34px] h-8 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer shrink-0"
							title="Открыть приём"
							data-testid="patient-mobile-header-open-visit-btn"
						>
							<Stethoscope size={13} aria-hidden="true" />
							<span>Приём</span>
						</button>
						<button
							type="button"
							onClick={() =>
								void printBlankMedicalContract(selectedPatient)
							}
							className="min-h-[34px] h-8 px-2 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer shrink-0"
							title="Распечатать бланк договора"
							data-testid="patient-mobile-header-print-contract-btn"
						>
							<FileText size={13} aria-hidden="true" />
							<span>Договор</span>
						</button>
						<button
							type="button"
							onClick={() =>
								void printBlankMedicalConsent(selectedPatient)
							}
							className="min-h-[34px] h-8 px-2 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer shrink-0"
							title="Распечатать бланк ИДС"
							data-testid="patient-mobile-header-print-consent-btn"
						>
							<ShieldCheck size={13} aria-hidden="true" />
							<span>ИДС</span>
						</button>
					</div>
				)}
			</div>

			<div
				className="panel-heading compact-heading flex flex-col gap-1.5"
				style={{
					borderBottom: "none",
					paddingBottom: "0",
					marginBottom: "8px",
				}}
			>
				<div className="flex flex-wrap items-center justify-between gap-2.5 w-full min-w-0">
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						{selectedPatient && (
							<PatientAvatar
								fullName={selectedPatient.fullName}
								size={36}
							/>
						)}
						<span
							className="break-words min-w-0 max-w-full sm:max-w-md leading-tight text-sm sm:text-base font-bold text-[var(--ink)]"
							title={selectedPatient ? selectedPatient.fullName : undefined}
						>
							{selectedPatient
								? selectedPatient.fullName
								: "Карточка пациента"}
						</span>
					</div>

					<div className="shrink-0 max-w-full">
						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{
									dirty: patientCoreDirty,
									saveState: patientCoreSaveState,
								},
								{
									dirty: patientAdministrativeProfileDirty,
									saveState: patientAdministrativeProfileSaveState,
								},
							]}
						/>
					</div>
				</div>

				{selectedPatient && (
					<div
						className="flex items-center gap-1.5 flex-wrap w-full pt-0.5 pb-0.5 select-none relative"
						data-testid="patient-quick-actions-toolbar"
					>
						{/* Primary CTA 1: Сохранить данные */}
						<button
							type="button"
							onClick={savePatientCore}
							aria-busy={patientCoreSaveState === "saving" || undefined}
							aria-describedby={
								patientCoreSaveGuidance
									? patientCoreSaveGuidanceId
									: undefined
							}
							disabled={patientCoreSaveState === "saving"}
							className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-xs"
							title="Сохранить изменения в карточке пациента"
							data-testid="patient-core-save-btn"
						>
							<UserCheck size={13} aria-hidden="true" />
							<span>Сохранить</span>
						</button>

						{/* Primary CTA 2: Открыть приём */}
						<button
							type="button"
							onClick={onOpenVisit}
							disabled={false}
							className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors bg-[var(--teal-soft)] hover:bg-[var(--teal-surface)] text-[var(--teal-dark)] dark:text-[var(--teal)] border border-[var(--teal)]/30"
							title="Открыть приём"
							data-testid="patient-card-open-visit-btn"
						>
							<Stethoscope
								size={13}
								aria-hidden="true"
								className="text-[var(--teal)] shrink-0"
							/>
							<span>Приём</span>
						</button>

						{/* 1-Click Next Appointment */}
						{nextPatientAppointment && (
							<button
								type="button"
								onClick={() => {
									useScheduleStore
										.getState()
										.setScheduleDateFilter(
											nextPatientAppointment.startsAt?.split("T")[0] ||
												new Date().toISOString().split("T")[0],
										);
									useAppStore.getState().setCurrentView("schedule");
									showToast(
										`Переход в расписание на приём: ${selectedPatient.fullName}`,
										"info",
									);
								}}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 py-1.5 rounded-lg bg-[var(--teal-soft)] hover:bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal)]/30 font-semibold inline-flex items-center gap-1.5 cursor-pointer text-xs shrink-0 transition-colors"
								title={`Следующий приём: ${new Date(nextPatientAppointment.startsAt!).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
								data-testid="patient-quick-next-appointment-btn"
							>
								<Clock size={12} className="shrink-0" />
								<span>
									Приём:{" "}
									{new Date(
										nextPatientAppointment.startsAt!,
									).toLocaleDateString("ru-RU", {
										day: "numeric",
										month: "short",
									})}{" "}
									{new Date(
										nextPatientAppointment.startsAt!,
									).toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</button>
						)}

						{/* Secondary Actions Dropdown (...) */}
						<PatientSecondaryActionsMenu
							selectedPatient={selectedPatient}
							patientBalance={patientBalance}
							onOpenPatientCardModal={onOpenPatientCardModal}
							onOpenLoyaltyModal={onOpenLoyaltyModal}
							executePatientSomaticNorm={executePatientSomaticNorm}
							executeBookAppointment={executeBookAppointment}
						/>
					</div>
				)}
			</div>

			{/* Core Info Form (Subcomponent) */}
			<PatientCoreEditorForm
				patientCoreDraft={patientCoreDraft}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>

			{patientCoreSaveGuidance ? (
				<p
					className="patient-save-guidance"
					id={patientCoreSaveGuidanceId}
					role="status"
					aria-live="polite"
				>
					{patientCoreSaveGuidance}
				</p>
			) : null}

			{/* Subcomponent: Family Account, Balance & DMS/OMS Insurance Widget */}
			{selectedPatient ? (
				<PatientFamilyAndInsuranceWidget
					patient={selectedPatient}
					patientBalance={patientBalance}
					insurancePolicyNumber={patientAdministrativeProfileDraft.insurancePolicyNumber}
					onUpdateInsurancePolicy={(policy) =>
						updatePatientAdministrativeProfileDraft("insurancePolicyNumber", policy)
					}
				/>
			) : null}

			{/* PROMINENT OVERVIEW TAB: FAMILY, LOYALTY, RECLAMATIONS, ORTHODONTIC, TIMELINE, ARCHIVE */}
			{selectedPatient ? (
				<div
					style={{ marginTop: "16px" }}
					data-testid="patient-overview-tab"
				>
					<PatientOverviewTab />
				</div>
			) : null}

			{/* Clinical Tools: Odontogram & 2D X-Ray Analyzer */}
			{selectedPatient ? (
				<div style={{ marginTop: "16px", marginBottom: "12px" }}>
					<OdontogramModule patientId={selectedPatient.id} />
				</div>
			) : null}

			<Suspense fallback={null}>
				<VisiographAnalyzer />
			</Suspense>

			{/* Administrative / Passport Documents Collapsible */}
			<details
				className="settings-advanced-block patient-docs-collapsible"
				style={{ marginTop: "16px" }}
			>
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label">
						<span className="settings-advanced-icon">
							<FileText
								size={16}
								className="text-teal-600 dark:text-teal-400"
								aria-hidden="true"
							/>
						</span>
						Паспортные данные и реквизиты документов
					</span>
					<span className="settings-advanced-hint">
						Паспорт, ИНН, СНИЛС, представитель, договор
					</span>
					<span className="settings-advanced-chevron"> </span>
				</summary>
				<div className="settings-advanced-form">
					<div
						className="panel-heading compact-heading patient-doc-heading"
						style={{
							borderBottom: "none",
							paddingBottom: "0",
							marginBottom: "8px",
						}}
					>
						<div>
							<span
								style={{
									fontSize: "14px",
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Документы и СНИЛС
							</span>
						</div>
						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{
									dirty: patientAdministrativeProfileDirty,
									saveState: patientAdministrativeProfileSaveState,
									validationMessage:
										patientAdministrativeProfileValidationMessage,
								},
							]}
						/>
					</div>
					{patientAdministrativeProfileValidationMessage ? (
						<p className="save-error patient-admin-validation">
							{patientAdministrativeProfileValidationMessage}
						</p>
					) : null}

					<PatientAdministrativeForm
						patientAdministrativeProfileDraft={
							patientAdministrativeProfileDraft
						}
						updatePatientAdministrativeProfileDraft={
							updatePatientAdministrativeProfileDraft
						}
						weekdayOptions={weekdayOptions}
						normalizeOptionalWorkingDaysDraft={
							normalizeOptionalWorkingDaysDraft
						}
					/>

					<div
						className="patient-admin-actions"
						style={{
							marginTop: "12px",
							display: "flex",
							justifyContent: "flex-start",
						}}
					>
						<button
							className="primary-button"
							type="button"
							onClick={savePatientAdministrativeProfile}
							aria-busy={
								patientAdministrativeProfileSaveState === "saving" ||
								undefined
							}
							aria-describedby={
								patientAdministrativeSaveGuidance
									? patientAdministrativeSaveGuidanceId
									: undefined
							}
							disabled={patientAdministrativeProfileSaveState === "saving"}
							style={{ minHeight: "36px" }}
							data-testid="patient-admin-save-btn"
						>
							<ShieldCheck size={16} aria-hidden="true" /> Сохранить
							реквизиты
						</button>
					</div>
					{patientAdministrativeSaveGuidance ? (
						<p
							className="patient-save-guidance"
							id={patientAdministrativeSaveGuidanceId}
							role="status"
							aria-live="polite"
						>
							{patientAdministrativeSaveGuidance}
						</p>
					) : null}
				</div>
			</details>

			{/* FAB clearance bottom spacer */}
			<div
				className="h-24 w-full shrink-0 pointer-events-none"
				aria-hidden="true"
			/>
		</section>
	);
}
