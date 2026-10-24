import { generateQrCodeSvg } from "@dental/shared";
import type { ShareConsentLinkInput } from "./types.js";

export function generateConsentShareLink(
	origin: string,
	patientId: string,
	input: ShareConsentLinkInput,
) {
	const params = new URLSearchParams({
		patientId,
		kind: input.kind,
		t: Date.now().toString(36),
	});
	if (input.visitId) params.set("visitId", input.visitId);

	const signUrl = `${origin}/portal/consents/sign?${params.toString()}`;
	const qrSvg = generateQrCodeSvg(signUrl, {
		size: 180,
		margin: 1,
		foregroundColor: "#0f766e",
		backgroundColor: "#ffffff",
		title: `Подписание согласия: ${input.title ?? "Информированное согласие"}`,
	});

	const whatsappText = encodeURIComponent(
		`Здравствуйте! Для начала стоматологического лечения в клинике, пожалуйста, ознакомьтесь и подпишите согласие онлайн со смартфона: ${signUrl}`,
	);
	const whatsappUrl = input.phone
		? `https://wa.me/${input.phone.replace(/\D/g, "")}?text=${whatsappText}`
		: `https://wa.me/?text=${whatsappText}`;

	return {
		signUrl,
		qrSvg,
		whatsappUrl,
		expiresInHours: 24,
	};
}
