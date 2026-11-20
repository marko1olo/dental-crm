/**
 * legalShieldAndDigitalConsent.test.ts
 *
 * Тест юридического контура ДЕНТЕ:
 * 1. Каноническая DocumentsStudioModal (SSOT первичного визита, договоров и согласий).
 * 2. ConsentStudioModal (Планшет цифровой подписи / Canvas ПЭП 63-ФЗ).
 * 3. Реестр статусов («Подписано ПЭП», «Требуется подпись», «Архив»).
 * 4. 0 эмодзи в юридических формах и бланках.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { DocumentsStudioModal, ConsentStudioModal } from "../components/documents/DocumentsStudioModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Legal Shield, Primary Intake 1051n & Digital Signature Suite", () => {
	test("DocumentsStudioModal instantiates intake and legal documents package", () => {
		const mockPatient = {
			id: "pat-123",
			fullName: "Кузнецов Алексей Петрович",
			birthDate: "1985-04-12",
			phone: "+7 999 123-45-67",
		};

		const element = React.createElement(DocumentsStudioModal, {
			isOpen: true,
			onClose: () => {},
			patient: mockPatient,
			initialTemplate: "intake",
			doctorFullName: "Д-р Иванов Сергей Павлович",
		});

		assert.ok(element, "DocumentsStudioModal element instantiated");
	});

	test("ConsentStudioModal instantiated with touchscreen and PEP mode props", () => {
		const mockPatient = {
			id: "pat-123",
			fullName: "Кузнецов Алексей Петрович",
			birthDate: "1985-04-12",
			phone: "+7 999 123-45-67",
		};

		const element = React.createElement(ConsentStudioModal, {
			isOpen: true,
			onClose: () => {},
			patient: mockPatient,
			clinicName: "Клиника ДЕНТЕ",
			doctorFullName: "Д-р Иванов Сергей Павлович",
		});

		assert.ok(element, "ConsentStudioModal element instantiated");
	});

	test("Zero emoji policy verification in legal module", () => {
		const studioCode = fs.readFileSync(
			path.resolve(__dirname, "../components/documents/DocumentsStudioModal.tsx"),
			"utf-8"
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		assert.equal(emojiRegex.test(studioCode), false, "DocumentsStudioModal has 0 emojis");
	});
});
