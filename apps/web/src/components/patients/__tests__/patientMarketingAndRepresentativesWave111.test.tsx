import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";

test("Wave 111 — PatientGeneralInfoTab renders marketing source chips", () => {
	const markup = renderToStaticMarkup(
		<PatientGeneralInfoTab
			patient={{
				fullName: "Пациент Тестовый",
				phone: "+7 (999) 000-00-00",
				acquisitionSource: "2GIS (ДубльГис)",
			}}
		/>,
	);

	assert.ok(markup.includes("Канал привлечения пациента (Маркетинг"));
	assert.ok(markup.includes('data-testid="chip-marketing-gis2"'));
	assert.ok(markup.includes('data-testid="chip-marketing-yandex"'));
	assert.ok(markup.includes('data-testid="chip-marketing-word_of_mouth"'));
});

test("Wave 111 — PatientGeneralInfoTab renders statutory legal representative chips and inputs", () => {
	const markup = renderToStaticMarkup(
		<PatientGeneralInfoTab
			patient={{
				fullName: "Несовершеннолетний Пациент",
				representativeType: "Мать",
				representativeFullName: "Мать Пациента",
				representativePhone: "+7 (916) 111-22-33",
				representativeDoc: "Свидетельство о рождении I-МЮ №123456",
			}}
		/>,
	);

	assert.ok(markup.includes("Законный представитель / Член семьи"));
	assert.ok(markup.includes('data-testid="chip-representative-mother"'));
	assert.ok(markup.includes('data-testid="chip-representative-father"'));
	assert.ok(markup.includes('data-testid="input-representative-fullname"'));
	assert.ok(markup.includes('data-testid="input-representative-phone"'));
	assert.ok(markup.includes('data-testid="input-representative-doc"'));
});
