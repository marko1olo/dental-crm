import { generateUuidV7, parseUtmFromUrl } from "@dental/shared";
import type { BookingConfirmationData, BookingDoctorData, BookingSlotItem, ClinicBranch } from "../contracts/bookingContracts";

export interface BookingSubmissionParams {
	organizationId: string | null;
	apiBaseUrl: string;
	patientName: string;
	patientPhone: string;
	patientComment?: string | undefined;
	patientId?: string | undefined;
	selectedDate: string;
	selectedSlot: BookingSlotItem;
	selectedDoctor: BookingDoctorData;
	selectedBranch: ClinicBranch;
	bookingStatus: "confirmed" | "unconfirmed";
	isPreBookingMode: boolean;
	referenceNumber: string;
}

export async function submitBookingRequest(params: BookingSubmissionParams): Promise<BookingConfirmationData> {
	const {
		organizationId,
		apiBaseUrl,
		patientName,
		patientPhone,
		patientComment,
		patientId,
		selectedDate,
		selectedSlot,
		selectedDoctor,
		selectedBranch,
		bookingStatus,
		isPreBookingMode,
		referenceNumber,
	} = params;

	const finalConfirmation: BookingConfirmationData = {
		referenceNumber,
		branch: selectedBranch,
		doctor: selectedDoctor,
		date: selectedDate,
		time: selectedSlot.time,
		startsAt: selectedSlot.startsAt,
		endsAt: selectedSlot.endsAt,
		patientName: patientName.trim(),
		patientPhone,
		cabinetNumber: "Кабинет №3 (Терапевтическое отделение)",
		comment: patientComment || undefined,
		status: bookingStatus,
		isPreBooking: isPreBookingMode,
		createdAt: new Date().toISOString(),
	};

	if (!organizationId) {
		return finalConfirmation;
	}

	const currentUrl = typeof window !== "undefined" ? window.location.href : "";
	const parsedUtm = parseUtmFromUrl(currentUrl);
	const idempotencyKey = generateUuidV7();

	const bookingPayload = {
		organizationId,
		doctorId: selectedDoctor.id,
		patientId: patientId || undefined,
		startsAt: selectedSlot.startsAt,
		endsAt: selectedSlot.endsAt,
		patientName: patientName.trim(),
		patientPhone: patientPhone.trim(),
		comment: patientComment || undefined,
		status: bookingStatus,
		idempotencyKey,
		utm_source: parsedUtm.utm_source || undefined,
		utm_medium: parsedUtm.utm_medium || undefined,
		utm_campaign: parsedUtm.utm_campaign || undefined,
		utm_content: parsedUtm.utm_content || undefined,
		utm_term: parsedUtm.utm_term || undefined,
		referrer: parsedUtm.referrer || (typeof document !== "undefined" ? document.referrer : undefined),
	};

	const requestHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		"Idempotency-Key": idempotencyKey,
		"X-Idempotency-Key": idempotencyKey,
	};

	let response = await fetch(`${apiBaseUrl}/create`, {
		method: "POST",
		headers: requestHeaders,
		body: JSON.stringify(bookingPayload),
	}).catch(() => null);

	if (!response || response.status === 404) {
		response = await fetch(`${apiBaseUrl}/${organizationId}/book`, {
			method: "POST",
			headers: requestHeaders,
			body: JSON.stringify(bookingPayload),
		});
	}

	if (!response.ok) {
		if (response.status === 409) {
			throw new Error("Выбранное время только что заняли. Пожалуйста, выберите другое время в расписании.");
		}
		const errData = await response.json().catch(() => ({}));
		throw new Error(errData?.message || errData?.error || `Не удалось завершить запись. Позвоните: ${selectedBranch.phone}`);
	}

	return finalConfirmation;
}
