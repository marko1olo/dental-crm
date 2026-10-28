import type { IntakeRequisitesContext } from "./types";

export function renderContractSheet(ctx: IntakeRequisitesContext): string {
	const {
		clinicName, clinicInn, clinicOgrn, clinicLicense, clinicAddress, clinicPhone,
		clinicWebsite, clinicCity, todayFormatted, patientCardNumber, clinicDirectorTitle,
		clinicDirector, hasRep, repFullName, repRelation, repBasis, repPassport, repPhone,
		ptName, ptBirthDate, ptPassport, ptSnils, ptAddress, ptPhone, clinicDirectorDecoding, ptSignatureDecoding,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            ИНН: ${clinicInn} · ОГРН: ${clinicOgrn} · Лицензия: № ${clinicLicense}<br>
            Адрес: ${clinicAddress}${clinicPhone ? ` · Тел: ${clinicPhone}` : ""}<br>
            Сайт клиники: ${clinicWebsite} · Лицензирующий орган: Росздравнадзор (roszdravnadzor.gov.ru)
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">ПП РФ от 11.05.2023 № 736</span><br>
            Экземпляр Пациента и Клиники<br>
            ${clinicCity} · ${todayFormatted}
          </div>
        </div>
        <h1>ДОГОВОР № ДЕНТЕ-${new Date().getFullYear()}-${patientCardNumber}</h1>
        <div class="sheet-subtitle">на оказание платных стоматологических медицинских услуг</div>
      </div>

      <div class="parties-block">
        <strong>Исполнитель:</strong> ${clinicName} в лице ${clinicDirectorTitle} ${clinicDirector}, действующего на основании Устава и лицензии № ${clinicLicense}, с одной стороны, и<br>
        ${
					hasRep
						? `<strong>Заказчик (Законный представитель):</strong> <strong>${repFullName}</strong> (${repRelation}, основание: ${repBasis}), паспорт: ${repPassport}, тел.: ${repPhone}, действующий(-ая) в интересах несовершеннолетнего Пациента: <strong>${ptName}</strong>, дата рождения: ${ptBirthDate}, документ: ${ptPassport}, СНИЛС: ${ptSnils}, адрес: ${ptAddress},`
						: `<strong>Пациент (Потребитель / Заказчик):</strong> <strong>${ptName}</strong>, дата рождения: ${ptBirthDate}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, адрес: ${ptAddress}, тел.: ${ptPhone},`
				} с другой стороны, заключили настоящий Договор о нижеследующем:
      </div>

      <div class="section-title">1. Предмет договора</div>
      <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические услуги надлежащего качества в соответствии с лицензией, утвержденными клиническими рекомендациями (протоколами лечения) Стоматологической Ассоциации России (СтАР) и стандартами медицинской помощи, а Пациент обязуется принять и оплатить оказанные услуги согласно условиям настоящего Договора.</p>
      <p>1.2. Конкретный перечень, объем, сроки и предварительная стоимость согласовываются сторонами в Плане лечения (Приложение № 1) и смете после осмотра полости рта и инструментальной диагностики.</p>

      <div class="section-title">2. Условия и порядок предоставления услуг</div>
      <p>2.1. Услуги оказываются при наличии информированного добровольного согласия (ИДС) Пациента, данного в порядке ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ.</p>
      <p>2.2. Пациент уведомлен в письменной форме о возможности получения бесплатной медицинской помощи в рамках программы государственных гарантий бесплатного оказания гражданам медицинской помощи (ОМС) и территориальной программы госгарантий в государственных учреждениях здравоохранения (п. 16 ПП РФ № 736; сайт лицензирующего органа: roszdravnadzor.gov.ru).</p>

      <div class="section-title">3. Стоимость услуг и порядок расчетов</div>
      <p>3.1. Стоимость услуг определяется действующим прайс-листом услуг Исполнителя. При первичном обращении до составления расширенной сметы ориентировочная сумма договора составляет 0 (ноль) рублей 00 коп. с оплатой первичного осмотра и диагностических снимков по факту их проведения.</p>
      <p>3.2. Оплата производится наличными денежными средствами, банковской картой или безналичным расчетом с выдачей кассового чека.</p>

      <div class="section-title">4. Права и обязанности сторон</div>
      <p>4.1. Пациент обязан предоставить полные и достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергиях и непереносимости препаратов, соблюдать рекомендации врача и график назначенных приёмов.</p>
      <p>4.2. Исполнитель обязан предоставить Пациенту полную информацию о методах лечения, возможных рисках и гарантировать конфиденциальность медицинской тайны (ст. 13 323-ФЗ).</p>

      <div class="section-title">5. Гарантийные обязательства</div>
      <p>5.1. Исполнитель устанавливает гарантийные сроки и сроки службы на результаты терапевтического, ортопедического и ортодонтического лечения в соответствии с Положением о гарантиях клиники при условии соблюдения Пациентом гигиены полости рта и регулярных профосмотров раз в 6 месяцев.</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        <strong>ИСПОЛНИТЕЛЬ:</strong><br>
        ${clinicName}<br>
        Лицензия: № ${clinicLicense}<br>
        ${clinicDirectorTitle}: ________________________${clinicDirectorDecoding}<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(М.П. / подпись уполномоченного лица)</div>
      </div>
      <div class="sign-box">
        <strong>${hasRep ? `ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (${repRelation}):` : "ПАЦИЕНТ (ЗАКАЗЧИК):"}</strong><br>
        ${hasRep ? repFullName : ptName}<br>
        Паспорт: ${hasRep ? repPassport : ptPassport}<br>
        ${hasRep ? `<span style="font-size:7pt; color:#4b5563;">В интересах пациента: ${ptName}</span><br>` : ""}
        Подпись: ________________________${hasRep ? ` / ${repFullName} /` : ptSignatureDecoding}<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(${hasRep ? "подпись законного представителя" : "личная подпись пациента"} / расшифровка)</div>
      </div>
    </div>
  </div>`;
}
