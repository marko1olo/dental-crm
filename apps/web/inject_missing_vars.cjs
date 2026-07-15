const fs = require("fs");
const { execSync } = require("child_process");

const targetFile =
	"C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx";

let iterations = 0;
while (iterations < 10) {
	iterations++;
	try {
		console.log(`Running tsc... iteration ${iterations}`);
		execSync("npx tsc -b", {
			cwd: "C:/Clinic_MVP/dental-crm/apps/web",
			stdio: "pipe",
		});
		console.log("Build passed! All variables found.");
		break;
	} catch (e) {
		const output = e.stdout.toString();
		const missingVarRegex = /Cannot find name '([^']+)'/g;
		const propertyVarRegex =
			/Property '([^']+)' does not exist on type 'IntrinsicAttributes'/g;

		let match;
		const missingVars = new Set();
		while ((match = missingVarRegex.exec(output)) !== null) {
			if (
				![
					"React",
					"div",
					"main",
					"span",
					"h1",
					"p",
					"section",
					"button",
					"a",
					"strong",
				].includes(match[1])
			) {
				missingVars.add(match[1]);
			}
		}

		// Sometimes TS complains about missing props on child components, which means those props are not defined in the scope
		while ((match = propertyVarRegex.exec(output)) !== null) {
			missingVars.add(match[1]);
		}

		if (missingVars.size === 0) {
			console.log(
				"No missing variables found, but build failed. Output:",
				output,
			);
			break;
		}

		console.log("Missing variables found:", [...missingVars]);

		let content = fs.readFileSync(targetFile, "utf8");
		const existingVarsRegex =
			/const \{\s*([\s\S]*?)\s*\} = useAppLogicContext\(\);/;
		const existingMatch = content.match(existingVarsRegex);
		if (existingMatch) {
			const currentVars = existingMatch[1]
				.replace("// __PLACEHOLDER__", "")
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s);
			const newVars = [...new Set([...currentVars, ...missingVars])];
			const replacement =
				"const {\n    " +
				newVars.join(",\n    ") +
				"\n  } = useAppLogicContext();";
			content = content.replace(existingVarsRegex, replacement);
			fs.writeFileSync(targetFile, content);
			console.log(`Injected ${missingVars.size} variables.`);
		} else {
			console.log("Could not find destructuring block.");
			break;
		}
	}
}
