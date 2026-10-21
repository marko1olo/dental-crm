import type { Appointment } from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

interface ExtendedAppointment extends Appointment {
	priceRub?: number | string | null;
	amountRub?: number | string | null;
	totalRub?: number | string | null;
	serviceTitle?: string | null;
	comment: string | null;
}

export function triggerAppointmentCheckout(
	appointment: Appointment,
	patientName: string,
	patientPhone?: string | null,
	patientId?: string | null,
) {
	const a = appointment as ExtendedAppointment;
	const resolvedPatientId = patientId || a.patientId;
	if (resolvedPatientId) {
		usePatientStore.getState().setSelectedPatientId(resolvedPatientId);
	}

	const rawPrice = a.priceRub ?? a.amountRub ?? a.totalRub;
	const resolvedPriceRub =
		rawPrice !== null &&
		rawPrice !== undefined &&
		String(rawPrice).trim() !== "" &&
		Number.isFinite(Number(rawPrice))
			? Math.max(0, Number(rawPrice))
			: 2500;

	const pendingCheckout = {
		patientId: resolvedPatientId || "",
		patientName,
		patientPhone: patientPhone || "",
		visitId: a.id,
		services: [
			{
				name: a.serviceTitle || a.comment || "Стоматологический приём",
				priceRub: resolvedPriceRub,
				quantity: 1,
				totalRub: resolvedPriceRub,
			},
		],
		totalDueRub: resolvedPriceRub,
		receiptNumber: `REC-${Date.now().toString().slice(-5)}`,
		timestamp: Date.now(),
		autoOpen: true,
	};

	try {
		sessionStorage.setItem(
			"dente_pending_checkout",
			JSON.stringify(pendingCheckout),
		);
		localStorage.setItem(
			"dente_pending_checkout",
			JSON.stringify(pendingCheckout),
		);
	} catch (err) {
		console.warn("[AppointmentCheckout] Write error:", err);
	}

	useAppStore.getState().setCurrentView("finance");
	if (typeof window !== "undefined") {
		window.location.hash = "#finance";
		window.dispatchEvent(new CustomEvent("dente:pending-checkout-ready"));
	}
	showToast(`Касса: оплата визита ${patientName}`, "info");
}
