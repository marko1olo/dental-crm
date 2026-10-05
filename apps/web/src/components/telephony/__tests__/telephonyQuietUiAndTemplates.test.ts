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

// Regular expression to detect unicode emojis
const EMOJI_REGEX = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]/;

describe("Telephony Quiet UI & Communication Templates Suite (Mandates 8b, 8d, 8e, 8n, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	it("1. Patient-Facing WhatsApp / SMS Templates — 100% Emoji-Free (Mandate 8d)", () => {
		// Confirmation template
		const confMsg = generateAppointmentConfirmationMessage({
			patientName: "Алексей Смирнов",
			doctorName: "д-р Иванов И.И.",
			appointmentStartsAt: "2026-09-30T14:30:00.000Z",
			clinicName: "DENTE",
			clinicAddress: "ул. Ленина, 42",
			templateType: "confirmation",
		});
		assert.ok(!EMOJI_REGEX.test(confMsg), "Confirmation template must not contain emojis");
		assert.ok(confMsg.includes("Здравствуйте, Алексей Смирнов!"), "Must have polite Russian greeting");
		assert.ok(confMsg.includes("DENTE"), "Must include clinic name");
		assert.ok(confMsg.includes("Иванов И.И."), "Must include doctor name");

		// Reminder template
		const remMsg = generateAppointmentConfirmationMessage({
			patientName: "Ольга Петрова",
			doctorName: "д-р Сидорова А.А.",
			appointmentStartsAt: "2026-09-30T10:00:00.000Z",
			clinicName: "DENTE",
			templateType: "reminder",
		});
		assert.ok(!EMOJI_REGEX.test(remMsg), "Reminder template must not contain emojis");
		assert.ok(remMsg.includes("Здравствуйте, Ольга Петрова!"), "Must have polite Russian greeting");
		assert.ok(remMsg.includes("Пожалуйста, приходите за 5-10 минут"), "Must have polite reminder text");

		// Urgent appointment template
		const urgMsg = generateAppointmentConfirmationMessage({
			patientName: "Дмитрий Кузнецов",
			doctorName: "д-р Смирнов В.В.",
			appointmentStartsAt: "2026-09-30T11:00:00.000Z",
			clinicName: "DENTE",
			clinicAddress: "ул. Мира, 10",
			templateType: "urgent",
		});
		assert.ok(!EMOJI_REGEX.test(urgMsg), "Urgent template must not contain emojis");
		assert.ok(urgMsg.includes("Здравствуйте, Дмитрий Кузнецов!"), "Must have polite Russian greeting");
		assert.ok(urgMsg.includes("срочный приём"), "Must indicate urgent visit");
	});

	it("2. Orthopedic Ready Templates — 100% Emoji-Free & Natural Clinical Russian (Mandates 8b, 8d)", () => {
		// Orthopedic SMS
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
		assert.ok(!EMOJI_REGEX.test(orthoSms), "Orthopedic SMS must not contain emojis");
		assert.ok(orthoSms.includes("Елена, ваша работа (Диоксид циркония, зуб 16, 17) поступила в клинику DENTE"));
		assert.ok(orthoSms.includes("Иванов И.И."));

		// Orthopedic WhatsApp
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
		assert.ok(!EMOJI_REGEX.test(orthoWa), "Orthopedic WhatsApp must not contain emojis");
		assert.ok(orthoWa.includes("Добрый день, Елена! Рады сообщить, что ваша ортопедическая работа по наряду № ORD-2026-042"));
		assert.ok(orthoWa.includes("С заботой, стоматология DENTE!"));

		// Lab modal SMS wrapper
		const labSms = generateReadyInClinicSmsTemplate({
			orderNumber: "ORD-101",
			patientName: "Новикова Анна",
			toothFdi: "46",
			material: "Металлокерамика",
			doctorName: "д-р Сидоров",
		});
		assert.ok(!EMOJI_REGEX.test(labSms), "Lab SMS must not contain emojis");
		assert.ok(labSms.includes("Анна, ваша работа (Металлокерамика, зуб 46) поступила в клинику DENTE"));

		// Lab modal WhatsApp wrapper
		const labWa = generateReadyInClinicWhatsAppTemplate({
			orderNumber: "ORD-101",
			patientName: "Новикова Анна",
			toothFdi: "46",
			material: "Металлокерамика",
			doctorName: "д-р Сидоров",
		});
		assert.ok(!EMOJI_REGEX.test(labWa), "Lab WhatsApp must not contain emojis");
		assert.ok(labWa.includes("Добрый день, Анна! Рады сообщить"));
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
					assert.ok(
						!EMOJI_REGEX.test(content),
						`Source file ${file} must not contain unicode emojis (Mandate 8d anti-emoji rule)`,
					);
				}
			}
		};

		checkFiles(telephonyDir);
		checkFiles(leadsDir);
	});

	it("4. Quiet UI: Non-Blocking Translucent Dynamic Island Capsule & Backdrop Blur", () => {
		const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
		const popupSource = fs.readFileSync(popupPath, "utf-8");

		// Non-blocking container
		assert.ok(
			popupSource.includes("pointer-events-none"),
			"Container must have pointer-events-none so surrounding clinical workspace remains interactive",
		);

		// Dynamic island capsule test id
		assert.ok(
			popupSource.includes('data-testid="incoming-call-capsule"'),
			"IncomingCallPopup must provide a compact dynamic island capsule",
		);

		// Translucent styling and backdrop blur
		assert.ok(
			popupSource.includes("backdrop-blur-xl"),
			"IncomingCallPopup must use backdrop-blur-xl for translucent quiet aesthetic",
		);

		// No modal blocking dialog or screen dimming
		assert.ok(
			!popupSource.includes("fixed inset-0 bg-black/50"),
			"IncomingCallPopup must NOT dim the screen with a modal overlay",
		);
	});

	it("5. Doctor Mode & Form 043/u Sterile Zone Immunity (Mandate 8e)", () => {
		const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
		const popupSource = fs.readFileSync(popupPath, "utf-8");

		assert.ok(
			popupSource.includes('selectedWorkspaceRole === "doctor" || currentView === "visit"'),
			"isDoctorMode must identify both doctor role and active visit view",
		);

		assert.ok(
			popupSource.includes("if (isDoctorMode || isDndActive) return null;"),
			"IncomingCallPopup must completely suppress popup during doctor mode to protect EMK Form 043/u",
		);
	});

	it("6. Miller's Law: Strictly <= 2 Primary Direct Buttons (Mandates 8d & 8p)", () => {
		const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
		const popupSource = fs.readFileSync(popupPath, "utf-8");

		// In ringing state: Answer and Reject
		assert.ok(
			popupSource.includes('data-testid="badge-header-answer-btn"'),
			"Header must provide 'Ответить' as primary button 1",
		);
		assert.ok(
			popupSource.includes('data-testid="badge-header-reject-btn"'),
			"Header must provide 'Сброс' as primary button 2",
		);

		// In main action row: Book and Open Card
		assert.ok(
			popupSource.includes('data-testid="badge-action-book"'),
			"Action row must provide 'Создать запись' as primary action 1",
		);
		assert.ok(
			popupSource.includes('data-testid="badge-action-card"'),
			"Action row must provide 'Открыть карту / Создать' as primary action 2",
		);

		// Secondary actions consolidated in More Menu
		assert.ok(
			popupSource.includes('data-testid="badge-more-menu-btn"'),
			"Secondary actions must be consolidated into '...' more menu button",
		);
	});
});
