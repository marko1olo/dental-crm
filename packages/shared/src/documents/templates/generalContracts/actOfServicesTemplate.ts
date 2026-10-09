/**
 * @file actOfServicesTemplate.ts
 * @description Layer 1: Acts of completed medical services (Nomenclature 804n),
 * voluntary medical insurance (DMS) acts, X-ray reception acts, clinic internal installment agreements,
 * warehouse balances, and FNS tax social deduction certificates (KND 1151156).
 */

import {
	renderDocHeader,
	renderPatientInfoBlock,
	renderSignaturesBlock,
	SHARED_DOCUMENT_CSS,
} from "../templateStyles.js";

/**
 * Акт выполненных медицинских работ (услуг) по номенклатуре Минздрава 804н
 */
export const INVOICE_ACT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Акт выполненных работ</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Акт № {{Документ.Номер}}")}
  <div class="doc-title">АКТ ВЫПОЛНЕННЫХ МЕДИЦИНСКИХ РАБОТ (УСЛУГ) № {{Документ.Номер}}</div>
  <div class="doc-subtitle">Приложение к Договору на оказание платных стоматологических услуг № {{Договор.Номер}} от {{Договор.Дата}} (г. {{Клиника.Город}})</div>

  <table class="doc-table" style="margin-bottom: 8px; font-size: 9.5pt;">
    <tr>
      <td style="width: 50%;">
        <strong>ИСПОЛНИТЕЛЬ (КЛИНИКА):</strong><br/>
        <strong>{{Клиника.Название}}</strong><br/>
        Адрес: {{Клиника.Адрес}}<br/>
        ИНН: {{Клиника.ИНН}} / КПП: {{Клиника.КПП}} | ОГРН: {{Клиника.ОГРН}}<br/>
        Лицензия № {{Клиника.Лицензия.Номер}} от {{Клиника.Лицензия.ДатаВыдачи}} ({{Клиника.Лицензия.КемВыдана}})<br/>
        Тел.: {{Клиника.Телефон}} | Сайт: {{Клиника.Сайт}}
      </td>
      <td style="width: 50%;">
        <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br/>
        ФИО: <strong>{{Пациент.ФИО}}</strong><br/>
        Дата рождения: {{Пациент.ДеньРождения}} ({{Пациент.Возраст}})<br/>
        Паспорт РФ: серия {{Пациент.Паспорт.Серия}} № {{Пациент.Паспорт.Номер}}, выдан {{Пациент.Паспорт.ДатаВыдачи}} ({{Пациент.Паспорт.КемВыдан}})<br/>
        Адрес: {{Пациент.Адрес}}<br/>
        Тел.: {{Пациент.Телефон}} | Карта №: {{Пациент.НомерКарты}}
      </td>
    </tr>
  </table>

  <div class="doc-section-title">ПЕРЕЧЕНЬ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ</div>
  {{!Акт.ТаблицаУслуг}}
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">№ п/п</th>
        <th style="width: 8%; text-align: center;">№ зуба</th>
        <th style="width: 14%;">Код услуги</th>
        <th>Наименование медицинской работы (услуги)</th>
        <th style="width: 7%; text-align: center;">Кол-во</th>
        <th style="width: 11%; text-align: right;">Цена (руб.)</th>
        <th style="width: 9%; text-align: right;">Скидка</th>
        <th style="width: 12%; text-align: right;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td style="text-align: center; font-weight: bold;">16</td>
        <td style="font-family: monospace;">A16.07.002</td>
        <td>Восстановление зуба пломбой (лечение кариеса дентина светоотверждаемым нанокомпозитом)</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">4 500,00</td>
        <td style="text-align: right;">0,00</td>
        <td style="text-align: right; font-weight: bold;">4 500,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td style="text-align: center; font-weight: bold;">16</td>
        <td style="font-family: monospace;">A11.07.012</td>
        <td>Глубокое фторирование эмали и медикаментозная обработка кариозной полости</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">850,00</td>
        <td style="text-align: right;">0,00</td>
        <td style="text-align: right; font-weight: bold;">850,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td style="text-align: center; font-weight: bold;">16</td>
        <td style="font-family: monospace;">B01.065.001</td>
        <td>Прием (осмотр, консультация) врача-стоматолога первичный с постановкой диагноза</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">1 500,00</td>
        <td style="text-align: right;">0,00</td>
        <td style="text-align: right; font-weight: bold;">1 500,00</td>
      </tr>
      <tr>
        <td style="text-align: center;">4</td>
        <td style="text-align: center;">—</td>
        <td style="font-family: monospace;">A26.07.001</td>
        <td>Индивидуальный санитарно-гигиенический антисептический комплект</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">450,00</td>
        <td style="text-align: right;">0,00</td>
        <td style="text-align: right; font-weight: bold;">450,00</td>
      </tr>
      <tr style="font-weight: bold; background-color: #f8fafc;">
        <td colspan="7" style="text-align: right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align: right;">{{Сумма}}</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; margin: 10px 0; font-size: 10pt;">
    <div><strong>Всего оказано услуг на сумму:</strong> <strong>{{Сумма}}</strong> ({{СуммаПрописью}}).</div>
    <div style="font-size: 8.5pt; color: #555; margin-top: 2px;">НДС не облагается на основании подпункта 2 пункта 2 статьи 149 Налогового кодекса РФ (медицинские услуги).</div>
  </div>

  <div class="doc-section-title">ЮРИДИЧЕСКИЙ БЛОК И СДАЧА-ПРИЕМКА РАБОТ</div>
  <p class="doc-paragraph">
    В соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями 
    платных медицинских услуг», статьями 779–783 Гражданского кодекса РФ и Законом РФ от 07.02.1992 № 2300-1 «О защите прав потребителей», 
    Пациент (Заказчик) <strong>{{Пациент.ФИО}}</strong> и Исполнитель (Клиника) <strong>{{Клиника.Название}}</strong> 
    в лице лечащего врача <strong>{{АктивныйВрач.ФИО}}</strong> составили настоящий Акт о том, что все вышеперечисленные медицинские 
    услуги оказаны Исполнителем в полном объёме, качественно, своевременно и в строгом соответствии с лицензией, клиническими рекомендациями (протоколами лечения) 
    Стоматологической Ассоциации России (СтАР) и стандартами медицинской помощи РФ.
  </p>
  <p class="doc-paragraph">
    Пациент подтверждает, что результат оказанных стоматологических услуг им лично осмотрен и принят в полном объёме. 
    Претензий по объёму, качеству, эстетическим свойствам и срокам оказания услуг Пациент к Исполнителю не имеет.
  </p>

  <div class="doc-section-title">ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА</div>
  <p class="doc-paragraph">
    На выполненные стоматологические работы (услуги) Исполнитель устанавливает гарантийный срок <strong>1 (один) год</strong> 
    (на композитные световые пломбы и эндодонтическое лечение) и <strong>2 (два) года</strong> (на ортопедические коронки и конструкции) 
    в соответствии с утвержденным Положением о гарантиях клиники. Гарантия действует при условии соблюдения Пациентом гигиены полости рта, 
    врачебных рекомендаций и обязательного прохождения контрольных профилактических осмотров не реже 1 раза в 6 месяцев.
  </p>

  <table class="doc-table" style="margin-top: 14px;">
    <tr>
      <td style="width: 50%;">
        <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br/><br/>
        Подпись: _____________________ / {{Пациент.ФИО}} /<br/>
        <div class="doc-sig-caption">(услуги принял в полном объеме, претензий не имею)</div>
        <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
      </td>
      <td style="width: 50%;">
        <strong>ИСПОЛНИТЕЛЬ (КЛИНИКА):</strong><br/><br/>
        {{АктивныйВрач.Должность}}:<br/>
        Подпись: _____________________ / {{АктивныйВрач.ФИО}} /<br/>
        <div class="doc-sig-caption">(подпись врача, личная печать, М.П. клиники)</div>
        <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
`;

/**
 * Акт оказанных услуг по страховой программе ДМС
 */
export const DMS_ACT_TEMPLATE = `
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
`;

/**
 * Акт сдачи-приемки рентгенологического исследования
 */
export const INVOICE_XRAY_ACT_TEMPLATE = `
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
`;

/**
 * Соглашение и график платежей по внутренней рассрочке клиники
 */
export const LOAN_AGREEMENT_TEMPLATE = `
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
`;

/**
 * Ведомость остатков материалов на складе
 */
export const STOCK_REMAINS_TEMPLATE = `
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
`;

/**
 * Справка об оплате медицинских услуг для представления в налоговые органы РФ (форма КНД 1151156)
 */
export const FNS_PAYMENT_CERTIFICATE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Справка об оплате медицинских услуг (КНД 1151156)</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  <!-- ВЕРХНЯЯ ЧАСТЬ: КОРЕШОК К СПРАВКЕ (хранится в клинике 3 года) -->
  <div style="border: 1px solid #cbd5e1; padding: 12px 16px; background: #fafafa; border-radius: 4px; font-size: 8.5pt;">
    <div style="text-align: right; font-size: 7.5pt; color: #64748b; line-height: 1.2;">
      Утверждено Приказом Минздрава России и МНС России от 25.07.2001 № 289/БГ-3-04/256<br/>
      (с учетом формы КНД 1151156, утв. Приказом ФНС России от 08.11.2023 № ЕА-7-11/824@)
    </div>
    <div style="text-align: center; font-weight: bold; font-size: 9.5pt; margin: 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
      КОРЕШОК К СПРАВКЕ ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ПРЕДСТАВЛЕНИЯ В НАЛОГОВЫЕ ОРГАНЫ РФ № {{СправкаФНС.Номер}}
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; line-height: 1.4;">
      <tr>
        <td style="width: 35%; padding: 2px 0;"><strong>Ф.И.О. налогоплательщика:</strong></td>
        <td style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">{{Налогоплательщик.ФИО}}</td>
        <td style="width: 15%; padding: 2px 0 2px 10px;"><strong>ИНН:</strong></td>
        <td style="width: 20%; border-bottom: 1px solid #94a3b8; padding: 2px 4px;">{{Налогоплательщик.ИНН}}</td>
      </tr>
      <tr>
        <td style="padding: 2px 0;"><strong>Ф.И.О. пациента:</strong></td>
        <td style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">{{Пациент.ФИО}}</td>
        <td style="padding: 2px 0 2px 10px;"><strong>Код услуги:</strong></td>
        <td style="border-bottom: 1px solid #94a3b8; padding: 2px 4px; font-weight: bold;">{{СправкаФНС.КодУслуги}}</td>
      </tr>
      <tr>
        <td style="padding: 2px 0;"><strong>№ амбулаторной медкарты:</strong></td>
        <td style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">{{Пациент.НомерКарты}}</td>
        <td style="padding: 2px 0 2px 10px;"><strong>Дата оплаты:</strong></td>
        <td style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">{{Акт.Дата}}</td>
      </tr>
      <tr>
        <td style="padding: 2px 0;"><strong>Стоимость медицинских услуг:</strong></td>
        <td colspan="3" style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">
          <strong>{{Сумма}}</strong> ({{СуммаПрописью}})
        </td>
      </tr>
      <tr>
        <td style="padding: 2px 0;"><strong>Медицинская организация:</strong></td>
        <td colspan="3" style="border-bottom: 1px solid #94a3b8; padding: 2px 4px;">
          {{Клиника.Название}}, ИНН {{Клиника.ИНН}}
        </td>
      </tr>
    </table>

    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt;">
      <tr>
        <td style="width: 50%;">
          Подпись лица, выдавшего справку: _________ / {{ТекущийПользователь.ФамилияИО}} /
        </td>
        <td style="width: 50%; text-align: right;">
          Подпись получателя (налогоплательщика): _________ / {{Налогоплательщик.ФИО}} /
        </td>
      </tr>
      <tr>
        <td colspan="2" style="font-size: 7.5pt; color: #64748b; padding-top: 4px;">
          Дата выдачи справки: {{ТекущаяПолнаяДата}}. Корешок подлежит обязательному хранению в делах клиники в течение 3 лет.
        </td>
      </tr>
    </table>
  </div>

  <!-- ЛИНИЯ ОТРЫВА (SCISSOR CUT LINE) -->
  <div style="border-bottom: 2px dashed #94a3b8; margin: 18px 0; text-align: center; position: relative; height: 14px;">
    <span style="position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #ffffff; padding: 0 14px; font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
      ✂ - - - - - - - - - - - - - - - - Линия отрыва - - - - - - - - - - - - - - - - ✂
    </span>
  </div>

  <!-- НИЖНЯЯ ЧАСТЬ: СПРАВКА ДЛЯ НАЛОГОВЫХ ОРГАНОВ РФ (выдается налогоплательщику) -->
  <div style="font-size: 9.5pt; line-height: 1.45;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8.5pt;">
      <tr>
        <td style="width: 65%; vertical-align: top;">
          <div style="font-size: 8pt; color: #64748b; text-transform: uppercase;">Министерство здравоохранения Российской Федерации</div>
          <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">{{Клиника.Название}}</div>
          <div>ИНН: {{Клиника.ИНН}} / КПП: {{Клиника.КПП}} • Адрес: {{Клиника.Адрес}}</div>
          <div>Лицензия: {{Клиника.Лицензия}}</div>
          <div>Тел: {{Клиника.Телефон}}</div>
        </td>
        <td style="width: 35%; text-align: right; vertical-align: top; font-size: 8pt; color: #475569;">
          <div>Утверждено Приказом Минздрава России<br/>и МНС России от 25.07.2001 № 289/БГ-3-04/256</div>
          <div style="margin-top: 4px; font-weight: 600;">Форма по КНД 1151156</div>
          <div style="color: #64748b;">(Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@)</div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 14px 0 10px 0;">
      <div style="font-size: 12pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
        СПРАВКА
      </div>
      <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">
        ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ПРЕДСТАВЛЕНИЯ В НАЛОГОВЫЕ ОРГАНЫ РОССИЙСКОЙ ФЕДЕРАЦИИ № {{СправкаФНС.Номер}}
      </div>
      <div style="font-size: 9pt; color: #475569; margin-top: 3px;">
        от {{ТекущаяПолнаяДата}}
      </div>
    </div>

    <div style="margin: 10px 0;">
      Выдана налогоплательщику (Ф.И.О.): <strong style="border-bottom: 1px solid #334155; padding: 0 4px;">{{Налогоплательщик.ФИО}}</strong><br/>
      ИНН налогоплательщика: <strong style="border-bottom: 1px solid #334155; padding: 0 4px;">{{Налогоплательщик.ИНН}}</strong>
    </div>

    <p style="text-indent: 20px; margin: 8px 0; text-align: justify;">
      В том, что он (она) оплатил(а) медицинские стоматологические услуги стоимостью: 
      <strong>{{Сумма}}</strong> (<strong>{{СуммаПрописью}}</strong>),
    </p>

    <div style="margin: 8px 0; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px;">
      <strong>Код услуги:</strong> <span style="font-size: 12pt; font-weight: bold; color: #0f766e; margin-left: 6px;">{{СправкаФНС.КодУслуги}}</span>
      <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
        (Код 1 — медицинские услуги, не относящиеся к дорогостоящему лечению; Код 2 — дорогостоящие медицинские услуги по Перечню, утвержденному Постановлением Правительства Российской Федерации от 08.04.2020 № 458).
      </div>
    </div>

    <div style="margin: 8px 0;">
      Оказанные: <u>ему (ей)</u>, супруге(у), сыну (дочери), матери (отцу) <span style="font-size: 8pt; color: #64748b;">(нужное подчеркнуть)</span>
    </div>

    <div style="margin: 6px 0;">
      Пациент (Ф.И.О. полностью): <strong style="border-bottom: 1px solid #334155; padding: 0 4px;">{{Пациент.ФИО}}</strong>
    </div>

    <div style="display: flex; justify-content: space-between; margin: 6px 0;">
      <div>Дата рождения: <strong>{{Пациент.ДатаРождения}}</strong></div>
      <div>Номер амбулаторной карты: <strong>{{Пациент.НомерКарты}}</strong></div>
      <div>Дата оплаты: <strong>{{Акт.Дата}}</strong></div>
    </div>

    <p style="font-size: 8pt; color: #64748b; margin: 12px 0 16px 0; line-height: 1.35; text-align: justify;">
      Настоящая справка выдается для подтверждения фактических расходов налогоплательщика на оплату медицинских услуг и лекарственных препаратов в соответствии с подпунктом 3 пункта 1 статьи 219 Налогового кодекса Российской Федерации в целях предоставления социального налогового вычета по налогу на доходы физических лиц (НДФЛ).
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 9pt;">
      <tr>
        <td style="width: 65%; vertical-align: bottom;">
          Фамилия, имя, отчество и должность лица, выдавшего справку:<br/>
          <strong>{{ТекущийПользователь.Должность}}</strong><br/><br/>
          Подпись: _____________________ / {{ТекущийПользователь.ФамилияИО}} /
        </td>
        <td style="width: 35%; text-align: right; vertical-align: bottom;">
          <div style="font-size: 8pt; color: #64748b; margin-bottom: 8px;">Телефон для справок: {{Клиника.Телефон}}</div>
          <div style="border: 1px dashed #94a3b8; width: 85px; height: 85px; line-height: 85px; text-align: center; display: inline-block; font-size: 8pt; color: #64748b; border-radius: 50%;">
            М.П.
          </div>
        </td>
      </tr>
    </table>

    <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 7.5pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
      <span>Бланк. Формат А5 / А4.</span>
      <span>Срок хранения копии бланка в архиве клиники — 3 года.</span>
    </div>
  </div>
</div>
</body>
</html>
`;
