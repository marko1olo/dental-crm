import { generateUuidV7, parseUtmFromUrl } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { clientLogger } from "../../../utils/logger";
import type { BookingConfirmationData, BookingDoctorData, BookingSlotItem, ClinicBranch } from "../contracts/bookingContracts";

async function parseJsonWithLog(response: Response, context: string): Promise<unknown> {
	try {
		return await response.json();
	} catch (jsonErr: unknown) {
		clientLogger.warn(`[bookingSubmissionEngine] Invalid JSON on ${context}`, jsonErr);
		return null;
	}
}

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
	verificationCode?: string | undefined;
	hasAgreedToPrivacy: boolean;
}

export async function submitBookingRequest(params: BookingSubmissionParams): Promise<BookingConfirmationData> {
	const {
		organizationId,
		apiBaseUrl,
		patientName,
		patientPhone,
		patientComment,
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
		cabinetNumber: undefined,
		comment: patientComment || undefined,
		status: bookingStatus,
		isPreBooking: isPreBookingMode,
		createdAt: new Date().toISOString(),
	};

	if (!organizationId && (isDemoShowcaseMode() || (typeof process !== "undefined" && process.env?.NODE_ENV === "test"))) {
		return finalConfirmation;
	}

	const currentUrl = typeof window !== "undefined" ? window.location.href : "";
	const parsedUtm = parseUtmFromUrl(currentUrl);
	const idempotencyKey = generateUuidV7();

	const bookingPayload = {
		organizationId: organizationId || undefined,
		doctorId: selectedDoctor.id,
		startsAt: selectedSlot.startsAt,
		endsAt: selectedSlot.endsAt,
		patientName: patientName.trim(),
		patientPhone: patientPhone.trim(),
		comment: patientComment || undefined,
		verificationCode: params.verificationCode || undefined,
		status: bookingStatus,
		hasAgreedToPrivacy: params.hasAgreedToPrivacy,
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

	const targetUrl = organizationId
		? `${apiBaseUrl}/${organizationId}/book`
		: `${apiBaseUrl}/create`;

	let response: Response | null = null;
	try {
		response = await fetch(targetUrl, {
			method: "POST",
			headers: requestHeaders,
			body: JSON.stringify(bookingPayload),
		});
	} catch (netErr: unknown) {
		clientLogger.warn("[bookingSubmissionEngine] Network error on submitBookingRequest", netErr);
	}

	if (!response || !response.ok) {
		if (response?.status === 409) {
			throw new Error("Выбранное время только что заняли. Пожалуйста, выберите другое время в расписании.");
		}
		const errData = response ? await parseJsonWithLog(response, "submitBookingRequest:error") : null;
		const errObj = (errData && typeof errData === "object" ? errData : null) as { message?: string; error?: string } | null;
		throw new Error(errObj?.message || errObj?.error || `Не удалось завершить запись. Позвоните: ${selectedBranch.phone}`);
	}

	const rawResponse = await parseJsonWithLog(response, "submitBookingRequest");
	const responseData = (
		rawResponse && typeof rawResponse === "object" && "data" in rawResponse
			? (rawResponse as { data: Record<string, unknown> }).data
			: rawResponse
	) as {
		referenceNumber?: string;
		booking?: { referenceNumber?: string };
		bookingId?: string;
		appointment?: { id?: string };
		cabinetNumber?: string;
		cabinet?: string;
	} | null;
	if (
		responseData?.referenceNumber ||
		responseData?.booking?.referenceNumber ||
		responseData?.bookingId ||
		responseData?.appointment?.id
	) {
		finalConfirmation.referenceNumber =
			responseData.referenceNumber ||
			responseData.booking?.referenceNumber ||
			responseData.bookingId ||
			responseData.appointment?.id ||
			finalConfirmation.referenceNumber;
	}
	if (responseData?.cabinetNumber || responseData?.cabinet) {
		finalConfirmation.cabinetNumber = responseData.cabinetNumber || responseData.cabinet;
	}

	return finalConfirmation;
}

export interface WaitlistSubmissionParams {
	organizationId: string | null;
	apiBaseUrl: string;
	patientName: string;
	patientPhone: string;
	patientComment?: string | undefined;
	patientId?: string | undefined;
	selectedDate?: string | undefined;
	selectedDoctor?: BookingDoctorData | null | undefined;
	selectedBranch: ClinicBranch;
	referenceNumber: string;
	hasAgreedToPrivacy: boolean;
}

export async function submitWaitlistRequest(params: WaitlistSubmissionParams): Promise<BookingConfirmationData> {
	const {
		organizationId,
		apiBaseUrl,
		patientName,
		patientPhone,
		patientComment,
		patientId,
		selectedDate,
		selectedDoctor,
		selectedBranch,
		referenceNumber,
		hasAgreedToPrivacy,
	} = params;

	const dateStr = selectedDate || new Date().toISOString().slice(0, 10);
	const finalConfirmation: BookingConfirmationData = {
		referenceNumber,
		branch: selectedBranch,
		doctor: selectedDoctor || {
			id: "waitlist-coordinator",
			fullName: "Координатор клиники",
			specialties: ["Лист ожидания"],
			experienceYears: 0,
			rating: 5,
			reviewsCount: 0,
			categoryIds: ["all"],
		},
		date: dateStr,
		time: "По согласованию",
		startsAt: `${dateStr}T09:00:00.000Z`,
		endsAt: `${dateStr}T10:00:00.000Z`,
		patientName: patientName.trim(),
		patientPhone,
		cabinetNumber: undefined,
		comment: [patientComment, "[Заявка в лист ожидания]"].filter(Boolean).join(" "),
		status: "unconfirmed",
		isPreBooking: true,
		createdAt: new Date().toISOString(),
	};

	if (!organizationId && (isDemoShowcaseMode() || (typeof process !== "undefined" && process.env?.NODE_ENV === "test"))) {
		return finalConfirmation;
	}

	const idempotencyKey = generateUuidV7();
	const payload = {
		organizationId: organizationId || undefined,
		patientId: patientId || undefined,
		patientName: patientName.trim(),
		patientPhone: patientPhone.trim(),
		doctorId: selectedDoctor?.id || undefined,
		preferredDoctorId: selectedDoctor?.id || undefined,
		date: dateStr,
		comment: patientComment || undefined,
		notes: patientComment || undefined,
		hasAgreedToPrivacy,
		idempotencyKey,
	};

	const targetUrl = organizationId
		? `${apiBaseUrl}/${organizationId}/waitlist`
		: `${apiBaseUrl}/waitlist`;

	let response: Response | null = null;
	try {
		response = await fetch(targetUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": idempotencyKey,
				"X-Idempotency-Key": idempotencyKey,
			},
			body: JSON.stringify(payload),
		});
	} catch (netErr: unknown) {
		clientLogger.warn("[bookingSubmissionEngine] Network error on submitWaitlistRequest", netErr);
	}

	if (!response || !response.ok) {
		const errData = response ? await parseJsonWithLog(response, "submitWaitlistRequest:error") : null;
		const errObj = (errData && typeof errData === "object" ? errData : null) as { message?: string; error?: string } | null;
		throw new Error(errObj?.message || errObj?.error || `Не удалось отправить заявку в лист ожидания. Позвоните: ${selectedBranch.phone}`);
	}

	const rawResponse = await parseJsonWithLog(response, "submitBookingRequest");
	const responseData = (
		rawResponse && typeof rawResponse === "object" && "data" in rawResponse
			? (rawResponse as { data: Record<string, unknown> }).data
			: rawResponse
	) as { waitlistId?: string; id?: string } | null;
	if (responseData?.waitlistId || responseData?.id) {
		finalConfirmation.referenceNumber = responseData.waitlistId || responseData.id || finalConfirmation.referenceNumber;
	}

	return finalConfirmation;
}
