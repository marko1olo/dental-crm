import type { ClinicalRequisitesContext } from "./types";

export function renderClinicalAnesthesiaSheet(ctx: ClinicalRequisitesContext): string {
	const {
		clinicName, clinicLicense, clinicAddress, clinicPhone, ptName, ptBirthDate,
		anesName, todayFormatted, docDoctorName,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> • Лицензия № ${clinicLicense}<br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Тел: ${clinicPhone}` : ""}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Приказ МЗ РФ № 1051н</span><br>
            <span class="statutory-badge">Медицинская карта приёма</span>
          </div>
        </div>
      </div>

      <h1>Информированное согласие и протокол на проведение местной и проводниковой анестезии</h1>
      <div class="sheet-subtitle">Приложение к медицинской карте приёма пациента</div>

      <div class="parties-block">
        Пациент: <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>.<br>
        Планируемый вид обезболивания: <strong>Инфильтрационная / Проводниковая анестезия</strong>.<br>
        Используемый препарат: <strong>${anesName}</strong>.
      </div>

      <div class="section-title">1. Информация о методе обезболивания</div>
      <p>
        Для безболезненного лечения мне показано проведение местной анестезии амидного ряда с вазоконстриктором или без.
        Действие наступает через 1–5 минут и продолжается от 1 до 4 часов.
      </p>

      <div class="section-title">2. Сведения об анамнезе</div>
      <p>Настоящим подтверждаю, что:</p>
      <ul>
        <li>Ранее местная анестезия проводилась, переносимость удовлетворительная;</li>
        <li>Аллергические реакции на анестетики (ультракаин, убистезин, септанест, скандонест) отрицаю;</li>
        <li>Тяжелые сердечно-сосудистые патологии, декомпенсированный диабет отрицаю;</li>
        <li>Беременность / период лактации: отрицаю / не применимо.</li>
      </ul>

      <div class="section-title">3. Возможные реакции и осложнения</div>
      <p>Мне разъяснено, что возможны индивидуальные реакции:</p>
      <ul>
        <li>Кратковременная тахикардия, тремор (реакция на вазоконстриктор);</li>
        <li>Постинъекционная гематома в зоне укола;</li>
        <li>Болезненность или ограничение открывания рта в течение нескольких дней;</li>
        <li>Временное онемение мягких тканей до 4 часов.</li>
      </ul>

      <div class="section-title">4. Правила безопасности пациента</div>
      <p>
        До полного восстановления чувствительности запрещается принимать горячую пищу и напитки,
        жевать твердую пищу во избежание травматического прикусывания губ, щек и языка.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент:</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Врач-стоматолог:</strong><br>
        ФИО: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>`;
}
