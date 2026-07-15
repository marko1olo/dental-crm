const { Project, SyntaxKind } = require("ts-morph");

const project = new Project();
project.addSourceFilesAtPaths("C:/Clinic_MVP/dental-crm/apps/web/src/**/*.tsx");
const sourceFile = project.getSourceFile("useAppLogic.tsx");

if (!sourceFile) {
	console.log("Could not find useAppLogic.tsx");
	process.exit(1);
}

const appLogicFunc = sourceFile.getFunction("useAppLogic");
if (!appLogicFunc) {
	console.log("Could not find useAppLogic function");
	process.exit(1);
}

console.log("Found useAppLogic, analyzing statements...");

const statements = appLogicFunc.getStatements();
let useStateCount = 0;
let useEffectCount = 0;
let functionCount = 0;

statements.forEach((stmt) => {
	if (stmt.getKind() === SyntaxKind.VariableStatement) {
		const text = stmt.getText();
		if (text.includes("useState(")) useStateCount++;
	} else if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
		const text = stmt.getText();
		if (text.startsWith("useEffect(")) useEffectCount++;
	} else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
		functionCount++;
	}
});

console.log(`Inside useAppLogic:`);
console.log(`- useState count: ${useStateCount}`);
console.log(`- useEffect count: ${useEffectCount}`);
console.log(`- nested functions count: ${functionCount}`);
console.log(`- total statements: ${statements.length}`);

// Find the return statement
const returnStmt = statements.find(
	(s) => s.getKind() === SyntaxKind.ReturnStatement,
);
if (returnStmt) {
	console.log(
		`Return statement found. Length: ${returnStmt.getText().length} chars`,
	);
} else {
	console.log("No return statement found!?");
}
