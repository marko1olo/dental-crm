// Read-only UTF-8 integrity check for the C3 packet target file.
const fs = require("node:fs");

const target = process.argv[2];
const bytes = fs.readFileSync(target);
const text = bytes.toString("utf8");
const lines = text.split("\n");
const mojibake = lines.filter((line) => /[РС][-ÿ]/.test(line));

console.log("file:", target);
console.log(
	"bom:",
	bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
);
console.log("mojibake_lines:", mojibake.length);
console.log("crlf_count:", (text.match(/\r\n/g) || []).length);
console.log("lines:", lines.length);
console.log("has_nav_copy_literal:", text.includes('className="nav-copy"'));
console.log("cyrillic_chars:", (text.match(/[Ѐ-ӿ]/g) || []).length);
