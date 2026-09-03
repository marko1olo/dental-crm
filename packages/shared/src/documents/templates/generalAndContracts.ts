import {
	SHARED_DOCUMENT_CSS,
	renderDocHeader,
	renderPatientInfoBlock,
	renderSignaturesBlock,
} from "./templateStyles.js";

/**
 * Бланки договоров, анкет, гарантий и финансовых документов
 */
export const GENERAL_TEMPLATES_HTML: Record<string, string> = {
	dogovor_na_okazanie_med_uslug: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Договор на оказание медицинских услуг</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Договор № {{Документ.Номер}}")}
  <div class="doc-title">ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ № {{Документ.Номер}}</div>
  <div class="doc-subtitle">г. Москва, дата заключения: {{ТекущаяПолнаяДата}}</div>
  
  <p class="doc-paragraph">
    Медицинская организация <strong>{{Клиника.Название}}</strong>, именуемая в дальнейшем «Исполнитель», 
    действующая на основании лицензии на осуществление медицинской деятельности № {{Клиника.Лицензия.Номер}} 
    от {{Клиника.Лицензия.ДатаВыдачи}}, выданной {{Клиника.Лицензия.КемВыдана}}, с одной стороны, и гражданин(ка)
  </p>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    именуемый(ая) в дальнейшем «Пациент» (или «Заказчик»), с другой стороны, совместно именуемые «Стороны», 
    руководствуясь Гражданским кодексом РФ, Федеральным законом от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ», 
    Законом РФ «О защите прав потребителей» и Правилами предоставления платных медицинских услуг (Постановление Правительства РФ от 11.05.2023 № 736), 
    заключили настоящий Договор о нижеследующем:
  </p>

  <div class="doc-section-title">1. ПРЕДМЕТ ДОГОВОРА</div>
  <p class="doc-paragraph">
    1.1. Исполнитель обязуется на возмездной основе оказать Пациенту квалифицированные стоматологические медицинские услуги 
    в соответствии с лицензией, клиническими рекомендациями (протоколами лечения) и порядками оказания медицинской помощи, 
    а Заказчик (Пациент) обязуется оплатить эти услуги в порядке и сроки, установленные настоящим Договором.
  </p>
  <p class="doc-paragraph">
    1.2. Перечень, объём и стоимость оказываемых услуг определяются согласованным Сторонами Планом лечения и Актами выполненных работ.
  </p>

  <div class="doc-section-title">2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</div>
  <p class="doc-paragraph">
    2.1. Стоимость медицинских услуг определяется в соответствии с действующим Прейскурантом Исполнителя на момент оказания услуг.
  </p>
  <p class="doc-paragraph">
    2.2. Оплата производится Заказчиком наличными денежными средствами, безналичным переводом или с использованием платежных карт 
    в кассу Исполнителя с выдачей фискального кассового чека.
  </p>

  <div class="doc-section-title">3. ПРАВА И ОБЯЗАННОСТИ СТОРОН</div>
  <p class="doc-paragraph">
    3.1. Пациент обязуется соблюдать правила внутреннего распорядка клиники, режим лечения, являться на контрольные осмотры 
    и неукоснительно выполнять предписания лечащего врача.
  </p>
  <p class="doc-paragraph">
    3.2. Исполнитель гарантирует применение сертифицированных материалов и соблюдение санитарно-эпидемиологических норм СанПиН.
  </p>

  ${renderSignaturesBlock("Заказчик (Пациент)", "От имени Исполнителя")}
</div>
</body>
</html>
`,

	dogovor_na_okazanie_med_uslug_nesovershennoletnego: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Договор в пользу несовершеннолетнего</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Договор № {{Документ.Номер}}")}
  <div class="doc-title">ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ<br/>В ПОЛЬЗУ НЕСОВЕРШЕННОЛЕТНЕГО (НЕДЕЕСПОСОБНОГО) № {{Документ.Номер}}</div>
  <div class="doc-subtitle">г. Москва, дата заключения: {{ТекущаяПолнаяДата}}</div>

  <p class="doc-paragraph">
    <strong>{{Клиника.Название}}</strong> (Лицензия № {{Клиника.Лицензия.Номер}} от {{Клиника.Лицензия.ДатаВыдачи}}), именуемое в дальнейшем «Исполнитель», 
    и законный представитель:
  </p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; margin-bottom: 10px; font-size: 10pt;">
    <strong>Законный представитель:</strong> {{Представитель.ФИО}} ({{Представитель.Тип}}), 
    паспорт: серия {{Представитель.Паспорт.Серия}} № {{Представитель.Паспорт.Номер}}, выдан {{Представитель.Паспорт.ДатаВыдачи}} ({{Представитель.Паспорт.КемВыдан}}), 
    проживающий(ая) по адресу: {{Представитель.Адрес}}, тел.: {{Представитель.Телефон}}. Документ-основание: {{Представитель.НаОсновании}}.
  </div>
  <p class="doc-paragraph">
    действующий(ая) в интересах несовершеннолетнего (недееспособного) Пациента:
  </p>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    заключили настоящий договор в соответствии с Гражданским кодексом РФ, Федеральным законом № 323-ФЗ и Постановлением Правительства РФ № 736.
  </p>

  ${renderSignaturesBlock("Законный представитель", "От имени Исполнителя")}
</div>
</body>
</html>
`,

	soglasie_na_obrabku_pd: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Согласие на обработку персональных данных</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ ПАЦИЕНТА</div>
  <div class="doc-subtitle">В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»</div>

  ${renderPatientInfoBlock()}

  <p class="doc-paragraph">
    Я, субъект персональных данных, свободно, своей волей и в своем интересе даю согласие оператору — 
    <strong>{{Клиника.Название}}</strong> (ИНН {{Клиника.ИНН}}, адрес: {{Клиника.Адрес}}) — на обработку моих персональных данных 
    (а также персональных данных представляемого лица при оформлении родителем/опекуном), включая: 
    фамилию, имя, отчество, дату рождения, паспортные данные, адрес регистрации и фактического проживания, контактный телефон, email, 
    сведения о состоянии здоровья, анамнезе, диагнозах, результатах рентгенологических исследований и проводимом лечении.
  </p>
  <p class="doc-paragraph">
    Обработка включает: сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, 
    использование, передачу (в случаях, предусмотренных действующим законодательством РФ, включая передачу в ЕГИСЗ Минздрава РФ), 
    обезличивание, блокирование, удаление и уничтожение.
  </p>
  <p class="doc-paragraph">
    Согласие действует в течение срока хранения медицинской документации (25 лет) либо до момента его письменного отзыва.
  </p>

  ${renderSignaturesBlock("Субъект ПДн (Пациент / Представитель)", "Принял сотрудник клиники")}
</div>
</body>
</html>
`,

	anketa_obshchego_sostoyaniya_zdorovya: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Анкета общего состояния здоровья</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">АНКЕТА ОБЩЕГО СОСТОЯНИЯ ЗДОРОВЬЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</div>
  <div class="doc-subtitle">Заполняется перед началом любого медицинского вмешательства (Федеральный закон № 323-ФЗ, форма 043/у)</div>

  ${renderPatientInfoBlock()}

  <table class="doc-table">
    <thead>
      <tr><th style="width: 70%;">Клинический фактор риска / Соматическое заболевание</th><th style="width: 30%; text-align: center;">Отметка пациента</th></tr>
    </thead>
    <tbody>
      <tr><td>1. Аллергические реакции на анестетики (лидокаин, артикаин), антибиотики, латекс, йод</td><td>{{Пациент.ОсобыеОтметки}}</td></tr>
      <tr><td>2. Заболевания сердечно-сосудистой системы (гипертония, стенокардия, инфаркт, кардиостимулятор)</td><td>Да / Нет</td></tr>
      <tr><td>3. Нарушения свертываемости крови (гемофилия, прием антикоагулянтов/варфарина/тромбо-асс)</td><td>Да / Нет</td></tr>
      <tr><td>4. Сахарный диабет (компенсированный / декомпенсированный)</td><td>Да / Нет</td></tr>
      <tr><td>5. Инфекционные заболевания (гепатит B/C, ВИЧ, туберкулез, сифилис)</td><td>Да / Нет</td></tr>
      <tr><td>6. Заболевания дыхательной системы (бронхиальная астма, ХОБЛ)</td><td>Да / Нет</td></tr>
      <tr><td>7. Для женщин: беременность (срок в неделях), лактация</td><td>Да / Нет</td></tr>
      <tr><td>8. Прием лекарственных препаратов на постоянной основе (бисфосфонаты, гормоны)</td><td>Да / Нет</td></tr>
    </tbody>
  </table>

  <p class="doc-paragraph">
    Я подтверждаю, что указал(а) полные и достоверные сведения о состоянии своего здоровья. 
    Осознаю, что сокрытие информации о соматических патологиях и аллергиях может привести к жизнеугрожающим осложнениям.
  </p>

  ${renderSignaturesBlock("Пациент", "Врач-стоматолог")}
</div>
</body>
</html>
`,

	polozhenie_o_garantiyakh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Положение о гарантиях</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ПОЛОЖЕНИЕ ОБ УСТАНОВЛЕНИИ ГАРАНТИЙНЫХ СРОКОВ И СРОКОВ СЛУЖБЫ</div>
  <div class="doc-subtitle">В соответствии со ст. 5, 10, 29 Закона РФ «О защите прав потребителей» и Гражданским кодексом РФ</div>

  <div class="doc-section-title">1. ГАРАНТИЙНЫЕ СРОКИ НА СТОМАТОЛОГИЧЕСКИЕ РАБОТЫ</div>
  <table class="doc-table">
    <thead>
      <tr><th>Вид стоматологической работы / реставрации</th><th>Гарантийный срок</th><th>Срок службы</th></tr>
    </thead>
    <tbody>
      <tr><td>Композитные пломбы светового отверждения (I-V класс по Блэку)</td><td>12 месяцев</td><td>24 месяца</td></tr>
      <tr><td>Металлокерамические коронки и мостовидные протезы</td><td>12 месяцев</td><td>36 месяцев</td></tr>
      <tr><td>Безметалловая керамика (диоксид циркония, E.max)</td><td>24 месяца</td><td>60 месяцев</td></tr>
      <tr><td>Дентальные имплантаты (интеграция в костной ткани)</td><td>24 месяца</td><td>10 лет</td></tr>
      <tr><td>Съемные пластиночные и бюгельные протезы</td><td>12 месяцев</td><td>24 месяца</td></tr>
      <tr><td>Эндодонтическое лечение корневых каналов</td><td>6 месяцев</td><td>12 месяцев</td></tr>
    </tbody>
  </table>

  <div class="doc-section-title">2. УСЛОВИЯ СОХРАНЕНИЯ ГАРАНТИЙНЫХ ОБЯЗАТЕЛЬСТВ</div>
  <ul class="doc-list">
    <li>Прохождение профилактического осмотра и профессиональной гигиены не реже 1 раза в 6 месяцев в клинике {{Клиника.Название}}.</li>
    <li>Соблюдение индивидуальной гигиены полости рта и прохождение профилактического осмотра не реже 1 раза в 6 месяцев.</li>
    <li>Немедленное обращение в клинику при возникновении сколов или дискомфорта (без попыток самостоятельного исправления).</li>
  </ul>

  ${renderSignaturesBlock("Ознакомлен Пациент", "Главный врач клиники")}
</div>
</body>
</html>
`,

	garantijnyj_pasport: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Гарантийный паспорт</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Паспорт № {{Документ.Номер}}")}
  <div class="doc-title">ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ № {{Документ.Номер}}</div>
  ${renderPatientInfoBlock()}

  <table class="doc-table">
    <thead>
      <tr><th>Зуб / Область</th><th>Выполненная работа / Конструкция</th><th>Использованные материалы</th><th>Срок гарантии</th><th>Дата окончания</th></tr>
    </thead>
    <tbody>
      <tr><td>Все пролеченные единицы</td><td>Ортопедическая и терапевтическая реабилитация</td><td>Премиальные композиты и циркониевые сплавы</td><td>По положению</td><td>{{Документ.ДатаОкончания}}</td></tr>
    </tbody>
  </table>

  <div class="doc-section-title">ГРАФИК ДИСПАНСЕРНЫХ КОНТРОЛЬНЫХ ОСМОТРОВ</div>
  <p class="doc-paragraph">
    Контрольные визиты каждые 6 месяцев обязательны для сохранения гарантии на установленные реставрации и имплантаты.
  </p>

  ${renderSignaturesBlock("Пациент", "Лечащий врач")}
</div>
</body>
</html>
`,

	"invoice-act": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Акт выполненных работ</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Акт № {{Документ.Номер}}")}
  <div class="doc-title">АКТ ВЫПОЛНЕННЫХ МЕДИЦИНСКИХ РАБОТ (УСЛУГ) № {{Документ.Номер}}</div>
  <div class="doc-subtitle">к Договору на оказание платных медицинских услуг от {{Документ.ДатаНачала}}</div>
  ${renderPatientInfoBlock()}

  <table class="doc-table">
    <thead>
      <tr><th style="width: 5%;">№</th><th>Наименование медицинской услуги (Номенклатура МЗ РФ № 804н)</th><th style="width: 10%;">Кол-во</th><th style="width: 15%;">Цена (руб.)</th><th style="width: 15%;">Сумма (руб.)</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Прием (осмотр, консультация) врача-стоматолога первичный</td><td>1</td><td>—</td><td>—</td></tr>
      <tr><td>2</td><td>Комплекс медицинских манипуляций по плану лечения</td><td>1</td><td>—</td><td>—</td></tr>
    </tbody>
  </table>

  <p class="doc-paragraph">
    Вышеперечисленные услуги оказаны в полном объёме, качественно и в установленный срок. 
    Пациент претензий по объёму, качеству и срокам оказания услуг не имеет.
  </p>

  ${renderSignaturesBlock("Заказчик (Пациент)", "Исполнитель (Врач)")}
</div>
</body>
</html>
`,

	"dms-act": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Акт ДМС</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Акт ДМС")}
  <div class="doc-title">АКТ ОКАЗАННЫХ УСЛУГ ПО СТРАХОВОЙ ПРОГРАММЕ ДМС</div>
  <div class="doc-subtitle">Полис ДМС: {{Пациент.ПолисДМС}}</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Медицинская организация {{Клиника.Название}} удостоверяет выполнение согласованного объема стоматологических манипуляций 
    в соответствии со страховой программой ДМС.
  </p>
  ${renderSignaturesBlock("Застрахованный", "Врач-куратор")}
</div>
</body>
</html>
`,

	"invoice-xray-act": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Акт рентгенодиагностики</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Акт Рентген")}
  <div class="doc-title">АКТ СДАЧИ-ПРИЕМКИ РЕНТГЕНОЛОГИЧЕСКОГО ИССЛЕДОВАНИЯ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Пациенту проведено лучевое исследование на цифровом аппарате клиники. Изображение занесено в медицинскую карту больного 
    и электронную систему PACS/DICOM.
  </p>
  ${renderSignaturesBlock("Пациент", "Рентгенолаборант / Врач")}
</div>
</body>
</html>
`,

	medplan: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>План лечения</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("План лечения")}
  <div class="doc-title">КОМПЛЕКСНЫЙ ПЛАН СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ</div>
  ${renderPatientInfoBlock()}
  <div class="doc-section-title">ЭТАПЫ КЛИНИЧЕСКОЙ РЕАБИЛИТАЦИИ</div>
  <table class="doc-table">
    <thead>
      <tr><th>Этап</th><th>Процедуры и манипуляции</th><th>Сроки</th><th>Ориентировочная стоимость</th></tr>
    </thead>
    <tbody>
      <tr><td>1. Санация</td><td>Профессиональная гигиена полости рта, лечение кариеса и эндодонтия</td><td>1-2 недели</td><td>По прейскуранту</td></tr>
      <tr><td>2. Хирургия</td><td>Удаление несохранных зубов, дентальная имплантация</td><td>1 месяц</td><td>По прейскуранту</td></tr>
      <tr><td>3. Ортопедия</td><td>Протезирование, установка постоянных коронок и реставраций</td><td>2-3 месяца</td><td>По прейскуранту</td></tr>
    </tbody>
  </table>
  ${renderSignaturesBlock("Согласовано Пациентом", "Лечащий врач")}
</div>
</body>
</html>
`,

	"medplan-agg": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>План лечения с агрегацией</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("План лечения")}
  <div class="doc-title">ПЛАН ЛЕЧЕНИЯ С АГРЕГАЦИЕЙ ПО СПЕЦИАЛЬНОСТЯМ</div>
  ${renderPatientInfoBlock()}
  <table class="doc-table">
    <thead><tr><th>Направление</th><th>Количество манипуляций</th><th>Сумма (руб.)</th></tr></thead>
    <tbody>
      <tr><td>Терапевтическая стоматология</td><td>В соответствии с дневником</td><td>Расчетная</td></tr>
      <tr><td>Ортопедическая стоматология</td><td>В соответствии с дневником</td><td>Расчетная</td></tr>
    </tbody>
  </table>
  ${renderSignaturesBlock("Пациент", "Врач-куратор")}
</div>
</body>
</html>
`,

	"medplan-agg-tooth": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>План лечения по зубам</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("План лечения")}
  <div class="doc-title">ПЛАН ЛЕЧЕНИЯ С АГРЕГАЦИЕЙ ПО ЗУБНОМУ РЯДУ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">Детализация лечебных манипуляций с привязкой к зубной формуле FDI 11-48/51-85.</p>
  ${renderSignaturesBlock("Пациент", "Лечащий врач")}
</div>
</body>
</html>
`,

	loan: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>График рассрочки</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("График платежей")}
  <div class="doc-title">СОГЛАШЕНИЕ И ГРАФИК ПЛАТЕЖЕЙ ПО ВНУТРЕННЕЙ РАССРОЧКЕ КЛИНИКИ</div>
  ${renderPatientInfoBlock()}
  <table class="doc-table">
    <thead><tr><th>Транш №</th><th>Срок внесения</th><th>Сумма транша (руб.)</th><th>Статус оплаты</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>В день заключения договора</td><td>30% от суммы</td><td>Оплачено</td></tr>
      <tr><td>2</td><td>Через 30 календарных дней</td><td>35% от суммы</td><td>К оплате</td></tr>
      <tr><td>3</td><td>Через 60 календарных дней</td><td>35% от суммы</td><td>К оплате</td></tr>
    </tbody>
  </table>
  ${renderSignaturesBlock("Пациент (Заемщик)", "Главный бухгалтер клиники")}
</div>
</body>
</html>
`,

	"outpatient-card": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Медицинская карта 043/у</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Форма 043/у")}
  <div class="doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № {{Пациент.НомерКарты}}</div>
  ${renderPatientInfoBlock()}
  <div class="doc-section-title">ДИАГНОЗ И АНАМНЕЗ</div>
  <p class="doc-paragraph">Жалобы, перенесенные соматические заболевания, данные объективного осмотра и зубной формулы зафиксированы в электронном дневнике.</p>
  ${renderSignaturesBlock("Пациент", "Лечащий врач")}
</div>
</body>
</html>
`,

	"doctor-schedule": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Расписание врачей</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("График смен")}
  <div class="doc-title">ГРАФИК И РАСПИСАНИЕ ПРИЕМА ВРАЧЕЙ-СТОМАТОЛОГОВ</div>
  <p class="doc-paragraph">Клиника: {{Клиника.Название}}, адрес: {{Клиника.Адрес}}.</p>
  <table class="doc-table">
    <thead><tr><th>Врач</th><th>Должность</th><th>Кабинет / Кресло</th><th>Дни и часы смены</th></tr></thead>
    <tbody><tr><td>{{АктивныйВрач.ФИО}}</td><td>{{АктивныйВрач.Должность}}</td><td>Кабинет терапевтический</td><td>Пн-Пт 09:00 - 15:00</td></tr></tbody>
  </table>
  ${renderSignaturesBlock("Администратор", "Главный врач")}
</div>
</body>
</html>
`,

	"stock-remains": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Остатки на складе</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Складской отчет")}
  <div class="doc-title">ВЕДОМОСТЬ ОСТАТКОВ МАТЕРИАЛОВ НА СКЛАДЕ: {{Склад.Название}}</div>
  <table class="doc-table">
    <thead><tr><th>Наименование материала</th><th>Неснижаемый порог</th><th>Текущий остаток</th><th>Ед. изм.</th></tr></thead>
    <tbody><tr><td>{{Склад.Материалы.Название}}</td><td>{{Склад.Материалы.МинимальныйПорог}}</td><td>{{Склад.Материалы.Остаток}}</td><td>шт / упак.</td></tr></tbody>
  </table>
  ${renderSignaturesBlock("Материально ответственное лицо", "Заведующий складом")}
</div>
</body>
</html>
`,

	"director-ai-report": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>AI-заключение для директора</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Аналитика DENTE")}
  <div class="doc-title">AI-ЗАКЛЮЧЕНИЕ И КЛИНИЧЕСКИЙ АУДИТ ДЛЯ РУКОВОДИТЕЛЯ КЛИНИКИ</div>
  <div class="doc-section-title">СВОДНЫЕ ПОКАЗАТЕЛИ ПРИЕМА</div>
  <p class="doc-paragraph">Пациент: {{Пациент.ФИО}}, лечащий врач: {{АктивныйВрач.ФИО}}.</p>
  <p class="doc-paragraph">Анализ соответствия клиническим рекомендациям СтАР, СанПиН нормам и полноте документации 043/у.</p>
  ${renderSignaturesBlock("AI Ассистент DENTE", "Генеральный директор")}
</div>
</body>
</html>
`,

	"fns-payment-certificate": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Справка ФНС (КНД 1151156)</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Форма по КНД 1151156")}
  <div class="doc-title">СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ПРЕДСТАВЛЕНИЯ В НАЛОГОВЫЕ ОРГАНЫ РФ</div>
  <div class="doc-subtitle">Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156)</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Выдана для подтверждения расходов налогоплательщика на медицинские услуги, оказанные клиникой {{Клиника.Название}} (ИНН {{Клиника.ИНН}}, КПП {{Клиника.КПП}}).
  </p>
  ${renderSignaturesBlock("Налогоплательщик (Пациент)", "Главный бухгалтер клиники")}
</div>
</body>
</html>
`,
};
