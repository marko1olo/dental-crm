import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("Starting Git Forensics Extraction for past 60 days...");

// 1. Get raw log with delimiter
const gitLogRaw = execSync(
  'git log --since="2 months ago" --format="COMMIT_START|%H|%an|%ae|%ad|%s" --date=iso-strict --numstat',
  { maxBuffer: 100 * 1024 * 1024, encoding: "utf8" }
);

const lines = gitLogRaw.split(/\r?\n/);
const commits = [];
let currentCommit = null;

for (const line of lines) {
  if (line.startsWith("COMMIT_START|")) {
    if (currentCommit) {
      commits.push(currentCommit);
    }
    const parts = line.split("|");
    const hash = parts[1];
    const author = parts[2];
    const email = parts[3];
    const isoDate = parts[4];
    const subject = parts.slice(5).join("|");

    const dateObj = new Date(isoDate);
    const day = isoDate.slice(0, 10);
    const hour = dateObj.getHours();

    currentCommit = {
      hash,
      author,
      email,
      timestamp: isoDate,
      day,
      hour,
      subject,
      files: [],
      insertions: 0,
      deletions: 0,
    };
  } else if (currentCommit && line.trim().length > 0) {
    const statParts = line.split("\t");
    if (statParts.length === 3) {
      const ins = statParts[0] === "-" ? 0 : parseInt(statParts[0], 10) || 0;
      const del = statParts[1] === "-" ? 0 : parseInt(statParts[1], 10) || 0;
      const filePath = statParts[2];
      currentCommit.files.push({ file: filePath, ins, del });
      currentCommit.insertions += ins;
      currentCommit.deletions += del;
    }
  }
}

if (currentCommit) {
  commits.push(currentCommit);
}

console.log(`Successfully parsed ${commits.length} commits.`);

// Group by Day and Hour
const hourlyMap = {};
const fileChurnMap = {};
const authorMap = {};

for (const c of commits) {
  // Author
  authorMap[c.author] = (authorMap[c.author] || 0) + 1;

  // Day & Hour
  const key = `${c.day}T${String(c.hour).padStart(2, "0")}:00`;
  if (!hourlyMap[key]) {
    hourlyMap[key] = {
      day: c.day,
      hour: c.hour,
      commitCount: 0,
      insertions: 0,
      deletions: 0,
      filesModifiedCount: 0,
      commits: [],
    };
  }
  hourlyMap[key].commitCount++;
  hourlyMap[key].insertions += c.insertions;
  hourlyMap[key].deletions += c.deletions;
  hourlyMap[key].filesModifiedCount += c.files.length;
  hourlyMap[key].commits.push({
    hash: c.hash.slice(0, 9),
    subject: c.subject,
    author: c.author,
    filesCount: c.files.length,
    ins: c.insertions,
    del: c.deletions,
  });

  // File churn
  for (const f of c.files) {
    if (!fileChurnMap[f.file]) {
      fileChurnMap[f.file] = {
        path: f.file,
        commitsCount: 0,
        insertions: 0,
        deletions: 0,
      };
    }
    fileChurnMap[f.file].commitsCount++;
    fileChurnMap[f.file].insertions += f.ins;
    fileChurnMap[f.file].deletions += f.del;
  }
}

const summary = {
  totalCommits: commits.length,
  dateRange: {
    from: commits[commits.length - 1]?.timestamp,
    to: commits[0]?.timestamp,
  },
  uniqueDays: Object.keys(hourlyMap).map((k) => k.slice(0, 10)).filter((v, i, a) => a.indexOf(v) === i),
  authors: authorMap,
  topChurnFiles: Object.values(fileChurnMap)
    .sort((a, b) => b.commitsCount - a.commitsCount)
    .slice(0, 100),
  hourlyBucketsCount: Object.keys(hourlyMap).length,
};

fs.writeFileSync(
  path.join(process.cwd(), "docs/audit/git_summary_60d.json"),
  JSON.stringify(summary, null, 2),
  "utf8"
);

fs.writeFileSync(
  path.join(process.cwd(), "docs/audit/git_hourly_matrix_60d.json"),
  JSON.stringify(hourlyMap, null, 2),
  "utf8"
);

console.log("Generated docs/audit/git_summary_60d.json and docs/audit/git_hourly_matrix_60d.json successfully.");
