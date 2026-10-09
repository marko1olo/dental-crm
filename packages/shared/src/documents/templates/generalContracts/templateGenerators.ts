/**
 * @file templateGenerators.ts
 * @description Layer 2: Template generators, comprehensive treatment plan aggregations,
 * dental lab work orders, placeholder substitution engines, and master registry compilation.
 */

import {
	renderDocHeader,
	renderPatientInfoBlock,
	renderSignaturesBlock,
	SHARED_DOCUMENT_CSS,
} from "../templateStyles.js";
import {
	DOGOVOR_NA_OKAZANIE_MED_USLUG_TEMPLATE,
	DOGOVOR_NA_OKAZANIE_MED_USLUG_NESOVERSHENNOLETNEGO_TEMPLATE,
	SOGLASIE_NA_OBRABKU_PD_TEMPLATE,
	DOVERENNOST_NA_SOPROVOZHDENIE_REBENKA_TEMPLATE,
	ANKETA_OBSHCHEGO_SOSTOYANIYA_ZDOROVYA_TEMPLATE,
	POLOZHENIE_O_GARANTIYAKH_TEMPLATE,
	GARANTIJNYJ_PASPORT_TEMPLATE,
} from "./contractClauses.js";
import {
	INVOICE_ACT_TEMPLATE,
	DMS_ACT_TEMPLATE,
	INVOICE_XRAY_ACT_TEMPLATE,
	LOAN_AGREEMENT_TEMPLATE,
	STOCK_REMAINS_TEMPLATE,
	FNS_PAYMENT_CERTIFICATE_TEMPLATE,
} from "./actOfServicesTemplate.js";

/**
 * Комплексный план стоматологического лечения
 */
export const MEDPLAN_TEMPLATE = `
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
`;

/**
 * План лечения с агрегацией по специальностям
 */
export const MEDPLAN_AGG_TEMPLATE = `
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
`;

/**
 * Комплексный план лечения с агрегацией по зубному ряду
 */
export const MEDPLAN_AGG_TOOTH_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>План лечения с агрегацией по зубам</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("План лечения № {{Документ.Номер}}")}
  <div class="doc-title">КОМПЛЕКСНЫЙ ПЛАН ЛЕЧЕНИЯ С АГРЕГАЦИЕЙ ПО ЗУБНОМУ РЯДУ № {{Документ.Номер}}</div>
  <div class="doc-subtitle">Приложение к амбулаторной карте № {{Пациент.НомерКарты}} от {{ТекущаяДата}} г.</div>

  <table class="doc-table" style="margin-bottom: 8px; font-size: 9.5pt;">
    <tr>
      <td style="width: 50%;">
        <strong>Клиника:</strong> {{Клиника.Название}} (ИНН: {{Клиника.ИНН}}, Лицензия: {{Клиника.Лицензия.Номер}})<br/>
        Адрес: {{Клиника.Адрес}} | Тел.: {{Клиника.Телефон}}<br/>
        <strong>Лечащий врач-координатор:</strong> {{АктивныйВрач.Должность}} {{АктивныйВрач.ФИО}}
      </td>
      <td style="width: 50%;">
        <strong>Пациент:</strong> {{Пациент.ФИО}}<br/>
        Дата рождения: {{Пациент.ДеньРождения}} (возраст: {{Пациент.Возраст}})<br/>
        Тел.: {{Пациент.Телефон}} | Карта: {{Пациент.НомерКарты}}<br/>
        <strong>Срок действия плана:</strong> 30 календарных дней (до: {{ПланЛечения.СрокДействия}})
      </td>
    </tr>
  </table>

  <div class="doc-warning">
    <strong>СРОК ДЕЙСТВИЯ ПЛАНА И ФИКСАЦИЯ СТОИМОСТИ:</strong><br/>
    Предварительный план лечения и расчет стоимости действительны в течение <strong>30 календарных дней</strong> с момента составления 
    (до: <strong>{{ПланЛечения.СрокДействия}}</strong>). В ходе лечения возможны изменения предварительного плана по объективным клиническим 
    показаниям (ст. 10 Закона о ЗПП, п. 24 Правил, утв. ПП РФ № 736) с обязательным предварительным согласованием с пациентом.
  </div>

  {{!ПланЛечения.ТаблицаПоЗубам}}
  {{!ПланЛечения.Таблица}}

  <div class="doc-section-title">ЭТАП 1: НЕОТЛОЖНАЯ ПОМОЩЬ, ГИГИЕНА И ТЕРАПЕВТИЧЕСКАЯ САНАЦИЯ</div>
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">№</th>
        <th style="width: 10%; text-align: center;">Зуб (FDI)</th>
        <th style="width: 14%;">Код услуги</th>
        <th>Наименование лечебной манипуляции</th>
        <th style="width: 8%; text-align: center;">Кол-во</th>
        <th style="width: 12%; text-align: right;">Цена, руб.</th>
        <th style="width: 14%; text-align: right;">Сумма, руб.</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1.1</td>
        <td style="text-align: center; font-weight: bold;">11-48</td>
        <td style="font-family: monospace;">A16.07.051</td>
        <td>Комплексная профессиональная гигиена полости рта (ультразвук, Air-Flow, полировка, фторлак)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">5 500,00</td>
        <td style="text-align: right; font-weight: bold;">5 500,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">1.2</td>
        <td style="text-align: center; font-weight: bold;">16</td>
        <td style="font-family: monospace;">A16.07.002</td>
        <td>Лечение глубокого кариеса дентина с лечебной подкладкой Biodentine и реставрацией нанокомпозитом</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">6 500,00</td>
        <td style="text-align: right; font-weight: bold;">6 500,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">1.3</td>
        <td style="text-align: center; font-weight: bold;">24</td>
        <td style="font-family: monospace;">A16.07.008</td>
        <td>Эндодонтическое лечение пульпита (инструментальная обработка 2 каналов ProTaper, обтурация гуттаперчей)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">9 800,00</td>
        <td style="text-align: right; font-weight: bold;">9 800,00</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="6" style="text-align: right;">Итого по этапу 1 (Санация и терапия):</td>
        <td style="text-align: right;">21 800,00</td>
      </tr>
    </tbody>
  </table>

  <div class="doc-section-title">ЭТАП 2: ХИРУРГИЧЕСКАЯ ПОДГОТОВКА И ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ</div>
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">№</th>
        <th style="width: 10%; text-align: center;">Зуб (FDI)</th>
        <th style="width: 14%;">Код услуги</th>
        <th>Наименование лечебной манипуляции</th>
        <th style="width: 8%; text-align: center;">Кол-во</th>
        <th style="width: 12%; text-align: right;">Цена, руб.</th>
        <th style="width: 14%; text-align: right;">Сумма, руб.</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">2.1</td>
        <td style="text-align: center; font-weight: bold;">38</td>
        <td style="font-family: monospace;">A16.07.001.002</td>
        <td>Сложное удаление ретинированного дистопированного зуба мудрости с фрагментацией коронки</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">7 200,00</td>
        <td style="text-align: right; font-weight: bold;">7 200,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">2.2</td>
        <td style="text-align: center; font-weight: bold;">36</td>
        <td style="font-family: monospace;">A16.07.054</td>
        <td>Внутрикостная дентальная имплантация системы премиум-класса (установка титанового имплантата)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">42 000,00</td>
        <td style="text-align: right; font-weight: bold;">42 000,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">2.3</td>
        <td style="text-align: center; font-weight: bold;">36</td>
        <td style="font-family: monospace;">A16.07.055</td>
        <td>Направленная костная регенерация (НКР) / синус-лифтинг с остеопластическим материалом и мембраной</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">18 500,00</td>
        <td style="text-align: right; font-weight: bold;">18 500,00</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="6" style="text-align: right;">Итого по этапу 2 (Хирургия и имплантация):</td>
        <td style="text-align: right;">67 700,00</td>
      </tr>
    </tbody>
  </table>

  <div class="doc-section-title">ЭТАП 3: ОРТОПЕДИЧЕСКАЯ РЕАБИЛИТАЦИЯ И ПРОТЕЗИРОВАНИЕ</div>
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">№</th>
        <th style="width: 10%; text-align: center;">Зуб (FDI)</th>
        <th style="width: 14%;">Код услуги</th>
        <th>Наименование лечебной манипуляции</th>
        <th style="width: 8%; text-align: center;">Кол-во</th>
        <th style="width: 12%; text-align: right;">Цена, руб.</th>
        <th style="width: 14%; text-align: right;">Сумма, руб.</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">3.1</td>
        <td style="text-align: center; font-weight: bold;">24</td>
        <td style="font-family: monospace;">A16.07.003</td>
        <td>Восстановление зуба культевой вкладкой из диоксида циркония CAD/CAM</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">8 000,00</td>
        <td style="text-align: right; font-weight: bold;">8 000,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">3.2</td>
        <td style="text-align: center; font-weight: bold;">24</td>
        <td style="font-family: monospace;">A16.07.004</td>
        <td>Изготовление и постоянная адгезивная фиксация безметалловой коронки из диоксида циркония (ZrO2)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">24 000,00</td>
        <td style="text-align: right; font-weight: bold;">24 000,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">3.3</td>
        <td style="text-align: center; font-weight: bold;">36</td>
        <td style="font-family: monospace;">A16.07.006</td>
        <td>Установка формирователя десны, индивидуального циркониевого абатмента и коронки на имплантате</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">36 000,00</td>
        <td style="text-align: right; font-weight: bold;">36 000,00</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="6" style="text-align: right;">Итого по этапу 3 (Ортопедия):</td>
        <td style="text-align: right;">68 000,00</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1.5px solid #0f766e; padding: 10px 14px; margin: 12px 0; font-size: 10pt;">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">ОБЩАЯ СМЕТНАЯ СТОИМОСТЬ ПО ПЛАНУ ЛЕЧЕНИЯ:</span>
      <span style="font-size: 13pt; font-weight: bold; color: #0f766e;">{{Сумма}}</span>
    </div>
    <div style="margin-top: 4px;">Сумма прописью: <strong>{{СуммаПрописью}}</strong></div>
  </div>

  <p class="doc-paragraph">
    С планом лечения, альтернативными методами, рисками, сроками выполнения и стоимостью ознакомлен(а) и согласен(а). 
    Обязуюсь соблюдать назначенный график посещений и гигиенические предписания.
  </p>

  <table class="doc-table" style="margin-top: 14px;">
    <tr>
      <td style="width: 50%;">
        <strong>Пациент:</strong><br/><br/>
        Подпись: _____________________ / {{Пациент.ФИО}} /<br/>
        <div class="doc-sig-caption">(с планом и сметой согласен)</div>
        <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
      </td>
      <td style="width: 50%;">
        <strong>Лечащий врач-координатор:</strong><br/><br/>
        Подпись: _____________________ / {{АктивныйВрач.ФИО}} /<br/>
        <div class="doc-sig-caption">({{АктивныйВрач.Должность}})</div>
        <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
`;

/**
 * Медицинская карта стоматологического пациента (форма 043/у)
 */
export const OUTPATIENT_CARD_TEMPLATE = `
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
`;

/**
 * График и расписание приема врачей-стоматологов
 */
export const DOCTOR_SCHEDULE_TEMPLATE = `
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
`;

/**
 * AI-заключение и клинический аудит для руководителя клиники
 */
export const DIRECTOR_AI_REPORT_TEMPLATE = `
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
`;

/**
 * Заказ-наряд в зуботехническую лабораторию
 */
export const DENTAL_WORK_ORDER_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Заказ-наряд в зуботехническую лабораторию</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Заказ-наряд № {{Документ.Номер}}")}
  <div class="doc-title">ЗАКАЗ-НАРЯД В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ № {{Документ.Номер}}</div>
  <div class="doc-subtitle">от {{ТекущаяПолнаяДата}}</div>

  <!-- Реквизиты клиники, лаборатории и пациента -->
  <table class="doc-table" style="margin: 10px 0; font-size: 8.5pt;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <strong>Заказчик (Клиника):</strong> {{Клиника.Название}}<br/>
        ИНН: {{Клиника.ИНН}} • Тел: {{Клиника.Телефон}}<br/>
        Адрес: {{Клиника.Адрес}}<br/>
        <strong>Лечащий врач-ортопед:</strong> {{АктивныйВрач.ФИО}} ({{АктивныйВрач.Должность}})
      </td>
      <td style="width: 50%; vertical-align: top;">
        <strong>Исполнитель (ЗТЛ):</strong> {{Лаборатория.Название}}<br/>
        <strong>Зубной техник:</strong> {{ЗубнойТехник.ФИО}}<br/>
        <strong>Пациент:</strong> {{Пациент.ФИО}} ({{Пациент.Пол}}, {{Пациент.Возраст}} лет)<br/>
        Дата рожд.: {{Пациент.ДатаРождения}} • Медкарта № {{Пациент.НомерКарты}}
      </td>
    </tr>
  </table>

  <!-- Таблица ортопедических работ -->
  <div class="doc-section-title">СПЕЦИФИКАЦИЯ ЗУБОТЕХНИЧЕСКИХ РАБОТ И КОНСТРУКЦИЙ</div>
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 5%;">№</th>
        <th style="width: 10%;">Зуб (FDI)</th>
        <th style="width: 12%;">Код услуги</th>
        <th>Вид работы / Конструкция / Материал</th>
        <th style="width: 7%;">Кол-во</th>
        <th style="width: 14%;">Цвет (VITA)</th>
        <th style="width: 14%;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td style="text-align: center; font-weight: bold;">11, 21</td>
        <td style="text-align: center;">A16.07.004</td>
        <td>Одиночная коронка из диоксида циркония (ZrO2) Prettau с индивидуализацией</td>
        <td style="text-align: center;">2</td>
        <td style="text-align: center; font-weight: bold;">{{ЗаказНаряд.Цвет}}</td>
        <td style="text-align: right;">36 000,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td style="text-align: center; font-weight: bold;">14, 15</td>
        <td style="text-align: center;">A16.07.003</td>
        <td>Керамический винир E.max Press с послойным нанесением полевошпатной керамики</td>
        <td style="text-align: center;">2</td>
        <td style="text-align: center; font-weight: bold;">{{ЗаказНаряд.Цвет}}</td>
        <td style="text-align: right;">38 000,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td style="text-align: center; font-weight: bold;">46</td>
        <td style="text-align: center;">A16.07.006</td>
        <td>Коронка на имплантате с винтовой фиксацией (Ti-base + цельноциркониевая коронка)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: center; font-weight: bold;">{{ЗаказНаряд.Цвет}}</td>
        <td style="text-align: right;">28 000,00</td>
      </tr>
    </tbody>
    <tfoot>
      <tr style="font-weight: bold; background: #f8fafc;">
        <td colspan="6" style="text-align: right;">ИТОГО ПО ЗАКАЗ-НАРЯДУ:</td>
        <td style="text-align: right; color: #0f766e;">{{Сумма}}</td>
      </tr>
    </tfoot>
  </table>

  <div style="margin: 6px 0 10px 0; font-size: 8.5pt;">
    Сумма прописью: <strong>{{СуммаПрописью}}</strong>
  </div>

  <!-- Технические и клинические параметры -->
  <div class="doc-section-title">ТЕХНИЧЕСКИЕ И КЛИНИЧЕСКИЕ ПАРАМЕТРЫ ЗАКАЗА</div>
  <table class="doc-table" style="font-size: 8.5pt;">
    <tr>
      <td style="width: 35%; background: #f8fafc; font-weight: bold;">Цвет по шкале VITA / 3D Master:</td>
      <td><strong>{{ЗаказНаряд.Цвет}}</strong></td>
    </tr>
    <tr>
      <td style="background: #f8fafc; font-weight: bold;">Цифровой 3D STL-скан / CAD проект:</td>
      <td>{{ЗаказНаряд.StlСсылка}}</td>
    </tr>
    <tr>
      <td style="background: #f8fafc; font-weight: bold;">Дата примерки каркаса / конструкции:</td>
      <td><strong>{{ЗаказНаряд.ДатаПримерки}}</strong></td>
    </tr>
    <tr>
      <td style="background: #f8fafc; font-weight: bold;">Ожидаемая дата сдачи работы в клинику:</td>
      <td><strong>{{Документ.ДатаОкончания}}</strong></td>
    </tr>
    <tr>
      <td style="background: #f8fafc; font-weight: bold;">Тип культи и окклюзия:</td>
      <td>Уступ chamfer 0.8 мм, погружение 0.2 мм, клыковое ведение, множественные фиссурно-бугорковые контакты.</td>
    </tr>
    <tr>
      <td style="background: #f8fafc; font-weight: bold;">Клинические указания и комментарии:</td>
      <td><em>{{ЗаказНаряд.Комментарий}}</em></td>
    </tr>
  </table>

  <!-- Подписи сторон -->
  <table class="doc-table" style="margin-top: 16px;">
    <tr>
      <td style="width: 50%;">
        <strong>Врач-стоматолог ортопед:</strong><br/><br/>
        Подпись: _____________________ / {{АктивныйВрач.ФамилияИнициалы}} /<br/>
        <div class="doc-sig-caption">({{АктивныйВрач.Должность}})</div>
        <div style="margin-top: 6px;">Дата передачи в ЗТЛ: {{ТекущаяПолнаяДата}}</div>
      </td>
      <td style="width: 50%;">
        <strong>Зубной техник / Ответственный ЗТЛ:</strong><br/><br/>
        Подпись: _____________________ / {{ЗубнойТехник.ФИО}} /<br/>
        <div class="doc-sig-caption">(Заказ принят в производство)</div>
        <div style="margin-top: 6px;">М.П. Лаборатории</div>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
`;

/**
 * Подстановка плейсхолдеров шаблона (например {{Пациент.ФИО}}) данными из объекта
 */
export function substituteTemplatePlaceholders(template: string, data: Record<string, unknown>): string {
	let result = template;
	for (const [key, val] of Object.entries(data)) {
		if (val !== undefined && val !== null) {
			result = result.replaceAll(`{{${key}}}`, String(val));
		}
	}
	return result;
}

/**
 * Форматирование суммы в валюте РФ
 */
export function formatCurrencyRub(amount: number): string {
	return `${amount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} руб.`;
}

/**
 * Бланки договоров, анкет, гарантий и финансовых документов
 */
export const GENERAL_TEMPLATES_HTML: Record<string, string> = {
	dogovor_na_okazanie_med_uslug: DOGOVOR_NA_OKAZANIE_MED_USLUG_TEMPLATE,
	dogovor_na_okazanie_med_uslug_nesovershennoletnego: DOGOVOR_NA_OKAZANIE_MED_USLUG_NESOVERSHENNOLETNEGO_TEMPLATE,
	soglasie_na_obrabku_pd: SOGLASIE_NA_OBRABKU_PD_TEMPLATE,
	doverennost_na_soprovozhdenie_rebenka: DOVERENNOST_NA_SOPROVOZHDENIE_REBENKA_TEMPLATE,
	anketa_obshchego_sostoyaniya_zdorovya: ANKETA_OBSHCHEGO_SOSTOYANIYA_ZDOROVYA_TEMPLATE,
	polozhenie_o_garantiyakh: POLOZHENIE_O_GARANTIYAKH_TEMPLATE,
	garantijnyj_pasport: GARANTIJNYJ_PASPORT_TEMPLATE,
	"invoice-act": INVOICE_ACT_TEMPLATE,
	"dms-act": DMS_ACT_TEMPLATE,
	"invoice-xray-act": INVOICE_XRAY_ACT_TEMPLATE,
	medplan: MEDPLAN_TEMPLATE,
	"medplan-agg": MEDPLAN_AGG_TEMPLATE,
	"medplan-agg-tooth": MEDPLAN_AGG_TOOTH_TEMPLATE,
	loan: LOAN_AGREEMENT_TEMPLATE,
	"outpatient-card": OUTPATIENT_CARD_TEMPLATE,
	"doctor-schedule": DOCTOR_SCHEDULE_TEMPLATE,
	"stock-remains": STOCK_REMAINS_TEMPLATE,
	"director-ai-report": DIRECTOR_AI_REPORT_TEMPLATE,
	"dental-work-order": DENTAL_WORK_ORDER_TEMPLATE,
	"fns-payment-certificate": FNS_PAYMENT_CERTIFICATE_TEMPLATE,
};
