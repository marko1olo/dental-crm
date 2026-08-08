import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let findings = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all function declarations that are NOT useCallback/useMemo
  // e.g. const fetchSomething = async () => { ... }
  // or const fetchSomething = () => { ... }
  // or async function fetchSomething() { ... }
  // We'll just look for standard names: const myFunc = 
  const funcRegex = /(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
  let funcs = [];
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    funcs.push(match[1]);
  }
  
  const functionRegex2 = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
  while ((match = functionRegex2.exec(content)) !== null) {
    funcs.push(match[1]);
  }

  // Now find useEffects and their dependency arrays
  const effectRegex = /useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[([^\]]+)\]\s*\)/g;
  
  while ((match = effectRegex.exec(content)) !== null) {
    const depsStr = match[1];
    // Split by comma
    const deps = depsStr.split(',').map(d => d.trim());
    
    // Check if any dep is a function defined locally
    const leakingDeps = deps.filter(d => funcs.includes(d));
    
    if (leakingDeps.length > 0) {
      findings.push({
        file,
        leakingDeps,
        deps: depsStr
      });
    }
  }
});

console.log(JSON.stringify(findings, null, 2));
