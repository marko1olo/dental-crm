/**
 * @file verify-export-parity.cjs
 * @description Compares exported symbols between an original monolith and a decomposed module/facade using TypeScript AST.
 * Usage: node scripts/verify-export-parity.cjs <originalMonolithPath> <newFacadePath>
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function extractExports(filePath, visited = new Set()) {
  let resolvedPath = path.resolve(filePath);
  if (visited.has(resolvedPath)) return new Set();
  visited.add(resolvedPath);

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    resolvedPath = path.join(resolvedPath, 'index.ts');
  }

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[ExportParity] Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const code = fs.readFileSync(resolvedPath, 'utf8');
  const source = ts.createSourceFile(resolvedPath, code, ts.ScriptTarget.Latest, true);
  const exports = new Set();

  function resolveModule(moduleSpecifier) {
    const baseDir = path.dirname(resolvedPath);
    let target = path.resolve(baseDir, moduleSpecifier);
    // Try extensions: target, target.ts, target.tsx, target.js, target.d.ts, target/index.ts, etc.
    const candidates = [
      target,
      target.replace(/\.js$/, '.ts'),
      target.replace(/\.js$/, '.tsx'),
      target + '.ts',
      target + '.tsx',
      target + '.js',
      path.join(target, 'index.ts'),
      path.join(target, 'index.tsx'),
      path.join(target, 'index.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
    return null;
  }

  function visit(node) {
    // 1. Export declarations: export { a, b } from './...'; or export { a, b };
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => exports.add(el.name.text));
      } else if (!node.exportClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        // export * from './...'
        const modPath = resolveModule(node.moduleSpecifier.text);
        if (modPath) {
          const subExports = extractExports(modPath, visited);
          subExports.forEach(sym => exports.add(sym));
        }
      }
    }

    // 2. Export modifier on declarations: export const foo = ..., export function bar() {}, export class Baz {}
    if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(d => {
          if (ts.isIdentifier(d.name)) {
            exports.add(d.name.text);
          }
        });
      } else if (node.name && ts.isIdentifier(node.name)) {
        exports.add(node.name.text);
      }
    }

    // 3. Export assignment: export default ...
    if (ts.isExportAssignment(node)) {
      exports.add('default');
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return exports;
}

const originalPath = process.argv[2];
const facadePath = process.argv[3];

if (!originalPath || !facadePath) {
  console.log('Usage: node scripts/verify-export-parity.cjs <original_file> <facade_file>');
  process.exit(1);
}

console.log(`[ExportParity] Comparing exports:`);
console.log(`  Original: ${originalPath}`);
console.log(`  Facade:   ${facadePath}`);

const originalExports = extractExports(originalPath);
const facadeExports = extractExports(facadePath);

const missing = Array.from(originalExports).filter(sym => !facadeExports.has(sym));

console.log(`[ExportParity] Found ${originalExports.size} baseline exports, ${facadeExports.size} facade exports.`);

if (missing.length > 0) {
  console.error(`\n❌ [ExportParity] FAILED: The following ${missing.length} exports are MISSING in the facade:`);
  missing.forEach(sym => console.error(`  - ${sym}`));
  process.exit(1);
}

console.log(`\n✔ [ExportParity] PASSED: 100% of baseline exports are preserved in the facade.\n`);
process.exit(0);
