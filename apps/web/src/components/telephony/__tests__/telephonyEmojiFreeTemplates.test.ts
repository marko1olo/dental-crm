import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import {
	generateAppointmentConfirmationMessage,
	generateOrthopedicReadyMessage,
} from "../../../store/telephonyClinical";
import {
	generateReadyInClinicSmsTemplate,
	generateReadyInClinicWhatsAppTemplate,
} from "../../lab/DentalLabReadyInClinicModal";

const EMOJI_REGEX = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]/;

describe("Telephony Emoji-Free Communication Templates (Mandates 8b, 8d)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	it("1. Patient-Facing WhatsApp / SMS Templates — 100% Emoji-Free (Mandate 8d)", () => {
		const confMsg = generateAppointmentConfirmationMessage({
			patientName: "Алексей Смирнов",
			doctorName: "д-р Иванов И.И.",
			appointmentStartsAt: "2026-09-30T14:30:00.000Z",
			clinicName: "DENTE",
			clinicAddress: "ул. Ленина, 42",
			templateType: "confirmation",
		});
		assert.ok(!EMOJI_REGEX.test(confMsg));
		assert.ok(confMsg.includes("Здравствуйте, Алексей Смирнов!"));

		const remMsg = generateAppointmentConfirmationMessage({
			patientName: "Ольга Петрова",
			doctorName: "д-р Сидорова А.А.",
			appointmentStartsAt: "2026-09-30T10:00:00.000Z",
			clinicName: "DENTE",
			templateType: "reminder",
		});
		assert.ok(!EMOJI_REGEX.test(remMsg));

		const urgMsg = generateAppointmentConfirmationMessage({
			patientName: "Дмитрий Кузнецов",
			doctorName: "д-р Смирнов В.В.",
			appointmentStartsAt: "2026-09-30T11:00:00.000Z",
			clinicName: "DENTE",
			clinicAddress: "ул. Мира, 10",
			templateType: "urgent",
		});
		assert.ok(!EMOJI_REGEX.test(urgMsg));
	});

	it("2. Orthopedic Ready Templates — 100% Emoji-Free & Natural Clinical Russian (Mandates 8b, 8d)", () => {
		const orthoSms = generateOrthopedicReadyMessage({
			patientName: "Васильева Елена",
			orderNumber: "ORD-2026-042",
			toothFdi: [16, 17],
			material: "Диоксид циркония",
			doctorName: "Иванов И.И.",
			clinicName: "DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			channel: "sms",
		});
		assert.ok(!EMOJI_REGEX.test(orthoSms));

		const orthoWa = generateOrthopedicReadyMessage({
			patientName: "Васильева Елена",
			orderNumber: "ORD-2026-042",
			toothFdi: "21",
			material: "E-max керамика",
			doctorName: "Петров П.П.",
			clinicName: "DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			bookingUrl: "https://dente.ru/book",
			channel: "whatsapp",
		});
		assert.ok(!EMOJI_REGEX.test(orthoWa));

		const labSms = generateReadyInClinicSmsTemplate({
			orderNumber: "ORD-101",
			patientName: "Новикова Анна",
			toothFdi: "46",
			material: "Металлокерамика",
			doctorName: "д-р Сидоров",
		});
		assert.ok(!EMOJI_REGEX.test(labSms));

		const labWa = generateReadyInClinicWhatsAppTemplate({
			orderNumber: "ORD-101",
			patientName: "Новикова Анна",
			toothFdi: "46",
			material: "Металлокерамика",
			doctorName: "д-р Сидоров",
		});
		assert.ok(!EMOJI_REGEX.test(labWa));
	});

	it("3. Zero Emojis in Telephony and Leads Source Code (Mandate 8d)", () => {
		const telephonyDir = path.resolve(srcDir, "components/telephony");
		const leadsDir = path.resolve(srcDir, "components/leads");

		const checkFiles = (dir: string) => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const fullPath = path.join(dir, file);
				const stat = fs.statSync(fullPath);
				if (stat.isDirectory()) {
					if (file !== "__tests__") checkFiles(fullPath);
				} else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
					const content = fs.readFileSync(fullPath, "utf-8");
					assert.ok(!EMOJI_REGEX.test(content), `${file} must not contain emojis`);
				}
			}
		};

		checkFiles(telephonyDir);
		checkFiles(leadsDir);
	});
});
