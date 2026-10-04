import {
	type ClinicProfile,
	type GeneratedDocument,
	type Patient,
	type PostVisitRecommendationsPayload,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientRegistrationAddress,
	patientResidentialAddress,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	issuedDate,
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";

export function postVisitCareTopicLabel(
	value: PostVisitRecommendationsPayload["careTopic"],
): string {
	const labels: Record<PostVisitRecommendationsPayload["careTopic"], string> = {
		extraction: "удаление зуба",
		implantation: "имплантация / костная пластика",
		filling_restoration: "пломба / реставрация",
		endo: "эндодонтическое лечение",
		surgery: "хирургическое вмешательство",
		local_anesthesia: "местная анестезия",
		hygiene: "профессиональная гигиена",
		prosthetics: "ортопедическое лечение",
		orthodontics: "ортодонтическое лечение",
		periodontology: "пародонтологическое лечение",
		other: "индивидуальные рекомендации",
		surgery_aftercare: "уход после хирургического вмешательства",
		fixation_aftercare: "уход после фиксации ортопедической конструкции",
		whitening: "клиническое / домашнее отбеливание",
		retention: "ретенционный период (ретейнеры / каппы)",
	};
	return labels[value] ?? value;
}

export function postVisitRecommendations(document: GeneratedDocument) {
	const payload = document.payload?.postVisitRecommendations as
		| PostVisitRecommendationsPayload
		| undefined;
	if (payload) {
		const attestation = document.signatureAttestation;
		const isIssued = document.status === "issued";
		const statusLabel = isIssued ? "Выдан" : "Черновик";
		const statusClass = isIssued ? "issued" : "draft";
		const attestationNote = attestation
			? `Подписан бумажный экземпляр: ${escapeHtml(attestation.signedAt)}`
			: "Документ является черновиком и не подписан";

		return `<style>
      /* Page setup and general overrides */
      @page {
        size: A4;
        margin: 8mm 10mm 8mm 10mm !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 12px !important;
        line-height: 1.3 !important;
      }
      
      /* Hide default layout elements */
      h1 { display: none !important; }
      body > .meta { display: none !important; }
      body > .issue-attestation { display: none !important; }
      body > .document-status-banner { display: none !important; }
      
      /* Modern Recommendations styles */
      .recs-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f766e;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .recs-header-left h1 {
        display: block !important;
        font-size: 17px !important;
        color: #0f766e;
        margin: 0 !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .recs-header-left p {
        margin: 2px 0 0 0 !important;
        font-size: 10px !important;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
      }
      .recs-status-badge {
        padding: 3px 8px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .recs-status-badge.issued {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
      .recs-status-badge.draft {
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fde68a;
      }
      .recs-info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 8px;
      }
      .recs-info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 10.5px;
        line-height: 1.3;
      }
      .recs-info-card strong {
        color: #334155;
        font-size: 11px;
      }
      .recs-info-label {
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 1px;
      }
      
      /* Grid for personalized recommendations */
      .recs-cards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .recs-cards-grid .doc-section-card {
        margin: 0 !important;
        padding: 8px !important;
        border-radius: 6px !important;
      }
      .recs-cards-grid .doc-section-card h3 {
        font-size: 11.5px !important;
        margin-bottom: 3px !important;
        font-weight: 700 !important;
      }
      .recs-cards-grid ul {
        margin: 2px 0 2px 14px !important;
      }
      .recs-cards-grid li {
        margin: 1px 0 !important;
        font-size: 10.5px !important;
      }
      
      .recs-full-width-card {
        grid-column: span 2;
      }
      
      /* Hygiene styles override */
      .hygiene-badge-green {
        display: inline-block;
        background: #dcfce7;
        color: #166534;
        padding: 1px 6px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      .hygiene-badge-blue {
        display: inline-block;
        background: #eff6ff;
        color: #1e40af;
        padding: 1px 6px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      /* Force Page Break for Hygiene Guide */
      .full-hygiene-guide {
        page-break-before: always;
        margin-top: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: none !important;
        font-size: 9.5px !important;
        line-height: 1.25 !important;
      }
      .full-hygiene-guide h2 {
        font-size: 14px !important;
        margin: 0 0 3px 0 !important;
        padding-bottom: 3px !important;
        border-bottom: 2px solid #0f766e !important;
      }
      .full-hygiene-guide h3 {
        font-size: 10.5px !important;
        margin: 6px 0 3px 0 !important;
        border-bottom: 1px solid #cbd5e1 !important;
        padding-bottom: 2px !important;
      }
      .hygiene-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 6px 0;
      }
      .hygiene-card {
        padding: 8px !important;
        font-size: 10px !important;
        border-radius: 6px !important;
      }
      .hygiene-card ol {
        margin: 2px 0 0 12px !important;
      }
      .hygiene-card li {
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
      }
      
      .hygiene-columns-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 6px 0;
      }
      .hygiene-column-box {
        padding: 8px !important;
        font-size: 9.5px !important;
        border-radius: 6px !important;
      }
      .hygiene-column-box h3 {
        margin-bottom: 4px !important;
        padding-bottom: 2px !important;
        font-size: 10.5px !important;
      }
      .hygiene-column-box ul {
        margin: 2px 0 0 12px !important;
      }
      .hygiene-column-box li {
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
      }
      
      .warning-box {
        background: #fdf2f2 !important;
        border: 1px solid #fde2e2 !important;
      }
      .warning-box h3 {
        color: #9b2c2c !important;
      }
      .info-box {
        background: #f0fdf4 !important;
        border: 1px solid #dcfce7 !important;
      }
      .info-box h3 {
        color: #166534 !important;
      }
      .error-box {
        background: #fff5f5 !important;
        border: 1px solid #fed7d7 !important;
      }
      .error-box h3 {
        color: #9b2c2c !important;
      }
      
      .hygiene-math-box {
        padding: 8px !important;
        margin: 6px 0 !important;
        border-radius: 6px !important;
      }
      .hygiene-math-title {
        font-size: 10.5px !important;
        margin-bottom: 4px !important;
      }
      .hygiene-math-grid {
        gap: 6px !important;
      }
      .hygiene-math-col {
        padding: 5px !important;
        font-size: 9.5px !important;
        border-radius: 4px !important;
      }
      
      /* Keep checklist and signatures tight */
      .check-list {
        margin: 8px 0 !important;
      }
      .check-list li {
        margin-bottom: 3px !important;
        font-size: 10.5px !important;
        padding-left: 18px !important;
      }
      .check-list li::before {
        top: 0px !important;
      }
      .signatures {
        margin-top: 15px !important;
        gap: 15px !important;
      }
      .signatures p {
        font-size: 11px !important;
        margin: 0 !important;
      }
    </style>

    <div class="recs-page-header">
      <div class="recs-header-left">
        <h1>Рекомендации после приема</h1>
        <p>${escapeHtml(attestationNote)}</p>
      </div>
      <div class="recs-status-badge ${statusClass}">
        ${statusLabel}
      </div>
    </div>

    <div class="recs-info-grid">
      <div class="recs-info-card">
        <div class="recs-info-label">Пациент</div>
        <strong>Пациент (по карте)</strong>
      </div>
      <div class="recs-info-card">
        <div class="recs-info-label">Врач</div>
        <strong>${escapeHtml(payload.doctorFullName)}</strong>
      </div>
      <div class="recs-info-card">
        <div class="recs-info-label">Дата приема</div>
        <strong>${escapeHtml(payload.performedAt)}</strong>
      </div>
      <div class="recs-info-card">
        <div class="recs-info-label">Блок рекомендаций</div>
        <strong>${escapeHtml(postVisitCareTopicLabel(payload.careTopic))}</strong>
      </div>
      <div class="recs-info-card">
        <div class="recs-info-label">Процедура</div>
        <strong>${escapeHtml(payload.procedureName)}</strong>
      </div>
      <div class="recs-info-card">
        <div class="recs-info-label">Зубы / область</div>
        <strong>${escapeHtml(payload.toothOrArea)}</strong>
      </div>
      
      <div class="recs-info-card" style="grid-column: span 3;">
        <strong>Связь с клиникой:</strong> ${escapeHtml(payload.clinicContactInstruction)}
        ${payload.plannedFollowUpAt ? `<br><strong>Контрольный прием:</strong> ${escapeHtml(payload.plannedFollowUpAt)}` : ""}
      </div>
    </div>

    <div class="recs-cards-grid">
      <div class="doc-section-card doc-alert-success">
        <h3>Разрешенные действия</h3>
        ${bulletList(payload.allowedAfter)}
      </div>
      
      <div class="doc-section-card doc-alert-warning">
        <h3>Временные ограничения</h3>
        ${bulletList(payload.temporaryRestrictions)}
      </div>
      
      <div class="doc-section-card">
        <h3>Назначения и медикаменты</h3>
        ${bulletList(payload.medicationAndRinsePlan)}
      </div>
      
      <div class="doc-section-card">
        <h3>Рекомендации по гигиене</h3>
        ${bulletList(payload.hygieneInstructions)}
      </div>
      
      <div class="doc-section-card">
        <h3>Режим питания</h3>
        ${bulletList(payload.nutritionInstructions)}
      </div>
      
      ${
				payload.plannedFollowUpAt
					? `
      <div class="doc-section-card doc-alert-info">
        <h3>Контрольный осмотр</h3>
        <p style="margin: 4px 0; font-size: 12px; font-weight: 600; color: #0369a1;">${escapeHtml(payload.plannedFollowUpAt)}</p>
      </div>`
					: `
      <div class="doc-section-card doc-alert-info">
        <h3>Контрольный осмотр</h3>
        <p style="margin: 4px 0; font-size: 12px; color: #475569;">Прием по плану врача или при дискомфорте</p>
      </div>`
			}
      
      <div class="doc-section-card doc-alert-danger recs-full-width-card">
        <h3>Срочно связаться с клиникой при признаках</h3>
        <div class="premium-bullet-list risks-list">
          ${bulletList(payload.urgentWarningSigns)}
        </div>
      </div>

      <div class="doc-section-card recs-full-width-card">
        <h3>Краткая памятка для пациента</h3>
        <p style="margin: 4px 0; font-size: 11.5px; color: #334155;">${escapeHtml(payload.telegramSummary)}</p>
      </div>
    </div>

    ${checkList([
			"пациент получил бумажную или электронную копию рекомендаций",
			"пациент понимает тревожные признаки и канал срочной связи",
			"краткий текст подходит для Telegram и не содержит лишних медицинских подробностей",
		])}
    ${signatureBlock("Пациент получил рекомендации", signatureParty("Врач", payload.doctorFullName))}

    <!-- ВТОРАЯ СТРАНИЦА: Инфографика гигиены зубов -->
    <div class="full-hygiene-guide">
      <h2>Индивидуальный протокол гигиены полости рта</h2>
      <p style="font-size: 11px; color: #64748b; margin: -2px 0 6px 0; font-style: italic;">
        Здоровые зубы — это 90% вашей работы дома и 10% работы врача. Следуйте этому алгоритму, чтобы не переплачивать за лечение.
      </p>
      
      <div class="hygiene-grid">
        <div class="hygiene-card morning">
          <span class="hygiene-badge-green">УТРЕННИЙ ПРОТОКОЛ (Очищение и защита)</span>
          <ol>
            <li><strong>Сначала ЗАВТРАК:</strong> Никогда не чистите зубы до еды, если планируете пить кофе или сок. После чистки эмаль уязвима к пигментам. Сначала едим — потом чистим. До еды можно прополоскать рот водой.</li>
            <li><strong>Чистка щеткой (3-4 минуты):</strong> Используйте выметающие движения «от красного к белому» (от десны к краю зуба). Не давите сильно! Количество пасты — строго с горошину, чтобы не снижать механическую чистку пеной.</li>
            <li><strong>Ополаскиватель:</strong> Если содержит ФТОР — используйте сразу после чистки (правило: почистили -> сплюнули -> 30 минут не пьем и не едим). Если БЕЗ фтора (для свежести) — днем после перекусов.</li>
            <li><strong>Чистка языка:</strong> Скребком или щеткой утром до завтрака (убирает 80% бактерий и неприятный запах).</li>
            <li><strong>Тест стекла:</strong> После чистки проведите языком по всем зубам у десны — зубы должны быть абсолютно гладкими. Чувствуете шероховатость — дочищайте!</li>
          </ol>
        </div>
        
        <div class="hygiene-card evening">
          <span class="hygiene-badge-blue">ВЕЧЕРНИЙ ПРОТОКОЛ (Глубокое межзубное очищение)</span>
          <ol>
            <li><strong>Межзубная гигиена (САМОЕ ВАЖНОЕ!):</strong> Сначала нить (флосс) и ершики. Контактные пункты щетка не чистит, а кариес начинается там незаметно в 90% случаев. Кровь в первые 3-5 дней — норма, это выходит застойное воспаление, чистку не бросать!</li>
            <li><strong>Ирригатор:</strong> Вымываем остатки пищи мощной струей воды. Обязателен при коронках и имплантах — стык коронки и десны быстро собирает налет, вызывая воспаление. Использовать ПОСЛЕ нити.</li>
            <li><strong>Финальная чистка щеткой (3-4 мин):</strong> Активно чистите. После чистки пасту сплюнуть, но <strong>рот водой НЕ полоскать</strong>, оставив полезный фтор укреплять эмаль на всю ночь.</li>
            <li><strong>Бонус:</strong> Реминерализующие гели (ROCS Minerals) — нанесите горошину геля на зубы перед сном. Не пить и не есть 30-40 минут.</li>
          </ol>
        </div>
      </div>
      
      <div class="hygiene-columns-grid" style="grid-template-columns: repeat(3, 1fr); gap: 8px;">
        <div class="hygiene-column-box">
          <h3>Рекомендованные средства гигиены</h3>
          <ul>
            <li><strong>Щетка:</strong> Электрическая звуковая (Sonic) или мануальная. Жесткость: СРЕДНЯЯ (Medium) или МЯГКАЯ (Soft). Меняйте каждые 3-4 месяца. Жесткие щетки сотрет эмаль!</li>
            <li><strong>Паста от кариеса:</strong> Базовая со фтором (Fluoride) 1450 ppm (Lacalut, President, Colgate, Splat). При чувствительности — пасты с Кальцием и Гидроксиапатитом. Не берите «отбеливающие» на каждый день.</li>
            <li><strong>Спецсредства:</strong> Монопучок (для восьмерок и брекетов), ершики (по размеру, должны входить с легким усилием, без боли), ирригатор (купить на маркетплейсе за 1.5–3 тыс. руб).</li>
            <li><strong>Гигиена приборов:</strong> Сухость щетки исключает грибок — хранить вертикально без футляра. Раз в неделю мойте щетку и ручку с мылом, протирайте дно стакана.</li>
          </ul>
        </div>
        
        <div class="hygiene-column-box warning-box">
          <h3>Противопоказанные действия</h3>
          <ul>
            <li><strong>Движения «Пила»:</strong> Горизонтальное трение стирает шейки зубов (образуется клиновидный дефект).</li>
            <li><strong>Сильный нажим:</strong> Если щетка лохматится за 2 недели — вы давите слишком сильно. Щетина должна лишь касаться зубов.</li>
            <li><strong>Бросать при крови:</strong> Кровоточивость при чистке нитью — признак налета и воспаления десен. Чистить это место тщательнее и аккуратнее, кровь пройдет за 3-4 дня!</li>
            <li><strong>Мертвые зоны:</strong> Внутренняя сторона нижних резцов и дальние зубы. Всегда проверяйте их.</li>
            <li><strong>Зубочистки:</strong> Категорически нельзя, травмируют десневой сосочек. Только нити и ершики.</li>
            <li><strong>Семечки, орехи, лед:</strong> Разгрызать зубами нельзя — это создает микротрещины и сколы эмали.</li>
          </ul>
        </div>
        
        <div class="hygiene-column-box info-box">
          <h3>Диетические рекомендации</h3>
          <ul>
            <li><strong>Стратегия чистки:</strong> Начинайте со сложных зон (внутри нижних резцов, дальние зубы), пока на щетке много свежей пасты и вы сосредоточены. Передние зубы — на десерт.</li>
            <li><strong>Чистые перерывы:</strong> Между приемами пищи должно проходить 3-4 часа для восстановления эмали слюной.</li>
            <li><strong>Вред сладостей:</strong> Вредно не количество сладкого, а частота. Лучше съесть шоколадку сразу, чем грызть по кусочку целый день.</li>
            <li><strong>Осторожно, кислота:</strong> Сразу после кислых фруктов, вина, газировок чистить щеткой нельзя 30 минут (эмаль размягчена). Прополощите рот водой! Днем после еды используйте жвачку без сахара (с ксилитом) на 10-15 минут.</li>
            <li><strong>Сухость во рту:</strong> Ночью слюны меньше. Если спите с открытым ртом или храпите — эмаль пересыхает и кариес идет в 2 раза быстрее. Сделайте пару глотков воды перед сном.</li>
          </ul>
        </div>
      </div>

      <div class="hygiene-columns-grid" style="grid-template-columns: 1.2fr 1.8fr; gap: 8px; margin-top: 4px;">
        <div class="hygiene-column-box" style="background: #fafaf9; border-color: #e7e5e4;">
          <h3 style="color: #44403c;">Соматические факторы и парафункции</h3>
          <p style="font-size: 9px; margin: 0 0 4px 0; color: #44403c; line-height: 1.25;">
            • <strong>Очаг инфекции:</strong> Бактерии из десны попадают в кровоток и могут приводить к рискам заболеваний сердца (эндокардит), осложнениям диабета и проблемам при беременности. Чистый рот — это крепкий общий иммунитет!
          </p>
          <p style="font-size: 9px; margin: 0; color: #44403c; line-height: 1.25;">
            • <strong>Бруксизм:</strong> Если просыпаетесь с усталостью в челюсти или болями в висках — вы сжимаете зубы ночью. Срочно нужна защитная каппа, иначе зубы треснут или сотрутся.
          </p>
        </div>
        
        <div class="hygiene-column-box error-box" style="background: #fff5f5; border-color: #fee2e2;">
          <h3 style="color: #9b2c2c;">Симптомы, требующие срочного обращения к врачу</h3>
          <ul style="margin: 0; padding-left: 14px; font-size: 9px; color: #742a2a; line-height: 1.25;">
            <li><strong>Застревание еды:</strong> Если еда всегда застревает в одном месте — там скрытый кариес или десневой кармашек.</li>
            <li><strong>Реакция на сладкое/холодное:</strong> Ноющие зубы от сладкого — это почти 100% кариес. Резкая боль от холодного — кариес или клиновидный дефект.</li>
            <li><strong>Привкус гнили:</strong> Запах гниения после чистки означает гниение остатков под коронкой или в кармане десны.</li>
            <li><strong>Ранки и болячки:</strong> Любая болячка во рту, которая не заживает более 14 дней — повод немедленно показаться врачу.</li>
          </ul>
        </div>
      </div>

      <div class="hygiene-math-box" style="margin-top: 4px !important;">
        <div class="hygiene-math-title">Экономическая эффективность профилактики: регулярная гигиена предотвращает дорогостоящее протезирование</div>
        <div class="hygiene-math-grid">
          <div class="hygiene-math-col">
            <strong>Гигиена в год (~10 000 руб):</strong><br>
            Хорошая щетка + ирригатор (5 000 руб) + пасты и нити (2 000 руб) + профгигиена у стоматолога раз в год (3 000 руб).
          </div>
          <div class="hygiene-math-col bad">
            <strong>Лечение одного зуба (от 40 000 руб):</strong><br>
            Глубокий кариес (6 000 руб) + каналы (10 000 руб) + коронка (25 000 руб). Имплантация зуба — от 60 000 руб.
          </div>
        </div>
        <div style="font-size: 9px; font-weight: 700; color: #0f766e; text-align: center; margin-top: 4px;">
          При хорошей гигиене новые проблемы почти не будут появляться, а пломбы и коронки прослужат в разы дольше!
          <span style="color: #64748b; font-weight: normal; font-style: italic; margin-left: 8px;">* Делайте самомассаж жевательных мышц лица. Увидимся через 6 месяцев!</span>
        </div>
      </div>
    </div>`;
	}

	return `<h2>Рекомендации после приема</h2>
    ${checkList([
			"не принимать пищу до окончания действия анестезии",
			"соблюдать назначенный режим, гигиену и прием препаратов",
			"при нарастающей боли, отеке, кровотечении, температуре или аллергической реакции связаться с клиникой",
			"явиться на контрольный прием в согласованный срок",
			"индивидуальные назначения врача вписать ниже",
		])}
    <h2>Индивидуальные назначения</h2>
    <p>______________________________________________________________________________</p>
    <p>______________________________________________________________________________</p>
    ${signatureBlock("Пациент получил рекомендации", "Врач")}`;
}
