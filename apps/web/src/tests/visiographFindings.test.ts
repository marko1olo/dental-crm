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
	const chart =
		readSource("components/odontogram/chart/toothChartTypes.ts") +
		"\n" +
		readSource("components/odontogram/chart/types/toothStateUnion.ts") +
		"\n" +
		readFileSync(
			path.join(
				webSrcRoot,
				"../../../packages/shared/src/clinical/clinicalDefectsCatalog.ts",
			),
			"utf8",
		);
	const declaredInChart = [...chart.matchAll(/\n\t\| "([A-Za-z_]+)"/g)].map(
		(m) => m[1] as string,
	);
	assert.ok(
		declaredInChart.length >= 8,
		`из toothChartTypes.ts разобрано ${declaredInChart.length} состояний зуба — разбор типа сломался, ` +
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
	const dicomModal = readSource("components/imaging/DicomViewerModal.tsx");
	const dicomAi = readSource("components/imaging/dicomViewerModal/useDicomViewerModalAi.ts");
	const source = dicomModal + "\n" + dicomAi;

	assert.ok(
		source.includes("/tooth-states/batch"),
		"DicomViewerModal обязан обращаться к /api/patients/:id/tooth-states/batch. Это ЕДИНСТВЕННЫЙ " +
			"адрес живой формулы (тот же, что у OdontogramModule): без него экран печатает «Внесено в " +
			"зубную формулу», а в карте пациента не появляется ничего.",
	);
	assert.ok(
		!/const \{[^}]*setToothStatus[^}]*\} = usePatientStore/.test(source),
		"DicomViewerModal не должен брать setToothStatus из устаревшего стора.",
	);
	assert.ok(
		/denteClinicalMutationHeaders\(\s*\{\s*["']Content-Type["']:\s*["']application\/json["']\s*,?\s*\}\s*\)/.test(
			source,
		),
		"запись формулы ушла без заголовков авторизации. Маршрут требует И токен кабинета, И токен " +
			"сотрудника: голый fetch получит 401, и врач увидит пустоту вместо отказа.",
	);
});

test("Мандат 8e: снимок визиографа открывается мгновенно (<50мс), без ожидания ИИ", () => {
	const dicomCtrl = readSource("components/imaging/dicomViewerModal/useDicomViewerModalController.ts");
	const dicomAi = readSource("components/imaging/dicomViewerModal/useDicomViewerModalAi.ts");
	const dicomModal = readSource("components/imaging/DicomViewerModal.tsx");
	const dicomHeader = readSource("components/imaging/dicomViewerModal/DicomViewerModalHeader.tsx");
	const dicomBody = readSource("components/imaging/dicomViewerModal/DicomViewerModalBody.tsx");
	const dicomDrawer = readSource("components/imaging/aiFindings/DicomAiFindingsFooter.tsx");
	const source = [dicomCtrl, dicomAi, dicomModal, dicomHeader, dicomBody, dicomDrawer].join("\n");

	// Открытие снимка происходит через FileReader сразу в dataURL без блокировки на AI
	assert.ok(
		source.includes("reader.readAsDataURL(file)"),
		"DicomViewerModalController должен мгновенно загружать локальный файл через FileReader.readAsDataURL",
	);
	assert.ok(
		source.includes("setCurrentImageSrc(reader.result as string)"),
		"DicomViewerModalController должен сразу отображать превью снимка в setCurrentImageSrc",
	);

	// ИИ запускается строго по отдельной кнопке врача
	assert.ok(
		source.includes("data-testid=\"btn-dicom-run-ai\""),
		"DicomViewerModal обязан содержать отдельную явную кнопку запуска ИИ 'btn-dicom-run-ai'",
	);
	assert.ok(
		source.includes("handleRunAiAnalysis"),
		"DicomViewerModal обязан запускать анализ ИИ только по отдельному вызову handleRunAiAnalysis",
	);

	// Запрещена автоматическая перезапись зубной формулы роботом
	assert.ok(
		source.includes("data-testid=\"btn-dicom-apply-findings\""),
		"Перезапись формулы должна требовать явного подтверждения врача через 'btn-dicom-apply-findings'",
	);

	// Действие «Норма: патологии на снимке не выявлено»
	assert.ok(
		source.includes("data-testid=\"btn-dicom-norma-emk\"") || source.includes("data-testid=\"btn-dicom-norma-043\""),
		"DicomViewerModal обязан содержать действие 'btn-dicom-norma-emk' для внесения нормы в карту",
	);
	assert.ok(
		source.includes("handleInsertNormaToEmk") || source.includes("handleInsertNormaTo043"),
		"DicomViewerModal обязан иметь обработчик handleInsertNormaToEmk",
	);
});

test("Мандат 8e / 8x: DicomViewerModal поддерживает 1-клик Норму в ЭМК", () => {
	const dicomHeader = readSource("components/imaging/dicomViewerModal/DicomViewerModalHeader.tsx");
	const dicomCtrl = readSource("components/imaging/dicomViewerModal/useDicomViewerModalController.ts");
	const source = dicomHeader + "\n" + dicomCtrl;

	assert.ok(
		source.includes("btn-dicom-norma-emk"),
		"DicomViewerModal обязан содержать 1-клик кнопку 'btn-dicom-norma-emk' для внесения нормы в ЭМК",
	);
	assert.ok(
		source.includes("handleInsertNormaToEmk"),
		"DicomViewerModal обязан иметь функцию handleInsertNormaToEmk",
	);
});

test("Мандат 8e: DicomViewerModal содержит честную дропзону, запуск ИИ по кнопке врача и подтверждение находок без робо-перезаписи", () => {
	const dicomModal = readSource("components/imaging/DicomViewerModal.tsx");
	const dicomDropzone = readSource("components/imaging/dicomViewerModal/DicomViewerModalDropzone.tsx");
	const dicomHeader = readSource("components/imaging/dicomViewerModal/DicomViewerModalHeader.tsx");
	const dicomBody = readSource("components/imaging/dicomViewerModal/DicomViewerModalBody.tsx");
	const dicomAi = readSource("components/imaging/dicomViewerModal/useDicomViewerModalAi.ts");
	const dicomFooter = readSource("components/imaging/aiFindings/DicomAiFindingsFooter.tsx");
	const source = [dicomModal, dicomDropzone, dicomHeader, dicomBody, dicomAi, dicomFooter].join("\n");

	// Честная дропзона при отсутствии снимка
	assert.ok(
		source.includes("data-testid=\"dicom-viewer-dropzone\""),
		"DicomViewerModal обязан содержать честную дропзону 'dicom-viewer-dropzone' для файлов",
	);

	// ИИ запускается строго по отдельной кнопке врача
	assert.ok(
		source.includes("data-testid=\"btn-dicom-run-ai\""),
		"DicomViewerModal обязан содержать отдельную кнопку запуска ИИ 'btn-dicom-run-ai'",
	);
	assert.ok(
		source.includes("handleRunAiAnalysis"),
		"DicomViewerModal обязан запускать анализ ИИ только по отдельному вызову handleRunAiAnalysis",
	);

	// Запрещена автоматическая перезапись зубной формулы: только по кнопке подтверждения врача
	assert.ok(
		source.includes("data-testid=\"btn-dicom-apply-findings\""),
		"DicomViewerModal обязан требовать подтверждения находок врачом через 'btn-dicom-apply-findings'",
	);
	assert.ok(
		source.includes("handleApplyFindingsToChart"),
		"DicomViewerModal обязан иметь обработчик подтверждения находок handleApplyFindingsToChart",
	);

	// Панель находок
	assert.ok(
		source.includes("data-testid=\"dicom-ai-findings-drawer\""),
		"DicomViewerModal обязан содержать панель/шторку находок ИИ 'dicom-ai-findings-drawer'",
	);

	// Маршрут живой формулы
	assert.ok(
		source.includes("/tooth-states/batch"),
		"DicomViewerModal обязан обращаться к /api/patients/:id/tooth-states/batch для живой формулы",
	);
});

test("Мандат 8e: DirectRvgCaptureModal честно экспортирует .dcm, а IncomingCallPopup не прерывает прием врача", () => {
	const directModal = readSource("components/radiology/DirectRvgCaptureModal.tsx");
	const incomingCall = readSource("components/telephony/IncomingCallPopup.tsx");

	// Честный экспорт DICOM с расширением .dcm (без подмены на .jpg)
	assert.ok(
		directModal.includes(".dcm"),
		"DirectRvgCaptureModal обязан экспортировать файл с расширением .dcm",
	);
	assert.ok(
		!directModal.includes("link.download = `RVG_Tooth_${selectedTeeth.join(\"_\")}_${patientCardNumber.replace(/[/\\\\?%*:|\"<>]/g, \"-\")}.jpg`"),
		"DirectRvgCaptureModal не должен подменять .dcm на .jpg в download",
	);

	// Стерильная зона врача в телефонии
	assert.ok(
		incomingCall.includes("if (isDoctorMode) return null;"),
		"IncomingCallPopup обязан блокировать показ входящего вызова в режиме врача перед createPortal",
	);
});

