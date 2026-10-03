const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7b840f43-9522-451c-bbbb-b51c119e24eb",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read CSS files to embed directly
const cssA4 = fs.readFileSync(path.resolve("apps/web/src/styles/professional-a4-print.css"), "utf8");
const cssMain = fs.readFileSync(path.resolve("apps/web/src/styles/main.css"), "utf8");

// Import the compiled shared package
const {
  generateA4PaidContractHtml,
  generateA4CompletedWorksActHtml,
  generateA4TreatmentPlanHtml,
  generateA4MedicalCardDiaryHtml,
  formatRubles,
  formatAmountInWordsRu,
  formatPassportString,
} = require("../packages/shared/dist/index.js");

// Define mock data
const mockClinic = {
  name: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
  legalName: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
  shortName: 'ООО "ДЕНТЕ Премиум"',
  address: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
  actualAddress: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
  inn: "7710984521",
  kpp: "771001001",
  ogrn: "1217700456123",
  licenseNumber: "ЛО41-01137-77/00645892",
  licenseDate: "15.04.2022",
  licenseIssuer: "Департамент здравоохранения города Москвы",
  phone: "+7 (495) 123-45-67",
  email: "info@dente-clinic.ru",
  bankName: 'ПАО "Сбербанк"',
  bik: "044525225",
  checkingAccount: "40702810938000123456",
  correspondentAccount: "30101810400000000225",
  directorTitle: "Генеральный директор",
  directorFullName: "Воронов Алексей Владимирович",
  city: "г. Москва",
};

const mockPatient = {
  fullName: "Ковалёв Роман Станиславович",
  birthDate: "12.04.1988",
  gender: "male",
  phone: "+7 (999) 888-77-66",
  passportSeries: "4515",
  passportNumber: "892341",
  passportIssuedBy: "ОВД Тверского района города Москвы",
  passportIssuedDate: "20.05.2012",
  passportDepartmentCode: "770-015",
  address: "г. Москва, ул. Новослободская, д. 14, кв. 82",
  registrationAddress: "г. Москва, ул. Новослободская, д. 14, кв. 82",
  snils: "154-892-301 92",
  omsPolis: "7700 8923 1204 9512",
  cardNumber: "МК-2026/0418",
};

const mockContractData = {
  clinic: mockClinic,
  patient: mockPatient,
  contractNumber: "Д-2026/0418",
  contractDate: "03 октября 2026",
  estimatedTotalRub: 18500,
  services: [
    {
      code804n: "B01.065.001",
      name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
      toothOrArea: "Полость рта",
      quantity: 1,
      unitPriceRub: 2500,
      totalRub: 2500,
    },
    {
      code804n: "A16.07.002",
      name: "Восстановление зуба пломбой с изоляцией коффердам и нанокомпозитом Harmonize",
      toothOrArea: "16",
      quantity: 1,
      unitPriceRub: 9500,
      totalRub: 9500,
    },
    {
      code804n: "A11.07.012",
      name: "Комплексная ультразвуковая и Air-Flow профессиональная гигиена полости рта",
      toothOrArea: "11-48",
      quantity: 1,
      unitPriceRub: 6500,
      totalRub: 6500,
    },
  ],
  clinicalReason: "Первичная консультация, санация кариеса зуба 16 и комплексная профгигиена",
  doctorFullName: "Воронов Алексей Владимирович",
};

const mockActData = {
  clinic: mockClinic,
  patient: mockPatient,
  actNumber: "А-2026/0418",
  actDate: "03 октября 2026",
  contractNumber: "Д-2026/0418",
  contractDate: "03 октября 2026",
  doctorFullName: "Воронов Алексей Владимирович",
  doctorSpecialty: "Врач-стоматолог-терапевт",
  services: [
    {
      code804n: "B01.065.001",
      name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
      toothOrArea: "Полость рта",
      quantity: 1,
      unitPriceRub: 2500,
      discountRub: 0,
      totalRub: 2500,
    },
    {
      code804n: "A16.07.002",
      name: "Восстановление зуба пломбой с изоляцией коффердам и нанокомпозитом Harmonize",
      toothOrArea: "16",
      quantity: 1,
      unitPriceRub: 9500,
      discountRub: 500,
      totalRub: 9000,
    },
    {
      code804n: "A11.07.012",
      name: "Комплексная ультразвуковая и Air-Flow профессиональная гигиена полости рта",
      toothOrArea: "11-48",
      quantity: 1,
      unitPriceRub: 6500,
      discountRub: 0,
      totalRub: 6500,
    },
  ],
  totalAmountRub: 18000,
  warrantyTermsText: "12 месяцев на композитные реставрации при условии явки на профилактический осмотр каждые 6 месяцев.",
  fiscalReceiptNumber: "ФД-78412 / ФП-98214301",
};

const mockTreatmentPlanData = {
  clinic: mockClinic,
  patient: mockPatient,
  planDate: "03 октября 2026",
  doctorFullName: "Воронов Алексей Владимирович",
  diagnosisSummary: "K02.1 Кариес дентина 16 зуба, K05.1 Хронический гингивит, дефект коронки 24 зуба",
  stages: [
    {
      stageNumber: 1,
      stageName: "Этап I. Неотложная терапия и санация очагов инфекции",
      stageTiming: "1–3 дня",
      plannedServices: [
        {
          name: "Консультация стоматолога-терапевта, фотопротокол и рентген-диагностика",
          toothOrArea: "Полость рта",
          timing: "1-й визит",
          priceRub: 2500,
        },
        {
          name: "Лечение кариеса дентина зуба 16 со световой реставрацией",
          toothOrArea: "16",
          timing: "1-й визит",
          priceRub: 9000,
        },
      ],
      stageTotalRub: 11500,
    },
    {
      stageNumber: 2,
      stageName: "Этап II. Профессиональная гигиена и пародонтологическая подготовка",
      stageTiming: "через 5–7 дней",
      plannedServices: [
        {
          name: "Снятие наддесневых и поддесневых зубных отложений ультразвуком + Air-Flow",
          toothOrArea: "11-48",
          timing: "2-й визит",
          priceRub: 6500,
        },
      ],
      stageTotalRub: 6500,
    },
    {
      stageNumber: 3,
      stageName: "Этап III. Ортопедическая реабилитация",
      stageTiming: "2–3 недели",
      plannedServices: [
        {
          name: "Препарирование и установка цельнокерамической коронки E.max",
          toothOrArea: "24",
          timing: "3-й и 4-й визит",
          priceRub: 28000,
        },
      ],
      stageTotalRub: 28000,
    },
  ],
  totalCostWithoutDiscountRub: 46000,
  discountRub: 2000,
  totalCostWithDiscountRub: 44000,
  approvedVariantName: "Вариант «Оптимальный» (Биологическая санация + E.max керамика)",
};

const mockMedicalCardData = {
  clinic: mockClinic,
  patient: mockPatient,
  cardNumber: "МК-2026/0418",
  visitDate: "03 октября 2026",
  doctorFullName: "Воронов Алексей Владимирович",
  doctorSpecialty: "Врач-стоматолог-терапевт",
  allergyStatus: "Отягощен: аллергия на амидопирин (со слов пациента). Непереносимость местных анестетиков отрицает.",
  somaticStatus: "Соматически здоров. Артериальное давление 120/80 мм рт. ст., пульс 72 уд/мин.",
  complaints: "Жалобы на кратковременные боли от сладкого и термических раздражителей в зубе 16 верхней челюсти справа.",
  anamnesisMorbi: "Боли появились около 2 недель назад. Ранее зуб не лечен. За медицинской помощью обратился впервые.",
  statusLocalis: "Слизистая оболочка полости рта бледно-розового цвета, умеренно увлажнена. Прикус ортогнатический. На окклюзионно-медиальной поверхности зуба 16 обнаружена глубокая кариозная полость со светлым размягченным дентином. Зондирование эмалево-дентинной границы чувствительно. Перкуссия зуба 16 безболезненна. Реакция на холод кратковременная. ЭОД = 4 мкА.",
  teethFormulaSummary: "16 — C (кариес), 24 — K (коронка/дефект), 36 — Pt (периодонтит/пломбирован), 46 — П (пломба).",
  teethFormulaMap: {
    18: { state: "—", label: "Интактный" }, 17: { state: "—", label: "Интактный" }, 16: { state: "C", label: "Кариес" }, 15: { state: "—", label: "Интактный" },
    14: { state: "—", label: "Интактный" }, 13: { state: "—", label: "Интактный" }, 12: { state: "—", label: "Интактный" }, 11: { state: "—", label: "Интактный" },
    21: { state: "—", label: "Интактный" }, 22: { state: "—", label: "Интактный" }, 23: { state: "—", label: "Интактный" }, 24: { state: "K", label: "Коронка" },
    25: { state: "—", label: "Интактный" }, 26: { state: "—", label: "Интактный" }, 27: { state: "—", label: "Интактный" }, 28: { state: "0", label: "Отсутствует" },
    48: { state: "0", label: "Отсутствует" }, 47: { state: "—", label: "Интактный" }, 46: { state: "П", label: "Пломба" }, 45: { state: "—", label: "Интактный" },
    44: { state: "—", label: "Интактный" }, 43: { state: "—", label: "Интактный" }, 42: { state: "—", label: "Интактный" }, 41: { state: "—", label: "Интактный" },
    31: { state: "—", label: "Интактный" }, 32: { state: "—", label: "Интактный" }, 33: { state: "—", label: "Интактный" }, 34: { state: "—", label: "Интактный" },
    35: { state: "—", label: "Интактный" }, 36: { state: "Pt", label: "Периодонтит" }, 37: { state: "—", label: "Интактный" }, 38: { state: "—", label: "Интактный" },
  },
  diagnosisIcd10: "K02.1",
  diagnosisDescription: "Кариес дентина (глубокий кариес)",
  diagnosisTooth: "16",
  treatmentProtocol: "Инфильтрационная анестезия Sol. Ultracaini D-S 1:200000 1.7 мл. Препарирование кариозной полости зуба 16 с водно-воздушным охлаждением. Изоляция операционного поля системой коффердам (кламп № W8A). Медикаментозная антисептическая обработка 2% раствором хлоргексидина биглюконата. Лечебная подкладка на основе гидроксида кальция Life (Kerr) точечно на дно полости. Изолирующая прокладка из жидкотекучего SDR+. Самонатравливающий адгезив OptiBond FL. Послойная реставрация наногибридным композитом Harmonize (Kerr) оттенков Dentin A3, Enamel A2 с воспроизведением индивидуальной анатомии фиссур. Фотополимеризация лампой полимеризационной 1200 мВт/см². Шлифовка и финишная полировка дисками Sof-Lex, полировочными головками Enhance и пастой Prisma Gloss. Окклюзионная коррекция по артикуляционной бумаге Bausch 40 мкм.",
  materialsUsed: "Ультракаин Д-С 1.7 мл, коффердам Nic Tone, Life (Kerr), SDR+ (Dentsply), OptiBond FL (Kerr), Harmonize A3/A2, полировочные системы Sof-Lex/Enhance.",
  recommendations: "1. Воздержаться от приема красящей и твердой пищи в течение 2 часов. 2. Соблюдать тщательную индивидуальную гигиену полости рта. 3. Контрольный осмотр и пришлифовка через 3–5 дней при возникновении чувства завышения прикуса. 4. Плановый профилактический осмотр через 6 месяцев.",
};

function renderFullA4PageHtml(activeTab, theme) {
  const isDark = theme === "dark";

  // Build Document Content inside sheet
  let docInnerHtml = "";
  if (activeTab === "contract") {
    docInnerHtml = `
      <header class="a4-header">
        <div class="a4-clinic-name">${mockClinic.legalName}</div>
        <div class="a4-clinic-requisites">
          Адрес: ${mockClinic.actualAddress} · Тел: ${mockClinic.phone} · ИНН: ${mockClinic.inn} · ОГРН: ${mockClinic.ogrn}<br>
          Лицензия на медицинскую деятельность: № ${mockClinic.licenseNumber} от ${mockClinic.licenseDate} г. (${mockClinic.licenseIssuer})
        </div>
      </header>

      <h1 class="a4-doc-title">ДОГОВОР № ${mockContractData.contractNumber}</h1>
      <div class="a4-doc-subtitle">
        на оказание платных медицинских стоматологических услуг<br>
        (в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)
      </div>

      <div class="a4-meta-row">
        <div>${mockClinic.city}</div>
        <div>«${mockContractData.contractDate}» г.</div>
      </div>

      <p class="a4-p">
        <strong>${mockClinic.legalName}</strong> (${mockClinic.shortName}), именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${mockClinic.directorTitle} ${mockClinic.directorFullName}, действующего на основании Устава и лицензии № ${mockClinic.licenseNumber}, с одной стороны, и гражданин(ка) <strong>${mockPatient.fullName}</strong>, именуемый(ая) в дальнейшем <strong>«Пациент» (Заказчик)</strong>, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
      </p>

      <h2 class="a4-section-heading">1. Предмет договора и уведомление о государственных гарантиях</h2>
      <p class="a4-p">
        1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества в соответствии с клиническими рекомендациями и стандартами медицинской помощи РФ, а Заказчик обязуется принять и оплатить оказанные услуги в соответствии со сметой и условиями настоящего Договора.
      </p>
      <p class="a4-p">
        1.2. <strong>Уведомление о программе госгарантий:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольное согласие на получение платных услуг.
      </p>
      <p class="a4-p">
        1.3. Основание обращения: <u>${mockContractData.clinicalReason}</u>. Медкарта № <strong>${mockPatient.cardNumber}</strong>.
      </p>

      <h2 class="a4-section-heading">2. Перечень и предварительная стоимость услуг</h2>
      <table class="a4-table">
        <thead>
          <tr>
            <th style="width: 25px;">№</th>
            <th style="width: 70px;">Код 804н</th>
            <th>Наименование медицинской услуги</th>
            <th style="width: 55px;">Зуб</th>
            <th style="width: 35px;">Кол.</th>
            <th style="width: 75px;">Цена (руб.)</th>
            <th style="width: 75px;">Сумма (руб.)</th>
          </tr>
        </thead>
        <tbody>
          ${mockContractData.services.map((s, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="text-align: center;">${s.code804n}</td>
              <td>${s.name}</td>
              <td style="text-align: center;">${s.toothOrArea}</td>
              <td style="text-align: center;">${s.quantity}</td>
              <td style="text-align: right;">${formatRubles(s.unitPriceRub)}</td>
              <td style="text-align: right; font-weight: bold;">${formatRubles(s.totalRub)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="6" style="text-align: right;">ИТОГО К ОПЛАТЕ:</td>
            <td style="text-align: right;">${formatRubles(mockContractData.estimatedTotalRub)}</td>
          </tr>
        </tfoot>
      </table>

      <p class="a4-p-noindent" style="font-size: 8.5pt;">
        <strong>Ориентировочная стоимость услуг:</strong> ${formatRubles(mockContractData.estimatedTotalRub)} руб. (${formatAmountInWordsRu(mockContractData.estimatedTotalRub)}). Оплата подтверждается кассовым чеком по 54-ФЗ.
      </p>

      <h2 class="a4-section-heading">3. Права и обязанности сторон, гарантии и конфиденциальность</h2>
      <p class="a4-p">
        3.1. Исполнитель обязан: оказать услуги в соответствии с клиническими рекомендациями, оформить информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н) до начала медицинского вмешательства, обеспечить конфиденциальность персональных данных в соответствии с 152-ФЗ.
      </p>
      <p class="a4-p">
        3.2. Пациент обязан: строго соблюдать врачебный режим, являться на контрольные профилактические осмотры не реже 1 раза в 6 месяцев для сохранения гарантийных обязательств клиники.
      </p>

      <div class="a4-sign-grid">
        <div class="a4-sign-col">
          <strong>ИСПОЛНИТЕЛЬ:</strong><br>
          <strong>${mockClinic.legalName}</strong><br>
          Юр. адрес: ${mockClinic.address}<br>
          Факт. адрес: ${mockClinic.actualAddress}<br>
          ОГРН: ${mockClinic.ogrn}, ИНН: ${mockClinic.inn}, КПП: ${mockClinic.kpp}<br>
          Р/с: ${mockClinic.checkingAccount} в ${mockClinic.bankName}<br>
          БИК: ${mockClinic.bik}, Тел: ${mockClinic.phone}<br><br>
          ${mockClinic.directorTitle}:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockClinic.directorFullName} / <span class="stamp-box">М.П.</span></div>
        </div>
        <div class="a4-sign-col">
          <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
          <strong>${mockPatient.fullName}</strong><br>
          Дата рождения: ${mockPatient.birthDate} г.<br>
          Паспорт: ${formatPassportString(mockPatient)}<br>
          Адрес регистрации: ${mockPatient.registrationAddress}<br>
          Телефон: ${mockPatient.phone}<br>
          СНИЛС: ${mockPatient.snils}<br><br>
          Подпись Заказчика (Пациента):<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockPatient.fullName} /</div>
        </div>
      </div>
    `;
  } else if (activeTab === "act") {
    docInnerHtml = `
      <header class="a4-header">
        <div class="a4-clinic-name">${mockClinic.legalName}</div>
        <div class="a4-clinic-requisites">
          Адрес: ${mockClinic.actualAddress} · Тел: ${mockClinic.phone} · ИНН: ${mockClinic.inn} · ОГРН: ${mockClinic.ogrn}<br>
          Лицензия: № ${mockClinic.licenseNumber}
        </div>
      </header>

      <h1 class="a4-doc-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № ${mockActData.actNumber}</h1>
      <div class="a4-doc-subtitle">
        к Договору на оказание платных медицинских услуг № <strong>${mockActData.contractNumber}</strong> от ${mockActData.contractDate} г.<br>
        Дата составления Акта: <strong>«${mockActData.actDate}» г.</strong>
      </div>

      <table class="a4-table" style="margin-bottom: 8px;">
        <tbody>
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f5f5f5;">Исполнитель:</td>
            <td style="width: 75%;">${mockClinic.legalName} (Лицензия № ${mockClinic.licenseNumber})</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Заказчик / Пациент:</td>
            <td><strong>${mockPatient.fullName}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Лечащий врач:</td>
            <td><strong>${mockActData.doctorFullName}</strong> (${mockActData.doctorSpecialty})</td>
          </tr>
        </tbody>
      </table>

      <h2 class="a4-section-heading">Перечень фактически оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</h2>
      <table class="a4-table">
        <thead>
          <tr>
            <th style="width: 25px;">№</th>
            <th style="width: 75px;">Код 804н</th>
            <th>Наименование медицинской услуги</th>
            <th style="width: 55px;">Зуб</th>
            <th style="width: 35px;">Кол.</th>
            <th style="width: 70px;">Цена (руб.)</th>
            <th style="width: 60px;">Скидка</th>
            <th style="width: 75px;">Итого (руб.)</th>
          </tr>
        </thead>
        <tbody>
          ${mockActData.services.map((s, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="text-align: center; font-family: monospace; font-weight: bold;">${s.code804n}</td>
              <td>${s.name}</td>
              <td style="text-align: center;">${s.toothOrArea}</td>
              <td style="text-align: center;">${s.quantity}</td>
              <td style="text-align: right;">${formatRubles(s.unitPriceRub)}</td>
              <td style="text-align: right;">${s.discountRub ? formatRubles(s.discountRub) : "—"}</td>
              <td style="text-align: right; font-weight: bold;">${formatRubles(s.totalRub)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="7" style="text-align: right;">ИТОГО К ОПЛАТЕ:</td>
            <td style="text-align: right; font-size: 9.5pt;">${formatRubles(mockActData.totalAmountRub)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="border: 0.75pt solid #000000; padding: 6px 8px; margin: 8px 0; font-size: 8.5pt; line-height: 1.35; background: #fafafa;">
        <div><strong>Всего оказано услуг на сумму:</strong> <strong>${formatRubles(mockActData.totalAmountRub)} руб.</strong> (${formatAmountInWordsRu(mockActData.totalAmountRub)})</div>
        <div><strong>Фискальный чек ККТ (54-ФЗ):</strong> № ${mockActData.fiscalReceiptNumber}</div>
        <div style="margin-top: 3px;"><strong>Гарантийные обязательства:</strong> ${mockActData.warrantyTermsText}</div>
        <div style="margin-top: 4px; font-weight: bold;">Юридическая формула сдачи-приемки:</div>
        <div style="text-align: justify; margin-top: 2px;">
          «Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством в соответствии со стандартами и клиническими рекомендациями Минздрава РФ. Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею.»
        </div>
      </div>

      <div class="a4-sign-grid">
        <div class="a4-sign-col">
          <strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br><br>
          Врач-стоматолог:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockActData.doctorFullName} / <span class="stamp-box">М.П.</span></div>
        </div>
        <div class="a4-sign-col">
          <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
          Пациент / Заказчик:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockPatient.fullName} /</div>
        </div>
      </div>
    `;
  } else if (activeTab === "treatment_plan") {
    docInnerHtml = `
      <header class="a4-header">
        <div class="a4-clinic-name">${mockClinic.legalName}</div>
        <div class="a4-clinic-requisites">
          Адрес: ${mockClinic.actualAddress} · Тел: ${mockClinic.phone} · ИНН: ${mockClinic.inn}<br>
          Лицензия на медицинскую деятельность: № ${mockClinic.licenseNumber}
        </div>
      </header>

      <h1 class="a4-doc-title">ПЛАН КОМПЛЕКСНОГО ЛЕЧЕНИЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</h1>
      <div class="a4-doc-subtitle">Приложение к Договору на оказание платных медицинских услуг · Дата: «${mockTreatmentPlanData.planDate}» г.</div>

      <table class="a4-table" style="margin-bottom: 6px;">
        <tbody>
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f5f5f5;">Пациент (ФИО):</td>
            <td style="width: 45%;"><strong>${mockPatient.fullName}</strong></td>
            <td style="width: 15%; font-weight: bold; background: #f5f5f5;">№ карты:</td>
            <td style="width: 15%;"><strong>${mockPatient.cardNumber}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Дата рождения / Тел:</td>
            <td>${mockPatient.birthDate} · Тел: ${mockPatient.phone}</td>
            <td style="font-weight: bold; background: #f5f5f5;">Лечащий врач:</td>
            <td><strong>${mockTreatmentPlanData.doctorFullName}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Повод обращения / Диагноз:</td>
            <td colspan="3">${mockTreatmentPlanData.diagnosisSummary}</td>
          </tr>
        </tbody>
      </table>

      <h2 class="a4-section-heading">Этапы и калькуляция лечебных мероприятий</h2>
      ${mockTreatmentPlanData.stages.map((st) => `
        <div style="margin-top: 8px;">
          <div style="font-weight: bold; font-size: 9pt; background: #eeeeee; border: 0.75pt solid #000000; padding: 3px 6px; border-bottom: none;">
            ${st.stageName} (Срок: ${st.stageTiming})
          </div>
          <table class="a4-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th style="width: 25px;">№</th>
                <th>Наименование медицинской процедуры</th>
                <th style="width: 65px;">Зуб / область</th>
                <th style="width: 90px;">Сроки</th>
                <th style="width: 85px;">Стоимость (руб.)</th>
              </tr>
            </thead>
            <tbody>
              ${st.plannedServices.map((srv, sIdx) => `
                <tr>
                  <td style="text-align: center;">${st.stageNumber}.${sIdx + 1}</td>
                  <td>${srv.name}</td>
                  <td style="text-align: center;">${srv.toothOrArea}</td>
                  <td style="text-align: center;">${srv.timing}</td>
                  <td style="text-align: right; font-weight: bold;">${formatRubles(srv.priceRub)}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Итого по этапу:</td>
                <td style="text-align: right;">${formatRubles(st.stageTotalRub)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `).join("")}

      <div style="border: 0.75pt solid #000000; padding: 6px 8px; margin: 8px 0; background: #fcfcfc; font-size: 8.5pt;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9.5pt;">
          <div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
          <div>${formatRubles(mockTreatmentPlanData.totalCostWithDiscountRub)} руб.</div>
        </div>
        <div style="fontSize: 8pt; color: #444444;">
          (Сумма без скидки: ${formatRubles(mockTreatmentPlanData.totalCostWithoutDiscountRub)} руб., скидка: ${formatRubles(mockTreatmentPlanData.discountRub)} руб.)
        </div>
        <div style="margin-top: 2px;">
          Сумма прописью: <strong>${formatAmountInWordsRu(mockTreatmentPlanData.totalCostWithDiscountRub)}</strong>
        </div>
      </div>

      <h2 class="a4-section-heading">Блок согласования плана лечения пациентом</h2>
      <p class="a4-p-noindent" style="font-size: 8pt; line-height: 1.3; text-align: justify;">
        План лечения может быть дополнен и скорректирован по предварительному согласованию с пациентом в соответствии с клиническими показаниями. Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков, а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные осмотры 1 раз в 6 месяцев для сохранения гарантий клиники. Врачом даны исчерпывающие ответы на все вопросы.
      </p>
      <div style="font-weight: bold; font-size: 8.5pt; margin-top: 4px;">
        Выбранный вариант плана: ${mockTreatmentPlanData.approvedVariantName}
      </div>

      <div class="a4-sign-grid">
        <div class="a4-sign-col">
          <strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong><br><br>
          Лечащий врач:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockTreatmentPlanData.doctorFullName} /</div>
        </div>
        <div class="a4-sign-col">
          <strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br><br>
          Пациент (Заказчик):<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockPatient.fullName} / (с планом, сроками и стоимостью согласен)</div>
        </div>
      </div>
    `;
  } else if (activeTab === "medical_card") {
    docInnerHtml = `
      <header class="a4-header">
        <div class="a4-clinic-name">${mockClinic.legalName}</div>
        <div class="a4-clinic-requisites">
          Адрес: ${mockClinic.actualAddress} · Тел: ${mockClinic.phone} · ИНН: ${mockClinic.inn}<br>
          Лицензия на осуществление медицинской деятельности: № ${mockClinic.licenseNumber}
        </div>
      </header>

      <h1 class="a4-doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА</h1>
      <div class="a4-doc-subtitle">
        Амбулаторная карта стоматологического пациента № <strong>${mockMedicalCardData.cardNumber}</strong>
      </div>

      <h2 class="a4-section-heading">1. Паспортная часть и соматический статус</h2>
      <table class="a4-table">
        <tbody>
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f5f5f5;">Пациент (ФИО):</td>
            <td style="width: 45%;"><strong>${mockPatient.fullName}</strong></td>
            <td style="width: 15%; font-weight: bold; background: #f5f5f5;">Дата рождения:</td>
            <td style="width: 15%;">${mockPatient.birthDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Пол / Контакты:</td>
            <td>Мужской · Тел: ${mockPatient.phone}</td>
            <td style="font-weight: bold; background: #f5f5f5;">СНИЛС / ОМС:</td>
            <td>${mockPatient.snils} / ${mockPatient.omsPolis}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Паспортные данные:</td>
            <td colspan="3">${formatPassportString(mockPatient)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Адрес проживания:</td>
            <td colspan="3">${mockPatient.address}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Аллергологический статус:</td>
            <td colspan="3"><strong>${mockMedicalCardData.allergyStatus}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f5f5f5;">Соматический статус:</td>
            <td colspan="3">${mockMedicalCardData.somaticStatus}</td>
          </tr>
        </tbody>
      </table>

      <h2 class="a4-section-heading">2. Протокол клинического осмотра и статус полости рта</h2>
      <div style="font-size: 9pt; margin: 4px 0;"><strong>Жалобы:</strong> ${mockMedicalCardData.complaints}</div>
      <div style="font-size: 9pt; margin: 4px 0;"><strong>Анамнез заболевания (Anamnesis morbi):</strong> ${mockMedicalCardData.anamnesisMorbi}</div>
      <div style="font-size: 9pt; margin: 4px 0;"><strong>Объективный осмотр (Status localis):</strong> ${mockMedicalCardData.statusLocalis}</div>

      <h2 class="a4-section-heading">3. Зубная формула (FDI World Dental Federation)</h2>
      <table class="a4-table" style="font-size: 7.5pt; text-align: center; margin: 4px 0;">
        <tbody>
          <tr>
            <td colspan="8" style="background: #eeeeee; font-weight: bold;">Верхняя челюсть справа</td>
            <td colspan="8" style="background: #eeeeee; font-weight: bold;">Верхняя челюсть слева</td>
          </tr>
          <tr style="background: #f7f7f7; font-weight: bold;">
            ${[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => `<td style="width: 22px;">${t}</td>`).join("")}
          </tr>
          <tr>
            ${[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => `<td style="width: 22px; font-weight: bold; color: ${mockMedicalCardData.teethFormulaMap[t]?.state === "C" ? "#b91c1c" : "#000000"};">${mockMedicalCardData.teethFormulaMap[t]?.state || "—"}</td>`).join("")}
          </tr>
          <tr>
            <td colspan="16" style="height: 4px; padding: 0; background: #000000;"></td>
          </tr>
          <tr>
            ${[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => `<td style="width: 22px; font-weight: bold;">${mockMedicalCardData.teethFormulaMap[t]?.state || "—"}</td>`).join("")}
          </tr>
          <tr style="background: #f7f7f7; font-weight: bold;">
            ${[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => `<td style="width: 22px;">${t}</td>`).join("")}
          </tr>
          <tr>
            <td colspan="8" style="background: #eeeeee; font-weight: bold;">Нижняя челюсть справа</td>
            <td colspan="8" style="background: #eeeeee; font-weight: bold;">Нижняя челюсть слева</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 7.5pt; color: #444444; margin-bottom: 6px;">
        Обозначения: С — кариес, P — пульпит, Pt — периодонтит, П — пломба, К — коронка, И — имплантат, 0 — отсутствует, — — интактный.<br>
        <strong>Расшифровка:</strong> ${mockMedicalCardData.teethFormulaSummary}
      </div>

      <h2 class="a4-section-heading">4. Клинический диагноз (МКБ-10)</h2>
      <div style="font-size: 9pt; margin: 4px 0;">
        <strong>Код МКБ-10:</strong> <span style="font-family: monospace; font-weight: bold; background: #f0f0f0; padding: 1px 4px;">${mockMedicalCardData.diagnosisIcd10}</span> — ${mockMedicalCardData.diagnosisDescription} (Зуб FDI: № ${mockMedicalCardData.diagnosisTooth})
      </div>

      <h2 class="a4-section-heading">5. Дневник приёма и протокол проведённого лечения</h2>
      <div style="font-size: 9pt; line-height: 1.35; text-align: justify; margin: 4px 0;">
        <strong>Дата приёма:</strong> «${mockMedicalCardData.visitDate}» г.<br>
        <strong>Проведённое лечение:</strong><br>
        ${mockMedicalCardData.treatmentProtocol}
      </div>
      <div style="font-size: 8.5pt; margin: 3px 0;">
        <strong>Примененные препараты и материалы:</strong> ${mockMedicalCardData.materialsUsed}
      </div>
      <div style="font-size: 9pt; margin: 4px 0;">
        <strong>Рекомендации и назначения:</strong> ${mockMedicalCardData.recommendations}
      </div>

      <div class="a4-sign-grid">
        <div class="a4-sign-col">
          <strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br><br>
          ${mockMedicalCardData.doctorSpecialty}:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockMedicalCardData.doctorFullName} / <span class="stamp-box">М.П.</span></div>
        </div>
        <div class="a4-sign-col">
          <strong>ПАЦИЕНТ:</strong><br><br>
          С диагнозом, планом лечения и рекомендациями ознакомлен:<br>
          <div class="a4-sign-line"></div>
          <div class="a4-sign-hint">/ ${mockPatient.fullName} /</div>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ru" data-theme="${theme}" class="${theme}">
<head>
  <meta charset="UTF-8">
  <title>Официальный документооборот A4 · ДЕНТЕ CRM</title>
  <style>
    ${cssMain}
    ${cssA4}
  </style>
</head>
<body class="${theme}" style="margin: 0; padding: 0; background-color: ${isDark ? "#0b1120" : "#f1f5f9"};">
  <div class="pro-a4-viewport">
    <!-- Верхний тулбар выбора бланка -->
    <div class="pro-a4-toolbar no-print">
      <div class="pro-a4-tab-selector" role="tablist">
        <button type="button" class="pro-a4-tab-btn ${activeTab === "contract" ? "active" : ""}">
          1. Договор (ПП РФ № 736)
        </button>
        <button type="button" class="pro-a4-tab-btn ${activeTab === "act" ? "active" : ""}">
          2. Акт выполненных работ (804н)
        </button>
        <button type="button" class="pro-a4-tab-btn ${activeTab === "treatment_plan" ? "active" : ""}">
          3. План лечения (Этапы)
        </button>
        <button type="button" class="pro-a4-tab-btn ${activeTab === "medical_card" ? "active" : ""}">
          4. Дневник приёма / Карта
        </button>
      </div>

      <div class="pro-a4-toolbar-actions">
        <span class="pro-a4-format-badge">Формат A4 · 210 × 297 мм · ГОСТ</span>
        <button type="button" class="pro-a4-print-btn">
          <span>Печать на принтер (A4)</span>
        </button>
      </div>
    </div>

    <!-- Физический лист бумаги A4 -->
    <div class="pro-a4-paper-container">
      <article class="pro-a4-physical-sheet" data-testid="pro-a4-physical-sheet">
        <div class="pro-a4-doc-content">
          ${docInnerHtml}
        </div>
      </article>
    </div>
  </div>
</body>
</html>
  `;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const themes = ["light", "dark"];
  const docTabs = [
    { key: "contract", filePrefix: "a4_print_contract" },
    { key: "act", filePrefix: "a4_print_act" },
    { key: "treatment_plan", filePrefix: "a4_print_treatment_plan" },
    { key: "medical_card", filePrefix: "a4_print_medical_card" },
  ];

  for (const theme of themes) {
    for (const docTab of docTabs) {
      console.log(`Rendering A4: ${docTab.key} in ${theme}...`);
      const html = renderFullA4PageHtml(docTab.key, theme);
      const tempPath = path.resolve(`scripts/temp_${docTab.key}_${theme}.html`);
      fs.writeFileSync(tempPath, html, "utf8");

      await page.goto("file:///" + tempPath.replace(/\\/g, "/"), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);

      const fileName = `${docTab.filePrefix}_${theme}.png`;
      const savePath = path.resolve("docs/screenshots/inquisition_live", fileName);
      await page.screenshot({ path: savePath, fullPage: false });

      for (const d of targetDirs) {
        const dest = path.join(d, fileName);
        if (dest !== savePath) {
          fs.copyFileSync(savePath, dest);
        }
      }
      console.log(`  -> Saved: ${fileName}`);

      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  // Also regenerate document_template_ident_parity_proof.png using real A4 diary template!
  console.log("\nRegenerating document_template_ident_parity_proof.png with real A4 diary template...");
  const diaryA4Html = generateA4MedicalCardDiaryHtml(mockMedicalCardData);
  const tempA4Path = path.resolve("scripts/temp_proof_a4.html");
  fs.writeFileSync(tempA4Path, diaryA4Html, "utf8");

  await page.goto("file:///" + tempA4Path.replace(/\\/g, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  const proofShotPath = path.resolve("docs/screenshots/inquisition_live/document_template_ident_parity_proof.png");
  await page.screenshot({ path: proofShotPath, fullPage: true });
  for (const d of targetDirs) {
    const dest = path.join(d, "document_template_ident_parity_proof.png");
    if (dest !== proofShotPath) {
      fs.copyFileSync(proofShotPath, dest);
    }
  }
  console.log("  -> Saved: document_template_ident_parity_proof.png");

  if (fs.existsSync(tempA4Path)) {
    fs.unlinkSync(tempA4Path);
  }

  await browser.close();
  console.log("\nALL 9 A4 SCREENSHOTS SUCCESSFULLY CAPTURED!");
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
