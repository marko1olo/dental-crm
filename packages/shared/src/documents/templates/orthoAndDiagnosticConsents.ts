import {
	SHARED_DOCUMENT_CSS,
	renderDocHeader,
	renderPatientInfoBlock,
	renderSignaturesBlock,
} from "./templateStyles.js";

/**
 * Бланки ИДС: ортопедия, виниры, коронки, ортодонтия, рентген, фотопротокол, отказы от лечения и ЕГИСЗ
 */
export const ORTHO_AND_DIAGNOSTIC_TEMPLATES_HTML: Record<string, string> = {
	ids_ortopediya: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Ортопедия</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА ОРТОПЕДИЧЕСКОЕ ЛЕЧЕНИЕ (ПРОТЕЗИРОВАНИЕ ЗУБОВ)</div>
  ${renderPatientInfoBlock()}

  <p class="doc-paragraph">
    Целью ортопедического лечения является восстановление анатомической формы разрушенных зубов, целостности зубных рядов, 
    жевательной эффективности и эстетики улыбки.
  </p>
  <p class="doc-paragraph">
    Препарирование зубов под коронки и мостовидные протезы сопряжено со снятием слоя твердых тканей зуба. 
    Врач предупредил меня о необходимости предварительного депульпирования зубов при наличии клинических показаний.
  </p>

  ${renderSignaturesBlock("Пациент", "Врач-стоматолог ортопед")}
</div>
</body>
</html>
`,

	ids_viniry: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Керамические виниры</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА ЭСТЕТИЧЕСКУЮ РЕАБИЛИТАЦИЮ КЕРАМИЧЕСКИМИ ВИНИРАМИ</div>
  ${renderPatientInfoBlock()}

  <p class="doc-paragraph">
    Керамические виниры представляют собой тонкие микропротезы, фиксируемые на вестибулярную поверхность зубов для коррекции формы, цвета и положения.
  </p>
  <div class="doc-section-title">ОГРАНИЧЕНИЯ И ПРЕДОСТОРОЖНОСТИ</div>
  <ul class="doc-list">
    <li>Препарирование эмали является необратимым процессом — зубы всегда будут нуждаться в искусственных реставрациях.</li>
    <li>Категорически запрещено откусывать винирами твердую пищу (орехи, сухари, кости, лед), открывать бутылки, грызть ногти и ручки.</li>
    <li>При бруксизме (ночном скрежетании зубами) обязательно постоянное ношение защитной релаксационной капы в ночное время.</li>
  </ul>

  ${renderSignaturesBlock("Пациент", "Врач-ортопед")}
</div>
</body>
</html>
`,

	ids_nesemnye_ortopedicheskie_konstrukcii: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Несъемное протезирование</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА НЕСЪЕМНЫЕ ОРТОПЕДИЧЕСКИЕ КОНСТРУКЦИИ (КОРОНКИ, МОСТЫ, ВКЛАДКИ)</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Ознакомлен(а) с выбранным материалом конструкций (диоксид циркония, E.max, металлокерамика). 
    Согласовал(а) форму, размер и цвет будущих коронок на этапе примерки до окончательной постоянной фиксации на цемент.
  </p>
  ${renderSignaturesBlock("Пациент", "Врач-ортопед")}
</div>
</body>
</html>
`,

	ids_semnye_ortopedicheskie_konstrukcii: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Съемное протезирование</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА СЪЕМНОЕ ПРОТЕЗИРОВАНИЕ (БЮГЕЛЬНЫЕ И ПЛАСТИНОЧНЫЕ ПРОТЕЗЫ)</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Мне разъяснено, что привыкание к съемному протезу длится от 2 до 6 недель и требует проведения коррекций при натирании слизистой оболочки (1–4 визита).
  </p>
  ${renderSignaturesBlock("Пациент", "Врач-ортопед")}
</div>
</body>
</html>
`,

	"dental-work-order": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Заказ-наряд в зуботехническую лабораторию</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Заказ-наряд № {{Документ.Номер}}")}
  <div class="doc-title">ЗАКАЗ-НАРЯД В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ № {{Документ.Номер}}</div>
  ${renderPatientInfoBlock()}
  <table class="doc-table">
    <thead><tr><th>Зубная формула</th><th>Вид изделия</th><th>Материал</th><th>Цвет по шкале VITA</th><th>Срок сдачи</th></tr></thead>
    <tbody><tr><td>По карте</td><td>Одиночная коронка / мостовидный протез</td><td>Диоксид циркония / E.max</td><td>A2 / A3</td><td>{{Документ.ДатаОкончания}}</td></tr></tbody>
  </table>
  ${renderSignaturesBlock("Врач-стоматолог ортопед", "Зубной техник")}
</div>
</body>
</html>
`,

	ids_ortodontiya_obshchee: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Ортодонтия</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА ОРТОДОНТИЧЕСКОЕ ЛЕЧЕНИЕ (БРЕКЕТ-СИСТЕМЫ, ЭЛАЙНЕРЫ, ПЛАСТИНКИ)</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Целью ортодонтического лечения является нормализация окклюзии (прикуса) и выравнивание зубных рядов. 
    Средняя продолжительность активного периода составляет от 12 до 36 месяцев, ретенционного периода — пожизненно или в 2 раза дольше активного.
  </p>
  ${renderSignaturesBlock("Пациент", "Врач-ортодонт")}
</div>
</body>
</html>
`,

	"orthodontic-card": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Ортодонтическая карта</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Ортокарта")}
  <div class="doc-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА</div>
  ${renderPatientInfoBlock()}
  <div class="doc-section-title">ДИАГНОСТИЧЕСКИЕ ДАННЫЕ И ПЛАН АППАРАТУРЫ</div>
  <p class="doc-paragraph">ТРГ, расчет моделей по Тонну, Пону, Снагиной, фотопротокол лица и зубных рядов.</p>
  ${renderSignaturesBlock("Пациент", "Врач-ортодонт")}
</div>
</body>
</html>
`,

	"orthodontic-card-epicrisis": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Эпикриз ортодонтического лечения</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Эпикриз")}
  <div class="doc-title">ЭПИКРИЗ ОРТОДОНТИЧЕСКОГО ЛЕЧЕНИЯ ПАЦИЕНТА</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">Оценка достигнутых окклюзионных контактов I класса по Энглю и стабильности ретенционного протокола.</p>
  ${renderSignaturesBlock("Пациент", "Врач-ортодонт")}
</div>
</body>
</html>
`,

	"orthodontic-card-observation": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Диспансерное наблюдение ортодонтии</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Наблюдение")}
  <div class="doc-title">ЛИСТ КОНТРОЛЬНОГО НАБЛЮДЕНИЯ В РЕТЕНЦИОННОМ ПЕРИОДЕ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">Контроль целостности несъемного ретейнера и прилегания ночных ретенционных капп.</p>
  ${renderSignaturesBlock("Пациент", "Врач-ортодонт")}
</div>
</body>
</html>
`,

	ids_obshchee_dlya_nesovershennoletnikh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС для несовершеннолетних</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("ст. 20 323-ФЗ")}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО НЕСОВЕРШЕННОЛЕТНЕМУ ПАЦИЕНТУ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Я, законный представитель несовершеннолетнего {{Пациент.ФИО}}, даю согласие на стоматологический осмотр, диагностику и лечение ребенка.
  </p>
  ${renderSignaturesBlock("Законный представитель (родитель/опекун)", "Детский врач-стоматолог")}
</div>
</body>
</html>
`,

	ids_rentgen: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Рентгенологическое исследование</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА ПРОВЕДЕНИЕ РЕНТГЕНОЛОГИЧЕСКОГО ИССЛЕДОВАНИЯ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Даю согласие на лучевое диагностическое исследование (радиовизиография, ОПТГ, КЛКТ). 
    Осведомлен(а), что эффективная эквивалентная доза не превышает установленных нормативов СанПиН 2.6.1.1192-03.
  </p>
  ${renderSignaturesBlock("Пациент", "Рентгенолаборант / Врач")}
</div>
</body>
</html>
`,

	"x-ray-protocol": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Протокол рентген исследования</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("Протокол КЛКТ/ОПТГ")}
  <div class="doc-title">ПРОТОКОЛ РЕНТГЕНОЛОГИЧЕСКОГО ИССЛЕДОВАНИЯ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">Описание состояния костной ткани челюстей, корневых каналов и периапикальных областей.</p>
  ${renderSignaturesBlock("Пациент", "Врач-рентгенолог")}
</div>
</body>
</html>
`,

	"x-ray-dose-load": `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Лист лучевых нагрузок</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("СанПиН 2.6.1.1192-03")}
  <div class="doc-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</div>
  ${renderPatientInfoBlock()}
  <table class="doc-table">
    <thead><tr><th>Дата</th><th>Вид исследования</th><th>Область исследования</th><th>Доза (мЗв)</th><th>Подпись лаборанта</th></tr></thead>
    <tbody><tr><td>{{ТекущаяДата}}</td><td>Цифровая визиография / КЛКТ</td><td>Зубной ряд</td><td>0.02 - 0.05</td><td>______</td></tr></tbody>
  </table>
  ${renderSignaturesBlock("Пациент", "Ответственный за радиационную безопасность")}
</div>
</body>
</html>
`,

	ids_fotoprotokol: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>ИДС Фотопротокол</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br/>НА ПРОВЕДЕНИЕ ДЕНТАЛЬНОГО ФОТОПРОТОКОЛА</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Согласен(на) на проведение фотосъемки лица и зубных рядов с целью планирования лечения, контроля динамики 
    и сохранения в электронной медицинской карте CRM DENTE.
  </p>
  ${renderSignaturesBlock("Пациент", "Врач-стоматолог")}
</div>
</body>
</html>
`,

	otkaz_v_peredache_dannykh_v_egisz: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Отказ в передаче данных в ЕГИСЗ</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("152-ФЗ / 323-ФЗ")}
  <div class="doc-title">ЗАЯВЛЕНИЕ ОБ ОТКАЗЕ ОТ ПЕРЕДАЧИ ПЕРСОНАЛЬНЫХ ДАННЫХ<br/>И СВЕДЕНИЙ О СОСТОЯНИИ ЗДОРОВЬЯ В ЕГИСЗ МИНЗДРАВА РФ</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Я, {{Пациент.ФИО}}, реализуя свои законные права, установленные Федеральным законом № 152-ФЗ «О персональных данных», 
    заявляю о своем категорическом отказе от передачи сведений о моем лечении и электронных медицинских документов (СЭМД) 
    в федеральную систему ЕГИСЗ и региональные медицинские информационные системы.
  </p>
  <p class="doc-paragraph">
    Осведомлен(а), что данный отказ не влечет отказа в оказании медицинской помощи со стороны клиники {{Клиника.Название}}.
  </p>
  ${renderSignaturesBlock("Пациент (Заявитель)", "Руководитель клиники")}
</div>
</body>
</html>
`,

	otkaz_ot_lecheniya: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Отказ от медицинского вмешательства</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader("ст. 20 323-ФЗ")}
  <div class="doc-title">ОТКАЗ ОТ МЕДИЦИНСКОГО ВМЕШАТЕЛЬСТВА (СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ)</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Я, {{Пациент.ФИО}}, отказываюсь от предложенного врачом медицинского вмешательства / продолжения плана лечения.
  </p>
  <p class="doc-paragraph">
    Мне в доступной форме разъяснены возможные последствия отказа: распространение инфекции, потеря зуба, 
    развитие остеомиелита, флегмоны и иных жизнеугрожающих гнойно-воспалительных осложнений челюстно-лицевой области.
  </p>
  ${renderSignaturesBlock("Пациент", "Врач-стоматолог")}
</div>
</body>
</html>
`,
};
