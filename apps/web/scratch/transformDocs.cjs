const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../src", "DocumentsView.tsx");
let content = fs.readFileSync(filePath, "utf8");

// We want to find:
// <article className="document-payload-card">
//   <div>
//     <h3>Title</h3>
//     <p>Description</p>
//   </div>
// and insert our <details> wrapper.

const regexStart =
	/(<article className="document-payload-card">\s*<div>\s*<h3>.*?<\/h3>\s*(?:<p.*?>.*?<\/p>\s*)*<\/div>)/g;

content = content.replace(
	regexStart,
	`$1\n  <details className="document-manual-override" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '16px' }}>\n    <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--brand-700)', userSelect: 'none' }}>✏️ Ручная корректировка полей (развернуть)</summary>\n    <div className="document-payload-collapsed-content" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>\n`,
);

// Then we need to close the tags right before </article>
const regexEnd = /(<\/article>)/g;
content = content.replace(regexEnd, `    </div>\n  </details>\n$1`);

fs.writeFileSync(filePath, content, "utf8");
console.log("DocumentsView.tsx transformed!");
