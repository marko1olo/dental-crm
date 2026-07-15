const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../src/DocumentsView.tsx");
const content = fs.readFileSync(file, "utf8");
const lines = content.split("\n");

let inArticle = false;
let articleCount = 0;
const outputLines = [];

for (let i = 0; i < lines.length; i++) {
	const line = lines[i];
	if (line.includes('<article className="document-payload-card">')) {
		inArticle = true;
		articleCount++;
		outputLines.push(line);
		// Find where the <div> section ends
		let divDepth = 0;
		let divFound = false;
		let j = i + 1;
		for (; j < lines.length; j++) {
			outputLines.push(lines[j]);
			if (lines[j].includes("<div>")) {
				divDepth++;
				divFound = true;
			}
			if (lines[j].includes("</div>")) divDepth--;
			if (divFound && divDepth === 0) {
				break; // found the end of the heading div
			}
		}
		// Now insert our <details>
		outputLines.push(
			'  <details className="document-manual-override" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "16px" }}>',
		);
		outputLines.push(
			'    <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--brand-700)", userSelect: "none" }}>✏️ Ручная корректировка полей (развернуть)</summary>',
		);
		outputLines.push(
			'    <div className="document-payload-collapsed-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>',
		);
		i = j;
	} else if (inArticle && line.includes("</article>")) {
		// Before closing article, close details
		outputLines.push("    </div>");
		outputLines.push("  </details>");
		outputLines.push(line);
		inArticle = false;
	} else {
		outputLines.push(line);
	}
}

fs.writeFileSync(file, outputLines.join("\n"), "utf8");
console.log(`Transformed ${articleCount} articles.`);
