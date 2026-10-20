async function main() {
  const res = await fetch('http://127.0.0.1:5173/src/main.tsx');
  const code = await res.text();
  const re = /from\s+["']([^"']+)["']/g;
  let match;
  const imports = [];
  while ((match = re.exec(code)) !== null) {
    imports.push(match[1]);
  }
  console.log('Total imports from main.tsx:', imports.length);
  for (const imp of imports) {
    let url = imp;
    if (imp.startsWith('.')) {
      url = 'http://127.0.0.1:5173/src/' + imp.replace(/^\.\//, '');
    } else if (imp.startsWith('/')) {
      url = 'http://127.0.0.1:5173' + imp;
    } else {
      url = 'http://127.0.0.1:5173/node_modules/.vite/deps/' + imp.replace('/', '_') + '.js';
    }
    const start = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      const ms = Date.now() - start;
      if (r.status !== 200 || ms > 1500) {
        console.log(`[SLOW/STATUS] ${imp} -> status ${r.status} (${ms}ms)`);
      }
    } catch (e) {
      console.log(`[HANG/ERROR] ${imp} -> ${e.message}`);
    }
  }
  console.log('Done checking imports!');
}

main().catch(console.error);
