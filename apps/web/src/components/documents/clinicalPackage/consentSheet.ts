import type { ClinicalRequisitesContext } from "./types";

export function renderClinicalConsentSheet(ctx: ClinicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, clinicLicense, clinicInn, clinicOgrn,
		ptName, ptBirthDate, ptPassport, ptAddress, docDoctorName, opType, opTooth,
		icdDiagnosis, todayFormatted,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Тел: ${clinicPhone}` : ""}<br>
            Лицензия: № ${clinicLicense} • ИНН: ${clinicInn} • ОГРН: ${clinicOgrn}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">ФЗ № 323-ФЗ ст. 20</span><br>
            <span class="statutory-badge">Приказ МЗ РФ № 1051н</span>
          </div>
        </div>
      </div>

      <h1>Информированное добровольное согласие на терапевтическое стоматологическое лечение</h1>
      <div class="sheet-subtitle">Утверждено в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России № 1051н</div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>,
        паспортные данные: <strong>${ptPassport}</strong>,
        зарегистрированный(ая) по адресу: <strong>${ptAddress}</strong>,
        настоящим подтверждаю, что уполномочиваю врача-стоматолога <strong>${docDoctorName}</strong>
        провести мне (или представляемому мной лицу) плановое / неотложное терапевтическое стоматологическое лечение:
        <strong>${opType} в области ${opTooth}${icdDiagnosis}</strong>.
      </div>

      <div class="section-title">1. Суть планируемого медицинского вмешательства</div>
      <p>
        Мне подробно разъяснены диагноз, цели терапевтического лечения, включая проведение анестезии, изоляцию коффердам,
        препарирование с водно-воздушным охлаждением, антисептическую обработку полости, наложение прокладок, адгезивный протокол,
        послойное пломбирование и реставрацию композитными материалами светового отверждения, а при эндодонтическом лечении —
        обработку и постоянную обтурацию корневых каналов, шлифование и полирование реставрации по окклюзии.
      </p>

      <div class="section-title">2. Альтернативные методы лечения и последствия отказа</div>
      <p>
        Мне разъяснены альтернативные методы лечения (ортопедическое восстановление вкладкой/коронкой, удаление с последующей имплантацией),
        а также последствия отказа от лечения: прогрессирование кариеса, развитие пульпита, периодонтита, кист и утрата зуба.
      </p>

      <div class="section-title">3. Возможные осложнения и особенности адаптации</div>
      <p>Я поставлен(а) в известность о возможных осложнениях:</p>
      <ul>
        <li>Кратковременная постпломбировочная чувствительность при накусывании (3–7 дней);</li>
        <li>При глубоком кариесе — риск сохранения воспаления пульпы, требующий депульпирования;</li>
        <li>При искривленных каналах — риск перфорации или поломки эндодонтического микроинструмента;</li>
        <li>Временный дискомфорт десны в месте клампа коффердама или инъекции анестетика.</li>
      </ul>

      <div class="section-title">4. Обязательства пациента и гарантии</div>
      <p>
        Обязуюсь соблюдать гигиену полости рта, приходить на контрольные осмотры каждые 6 месяцев.
        Подтверждаю отсутствие скрытых аллергических реакций на анестетики и композитные материалы.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент (законный представитель):</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента / представителя) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Врач-стоматолог-терапевт:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись и личная печать врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>`;
}
