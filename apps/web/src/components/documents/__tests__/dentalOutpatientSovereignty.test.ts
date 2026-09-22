import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("Outpatient Dental Domain Sovereignty (Mandate 8i & Mandate 8e - Wave 106)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const webSrcDir = path.resolve(__dirname, "../../..");

	test("1. ЭЛН: Режим лечения содержит только '01 - Амбулаторный', стационар и санаторий исключены", () => {
		const modalPath = path.join(
			webSrcDir,
			"components/documents/sickLeave/SickLeaveElnModal.tsx",
		);
		const modalContent = fs.readFileSync(modalPath, "utf-8");

		// Должен быть амбулаторный режим
		assert.ok(
			modalContent.includes('<option value="ambulatory">01 - Амбулаторный</option>'),
			"Селектор режима лечения обязан содержать 01 - Амбулаторный",
		);

		// Не должно быть стационарного режима
		assert.ok(
			!modalContent.includes('<option value="hospital">'),
			"Стационарный режим (02 - Стационарный) недопустим в амбулаторной стоматологии",
		);

		// Не должно быть дневного стационара
		assert.ok(
			!modalContent.includes('<option value="day_hospital">'),
			"Дневной стационар (03 - Дневной стационар) недопустим в амбулаторной стоматологии",
		);

		// Не должно быть санаторно-курортного режима
		assert.ok(
			!modalContent.includes('<option value="sanatorium">'),
			"Санаторно-курортный режим (04 - Санаторно-курортный) недопустим в амбулаторной стоматологии",
		);
	});

	test("2. DocumentsView: Форма 025/у исключена из каталога создания документов в пользу 043/у", () => {
		const docViewPath = path.join(webSrcDir, "DocumentsView.tsx");
		const docViewContent = fs.readFileSync(docViewPath, "utf-8");

		// clinicalKinds не должен содержать outpatient_medical_card_025u
		const clinicalKindsMatch = docViewContent.match(
			/const clinicalKinds = useMemo\(\s*\(\) =>\s*new Set<DocumentKind>\(\[([\s\S]*?)\]\),/m,
		);
		assert.ok(clinicalKindsMatch && clinicalKindsMatch[1], "clinicalKinds должен быть определен");
		const clinicalKindsStr = clinicalKindsMatch[1]!;
		assert.ok(
			!clinicalKindsStr.includes('"outpatient_medical_card_025u"'),
			"clinicalKinds не должен содержать outpatient_medical_card_025u",
		);

		// certificatesSanpinKinds не должен содержать outpatient_medical_card_025u
		const certKindsMatch = docViewContent.match(
			/const certificatesSanpinKinds = useMemo\(\s*\(\) =>\s*new Set<DocumentKind>\(\[([\s\S]*?)\]\),/m,
		);
		assert.ok(certKindsMatch && certKindsMatch[1], "certificatesSanpinKinds должен быть определен");
		const certKindsStr = certKindsMatch[1]!;
		assert.ok(
			!certKindsStr.includes('"outpatient_medical_card_025u"'),
			"certificatesSanpinKinds не должен содержать outpatient_medical_card_025u",
		);

		// sanitizedDocumentFactoryGroups должен фильтровать outpatient_medical_card_025u
		assert.ok(
			docViewContent.includes('!== "outpatient_medical_card_025u"'),
			"sanitizedDocumentFactoryGroups обязан отфильтровывать outpatient_medical_card_025u",
		);

		// При выборе 025/у должен быть авто-редирект на dental_medical_card_043u
		assert.ok(
			docViewContent.includes(
				'setSelectedDocumentKind("dental_medical_card_043u")',
			),
			"При выборе 025/у должен осуществляться редирект на стоматологическую форму 043/у",
		);

		// Старый блок формы 025/у с бюрократическими чекбоксами приказа 274н заменен на уведомление о суверенитете
		assert.ok(
			!docViewContent.includes("Карта 025/у собрана из подписанных медицинских записей"),
			"Чекбокс карты 025/у должен быть устранен",
		);
		assert.ok(
			!docViewContent.includes("Структура сверена с приказом Минздрава России от 13.05.2025 N 274н"),
			"Чекбокс приказа 274н для 025/у должен быть устранен",
		);
	});

	test("3. documentValidators: validateOutpatientMedicalCard025U ликвидирован в пользу суверенитета 043/у", () => {
		const docValidatorsPath = path.join(webSrcDir, "documentValidators.ts");
		const docValidatorsContent = fs.readFileSync(docValidatorsPath, "utf-8");

		assert.ok(
			!docValidatorsContent.includes("validateOutpatientMedicalCard025U"),
			"validateOutpatientMedicalCard025U полностью ликвидирован из documentValidators.ts",
		);
		assert.ok(
			!docValidatorsContent.includes("outpatient_medical_card_025u:"),
			"outpatient_medical_card_025u исключен из реестра documentValidators",
		);
	});

	test("4. AppointmentCard: кнопка 'Завершить' при открытом визите не блокирует врача ошибкой (Мандат 8e)", () => {
		const cardPath = path.join(
			webSrcDir,
			"components/schedule/AppointmentCard.tsx",
		);
		const cardContent = fs.readFileSync(cardPath, "utf-8");

		// Ошибка "Статус приема заблокирован: по этому приему открыт активный визит" в handleQuickStatusChange устранена
		assert.ok(
			!cardContent.includes(
				'showToast(\n\t\t\t\t\t"Статус приема заблокирован: по этому приему открыт активный визит"',
			) &&
			!cardContent.includes(
				'showToast("Статус приема заблокирован: по этому приему открыт активный визит", "error")',
			),
			"Грубая блокирующая ошибка в handleQuickStatusChange устранена",
		);

		// Вместо ошибки - мягкий переход в активный визит для сохранения протокола
		assert.ok(
			cardContent.includes("Переход в активный визит для сохранения протокола и завершения приёма"),
			"Врачу показывается информирование о переходе в активный визит для штатного завершения",
		);
		assert.ok(
			cardContent.includes('useAppStore.getState().setCurrentView("visit")'),
			"Осуществляется переход во вью визита в ЭМК",
		);
	});
});
