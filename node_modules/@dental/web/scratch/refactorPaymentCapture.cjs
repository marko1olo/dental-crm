const fs = require('fs');

const file = 'apps/web/src/PaymentCapture.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Refactor details to smart-details
code = code.replace(/<details className="payment-capture-detail-section" open=\{([^}]+)\}>/g, '<details className="smart-details" open={$1}>');
code = code.replace(/<summary>(.*?)<\/summary>\s*<div className="payment-capture-detail-grid">/g, '<summary>$1</summary>\n      <div className="smart-details-content">\n        <div className="payment-capture-detail-grid">');
// We need to add the closing div for smart-details-content before </details>
code = code.replace(/<\/div>\s*<\/details>/g, '</div>\n      </div>\n    </details>');

// 2. Refactor input labels
// This regex tries to find:
// <label>
//   [Text]
//   <input or <DigitsInput ... />
// </label>
// It's tricky to do globally with regex because of nested tags.
// Let's do it with specific replacements.

const replacements = [
  // Receipt Number
  {
    from: /<label>\s*Номер чека \/ примечание\s*<input([\s\S]*?)placeholder="можно оставить пустым, если есть ФН\/ФД\/ФПД"\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Номер чека (можно пусто, если есть ФН/ФД/ФПД)</label>\n        </div>`
  },
  // Date
  {
    from: /<label>\s*Дата чека\s*<input type="datetime-local"([\s\S]*?)\/>\s*<\/label>/,
    to: `<div className="smart-field no-float">\n          <input type="datetime-local"$1/>\n          <label>Дата чека</label>\n        </div>`
  },
  // FN
  {
    from: /<label>\s*ФН\s*<DigitsInput([\s\S]*?)placeholder="номер фискального накопителя"\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <DigitsInput$1placeholder=" " />\n          <label>ФН (номер фискального накопителя)</label>\n        </div>`
  },
  // FD
  {
    from: /<label>\s*ФД\s*<DigitsInput([\s\S]*?)placeholder="номер фискального документа"\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <DigitsInput$1placeholder=" " />\n          <label>ФД (номер фискального документа)</label>\n        </div>`
  },
  // FPD
  {
    from: /<label>\s*ФПД\s*<DigitsInput([\s\S]*?)placeholder="фискальный признак"\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <DigitsInput$1placeholder=" " />\n          <label>ФПД (фискальный признак)</label>\n        </div>`
  },
  // URL
  {
    from: /<label>\s*Ссылка ОФД\s*<input([\s\S]*?)placeholder="https:\/\/\.\.\."\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Ссылка ОФД (https://...)</label>\n        </div>`
  },
  // Cashier
  {
    from: /<label>\s*Кассир\s*<input([\s\S]*?)placeholder="ФИО администратора"\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Кассир (ФИО администратора)</label>\n        </div>`
  },
  // Tax Payer Name
  {
    from: /<label>\s*Плательщик для вычета\s*<input([\s\S]*?)placeholder=\{patientDefaults\.fullName \?\? "ФИО налогоплательщика"\}\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Плательщик для вычета (ФИО)</label>\n        </div>`
  },
  // Tax Payer INN
  {
    from: /<label>\s*ИНН плательщика\s*<DigitsInput([\s\S]*?)placeholder=\{patientDefaults\.taxpayerInn \?\? "если есть"\}\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <DigitsInput$1placeholder=" " />\n          <label>ИНН плательщика (если есть)</label>\n        </div>`
  },
  // Tax Payer Birth
  {
    from: /<label>\s*Дата рождения плательщика\s*<input([\s\S]*?)placeholder=\{patientDefaults\.birthDate \?\? ""\}\s*\/>\s*<\/label>/,
    to: `<div className="smart-field no-float">\n          <input$1placeholder=" " />\n          <label>Дата рождения плательщика</label>\n        </div>`
  },
  // Tax Payer Doc
  {
    from: /<label>\s*Документ плательщика\s*<input([\s\S]*?)placeholder=\{patientDefaults\.identityDocument \?\? "паспорт \/ иной документ"\}\s*\/>\s*<\/label>/,
    to: `<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Документ плательщика (паспорт / иной)</label>\n        </div>`
  },
  // Main Amount
  {
    from: /<label>\s*Сумма\s*<input\s*id="payment-amount-input"([\s\S]*?)placeholder="3800"\s*\/>\s*([\s\S]*?)<\/label>/,
    to: `<div className="smart-field">\n        <input\n          id="payment-amount-input"$1placeholder=" "\n        />\n        <label>Сумма к оплате (₽)</label>\n        $2\n      </div>`
  }
];

replacements.forEach(({from, to}) => {
  code = code.replace(from, to);
});

// Fix method buttons
code = code.replace(/<div className="payment-methods" aria-label="Способ оплаты">/g, '<div className="quick-chips-row" style={{marginBottom: "20px"}} aria-label="Способ оплаты">');
// Change button to quick-chip
code = code.replace(/className=\{method === paymentMethod \? "active" : ""\}/g, 'className={`quick-chip ${method === paymentMethod ? "active" : ""}`}');

// Fix Tax buttons
code = code.replace(/<div className="payment-methods" aria-label="Код медицинской услуги для налогового вычета">/g, '<div className="quick-chips-row" style={{marginBottom: "20px"}} aria-label="Код медицинской услуги для налогового вычета">');
code = code.replace(/className=\{taxDeductionCode === "" \? "active" : ""\}/g, 'className={`quick-chip ${taxDeductionCode === "" ? "active" : ""}`}');
code = code.replace(/className=\{taxDeductionCode === code \? "active" : ""\}/g, 'className={`quick-chip ${taxDeductionCode === code ? "active" : ""}`}');

// Relationship has extra quick-chips-row inside label, needs careful refactoring
// Wait, regex might fail here.
code = code.replace(/<label>\s*Родство\s*<input([\s\S]*?)placeholder="пациент"\s*\/>\s*<div className="quick-chips-row" style=\{\{ marginTop: "6px", flexWrap: "wrap" \}\}>\s*\{\["пациент", "мать", "отец", "супруг", "супруга"\]\.map\(rel => \(\s*<button key=\{rel\} type="button" className="quick-chip quick-chip--sm" onClick=\{\(\) => onPayerRelationshipChange\(rel\)\}>\{rel\}<\/button>\s*\)\)\}\s*<\/div>\s*<\/label>/, 
`<div className="smart-field">\n          <input$1placeholder=" " />\n          <label>Родство (пациент, мать...)</label>\n          <div className="quick-chips-row" style={{ marginTop: "6px", padding: "0 14px 10px 14px" }}>\n             {["пациент", "мать", "отец", "супруг", "супруга"].map(rel => (\n               <button key={rel} type="button" className="quick-chip quick-chip--sm" onClick={() => onPayerRelationshipChange(rel)}>{rel}</button>\n             ))}\n          </div>\n        </div>`);


fs.writeFileSync(file, code, 'utf8');
console.log('PaymentCapture refactored');
