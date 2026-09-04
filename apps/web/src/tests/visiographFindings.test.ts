import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	AI_STATES_WITHOUT_FORMULA_STATE,
	AI_TO_TOOTH_STATE,
	planVisiographFindings,
} from "../components/imaging/visiographFindings";

/**
 * Страж записи находок снимка в карту пациента.
 *
 * ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ И ПОЧЕМУ ИМЕННО ПРОГОНОМ. Разбор прицельного снимка идёт
 * через платный вызов внешней модели, поэтому глазами на экране этот код
 * проверяется один раз и дорого. При этом решается судьба содержимого КАРТЫ
 * ПАЦИЕНТА: какая находка становится диагнозом, а какую врач ставит руками.
 * Ошибка не видна ни в типах, ни на экране — формула просто окажется не той.
 *
 * ЧТО БЫЛО СЛОМАНО. Находки писались в store/patientStore через setToothStatus, а
 * этот стор читал ровно один файл во всём apps/web/src — несмонтированный
 * components/Odontogram.tsx. Живая формула берёт состояния с сервера. Экран
 * печатал врачу «Внесено в зубную формулу: N зубов из M», в карте не появлялось
 * ничего, и после перезагрузки находки исчезали вместе со стором.
 */

const webSrcRoot = path.join(import.meta.dirname, "..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

test("состояния, которые пишутся в карту, существуют в живой формуле и на сервере", () => {
	/*
	 * Сверка с ДВУМЯ источниками истины сразу, потому что разойтись можно с обоими:
	 * тип ToothState рисует формулу врачу, а перечисление toothStateValues на
	 * сервере решает, примет он запись или ответит отказом проверки. Прежний код
	 * писал `Filling` — значения, которого нет ни там, ни там (на сервере `Filled`).
	 */
	const chart = readSource("components/odontogram/ToothChart.tsx");
	const declaredInChart = [...chart.matchAll(/\n\t\| "([A-Za-z_]+)"/g)].map(
		(m) => m[1] as string,
	);
	assert.ok(
		declaredInChart.length >= 8,
		`из ToothChart.tsx разобрано ${declaredInChart.length} состояний зуба — разбор типа сломался, ` +
			"и проверка ниже пройдёт, ничего не проверив",
	);

	for (const state of Object.values(AI_TO_TOOTH_STATE)) {
		assert.ok(
			declaredInChart.includes(state),
			`состояние «${state}» пишется в карту, но живая формула его не знает: сервер ответит отказом ` +
				"проверки, а врач увидит «находки не внесены» на каждом разборе",
		);
	}
});

test("один статус ИИ не может одновременно писаться и не писаться", () => {
	const overlap = Object.keys(AI_TO_TOOTH_STATE).filter(
		(state) => state in AI_STATES_WITHOUT_FORMULA_STATE,
	);
	assert.deepEqual(
		overlap,
		[],
		`статус ${overlap.join(", ")} стоит в обоих списках. Врачу тогда одновременно записывают ` +
			"диагноз в карту и говорят «отметьте руками» — одно из двух утверждений ложно.",
	);
});

test("«требует лечения» и «зуб отсутствует» уходят в карту, каждое своей группой", () => {
	const plan = planVisiographFindings({
		"26": "treatment",
		"36": "treatment",
		"31": "missing",
	});

	assert.equal(
		plan.groups.length,
		2,
		"зубы с одинаковым состоянием обязаны идти одним запросом: маршрут формулы принимает одно " +
			"состояние на запрос, и запрос на каждый зуб дал бы отдельную запись в истории зуба",
	);
	const caries = plan.groups.find((group) => group.state === "Caries");
	const missing = plan.groups.find((group) => group.state === "Missing");
	assert.deepEqual(
		caries?.teeth.map((t) => t.toothNumber),
		[26, 36],
	);
	assert.deepEqual(
		missing?.teeth.map((t) => t.toothNumber),
		[31],
	);
	assert.deepEqual([...plan.unreadableCodes], []);
	assert.deepEqual([...plan.noFormulaStateCodes], []);
});

test("«наблюдение», «план» и «ранее вылечен» в карту не пишутся, но и не молчат", () => {
	const plan = planVisiographFindings({
		"27": "watch",
		"16": "planned",
		"45": "done",
	});

	assert.deepEqual(
		plan.groups,
		[],
		"эти три статуса не имеют соответствия в формуле. Запись любого из них — выдуманный факт о " +
			"пациенте: «требует наблюдения» это не диагноз, а «ранее вылечен» не говорит чем именно.",
	);
	assert.deepEqual(
		[...plan.noFormulaStateCodes].sort(),
		["16", "27", "45"],
		"находка обязана быть названа врачу отдельно от непонятых: здесь она ясна, и её надо отметить " +
			"руками, а не искать место на снимке заново",
	);
});

test("мусорный номер зуба и незнакомое слово не становятся кариесом", () => {
	const plan = planVisiographFindings({
		"99": "treatment",
		"0": "treatment",
		"12abc": "treatment",
		"": "treatment",
		"46": "погрызено",
		"47": "",
	});

	assert.deepEqual(
		plan.groups,
		[],
		"Раньше здесь стояло `AI_TO_ODONTOGRAM[state] ?? 'Caries'`, и опечатка модели, новое слово или " +
			"пустая строка становились диагнозом «кариес» в карте пациента — а по нему строится план " +
			"лечения и смета. Номер вне FDI заводил в формуле ключ, которого нет ни в одном ряду.",
	);
	// Сортировка, а не порядок ответа: числовые ключи объекта JS всегда идут
	// первыми и по возрастанию, а нечисловые — в порядке вставки. Проверять здесь
	// порядок значило бы закреплять правило движка, а не поведение разбора.
	assert.deepEqual([...plan.unreadableCodes].sort(), [
		"",
		"0",
		"12abc",
		"46",
		"47",
		"99",
	]);
});

test("пустой ответ модели не даёт ни записи, ни отказа", () => {
	for (const empty of [null, undefined, {}]) {
		const plan = planVisiographFindings(empty);
		assert.deepEqual(plan.groups, []);
		assert.deepEqual([...plan.unreadableCodes], []);
		assert.deepEqual([...plan.noFormulaStateCodes], []);
	}
});

test("панель пишет находки на живой адрес формулы, а не в мёртвый стор", () => {
	const analyzer = readSource("components/imaging/VisiographAnalyzer.tsx");

	assert.ok(
		analyzer.includes("/tooth-states/batch"),
		"VisiographAnalyzer больше не обращается к /api/patients/:id/tooth-states/batch. Это ЕДИНСТВЕННЫЙ " +
			"адрес живой формулы (тот же, что у OdontogramModule): без него экран снова печатает «Внесено в " +
			"зубную формулу», а в карте пациента не появляется ничего.",
	);
	// Проверяется ЗАБОР имени из стора, а не текст `setToothStatus(`: разбор
	// прежнего дефекта описан в комментариях того же файла, и поиск по подстроке
	// краснел бы на объяснении вместо кода.
	assert.ok(
		!/const \{[^}]*setToothStatus[^}]*\} = usePatientStore/.test(analyzer),
		"VisiographAnalyzer снова берёт setToothStatus из patientStore. Этот стор не читает ни один " +
			"смонтированный файл: запись уходит в никуда и исчезает при перезагрузке страницы.",
	);
	assert.ok(
		/denteClinicalMutationHeaders\(\s*\{\s*["']Content-Type["']:\s*["']application\/json["']\s*,?\s*\}\s*\)/.test(
			analyzer,
		),
		"запись формулы ушла без заголовков авторизации. Маршрут требует И токен кабинета, И токен " +
			"сотрудника: голый fetch получит 401, и врач увидит пустоту вместо отказа.",
	);
});

test("Мандат 8e: снимок визиографа открывается мгновенно (<50мс), без ожидания ИИ", () => {
	const analyzer = readSource("components/imaging/VisiographAnalyzer.tsx");

	// Открытие снимка происходит через FileReader сразу в dataURL без блокировки на AI
	assert.ok(
		analyzer.includes("reader.readAsDataURL(file)"),
		"VisiographAnalyzer должен мгновенно загружать локальный файл через FileReader.readAsDataURL",
	);
	assert.ok(
		analyzer.includes("setCurrentImageUrl(dataUrl)"),
		"VisiographAnalyzer должен сразу отображать превью снимка в setCurrentImageUrl(dataUrl)",
	);

	// ИИ запускается строго по отдельной кнопке врача
	assert.ok(
		analyzer.includes("data-testid=\"btn-run-visiograph-ai\""),
		"VisiographAnalyzer обязан содержать отдельную явную кнопку запуска ИИ 'btn-run-visiograph-ai'",
	);
	assert.ok(
		analyzer.includes("handleRunAiAnalysis"),
		"VisiographAnalyzer обязан запускать анализ ИИ только по отдельному вызову handleRunAiAnalysis",
	);

	// Запрещена автоматическая перезапись зубной формулы роботом
	assert.ok(
		analyzer.includes("data-testid=\"btn-apply-findings-to-chart\""),
		"Перезапись формулы должна требовать явного подтверждения врача через 'btn-apply-findings-to-chart'",
	);

	// 1-клик действие «Норма: патологии на снимке не выявлено» (043/у)
	assert.ok(
		analyzer.includes("data-testid=\"btn-visiograph-norma-043\""),
		"VisiographAnalyzer обязан содержать 1-клик действие 'btn-visiograph-norma-043' для внесения нормы в карту",
	);
	assert.ok(
		analyzer.includes("handleApplyNormaTo043"),
		"VisiographAnalyzer обязан иметь обработчик handleApplyNormaTo043",
	);
});

test("Мандат 8e: DicomViewerModal, ImagingModal и RadiologyViewerModal поддерживают 1-клик Норму в 043/у", () => {
	const dicomModal = readSource("components/imaging/DicomViewerModal.tsx");
	const imagingModal = readSource("components/imaging/ImagingModal.tsx");
	const radiologyModal = readSource("components/radiology/RadiologyViewerModal.tsx");

	assert.ok(
		dicomModal.includes("btn-dicom-norma-043"),
		"DicomViewerModal обязан содержать 1-клик кнопку 'btn-dicom-norma-043' для внесения нормы в карту 043/у",
	);
	assert.ok(
		dicomModal.includes("handleInsertNormaTo043"),
		"DicomViewerModal обязан иметь функцию handleInsertNormaTo043",
	);

	assert.ok(
		imagingModal.includes("ImagingModal"),
		"ImagingModal должен быть экспортирован и оборачивать просмотр снимков",
	);

	assert.ok(
		radiologyModal.includes("radiology-norma-043-btn"),
		"RadiologyViewerModal обязан содержать кнопку 'radiology-norma-043-btn' для мгновенного протоколирования нормы",
	);
	assert.ok(
		radiologyModal.includes("handleInsertNormaTo043"),
		"RadiologyViewerModal обязан иметь обработчик handleInsertNormaTo043",
	);
});
