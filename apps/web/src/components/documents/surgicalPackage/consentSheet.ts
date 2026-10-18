import type { SurgicalRequisitesContext } from "./types";

export function renderSurgicalConsentSheet(ctx: SurgicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, clinicLicense, clinicInn, clinicOgrn,
		ptName, ptBirthDate, ptPassport, ptAddress, docDoctorName, opType, opTooth,
		todayFormatted,
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

      <h1>Информированное добровольное согласие на хирургическое стоматологическое вмешательство и дентальную имплантацию</h1>
      <div class="sheet-subtitle">Утверждено в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ</div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>,
        паспортные данные: <strong>${ptPassport}</strong>,
        зарегистрированный(ая) по адресу: <strong>${ptAddress}</strong>,
        настоящим подтверждаю, что уполномочиваю врача-стоматолога <strong>${docDoctorName}</strong>
        провести мне (или представляемому мной лицу) плановое / неотложное хирургическое вмешательство:
        <strong>${opType} в области ${opTooth}</strong>.
      </div>

      <div class="section-title">1. Суть планируемого медицинского вмешательства</div>
      <p>
        Мне подробно, в доступной форме разъяснены диагноз, характер и цели хирургического вмешательства,
        включая проведение местной анестезии, препарирование костного ложа, остеотомию, удаление зуба (корней),
        синус-лифтинг, направленную тканевую регенерацию с использованием мембран, установку имплантатов, наложение швов и гемостаз.
      </p>

      <div class="section-title">2. Альтернативные методы лечения и последствия отказа</div>
      <p>
        Мне разъяснены альтернативные методы лечения (сохранение зуба, протезирование), а также возможные риски отказа:
        распространение инфекции, развитие периостита, остеомиелита, флегмоны, убыль кости челюсти.
      </p>

      <div class="section-title">3. Возможные осложнения и риски операции</div>
      <p>Я поставлен(а) в известность о возможных осложнениях:</p>
      <ul>
        <li>Болевой синдром, отек мягких тканей лица и гематома в зоне операции (в первые 3–5 дней);</li>
        <li>Кровоточивость из лунки, расхождение швов, развитие альвеолита;</li>
        <li>Временное онемение губы, подбородка или языка при близком расположении нижнеальвеолярного нерва;</li>
        <li>Перфорация дна верхнечелюстной пазухи при операциях на верхней челюсти;</li>
        <li>Риск периимплантита или отторжения дентального имплантата, требующий его удаления.</li>
      </ul>

      <div class="section-title">4. Обязательства пациента</div>
      <p>
        Обязуюсь строго выполнять назначения врача, принимать назначенные препараты, соблюдать режим питания,
        гигиену рта и являться на контрольные осмотры и снятие швов.
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
        <strong>Хирург-стоматолог:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись и личная печать врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>`;
}
