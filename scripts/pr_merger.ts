import { execSync } from "child_process";
import { readFileSync } from "fs";

const TOKEN = readFileSync(
	"C:/Users/Admin/Documents/gitenv.txt",
	"utf8",
).trim();
const REPO = "marko1olo/dental-crm";

async function fetchAllOpenPrs() {
	let allPrs: any[] = [];
	let page = 1;
	while (true) {
		const res = await fetch(
			`https://api.github.com/repos/${REPO}/pulls?state=open&per_page=100&page=${page}`,
			{
				headers: { Authorization: `token ${TOKEN}` },
			},
		);
		const prs = await res.json();
		if (!Array.isArray(prs)) {
			console.error("Failed to fetch PRs:", prs);
			break;
		}
		if (prs.length === 0) break;
		allPrs = allPrs.concat(prs);
		if (prs.length < 100) break;
		page++;
	}
	return allPrs;
}

async function main() {
	console.log("Fetching open PRs...");
	const prs = await fetchAllOpenPrs();

	if (prs.length === 0) {
		console.log("No open PRs found.");
		return;
	}

	// Сортируем с конца (самые старые сначала, чтобы соблюдать порядок), либо берем как есть
	prs.sort((a, b) => a.number - b.number);

	console.log(`Found ${prs.length} open PRs. Starting processing...`);

	for (const pr of prs) {
		console.log(`\n==============================================`);
		console.log(`Processing PR #${pr.number}: ${pr.title}`);
		console.log(`Branch: ${pr.head.ref}`);

		// Fetch the PR branch
		try {
			execSync(`git fetch origin pull/${pr.number}/head:pr/${pr.number}`, {
				stdio: "inherit",
			});
		} catch (e) {
			console.error(`Failed to fetch PR #${pr.number}. Skipping.`);
			continue;
		}

		// Attempt to merge
		try {
			execSync(
				`git merge --no-ff pr/${pr.number} -m "Merge PR #${pr.number}: ${pr.title.replace(/"/g, '\\"')}"`,
				{ stdio: "inherit" },
			);
		} catch (e) {
			console.log(
				`\n🚨 Merge conflict detected for PR #${pr.number}! PAUSING SCRIPT.`,
			);
			console.log(
				"Please resolve the conflict manually, run 'git commit', and then re-run this script.",
			);
			process.exit(1); // Остановка скрипта
		}

		// Run type check
		console.log("Merge successful, running TS checks...");
		try {
			execSync(`cd apps/web && npx tsc --noEmit`, { stdio: "inherit" });
			execSync(`cd apps/api && npx tsc --noEmit`, { stdio: "inherit" });
			console.log("TS checks passed.");
		} catch (e) {
			console.log(
				`\n❌ TS checks failed for PR #${pr.number}! Reverting merge.`,
			);
			try {
				execSync(`git reset --hard HEAD~1`, { stdio: "inherit" });
			} catch (err) {}
			console.log(
				`Skipping PR #${pr.number} due to TS errors. Continuing to next PR...`,
			);
			continue;
		}

		// Push changes
		console.log(`Pushing changes to main...`);
		try {
			execSync(`git push origin main`, { stdio: "inherit" });
			try {
				execSync(`git branch -D pr/${pr.number}`, { stdio: "ignore" });
			} catch (e) {} // ignore if branch deletion fails
			console.log(`✅ Successfully merged and pushed PR #${pr.number}`);
		} catch (e) {
			console.error(`\n🚨 Failed to push changes to remote. Stopping script.`);
			process.exit(1);
		}
	}

	console.log("Finished processing all PRs.");
}

main().catch(console.error);
