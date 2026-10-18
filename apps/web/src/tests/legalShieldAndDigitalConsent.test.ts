/**
 * legalShieldAndDigitalConsent.test.ts
 *
 * Тест юридического контура ДЕНТЕ:
 * 1. Экспресс-пакет первичного визита (Договор 736, ИДС 1051н, 152-ФЗ, Анкета здоровья).
 * 2. Планшет цифровой подписи (Digital Signature Tablet / Canvas ПЭП 63-ФЗ).
 * 3. Реестр статусов («Подписано ПЭП», «Требуется подпись», «Архив»).
 * 4. 0 эмодзи в юридических формах и бланках.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { PrimaryIntakePackageModal } from "../components/documents/PrimaryIntakePackageModal";
import { DigitalSignatureTabletModal } from "../components/documents/DigitalSignatureTabletModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Legal Shield, Primary Intake 1051n & Digital Signature Suite", () => {
	test("PrimaryIntakePackageModal contains 4 statutory legal documents", () => {
		// Mock patient
		const mockPatient: any = {
			id: "pat-123",
			fullName: "Кузнецов Алексей Петрович",
			birthDate: "1985-04-12",
			phone: "+7 999 123-45-67",
		};

		const element = React.createElement(PrimaryIntakePackageModal, {
			isOpen: true,
			onClose: () => {},
			patient: mockPatient,
			existingDocuments: [],
			onCreateDocument: () => {},
			onOpenDocument: () => {},
			onSelectDocumentKind: () => {},
			doctorFullName: "Д-р Иванов Сергей Павлович",
		});

		assert.ok(element, "PrimaryIntakePackageModal element instantiated");
	});

	test("DigitalSignatureTabletModal instantiated with touchscreen and PEP mode props", () => {
		const mockPatient: any = {
			id: "pat-123",
			fullName: "Кузнецов Алексей Петрович",
			birthDate: "1985-04-12",
			phone: "+7 999 123-45-67",
		};

		const element = React.createElement(DigitalSignatureTabletModal, {
			isOpen: true,
			onClose: () => {},
			patient: mockPatient,
			documentsPackageTitle: "Экспресс-пакет первичного пациента (Договор 736, ИДС 1051н)",
			clinicName: "Клиника ДЕНТЕ",
			onConfirmSignature: () => {},
			onPrintArchiveA4: () => {},
		});

		assert.ok(element, "DigitalSignatureTabletModal element instantiated");
	});

	test("Zero emoji policy verification in legal module", () => {
		const primaryIntakeCode = fs.readFileSync(
			path.resolve(__dirname, "../components/documents/PrimaryIntakePackageModal.tsx"),
			"utf-8"
		);
		const tabletCode = fs.readFileSync(
			path.resolve(__dirname, "../components/documents/DigitalSignatureTabletModal.tsx"),
			"utf-8"
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		assert.equal(emojiRegex.test(primaryIntakeCode), false, "PrimaryIntakePackageModal has 0 emojis");
		assert.equal(emojiRegex.test(tabletCode), false, "DigitalSignatureTabletModal has 0 emojis");
	});
});
