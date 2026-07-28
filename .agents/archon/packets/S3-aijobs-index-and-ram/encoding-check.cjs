/**
 * encoding-check.cjs — read-only mojibake / BOM / CRLF audit for the files this
 * packet touched. AGENTS.md rule 5 orders this check after any change that
 * writes Russian text; the repo has a history of double-encoded Cyrillic
 * (UTF-8 bytes read as CP1252 and re-encoded), which shows up as sequences
 * starting with U+0420 / U+0421 followed by a Latin-1 high byte.
 *
 * Run: node .agents/archon/packets/S3-aijobs-index-and-ram/encoding-check.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../../..");
const files = [
  "apps/api/src/speech/storage.ts",
  "apps/api/src/db/schema.ts",
  "apps/api/drizzle/0134_ai_jobs_recording_path_index.sql",
  "apps/api/src/speech/tests/storageRestoreCeiling.test.ts",
];

const mojibakePattern = /[РС][-ÿ]/;
const cp1252ArtefactPattern = /вЂ|В«|В»/;

let filesWithProblems = 0;
for (const relativePath of files) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`${relativePath} SKIPPED (not on disk)`);
    continue;
  }
  const bytes = fs.readFileSync(absolutePath);
  const text = bytes.toString("utf8");
  const mojibakeLines = text.split("\n").filter((line) => mojibakePattern.test(line)).length;
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const replacementChars = (text.match(/�/g) || []).length;
  const cp1252Artefacts = (text.match(cp1252ArtefactPattern) || []).length;
  const crlfLines = (text.match(/\r\n/g) || []).length;
  const problems = mojibakeLines + replacementChars + cp1252Artefacts + (hasBom ? 1 : 0);
  if (problems > 0) filesWithProblems += 1;
  console.log(
    `${relativePath} mojibake=${mojibakeLines} bom=${hasBom} ufffd=${replacementChars} cp1252art=${cp1252Artefacts} crlf=${crlfLines}`
  );
}
console.log(`FILES WITH PROBLEMS: ${filesWithProblems}`);
process.exitCode = filesWithProblems > 0 ? 1 : 0;
