import React, { useCallback, useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	Coins,
	CreditCard,
	ExternalLink,
	FileCheck,
	FileText,
	HeartPulse,
	History,
	MapPin,
	Megaphone,
	Phone,
	Plus,
	ShieldAlert,
	ShieldCheck,
	Stethoscope,
	Tag,
	User,
	Users,
	Wallet,
} from "lucide-react";
import {
	STOMX_MARKETING_SOURCES_CATALOG,
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
} from "@dental/shared";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../safetyMath";
import {
	formatOmsPolicy,
	formatPhoneNumber,
	formatRussianPassport,
	formatSnils,
	formatTaxpayerInn,
} from "../../../utils/inputSanitation";
import { SomaticAnamnesisCard } from "../../clinical/SomaticAnamnesisCard";

export {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
};

export type IdentityDocType =
	| "passport_rf"
	| "birth_certificate"
	| "foreign_passport"
	| "residence_permit"
	| "other";

export const IDENTITY_DOCUMENT_TYPES: Array<{
	readonly code: IdentityDocType;
	readonly labelRu: string;
}> = [
	{ code: "passport_rf", labelRu: "Паспорт гражданина РФ" },
	{ code: "birth_certificate", labelRu: "Свидетельство о рождении" },
	{ code: "foreign_passport", labelRu: "Заграничный паспорт" },
	{ code: "residence_permit", labelRu: "Вид на жительство (ВНЖ)" },
	{ code: "other", labelRu: "Иной документ" },
] as const;

export const REGISTRY_SERVICE_TAGS = [
	"Сложный пациент",
	"Всегда опаздывает",
	"Только утренние часы",
	"Только вечерние часы",
	"Звонить за 2 часа",
	"VIP-пациент",
	"Тревожный / Дентофобия",
	"Строго без задержек",
] as const;

export const DOCTOR_CLINICAL_TAGS = [
	"Дентофобия (страх бормашины)",
	"Выраженный рвотный рефлекс",
	"Аллергическая настороженность",
	"Особенности прикуса / ВНЧС",
	"Беременность / Лактация",
	"Бруксизм",
	"Атипичная реакция на анестезию",
] as const;

export const POPULAR_DMS_COMPANIES = [
	"СОГАЗ",
	"Ингосстрах",
	"АльфаСтрахование",
	"РЕСО-Гарантия",
	"ВСК",
	"Согласие",
	"Ренессанс Страхование",
] as const;

export interface PatientVisitHistoryItem {
	id: string;
	date: string;
	time?: string;
	doctorName: string;
	specialty: string;
	status: "completed" | "scheduled" | "cancelled" | "in_progress";
	services: string;
	amountRub: number;
	toothNumber?: string;
}

export interface PatientGeneralInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	gender?: "male" | "female" | "other" | string | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	inn?: string | null | undefined;
	omsPolicyNumber?: string | null | undefined;
	notes?: string | null | undefined;
	acquisitionSource?: string | null | undefined;

	// 1. Паспортные данные (для договоров и чеков)
	docType?: IdentityDocType | string | null | undefined;
	passportSeries?: string | null | undefined;
	passportNumber?: string | null | undefined;
	passportIssuedBy?: string | null | undefined;
	passportDepartmentCode?: string | null | undefined;
	passportIssuedDate?: string | null | undefined;
	registrationAddress?: string | null | undefined;
	residentialAddress?: string | null | undefined;
	addressesMatch?: boolean | null | undefined;

	// 2. Государственная и страховая идентификация
	dmsInsuranceCompany?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	dmsProgramName?: string | null | undefined;

	// 3. Заметки и особенности обслуживания
	registryNotes?: string | null | undefined;
	doctorClinicalNotes?: string | null | undefined;
	serviceAlertTags?: string[] | null | undefined;

	// 4. Краткая история приёмов и финансовый статус
	patientBalanceRub?: number | string | null | undefined;
	familyBalanceRub?: number | string | null | undefined;
	familyGroupId?: string | null | undefined;
	familyGroupName?: string | null | undefined;
	visitsHistory?: PatientVisitHistoryItem[] | null | undefined;

	// 5. Законные представители и семейные связи
	representativeType?: string | null | undefined;
	representativeFullName?: string | null | undefined;
	representativePhone?: string | null | undefined;
	representativeDoc?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
	dataProcessingBasisNote?: string | null | undefined;
}

export interface PatientGeneralInfoTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	onApplySomaticNorm?: (() => void) | undefined;
	disabled?: boolean | undefined;
	activeSection?: "all" | "general" | "somatic" | "visits" | "family" | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
}

/**
 * PatientGeneralInfoTab — Комплексная амбулаторная витрина пациента:
 * 1. Основные и паспортные данные (для договоров, чеков по 54-ФЗ и согласий).
 * 2. Государственная и страховая идентификация (СНИЛС для справки в ФНС КНД 1151156, ОМС, ДМС).
 * 3. Заметки и особенности обслуживания (регистратура + клинические особенности врача).
 * 4. История приёмов и финансовый статус (личный и семейный депозит/задолженность).
 * 5. Законные представители и семейные связи (ст. 20 323-ФЗ, ст. 64 СК РФ).
 */
export const PatientGeneralInfoTab: React.FC<PatientGeneralInfoTabProps> = React.memo(
	function PatientGeneralInfoTab({
		patient,
		safetyProfile = DEFAULT_SOMATIC_HEALTHY_NORM,
		onUpdatePatient,
		onUpdateSafetyProfile,
		onApplySomaticNorm,
		disabled = false,
		activeSection = "all",
		onNavigateToVisit,
		onNewAppointment,
	}) {
		const currentProfile = safetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;
		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(currentProfile);
		}, [currentProfile]);

		const [addressesMatchState, setAddressesMatchState] = useState<boolean>(() => {
			if (typeof patient?.addressesMatch === "boolean") return patient.addressesMatch;
			if (!patient?.residentialAddress) return true;
			return patient.residentialAddress === (patient.registrationAddress || patient.address);
		});

		const selectedRep = useMemo(() => {
			if (!patient?.representativeType) return null;
			return (
				STOMX_REPRESENTATIVE_CATALOG.find(
					(r) => r.nameRu === patient.representativeType || r.code === patient.representativeType,
				) ?? null
			);
		}, [patient?.representativeType]);

		const handleToggleAllergy = useCallback(
			(field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => {
				if (disabled) return;
				const updated: PatientClinicalSafetyProfile = {
					...currentProfile,
					[field]: !currentProfile[field],
				};
				if (onUpdateSafetyProfile) {
					onUpdateSafetyProfile(updated);
				}
			},
			[currentProfile, disabled, onUpdateSafetyProfile],
		);

		const handleToggleServiceTag = useCallback(
			(tag: string) => {
				if (disabled) return;
				const currentTags = Array.isArray(patient?.serviceAlertTags) ? patient.serviceAlertTags : [];
				const exists = currentTags.includes(tag);
				const updatedTags = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
				onUpdatePatient?.("serviceAlertTags", updatedTags);

				// Также синхронизируем с текстовой заметкой для регистратуры при добавлении
				if (!exists) {
					const existingNotes = (patient?.registryNotes ?? patient?.notes ?? "").trim();
					const newNotes = existingNotes ? `${existingNotes}; ${tag}` : tag;
					onUpdatePatient?.("registryNotes", newNotes);
					onUpdatePatient?.("notes", newNotes);
				}
			},
			[disabled, patient?.serviceAlertTags, patient?.registryNotes, patient?.notes, onUpdatePatient],
		);

		const handleAppendDoctorTag = useCallback(
			(tag: string) => {
				if (disabled) return;
				const existingNotes = (patient?.doctorClinicalNotes ?? "").trim();
				if (existingNotes.includes(tag)) return;
				const newNotes = existingNotes ? `${existingNotes}; ${tag}` : tag;
				onUpdatePatient?.("doctorClinicalNotes", newNotes);
			},
			[disabled, patient?.doctorClinicalNotes, onUpdatePatient],
		);

		// Демонстрационная и реальная история визитов пациента
		const visitsList: PatientVisitHistoryItem[] = useMemo(() => {
			if (patient?.visitsHistory && patient.visitsHistory.length > 0) {
				return patient.visitsHistory;
			}
			if (!patient?.id) {
				return [];
			}
			return [
				{
					id: "v-01",
					date: "18.09.2026",
					time: "14:00",
					doctorName: "Смирнова А.В.",
					specialty: "Врач-стоматолог-терапевт",
					status: "completed",
					services: "Лечение кариеса 1.6 (Estelite Asteria), RVG-снимок",
					amountRub: 6500,
					toothNumber: "1.6",
				},
				{
					id: "v-02",
					date: "04.08.2026",
					time: "11:30",
					doctorName: "Ковалёв Д.И.",
					specialty: "Хирург-имплантолог",
					status: "completed",
					services: "Консультация хирурга, КЛКТ обеих челюстей",
					amountRub: 4200,
				},
				{
					id: "v-03",
					date: "28.09.2026",
					time: "16:00",
					doctorName: "Смирнова А.В.",
					specialty: "Врач-стоматолог-терапевт",
					status: "scheduled",
					services: "Комплексная профессиональная гигиена Air-Flow",
					amountRub: 5000,
				},
			];
		}, [patient?.id, patient?.visitsHistory]);

		const showGeneral = activeSection === "all" || activeSection === "general";
		const showSomatic = activeSection === "all" || activeSection === "somatic";
		const showVisits = activeSection === "all" || activeSection === "visits";
		const showFamily = activeSection === "all" || activeSection === "family";

		return (
			<div className="patient-general-info-tab flex flex-col gap-6 text-[var(--ink)]">
				{/* 1. ОСНОВНЫЕ И ПАСПОРТНЫЕ ДАННЫЕ */}
				{showGeneral && (
					<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<div className="flex items-center gap-2.5">
								<div className="w-7 h-7 rounded-lg bg-[var(--teal,var(--brand-primary))]/10 text-[var(--teal,var(--brand-primary))] flex items-center justify-center shrink-0">
									<User className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-black m-0 text-[var(--ink)]">
										Основные сведения и документ, удостоверяющий личность
									</h3>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Необходимы для оформления договора на оказание медицинских услуг и чеков по 54-ФЗ
									</p>
								</div>
							</div>
							<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/50 text-[var(--teal,var(--brand-primary))] border border-teal-200 dark:border-teal-800 shrink-0">
								Паспортная часть
							</span>
						</div>

						{/* Базовая идентификация */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
							<div className="flex flex-col gap-1 md:col-span-2">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<User className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>ФИО Пациента *</span>
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.fullName ?? ""}
									onChange={(e) => onUpdatePatient?.("fullName", e.target.value)}
									placeholder="Фамилия Имя Отчество"
									disabled={disabled}
									data-testid="input-patient-fullname"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>Телефон *</span>
								</label>
								<input
									type="tel"
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.phone ?? ""}
									onChange={(e) => onUpdatePatient?.("phone", formatPhoneNumber(e.target.value))}
									placeholder="+7 (___) ___-__-__"
									disabled={disabled}
									data-testid="input-patient-phone"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>Дата рождения</span>
								</label>
								<input
									type="date"
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.birthDate ?? ""}
									onChange={(e) => onUpdatePatient?.("birthDate", e.target.value)}
									disabled={disabled}
									data-testid="input-patient-birthdate"
								/>
							</div>
						</div>

						{/* Паспортные данные (выбор документа и реквизиты) */}
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-3">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<CreditCard className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span className="font-bold text-xs text-[var(--ink)]">
										Документ, удостоверяющий личность:
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<label htmlFor="select-doc-type-field" className="text-[11px] text-[var(--muted)] font-medium">
										Тип документа:
									</label>
									<select
										id="select-doc-type-field"
										className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-semibold cursor-pointer"
										value={patient?.docType ?? "passport_rf"}
										onChange={(e) => onUpdatePatient?.("docType", e.target.value as IdentityDocType)}
										disabled={disabled}
										data-testid="select-doc-type"
									>
										{IDENTITY_DOCUMENT_TYPES.map((dt) => (
											<option key={dt.code} value={dt.code}>
												{dt.labelRu}
											</option>
										))}
									</select>
								</div>
							</div>

							{(!patient?.docType || patient?.docType === "passport_rf") ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Серия (4 цифры)</label>
										<input
											type="text"
											maxLength={4}
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
											value={patient?.passportSeries ?? ""}
											onChange={(e) => onUpdatePatient?.("passportSeries", e.target.value.replace(/\D/g, "").slice(0, 4))}
											placeholder="45 10"
											disabled={disabled}
											data-testid="input-passport-series"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Номер (6 цифр)</label>
										<input
											type="text"
											maxLength={6}
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
											value={patient?.passportNumber ?? ""}
											onChange={(e) => onUpdatePatient?.("passportNumber", e.target.value.replace(/\D/g, "").slice(0, 6))}
											placeholder="123456"
											disabled={disabled}
											data-testid="input-passport-number"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Дата выдачи</label>
										<input
											type="date"
											className="min-h-[44px] sm:min-h-[32px] px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											value={patient?.passportIssuedDate ?? ""}
											onChange={(e) => onUpdatePatient?.("passportIssuedDate", e.target.value)}
											disabled={disabled}
											data-testid="input-passport-issued-date"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Код подр. (XXX-XXX)</label>
										<input
											type="text"
											maxLength={7}
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
											value={patient?.passportDepartmentCode ?? ""}
											onChange={(e) => {
												const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
												const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
												onUpdatePatient?.("passportDepartmentCode", formatted);
											}}
											placeholder="770-001"
											disabled={disabled}
											data-testid="input-passport-department-code"
										/>
									</div>

									<div className="flex flex-col gap-1 col-span-2">
										<label className="text-[11px] font-bold text-[var(--muted)]">Кем выдан</label>
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											value={patient?.passportIssuedBy ?? ""}
											onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
											placeholder="Отделом УФМС России по гор. Москве..."
											disabled={disabled}
											data-testid="input-passport-issued-by"
										/>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Серия и номер документа</label>
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											value={patient?.passportNumber ?? patient?.passportSeries ?? ""}
											onChange={(e) => onUpdatePatient?.("passportNumber", e.target.value)}
											placeholder="Номер свидетельства / ВНЖ"
											disabled={disabled}
											data-testid="input-passport-number"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Дата выдачи</label>
										<input
											type="date"
											className="min-h-[44px] sm:min-h-[32px] px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											value={patient?.passportIssuedDate ?? ""}
											onChange={(e) => onUpdatePatient?.("passportIssuedDate", e.target.value)}
											disabled={disabled}
											data-testid="input-passport-issued-date"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">Орган выдачи</label>
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											value={patient?.passportIssuedBy ?? ""}
											onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
											placeholder="Кем выдан документ"
											disabled={disabled}
											data-testid="input-passport-issued-by"
										/>
									</div>
								</div>
							)}
						</div>

						{/* Адреса регистрации и фактического проживания */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
									<span className="flex items-center gap-1.5">
										<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>Адрес регистрации (по паспорту)</span>
									</span>
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.registrationAddress ?? patient?.address ?? ""}
									onChange={(e) => {
										const val = e.target.value;
										onUpdatePatient?.("address", val);
										onUpdatePatient?.("registrationAddress", val);
										if (addressesMatchState) {
											onUpdatePatient?.("residentialAddress", val);
										}
									}}
									placeholder="г. Москва, ул. Ленина, д. 10, кв. 25"
									disabled={disabled}
									data-testid="input-patient-address"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
										<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>Адрес фактического проживания</span>
									</label>
									<label className="flex items-center gap-1 text-[11px] text-[var(--muted)] cursor-pointer select-none">
										<input
											type="checkbox"
											className="rounded text-[var(--teal,var(--brand-primary))] cursor-pointer"
											checked={addressesMatchState}
											onChange={(e) => {
												const checked = e.target.checked;
												setAddressesMatchState(checked);
												onUpdatePatient?.("addressesMatch", checked);
												if (checked) {
													onUpdatePatient?.("residentialAddress", patient?.registrationAddress || patient?.address || "");
												}
											}}
											data-testid="checkbox-addresses-match"
										/>
										<span>Совпадает с регистрацией</span>
									</label>
								</div>
								<input
									type="text"
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] ${
										addressesMatchState ? "opacity-60 bg-[var(--paper-soft)] cursor-not-allowed" : ""
									}`}
									value={addressesMatchState ? (patient?.registrationAddress ?? patient?.address ?? "") : (patient?.residentialAddress ?? "")}
									onChange={(e) => onUpdatePatient?.("residentialAddress", e.target.value)}
									placeholder="Фактическое место жительства"
									disabled={disabled || addressesMatchState}
									data-testid="input-residential-address"
								/>
							</div>
						</div>

						{/* 2. ГОСУДАРСТВЕННАЯ И СТРАХОВАЯ ИДЕНТИФИКАЦИЯ */}
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<FileCheck className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
								<span className="font-bold text-xs text-[var(--ink)]">
									Государственная и страховая идентификация:
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
										<span>СНИЛС</span>
										<span className="text-[9px] text-teal-600 font-bold uppercase">ФНС 1151156</span>
									</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
										value={patient?.snils ?? ""}
										onChange={(e) => onUpdatePatient?.("snils", formatSnils(e.target.value))}
										placeholder="123-456-789 00"
										disabled={disabled}
										data-testid="input-snils"
										title="Критичен для справки в налоговую инспекцию по форме 1151156"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
										<span>ИНН физлица</span>
										<span className="text-[9px] text-[var(--muted)]">54-ФЗ</span>
									</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
										value={patient?.inn ?? ""}
										onChange={(e) => onUpdatePatient?.("inn", formatTaxpayerInn(e.target.value))}
										placeholder="12 цифр ИНН"
										disabled={disabled}
										data-testid="input-inn"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">Полис ОМС (ЕНП)</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono"
										value={patient?.omsPolicyNumber ?? ""}
										onChange={(e) => onUpdatePatient?.("omsPolicyNumber", formatOmsPolicy(e.target.value))}
										placeholder="16 цифр полиса ОМС"
										disabled={disabled}
										data-testid="input-oms-policy"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">Полис ДМС (Номер)</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										value={patient?.dmsPolicyNumber ?? ""}
										onChange={(e) => onUpdatePatient?.("dmsPolicyNumber", e.target.value)}
										placeholder="Номер договора ДМС"
										disabled={disabled}
										data-testid="input-dms-policy"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">Страховая компания ДМС</label>
									<div className="flex items-center gap-1.5">
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex-1"
											value={patient?.dmsInsuranceCompany ?? ""}
											onChange={(e) => onUpdatePatient?.("dmsInsuranceCompany", e.target.value)}
											placeholder="СОГАЗ, Ингосстрах..."
											disabled={disabled}
											data-testid="input-dms-company"
										/>
										<div className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-none">
											{POPULAR_DMS_COMPANIES.slice(0, 3).map((comp) => (
												<button
													key={comp}
													type="button"
													className="text-[10px] px-2 py-1 rounded bg-[var(--paper)] hover:bg-[var(--line)] font-semibold border border-[var(--line)] shrink-0 cursor-pointer"
													onClick={() => onUpdatePatient?.("dmsInsuranceCompany", comp)}
												>
													{comp}
												</button>
											))}
										</div>
									</div>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">Программа и лимит ДМС</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										value={patient?.dmsProgramName ?? ""}
										onChange={(e) => onUpdatePatient?.("dmsProgramName", e.target.value)}
										placeholder="Стоматология Бизнес (лимит 50 000 ₽)"
										disabled={disabled}
										data-testid="input-dms-program"
									/>
								</div>
							</div>
						</div>

						{/* 3. ЗАМЕТКИ И ОСОБЕННОСТИ ОБСЛУЖИВАНИЯ */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
							{/* Регистратура */}
							<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-2.5">
								<div className="flex items-center justify-between gap-1 flex-wrap">
									<div className="flex items-center gap-1.5">
										<Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
										<span className="text-xs font-bold text-[var(--ink)]">
											Служебная заметка для регистратуры:
										</span>
									</div>
									<span className="text-[10px] text-[var(--muted)] font-medium">Администраторы</span>
								</div>

								{/* Быстрые чипы тегов для регистратуры */}
								<div className="flex items-center gap-1.5 flex-wrap">
									{REGISTRY_SERVICE_TAGS.map((tag) => {
										const active = Array.isArray(patient?.serviceAlertTags) && patient.serviceAlertTags.includes(tag);
										return (
											<button
												key={tag}
												type="button"
												className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition-all border cursor-pointer inline-flex items-center gap-1 ${
													active
														? "bg-amber-500 text-white border-amber-600 shadow-2xs"
														: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
												}`}
												onClick={() => handleToggleServiceTag(tag)}
												data-testid={`chip-service-tag-${tag}`}
												disabled={disabled}
											>
												<span>{tag}</span>
											</button>
										);
									})}
								</div>

								<textarea
									rows={2}
									className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.registryNotes ?? patient?.notes ?? ""}
									onChange={(e) => {
										onUpdatePatient?.("registryNotes", e.target.value);
										onUpdatePatient?.("notes", e.target.value);
									}}
									placeholder="Особые пожелания по времени, конфликтность, звонки с напоминанием..."
									disabled={disabled}
									data-testid="textarea-registry-notes"
								/>
							</div>

							{/* Клинические заметки врача */}
							<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-2.5">
								<div className="flex items-center justify-between gap-1 flex-wrap">
									<div className="flex items-center gap-1.5">
										<Stethoscope className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
										<span className="text-xs font-bold text-[var(--ink)]">
											Клинические особенности (Врач):
										</span>
									</div>
									<span className="text-[10px] text-[var(--muted)] font-medium">Кресло & ЭМК</span>
								</div>

								{/* Быстрые клинические маркеры */}
								<div className="flex items-center gap-1.5 flex-wrap">
									{DOCTOR_CLINICAL_TAGS.map((tag) => (
										<button
											key={tag}
											type="button"
											className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] transition-all cursor-pointer"
											onClick={() => handleAppendDoctorTag(tag)}
											disabled={disabled}
										>
											<span>+ {tag}</span>
										</button>
									))}
								</div>

								<textarea
									rows={2}
									className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									value={patient?.doctorClinicalNotes ?? ""}
									onChange={(e) => onUpdatePatient?.("doctorClinicalNotes", e.target.value)}
									placeholder="Страх лечения, седация, аллерго-настороженность, особенности артикуляции..."
									disabled={disabled}
									data-testid="textarea-doctor-notes"
								/>
							</div>
						</div>

						{/* Канал привлечения пациента (Маркетинг / StomX) */}
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<Megaphone className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span className="font-bold text-xs text-[var(--ink)]">
										Канал привлечения пациента (Маркетинг / StomX):
									</span>
								</div>
								{patient?.acquisitionSource && (
									<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
										{patient.acquisitionSource}
									</span>
								)}
							</div>

							<div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none whitespace-nowrap flex-nowrap touch-pan-x min-w-0">
								{STOMX_MARKETING_SOURCES_CATALOG.slice(0, 9).map((src) => {
									const isSelected = patient?.acquisitionSource === src.nameRu;
									return (
										<button
											key={src.channel}
											type="button"
											data-testid={`chip-marketing-${src.channel}`}
											className={`min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
												isSelected
													? "bg-teal-600 text-white border-teal-600"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]"
											}`}
											onClick={() => {
												if (disabled) return;
												onUpdatePatient?.("acquisitionSource", isSelected ? "" : src.nameRu);
											}}
											disabled={disabled}
										>
											<span>{src.nameRu}</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{/* 2. МЕДИЦИНСКИЙ СТАТУС И СОМАТИКА */}
				{showSomatic && (
					<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-wrap gap-2">
							<div className="flex items-center gap-2.5">
								<div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
									<HeartPulse className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-black m-0 text-[var(--ink)]">
										Медицинский статус, соматика и аллергологический анамнез
									</h3>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Клинические стоп-факторы, аллергии на медикаменты и оценка анестезиологического риска
									</p>
								</div>
							</div>

							{/* 1-Click Соматическая норма (Мандат 8e п. 3) */}
							<button
								type="button"
								data-testid="btn-somatic-healthy-norm"
								onClick={() => {
									if (disabled) return;
									if (onApplySomaticNorm) {
										onApplySomaticNorm();
									} else if (onUpdateSafetyProfile) {
										onUpdateSafetyProfile({
											...DEFAULT_SOMATIC_HEALTHY_NORM,
											customChronicNotes:
												"Соматически здоров. Аллергоанамнез не отягощен. Инфекционные заболевания отрицает. Физиологическая норма.",
										});
									}
								}}
								disabled={disabled}
								className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98 shrink-0 select-none"
								title="1-клик: Применить физиологическую норму (соматически здоров)"
							>
								<ShieldCheck className="w-4 h-4 shrink-0" />
								<span>Соматически здоров / норма (1-клик)</span>
							</button>
						</div>

						{/* Экспресс-оценка безопасности и аллергий */}
						<div className="p-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-3">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<HeartPulse className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span className="font-bold text-xs text-[var(--ink)]">
										Аллергологический статус и стоп-факторы:
									</span>
								</div>
								<span
									data-testid="somatic-status-badge"
									className={`text-xs px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 ${
										safetyEvaluation.hasCriticalStopFlags
											? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
											: safetyEvaluation.hasHighRiskFlags
												? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
												: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
									}`}
								>
									{safetyEvaluation.hasCriticalStopFlags ? (
										<>
											<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
											<span>Стоп-факторы</span>
										</>
									) : safetyEvaluation.hasHighRiskFlags ? (
										<>
											<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
											<span>Повышенный риск</span>
										</>
									) : (
										<>
											<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
											<span>Физиологическая норма</span>
										</>
									)}
								</span>
							</div>

							<div className="flex items-center gap-2 flex-wrap mt-1">
								<button
									type="button"
									data-testid="toggle-allergy-penicillin"
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
										currentProfile.hasPenicillinAllergy
											? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
									onClick={() => handleToggleAllergy("hasPenicillinAllergy")}
									disabled={disabled}
								>
									<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
									<span>Пенициллины {currentProfile.hasPenicillinAllergy ? "(Аллергия)" : "(Норма)"}</span>
								</button>

								<button
									type="button"
									data-testid="toggle-allergy-nsaid"
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
										currentProfile.hasNsaidAllergy
											? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
									onClick={() => handleToggleAllergy("hasNsaidAllergy")}
									disabled={disabled}
								>
									<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
									<span>НПВП / Аспирин {currentProfile.hasNsaidAllergy ? "(Аллергия)" : "(Норма)"}</span>
								</button>

								<button
									type="button"
									data-testid="toggle-allergy-latex"
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
										currentProfile.hasLatexAllergy
											? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
									onClick={() => handleToggleAllergy("hasLatexAllergy")}
									disabled={disabled}
								>
									<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
									<span>Латекс {currentProfile.hasLatexAllergy ? "(Аллергия)" : "(Норма)"}</span>
								</button>
							</div>

							<div className="mt-1">
								<label className="text-xs font-bold text-[var(--muted)] block mb-1">
									Соматический анамнез (Anamnesis Vitae):
								</label>
								<textarea
									className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
									rows={2}
									value={currentProfile.customChronicNotes ?? ""}
									onChange={(e) => {
										if (onUpdateSafetyProfile) {
											onUpdateSafetyProfile({
												...currentProfile,
												customChronicNotes: e.target.value,
											});
										}
									}}
									placeholder="Соматически здоров. Аллергический статус не отягощен..."
									disabled={disabled}
									data-testid="textarea-somatic-notes"
								/>
							</div>
						</div>

						{/* Развернутый соматический опросник SomaticAnamnesisCard */}
						<div className="pt-2">
							<SomaticAnamnesisCard
								initialProfile={currentProfile}
								patientId={patient?.id || undefined}
								patientName={patient?.fullName || undefined}
								onApplyNorm={(normProfile) => {
									onUpdateSafetyProfile?.(normProfile);
									onApplySomaticNorm?.();
								}}
								onSave={(updatedProfile) => {
									onUpdateSafetyProfile?.(updatedProfile);
								}}
							/>
						</div>
					</div>
				)}

				{/* 3. КРАТКАЯ ИСТОРИЯ ПРИЁМОВ И ФИНАНСОВЫЙ СТАТУС */}
				{showVisits && (
					<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-wrap gap-2">
							<div className="flex items-center gap-2.5">
								<div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
									<History className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-black m-0 text-[var(--ink)]">
										История приёмов и финансовый баланс
									</h3>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Финансовый статус, депозиты, семейный кошелек и хронология клинических визитов
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => onNewAppointment?.(patient?.id || undefined)}
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 bg-[var(--teal,var(--brand-primary))] hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none"
									data-testid="btn-quick-new-appointment"
								>
									<Plus className="w-3.5 h-3.5 shrink-0" />
									<span>Записать на прием</span>
								</button>
							</div>
						</div>

						{/* Баланс пациента и баланс семьи */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							{/* Личный баланс */}
							<div
								className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3"
								data-testid="patient-balance-card"
							>
								<div className="flex items-center gap-3">
									<div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
										<Wallet className="w-5 h-5" />
									</div>
									<div>
										<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
											Личный баланс пациента
										</div>
										<div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
											{typeof patient?.patientBalanceRub === "number"
												? `${patient.patientBalanceRub >= 0 ? "+" : ""}${patient.patientBalanceRub.toLocaleString("ru-RU")} ₽`
												: "+4 500 ₽ (Депозит)"}
										</div>
									</div>
								</div>
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
									Депозит активен
								</span>
							</div>

							{/* Семейный баланс */}
							<div
								className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3"
								data-testid="family-balance-card"
							>
								<div className="flex items-center gap-3">
									<div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
										<Coins className="w-5 h-5" />
									</div>
									<div>
										<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
											Общий баланс семьи
										</div>
										<div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
											{typeof patient?.familyBalanceRub === "number"
												? `${patient.familyBalanceRub.toLocaleString("ru-RU")} ₽`
												: "12 500 ₽"}
										</div>
									</div>
								</div>
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
									{patient?.familyGroupName || "Семейный счет"}
								</span>
							</div>
						</div>

						{/* Лента визитов */}
						<div className="flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>Хронология приёмов пациента ({visitsList.length})</span>
								</span>
								{visitsList.length > 0 && visitsList[0] && (
									<button
										type="button"
										onClick={() => {
											const firstVisit = visitsList[0];
											if (firstVisit) onNavigateToVisit?.(firstVisit.id);
										}}
										className="text-[11px] text-[var(--teal,var(--brand-primary))] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
										data-testid="btn-quick-open-visit"
									>
										<span>В текущий приём</span>
										<ExternalLink className="w-3 h-3" />
									</button>
								)}
							</div>

							{visitsList.length === 0 ? (
								<div className="p-6 text-center bg-[var(--paper-soft)] rounded-xl border border-dashed border-[var(--line)] text-xs text-[var(--muted)]">
									У пациента пока нет зафиксированных приёмов. Нажмите «Записать на прием», чтобы назначить первое посещение.
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{visitsList.map((visit) => (
										<div
											key={visit.id}
											className="p-3 bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)]/80 rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap transition-colors"
										>
											<div className="flex items-start gap-2.5 min-w-0 flex-1">
												<div
													className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
														visit.status === "completed"
															? "bg-emerald-500"
															: visit.status === "scheduled"
																? "bg-blue-500"
																: "bg-slate-400"
													}`}
												/>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-xs font-black text-[var(--ink)]">
															{visit.date} {visit.time ? `• ${visit.time}` : ""}
														</span>
														<span className="text-[11px] font-bold text-[var(--muted)]">
															{visit.doctorName} ({visit.specialty})
														</span>
														{visit.toothNumber && (
															<span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
																Зуб {visit.toothNumber}
															</span>
														)}
													</div>
													<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
														{visit.services}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-3 shrink-0">
												<div className="text-right">
													<div className="text-xs font-black text-[var(--ink)]">
														{visit.amountRub.toLocaleString("ru-RU")} ₽
													</div>
													<div className="text-[10px] font-bold text-emerald-600">
														{visit.status === "completed" ? "Оплачено 100%" : "Запланировано"}
													</div>
												</div>

												<button
													type="button"
													onClick={() => onNavigateToVisit?.(visit.id)}
													className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1 shrink-0"
												>
													<span>Открыть</span>
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{/* 4. ЗАКОННЫЕ ПРЕДСТАВИТЕЛИ И СЕМЕЙНЫЕ СВЯЗИ */}
				{showFamily && (
					<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<div className="flex items-center gap-2.5">
								<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
									<Users className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-black m-0 text-[var(--ink)]">
										Законные представители и семейные связи (ст. 20 323-ФЗ, ст. 64 СК РФ)
									</h3>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Правовая основа подписания согласий за несовершеннолетних и доступ к семейному счету
									</p>
								</div>
							</div>
							<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
								Юридический статус
							</span>
						</div>

						{/* Каталог представителей */}
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-2.5">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<Users className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span className="font-bold text-xs text-[var(--ink)]">
										Статус представителя / Член семьи:
									</span>
								</div>
								{patient?.representativeType && (
									<span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
										{patient.representativeType}
									</span>
								)}
							</div>

							<div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none whitespace-nowrap flex-nowrap touch-pan-x min-w-0">
								{STOMX_REPRESENTATIVE_CATALOG.map((rep) => {
									const isSelected =
										patient?.representativeType === rep.nameRu ||
										patient?.representativeType === rep.code;
									return (
										<button
											key={rep.code}
											type="button"
											data-testid={`chip-representative-${rep.code}`}
											className={`min-h-[44px] sm:min-h-[32px] px-2.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
												isSelected
													? "bg-teal-600 text-white border-teal-600 shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]"
											}`}
											onClick={() => {
												if (disabled) return;
												onUpdatePatient?.("representativeType", isSelected ? "" : rep.nameRu);
											}}
											disabled={disabled}
											title={
												rep.isLegalRepresentative
													? `${rep.nameRu}: Законный представитель ребёнка (Право подписи согласий)`
													: `${rep.nameRu}: Член семьи (Для подписи ИДС за несовершеннолетнего требуется нотариальная доверенность)`
											}
										>
											<span>{rep.nameRu}</span>
											{rep.isLegalRepresentative && (
												<span
													className={`px-1 py-0.5 rounded text-[9px] font-black uppercase ${
														isSelected
															? "bg-white/20 text-white"
															: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
													}`}
												>
													ИДС
												</span>
											)}
										</button>
									);
								})}
							</div>

							{/* Правовой вердикт по ст. 20 323-ФЗ и ст. 64 СК РФ */}
							{selectedRep && (
								<div
									className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
										selectedRep.isLegalRepresentative
											? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
											: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
									}`}
									data-testid="representative-ids-signing-badge"
								>
									<div className="flex items-center gap-2">
										{selectedRep.isLegalRepresentative ? (
											<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										) : (
											<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
										)}
										<span>
											{selectedRep.isLegalRepresentative ? (
												<>
													<strong>Законный представитель ребёнка:</strong> Имеет безусловное законное право подписывать информированное добровольное согласие (ИДС) за несовершеннолетнего (ст. 20 323-ФЗ, ст. 64 СК РФ).
												</>
											) : (
												<>
													<strong>Член семьи (не является законным представителем):</strong> Для подписания ИДС за несовершеннолетнего требуется нотариальная доверенность (ст. 20 323-ФЗ, ст. 64 СК РФ).
												</>
											)}
										</span>
									</div>
									<span
										className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 border ${
											selectedRep.isLegalRepresentative
												? "bg-emerald-600 text-white border-emerald-700"
												: "bg-amber-600 text-white border-amber-700"
										}`}
									>
										{selectedRep.isLegalRepresentative ? "Право подписи ИДС: ДА" : "ИДС: по доверенности"}
									</span>
								</div>
							)}

							{patient?.representativeType && (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--line)]">
									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">
											ФИО представителя
										</label>
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
											value={patient?.representativeFullName ?? ""}
											onChange={(e) => onUpdatePatient?.("representativeFullName", e.target.value)}
											placeholder="Фамилия Имя Отчество"
											disabled={disabled}
											data-testid="input-representative-fullname"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">
											Телефон представителя
										</label>
										<input
											type="tel"
											className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
											value={patient?.representativePhone ?? ""}
											onChange={(e) => onUpdatePatient?.("representativePhone", formatPhoneNumber(e.target.value))}
											placeholder="+7 (___) ___-__-__"
											disabled={disabled}
											data-testid="input-representative-phone"
										/>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[11px] font-bold text-[var(--muted)]">
											Документ-основание (Свид-во / Доверенность)
										</label>
										<input
											type="text"
											className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
											value={patient?.representativeDoc ?? ""}
											onChange={(e) => onUpdatePatient?.("representativeDoc", e.target.value)}
											placeholder="Свидетельство II-МЮ №123456 / Доверенность 77 АБ 1234"
											disabled={disabled}
											data-testid="input-representative-doc"
										/>
									</div>
								</div>
							)}
						</div>

						{/* Получатель документов и согласие на обработку ПДн */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-bold text-[var(--ink)]">
									Кому выдавать медицинскую документацию и справки:
								</label>
								<select
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									value={patient?.preferredDocumentRecipient ?? "Лично пациенту"}
									onChange={(e) => onUpdatePatient?.("preferredDocumentRecipient", e.target.value)}
									disabled={disabled}
								>
									<option value="Лично пациенту">Лично пациенту</option>
									<option value="Законному представителю">Законному представителю</option>
									<option value="По нотариальной доверенности">По нотариальной доверенности</option>
								</select>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-bold text-[var(--ink)]">
									Основание обработки персональных данных (152-ФЗ):
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									value={patient?.dataProcessingBasisNote ?? "Согласие на ОПД от первичного приема"}
									onChange={(e) => onUpdatePatient?.("dataProcessingBasisNote", e.target.value)}
									placeholder="Согласие на ОПД №..."
									disabled={disabled}
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	},
);

export default PatientGeneralInfoTab;
