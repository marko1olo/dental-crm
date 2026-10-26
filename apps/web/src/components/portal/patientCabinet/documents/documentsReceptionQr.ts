import { generateQrCodeSvg } from "@dental/shared";
import type { PatientPersonalCabinetData, PatientAppointment } from "../patientCabinetEngine.js";
import { calculateCabinetSummary } from "../engine/patientCabinetSummaryEngine.js";

export interface ReceptionCheckinQrResult {
	readonly qrPayload: string;
	readonly qrCodeSvg: string;
	readonly patientId: string;
	readonly cardNumber: string;
	readonly fullName: string;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly receptionInstructionsRu: string;
}

export function generateReceptionCheckinQrPayload(
	data: PatientPersonalCabinetData,
): ReceptionCheckinQrResult {
	const summary = calculateCabinetSummary(data);
	const nextAppt = summary.nextAppointment;
	const payload = `DENTE:CHECKIN:v1|pid=${data.patientId}|card=${data.cardNumber}|phone=${data.phone}|appt=${nextAppt?.id ?? "none"}|ts=${Date.now()}`;
	const qrCodeSvg = generateQrCodeSvg(payload, {
		size: 260,
		margin: 2,
		colorDark: "#000000",
		colorLight: "#ffffff",
	});

	return {
		qrPayload: payload,
		qrCodeSvg,
		patientId: data.patientId,
		cardNumber: data.cardNumber,
		fullName: data.fullName,
		nextAppointment: nextAppt,
		receptionInstructionsRu: "Покажите данный QR-код администратору клиники или поднесите к 2D-сканеру на стойке ресепшена для мгновенной регистрации прибытия на прием.",
	};
}
