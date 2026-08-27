/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 109 / ФОРМА № 043-1/у: МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА
 * (HL7 CDA R2 / МИНЗДРАВ РФ / ПРИКАЗ 911Н / КЛАССИФИКАТОРЫ НСИ)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import { escapeXml } from "./c14n.js";
import { generateClinicalDocumentHeader } from "./header.js";
import { normalizeSurfaces } from "./generator101.js";
import type { CdaSemd043_1uParams } from "./types.js";

const ANGLE_LABELS: Record<string, string> = {
	class_1: "I класс по Энглю (нейтральное смыкание)",
	class_2: "II класс по Энглю (дистальное смыкание)",
	class_2_sub_1: "II класс 1 подкласс по Энглю (дистальный прикус с протрузией резцов)",
	class_2_sub_2: "II класс 2 подкласс по Энглю (дистальный прикус с ретрузией резцов)",
	class_3: "III класс по Энглю (мезиальное смыкание)",
};

const FACIAL_TYPE_LABELS: Record<string, string> = {
	leptoprosopic: "Лептопрозоп (узкое / долихофациальное лицо)",
	mesoprosopic: "Мезопрозоп (гармоничное / мезофациальное лицо)",
	euryprosopic: "Эурипрозоп (широкое / брахифациальное лицо)",
};

const PROFILE_LABELS: Record<string, string> = {
	straight: "Прямой профиль",
	convex: "Выпуклый профиль",
	concave: "Вогнутый профиль",
};

const SKELETAL_CLASS_LABELS: Record<string, string> = {
	class_1: "Скелетный класс I (гармоничное соотношение челюстей)",
	class_2_sub_1: "Скелетный класс II подкласс 1 (ретрогнатия н/ч или прогнатия в/ч)",
	class_2_sub_2: "Скелетный класс II подкласс 2 (дистальный тип)",
	class_3: "Скелетный класс III (прогнатия н/ч или ретрогнатия в/ч)",
};

const APPLIANCE_LABELS: Record<string, string> = {
	metal_braces_standard: "Металлическая лигатурная брекет-система",
	metal_braces_self_ligating: "Металлическая самолигирующая брекет-система",
	ceramic_braces_aesthetic: "Керамическая / сапфировая эстетическая брекет-система",
	lingual_braces: "Лингвальная брекет-система",
	clear_aligners: "Прозрачные ортодонтические элайнеры (серия кап)",
	rapid_palatal_expander_haas: "Несъемный нёбный расширитель (аппарат Хааса / Марко Роса)",
	functional_twin_block: "Функциональный двучелюстной аппарат Твин-Блок",
	plate_removable_orthodontic: "Съемная ортодонтическая пластинка",
	skeletal_anchorage_miniscrews: "Ортодонтические микровинты (скелетная опора)",
};

export function generateSemd043_1uXml(params: CdaSemd043_1uParams): string {
	const headerXml = generateClinicalDocumentHeader({
		docKind: "109",
		docTypeNsiCode: "109",
		docTitle: "Медицинская карта ортодонтического пациента (Форма 043-1/у)",
		templateOids: [
			EGISZ_OIDS.SEMD_TEMPLATE_109,
			EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108,
			EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
		],
		documentId: params.documentId,
		documentVersion: params.documentVersion ?? 1,
		documentTime: params.documentTime,
		visitDate: params.visitDate,
		encounterId: params.encounterId,
		documentSetId: params.documentSetId,
		replacesDocumentId: params.replacesDocumentId,
		patient: params.patient,
		doctor: params.doctor,
		clinic: params.clinic,
		legalAuthenticator: params.legalAuthenticator,
	});

	// ─── 1. Клинический ортодонтический диагноз (LOINC 29548-5) ─────────────────
	const primaryIcd = params.icd10Code || "K07.2";
	const diagText = params.orthodonticDiagnosis.trim();
	const angleMolarR = params.angleMolarClassRight ? ANGLE_LABELS[params.angleMolarClassRight] || params.angleMolarClassRight : "";
	const angleMolarL = params.angleMolarClassLeft ? ANGLE_LABELS[params.angleMolarClassLeft] || params.angleMolarClassLeft : "";
	const angleCanineR = params.angleCanineClassRight ? ANGLE_LABELS[params.angleCanineClassRight] || params.angleCanineClassRight : "";
	const angleCanineL = params.angleCanineClassLeft ? ANGLE_LABELS[params.angleCanineClassLeft] || params.angleCanineClassLeft : "";

	const angleRows: string[] = [];
	if (angleMolarR) angleRows.push(`<tr><td>Смыкание первых моляров справа</td><td>${escapeXml(angleMolarR)}</td></tr>`);
	if (angleMolarL) angleRows.push(`<tr><td>Смыкание первых моляров слева</td><td>${escapeXml(angleMolarL)}</td></tr>`);
	if (angleCanineR) angleRows.push(`<tr><td>Смыкание клыков справа</td><td>${escapeXml(angleCanineR)}</td></tr>`);
	if (angleCanineL) angleRows.push(`<tr><td>Смыкание клыков слева</td><td>${escapeXml(angleCanineL)}</td></tr>`);

	const angleTableXml = angleRows.length > 0
		? `<table border="1" width="100%">
							<thead><tr><th>Окклюзионный ориентир</th><th>Классификация по Энглю</th></tr></thead>
							<tbody>${angleRows.join("")}</tbody>
						</table>`
		: "";

	const diagnosisSection = `
			<!-- Секция 1: Клинический ортодонтический диагноз -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический ортодонтический диагноз</title>
					<text>
						<paragraph><strong>Основной диагноз по МКБ-10:</strong> ${escapeXml(primaryIcd)} — ${escapeXml(diagText)}</paragraph>
						${angleTableXml}
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_OBSERVATION}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Клинический диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(primaryIcd)}" codeSystem="${EGISZ_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diagText)}"/>
						</observation>
					</entry>
				</section>
			</component>`;

	// ─── 2. Анамнез и жалобы (LOINC 10164-2) ──────────────────────────────────
	const complaintsText = params.complaints?.trim() || "";
	const anamnesisText = params.anamnesis?.trim() || "";
	const anamnesisVitaeText = params.anamnesisVitae?.trim() || "";

	const anamnesisFullText = [
		complaintsText ? `Жалобы: ${complaintsText}` : "Жалобы: нарушение эстетики улыбки, неровное положение зубов.",
		anamnesisText ? `Анамнез заболевания: ${anamnesisText}` : "",
		anamnesisVitaeText ? `Анамнез жизни: ${anamnesisVitaeText}` : "Анамнез жизни: соматически здоров, аллергоанамнез не отягощен.",
	].filter(Boolean).join("\n\n");

	const anamnesisSection = `
			<!-- Секция 2: Анамнез и жалобы -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез и жалобы"/>
					<title>Анамнез и жалобы</title>
					<text>
						<paragraph>${escapeXml(anamnesisFullText)}</paragraph>
					</text>
				</section>
			</component>`;

	// ─── 3. Антропометрия и фотометрия лица (LOINC 55286-9) ───────────────────
	const anthro = params.anthropometry;
	const anthroRows: string[] = [];
	if (anthro) {
		if (anthro.facialType) anthroRows.push(`<tr><td>Тип лица</td><td>${escapeXml(FACIAL_TYPE_LABELS[anthro.facialType] || anthro.facialType)}</td></tr>`);
		if (anthro.profileType) anthroRows.push(`<tr><td>Профиль лица</td><td>${escapeXml(PROFILE_LABELS[anthro.profileType] || anthro.profileType)}</td></tr>`);
		if (anthro.facialSymmetry) anthroRows.push(`<tr><td>Симметрия лица</td><td>${anthro.facialSymmetry === "symmetric" ? "Симметрично" : anthro.facialSymmetry === "chin_deviation_left" ? "Смещение подбородка влево" : "Смещение подбородка вправо"}</td></tr>`);
		if (anthro.chinDeviationMm !== undefined) anthroRows.push(`<tr><td>Смещение подбородка</td><td>${anthro.chinDeviationMm} мм</td></tr>`);
		if (anthro.nasolabialAngleDegrees !== undefined) anthroRows.push(`<tr><td>Носогубный угол</td><td>${anthro.nasolabialAngleDegrees}° (норма 90-110°)</td></tr>`);
		if (anthro.mentolabialSulcus) anthroRows.push(`<tr><td>Подбородочно-губная борозда</td><td>${anthro.mentolabialSulcus === "normal" ? "Выражена умеренно (норма)" : anthro.mentolabialSulcus === "deep_pronounced" ? "Глубокая" : "Сглажена"}</td></tr>`);
		if (anthro.lipCompetenceAtRest) anthroRows.push(`<tr><td>Смыкание губ в покое</td><td>${anthro.lipCompetenceAtRest === "competent_closed" ? "Смыкаются без напряжения" : anthro.lipCompetenceAtRest === "incompetent_open" ? "Не смыкаются" : "Смыкаются с напряжением"}</td></tr>`);
		if (anthro.incisalDisplayAtSmileMm !== undefined) anthroRows.push(`<tr><td>Экспозиция резцов при улыбке</td><td>${anthro.incisalDisplayAtSmileMm} мм</td></tr>`);
		if (anthro.gummySmileMm !== undefined) anthroRows.push(`<tr><td>Десневая улыбка</td><td>${anthro.gummySmileMm > 0 ? `${anthro.gummySmileMm} мм` : "Отсутствует (норма)"}</td></tr>`);
		anthroRows.push(`<tr><td>Фотопротокол</td><td>${anthro.photoProtocolCompleted ? "Выполнен в полном объеме (анфас, профиль, внутриротовые)" : "Не выполнен"}</td></tr>`);
	}

	const anthropometrySection = anthroRows.length > 0
		? `
			<!-- Секция 3: Антропометрия и фотометрия лица -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_FACIAL_ANTHROPOMETRY}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Антропометрия лица"/>
					<title>Антропометрия и фотометрия лица</title>
					<text>
						<table border="1" width="100%">
							<thead><tr><th>Параметр антропометрии</th><th>Значение</th></tr></thead>
							<tbody>${anthroRows.join("")}</tbody>
						</table>
					</text>
				</section>
			</component>`
		: "";

	// ─── 4. Цефалометрический анализ ТРГ (LOINC 55287-7) ────────────────────────
	const ceph = params.cephalometry;
	const cephRows: string[] = [];
	if (ceph) {
		if (ceph.skeletalClass) cephRows.push(`<tr><td>Скелетный класс</td><td>${escapeXml(SKELETAL_CLASS_LABELS[ceph.skeletalClass] || ceph.skeletalClass)}</td></tr>`);
		if (ceph.growthPattern) cephRows.push(`<tr><td>Тип роста</td><td>${ceph.growthPattern === "normodivergent" ? "Нормодивергентный" : ceph.growthPattern === "hyperdivergent_vertical" ? "Вертикальный (гипердивергентный)" : "Горизонтальный (гиподивергентный)"}</td></tr>`);
		if (ceph.snaAngle !== undefined) cephRows.push(`<tr><td>Угол SNA (положение в/ч)</td><td>${ceph.snaAngle}° (норма 82° ± 2°)</td></tr>`);
		if (ceph.snbAngle !== undefined) cephRows.push(`<tr><td>Угол SNB (положение н/ч)</td><td>${ceph.snbAngle}° (норма 80° ± 2°)</td></tr>`);
		if (ceph.anbAngle !== undefined) cephRows.push(`<tr><td>Угол ANB (межчелюстной сагиттальный)</td><td>${ceph.anbAngle}° (норма 2° ± 1°)</td></tr>`);
		if (ceph.witsAppraisalMm !== undefined) cephRows.push(`<tr><td>Число Wits</td><td>${ceph.witsAppraisalMm} мм (норма -1..0 мм)</td></tr>`);
		if (ceph.fmaAngle !== undefined) cephRows.push(`<tr><td>Угол FMA (Франкфурт-мандибулярный)</td><td>${ceph.fmaAngle}° (норма 25° ± 3°)</td></tr>`);
		if (ceph.snGoGnAngle !== undefined) cephRows.push(`<tr><td>Угол Sn-GoGn (вертикальный)</td><td>${ceph.snGoGnAngle}° (норма 32° ± 3°)</td></tr>`);
		if (ceph.upperIncisorToNaAngle !== undefined) cephRows.push(`<tr><td>Наклон верхних резцов (1-NA)</td><td>${ceph.upperIncisorToNaAngle}° (норма 22°)</td></tr>`);
		if (ceph.lowerIncisorToNbAngle !== undefined) cephRows.push(`<tr><td>Наклон нижних резцов (1-NB)</td><td>${ceph.lowerIncisorToNbAngle}° (норма 25°)</td></tr>`);
		if (ceph.interincisalAngle !== undefined) cephRows.push(`<tr><td>Межрезцовый угол</td><td>${ceph.interincisalAngle}° (норма 130° ± 5°)</td></tr>`);
	}

	const cephalometricsSection = cephRows.length > 0
		? `
			<!-- Секция 4: Цефалометрический анализ ТРГ -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_CEPHALOMETRICS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Цефалометрия ТРГ"/>
					<title>Цефалометрический анализ ТРГ в боковой проекции</title>
					<text>
						<table border="1" width="100%">
							<thead><tr><th>Угловой / линейный параметр</th><th>Результат измерения</th></tr></thead>
							<tbody>${cephRows.join("")}</tbody>
						</table>
					</text>
				</section>
			</component>`
		: "";

	// ─── 5. Биометрические индексы моделей (LOINC 55288-5) ────────────────────
	const ind = params.indices;
	const indexParagraphs: string[] = [];
	if (ind) {
		if (ind.tonnIndexNotes) indexParagraphs.push(`<paragraph><strong>Индекс Тона (Tonn):</strong> ${escapeXml(ind.tonnIndexNotes)}</paragraph>`);
		if (ind.pontIndexNotes) indexParagraphs.push(`<paragraph><strong>Индекс Пона (Pont):</strong> ${escapeXml(ind.pontIndexNotes)}</paragraph>`);
		if (ind.boltonIndexNotes) indexParagraphs.push(`<paragraph><strong>Индекс Болтона (Bolton):</strong> ${escapeXml(ind.boltonIndexNotes)}</paragraph>`);
		if (ind.korkhausIndexNotes) indexParagraphs.push(`<paragraph><strong>Индекс Коркхауза (Korkhaus):</strong> ${escapeXml(ind.korkhausIndexNotes)}</paragraph>`);
	}

	const indicesSection = indexParagraphs.length > 0
		? `
			<!-- Секция 5: Биометрические индексы диагностических моделей -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_ORTHODONTIC_INDICES}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Биометрические индексы"/>
					<title>Биометрические индексы контрольно-диагностических моделей</title>
					<text>
						${indexParagraphs.join("\n\t\t\t\t\t\t")}
					</text>
				</section>
			</component>`
		: "";

	// ─── 6. План аппаратурного лечения (LOINC 18776-5) ─────────────────────────
	const appPlan = params.appliancePlan;
	let appliancePlanSection = "";
	if (appPlan) {
		const appTypeLabel = appPlan.applianceType ? APPLIANCE_LABELS[appPlan.applianceType] || appPlan.applianceType : "Ортодонтическая аппаратура";
		const alignerInfo = appPlan.alignerStepsCount && appPlan.alignerStepsCount > 0 ? ` (серия из ${appPlan.alignerStepsCount} кап)` : "";
		const stagesXml = appPlan.treatmentStages && appPlan.treatmentStages.length > 0
			? `<list>\n\t\t\t\t\t\t\t${appPlan.treatmentStages.map((s) => `<item>${escapeXml(s)}</item>`).join("\n\t\t\t\t\t\t\t")}\n\t\t\t\t\t\t</list>`
			: "";

		appliancePlanSection = `
			<!-- Секция 6: План ортодонтического аппаратурного лечения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_APPLIANCE_PLAN}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="План лечения"/>
					<title>План ортодонтического аппаратурного лечения</title>
					<text>
						<paragraph><strong>Выбранная аппаратура:</strong> ${escapeXml(appTypeLabel)}${alignerInfo}</paragraph>
						${appPlan.extractionPlan ? `<paragraph><strong>План экстракции:</strong> ${escapeXml(appPlan.extractionPlan)}</paragraph>` : ""}
						${appPlan.estimatedDurationMonths ? `<paragraph><strong>Планируемый срок активного лечения:</strong> ${appPlan.estimatedDurationMonths} мес.</paragraph>` : ""}
						${stagesXml}
						${appPlan.retentionProtocol ? `<paragraph><strong>Ретенционный протокол:</strong> ${escapeXml(appPlan.retentionProtocol)}</paragraph>` : ""}
					</text>
				</section>
			</component>`;
	}

	// ─── 7. Зубная формула при наличии (LOINC 29545-1) ─────────────────────────
	let dentalStatusSection = "";
	if (params.dentalStatus && params.dentalStatus.length > 0) {
		const tableRows = params.dentalStatus.map((item) => {
			const toothStr = String(item.tooth).trim();
			const surfs = normalizeSurfaces(item.surfaces);
			const surfsDisplay = surfs.length > 0 ? surfs.join(", ") : "-";
			const condName = item.conditionName || item.condition;
			return `<tr><td>${escapeXml(toothStr)}</td><td>${escapeXml(surfsDisplay)}</td><td>${escapeXml(condName)}</td></tr>`;
		}).join("");

		dentalStatusSection = `
			<!-- Секция 7: Зубная формула -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Стоматологический статус"/>
					<title>Стоматологический статус (Зубная формула)</title>
					<text>
						<table border="1" width="100%">
							<thead><tr><th>Зуб (FDI)</th><th>Поверхности</th><th>Статус</th></tr></thead>
							<tbody>${tableRows}</tbody>
						</table>
					</text>
				</section>
			</component>`;
	}

	// ─── 8. Оказанные медицинские услуги по 804н (LOINC 47519-4) ──────────────
	let servicesSection = "";
	if (params.services && params.services.length > 0) {
		const itemsXml = params.services.map((svc) => {
			const qty = svc.quantity && svc.quantity > 0 ? svc.quantity : 1;
			const toothInfo = svc.tooth ? ` (зуб ${escapeXml(String(svc.tooth))})` : "";
			return `<item>${escapeXml(svc.code)} ${escapeXml(svc.name)} — ${qty} усл.${toothInfo}</item>`;
		}).join("\n\t\t\t\t\t\t\t");

		const entriesXml = params.services.map((svc) => {
			const toothTag = svc.tooth
				? `\n							<targetSiteCode code="${escapeXml(String(svc.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(svc.tooth))}"/>`
				: "";
			return `					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(svc.code)}" codeSystem="${EGISZ_OIDS.ORDER_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(svc.name)}"/>
							<statusCode code="completed"/>${toothTag}
						</procedure>
					</entry>`;
		}).join("\n");

		servicesSection = `
			<!-- Секция 8: Оказанные медицинские услуги -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Оказанные медицинские услуги (Номенклатура 804н)</title>
					<text>
						<list>
							${itemsXml}
						</list>
					</text>
${entriesXml}
				</section>
			</component>`;
	}

	// ─── 9. Рекомендации и назначения (LOINC 18776-5) ──────────────────────────
	let recsSection = "";
	if (params.recommendations) {
		let recsText = "";
		if (Array.isArray(params.recommendations)) {
			recsText = params.recommendations
				.filter(Boolean)
				.map((r, i) => `<paragraph>${i + 1}. ${escapeXml(r)}</paragraph>`)
				.join("\n\t\t\t\t\t\t");
		} else if (typeof params.recommendations === "string" && params.recommendations.trim()) {
			recsText = `<paragraph>${escapeXml(params.recommendations.trim())}</paragraph>`;
		}

		if (recsText) {
			recsSection = `
			<!-- Секция 9: Рекомендации и назначения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации и назначения</title>
					<text>
						${recsText}
					</text>
				</section>
			</component>`;
		}
	}

	return `${headerXml}

	<component>
		<structuredBody>
			${diagnosisSection}
			${anamnesisSection}
			${anthropometrySection}
			${cephalometricsSection}
			${indicesSection}
			${appliancePlanSection}
			${dentalStatusSection}
			${servicesSection}
			${recsSection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
