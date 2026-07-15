const { Project, SyntaxKind } = require("ts-morph");
const fs = require("fs");

const project = new Project({
	tsConfigFilePath: "C:/Clinic_MVP/dental-crm/apps/web/tsconfig.json",
});

const sourceFile = project.getSourceFile(
	"C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx",
);
if (!sourceFile) {
	console.log("File not found");
	process.exit(1);
}

const useAppLogicDecl = sourceFile.getFunction("useAppLogic");
if (!useAppLogicDecl) {
	console.log("useAppLogic not found");
	process.exit(1);
}

// Get all statements inside useAppLogic
const statements = useAppLogicDecl.getBody().getStatements();
console.log(`Total statements in useAppLogic: ${statements.length}`);

// Let's count how many variables/functions are declared at the top level of this hook.
let stateCount = 0;
let effectCount = 0;
let functionCount = 0;
const prefixes = {};

statements.forEach((stmt) => {
	if (stmt.getKind() === SyntaxKind.VariableStatement) {
		const decs = stmt.getDeclarations();
		decs.forEach((dec) => {
			const name = dec.getName();
			// Count states
			if (stmt.getText().includes("useState")) {
				stateCount++;
			} else if (
				stmt.getText().includes("useCallback") ||
				stmt.getText().includes("useMemo") ||
				dec.getInitializer()?.getKind() === SyntaxKind.ArrowFunction
			) {
				functionCount++;
			}

			// Record prefixes for grouping (split by CamelCase)
			const prefix = name.replace(/([A-Z])/g, " $1").split(" ")[0];
			if (prefix.length > 2) {
				prefixes[prefix] = (prefixes[prefix] || 0) + 1;
			}
		});
	} else if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
		if (stmt.getText().startsWith("useEffect")) {
			effectCount++;
		}
	} else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
		functionCount++;
		const name = stmt.getName();
		if (name) {
			const prefix = name.replace(/([A-Z])/g, " $1").split(" ")[0];
			if (prefix.length > 2) {
				prefixes[prefix] = (prefixes[prefix] || 0) + 1;
			}
		}
	}
});

console.log(
	`States: ${stateCount}, Effects: ${effectCount}, Functions: ${functionCount}`,
);
console.log("Top Prefixes:");
Object.entries(prefixes)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 15)
	.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
