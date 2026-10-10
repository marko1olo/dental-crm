import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { countLabel } from "../../lib/russianPlural.js";
import {
    collectDicomWorkstationClientFacts,
    isBrowserImagingScanAbortError,
    localImagingFolderFingerprint
} from "../browserScanUtils";
import {
    buildClinicProfileUpdatePayload,
    buildPatientAdministrativeProfilePayload,
    clinicLegalMissingFields,
    clinicLegalReadinessPercent,
    type ClinicProfileDraft,
    clinicProfileDraftFromProfile,
    clinicProfileDraftSignature,
    clinicProfileEndpoint,
    defaultAppointmentStartLocal,
    defaultStaffScheduleDraft,
    defaultWorkingDays,
    emptyClinicProfileDraft,
    isDentalSpecialty,
    isStaffRole,
    normalizedDentalSpecialty,
    normalizedStaffRole,
    normalizeOptionalWorkingDaysDraft,
    normalizeWorkingDaysDraft,
    nullableClinicDraftValue,
    nullablePatientDraftValue,
    type PatientAdministrativeProfileDraft,
    patientAdministrativeProfileDraftFromPatient,
    patientAdministrativeProfileDraftIssue,
    patientAdministrativeProfileDraftSignature,
    roleFocusOrder,
    type StaffScheduleDraft,
    staffScheduleDraftFromWorkingHours,
    staffScheduleDraftSignature,
    staffWorkingHoursFromDraft,
    staffWorkingHoursFromSimpleDraft,
} from "../clinicProfileUtils";
import {
    addMinutesToClinicDateTimeLocal,
    calendarDayInTimeZone,
    dateInputValuePlusDays,
    formatDateTime,
    formatShortDate,
    formatTime,
    fromDateTimeLocalValue,
    isDateInputValue,
    isDateTimeLocalInputValue,
    isoDateLabel,
    isValidDateParts,
    minutesLabel,
    normalizeClockTime,
    shiftCalendarDay,
    timeZoneDateParts,
    timeZoneOffsetMinutes,
    timeZoneOffsetSuffix,
    toDateInputValue,
    todayDateInputValue,
    validClockTime,
    weekdayFromDateInput,
} from "../dateTimeUtils";
import {
    localConvenienceRetentionMs,
    localSavedAtFresh,
    organizationScopedLocalStorageKey,
} from "../localStorageHelpers";

export * from "../browserScanUtils";
export { addMinutesToClinicDateTimeLocal, buildClinicProfileUpdatePayload, buildPatientAdministrativeProfilePayload, calendarDayInTimeZone, clinicLegalMissingFields, clinicLegalReadinessPercent, clinicProfileDraftFromProfile, clinicProfileDraftSignature, clinicProfileEndpoint, collectDicomWorkstationClientFacts, countLabel, dateInputValuePlusDays, defaultAppointmentStartLocal, defaultStaffScheduleDraft, defaultWorkingDays, denteAdminSecretRequestHeaders, emptyClinicProfileDraft, formatDateTime, formatShortDate, formatTime, fromDateTimeLocalValue, isBrowserImagingScanAbortError, isDateInputValue, isDateTimeLocalInputValue, isDentalSpecialty, isoDateLabel, isStaffRole, isValidDateParts, localConvenienceRetentionMs, localImagingFolderFingerprint, localSavedAtFresh, minutesLabel, normalizeClockTime, normalizedDentalSpecialty, normalizedStaffRole, normalizeOptionalWorkingDaysDraft, normalizeWorkingDaysDraft, nullableClinicDraftValue, nullablePatientDraftValue, organizationScopedLocalStorageKey, patientAdministrativeProfileDraftFromPatient, patientAdministrativeProfileDraftIssue, patientAdministrativeProfileDraftSignature, roleFocusOrder, shiftCalendarDay, staffScheduleDraftFromWorkingHours, staffScheduleDraftSignature, staffWorkingHoursFromDraft, staffWorkingHoursFromSimpleDraft, timeZoneDateParts, timeZoneOffsetMinutes, timeZoneOffsetSuffix, toDateInputValue, todayDateInputValue, validClockTime, weekdayFromDateInput };
export type { ClinicProfileDraft, PatientAdministrativeProfileDraft, StaffScheduleDraft };

    export * from "./formatting";
    export * from "./storage";
    export * from "./types";
    export * from "./validation";

