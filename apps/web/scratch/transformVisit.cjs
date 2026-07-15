const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../src/VisitView.tsx");
let content = fs.readFileSync(file, "utf8");

// 1. Remove the old "smart-ai-booking" dictation block
const oldDictationRegex =
	/\s*\{\/\* Умная диктовка \*\/\}\s*<div className="smart-ai-booking"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Статусные иконки/g;
if (oldDictationRegex.test(content)) {
	content = content.replace(
		oldDictationRegex,
		"\n              {/* Статусные иконки",
	);
	console.log("Removed old dictation block");
} else {
	// try a more generic replacement
	const oldDictationBlock =
		/\s*\{\/\* Умная диктовка \*\/\}\s*<div className="smart-ai-booking"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
	content = content.replace(oldDictationBlock, "");
}

// 2. Add chips under the top smart input
const topInputBlock =
	/(<div className="smart-ai-booking"[^>]*>[\s\S]*?<div className="smart-ai-input-wrapper"[^>]*>[\s\S]*?<\/div>)\s*(<\/div>)/;
const chipsHtml = `
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '48px' }}>
                <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, alignSelf: 'center' }}>Частые шаблоны:</span>
                <button type="button" className="quick-chip macro-chip" onClick={() => applyMacro("caries")}>🦷 Кариес</button>
                <button type="button" className="quick-chip macro-chip" onClick={() => applyMacro("pulpitis")}>🔥 Пульпит</button>
                <button type="button" className="quick-chip macro-chip" onClick={() => applyMacro("extraction")}>🔨 Удаление</button>
                <button type="button" className="quick-chip macro-chip" onClick={() => applyMacro("hygiene")}>✨ Профгигиена</button>
              </div>
`;
content = content.replace(topInputBlock, `$1${chipsHtml}$2`);

fs.writeFileSync(file, content, "utf8");
console.log("VisitView.tsx transformed");
