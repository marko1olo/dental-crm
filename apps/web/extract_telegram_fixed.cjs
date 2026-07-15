const fs = require("fs");
const { Project, SyntaxKind, ObjectBindingPattern } = require("ts-morph");

const project = new Project({
	tsConfigFilePath: "C:/Clinic_MVP/dental-crm/apps/web/tsconfig.json",
});

const sourceFile = project.getSourceFile(
	"C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx",
);
const useAppLogicDecl = sourceFile.getFunction("useAppLogic");

const statements = useAppLogicDecl.getBody().getStatements();
const telegramStmts = [];

statements.forEach((stmt) => {
	const text = stmt.getText();
	if (
		stmt.getKind() === SyntaxKind.VariableStatement &&
		text.includes("useTelegramStore()")
	) {
		telegramStmts.push(stmt);
		return;
	}

	let isTelegram = false;
	if (stmt.getKind() === SyntaxKind.VariableStatement) {
		// Check if any variable name contains 'telegram' or 'Telegram'
		stmt.getDeclarations().forEach((d) => {
			const nameNode = d.getNameNode();
			if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
				nameNode.getElements().forEach((el) => {
					if (el.getName().toLowerCase().includes("telegram"))
						isTelegram = true;
				});
			} else {
				if (d.getName().toLowerCase().includes("telegram")) isTelegram = true;
			}
		});
	} else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
		const name = stmt.getName();
		if (name && name.toLowerCase().includes("telegram")) isTelegram = true;
	}

	if (
		stmt.getKind() === SyntaxKind.ExpressionStatement &&
		text.startsWith("useEffect") &&
		text.toLowerCase().includes("telegram")
	) {
		isTelegram = true;
	}

	if (isTelegram) {
		telegramStmts.push(stmt);
	}
});

console.log("Telegram statements:", telegramStmts.length);

const exportedNames = [];
telegramStmts.forEach((stmt) => {
	if (stmt.getKind() === SyntaxKind.VariableStatement) {
		stmt.getDeclarations().forEach((d) => {
			const nameNode = d.getNameNode();
			if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
				nameNode
					.getElements()
					.forEach((el) => exportedNames.push(el.getName()));
			} else {
				const init = d.getInitializer();
				// We only export functions and states (start with is)
				if (
					init &&
					(init.getKind() === SyntaxKind.ArrowFunction ||
						init.getKind() === SyntaxKind.CallExpression)
				) {
					exportedNames.push(d.getName());
				}
			}
		});
	} else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
		if (stmt.getName()) exportedNames.push(stmt.getName());
	}
});

const newFileContent = `import { useState, useCallback, useEffect } from 'react';
import { useTelegramStore } from '../../store/settingsStore';
// TODO: manual imports if needed

export function useTelegramLogic(deps: any) {
  const { setError } = deps; // Destructure dependencies here if TS complains

  ${telegramStmts.map((s) => s.getText()).join("\n\n  ")}

  return {
    ${exportedNames.join(",\n    ")}
  };
}
`;

fs.writeFileSync(
	"C:/Clinic_MVP/dental-crm/apps/web/src/logic/useTelegramLogic.tsx",
	newFileContent,
);
console.log("Fixed export syntax!");
