const fs = require('fs');

function fix() {
    let content = fs.readFileSync('test_master_clinical_crm_flow.cjs', 'utf-8');

    // 1. Remove the accidentally inserted block
    const startMarker = 'console.log(`[${state.name}] ➡️ SOAP Journal`);';
    const endMarker = 'await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_MultiSelect_${state.name}.png`) });';
    
    // There might be multiple occurrences now, let's find the one near line 438
    // Actually, let's just find the LAST occurrence because the original is at the top
    const lastStartIdx = content.lastIndexOf(startMarker);
    const firstStartIdx = content.indexOf(startMarker);
    if (lastStartIdx !== firstStartIdx && lastStartIdx !== -1) {
        const endIdx = content.indexOf(endMarker, lastStartIdx) + endMarker.length;
        content = content.substring(0, lastStartIdx) + content.substring(endIdx);
    }

    // 2. Fix SOAP navigation
    // Since we don't know the exact garbage chars, let's use regex!
    content = content.replace(
        /console\.log\(`\[\$\{state\.name\}\] [^`]+ SOAP Journal`\);\s+await page\.evaluate\(\(\) => \{\s+const links = Array\.from\(document\.querySelectorAll\("a, button, \[role='button'\]"\)\);\s+const visitBtn = links\.find\(el => \{\s+const t = \(el\.textContent \|\| ""\)\.toLowerCase\(\);\s+return t\.includes\([^)]+\) \|\| t\.includes\([^)]+\) \|\| t\.includes\([^)]+\) \|\| t\.includes\([^)]+\);\s+\}\);\s+if \(visitBtn\) visitBtn\.click\(\);\s+\}\);\s+await wait\(\d+\);/g,
        `console.log(\`[\${state.name}] -> SOAP Journal\`);
    await page.evaluate(async () => {
      window.location.hash = "visit";
      await new Promise(r => setTimeout(r, 1000));
    });
    await wait(1500);`
    );

    // 3. Fix Calendar navigation
    content = content.replace(
        /console\.log\(`\[\$\{state\.name\}\] [^`]+ Calendar \(Schedule\)`\);\s+await page\.evaluate\(\(\) => \{\s+const links = Array\.from\(document\.querySelectorAll\("a, button, \[role='button'\], nav a"\)\);\s+const schedBtn = links\.find\(el => \{\s+const t = \(el\.textContent \|\| ""\)\.toLowerCase\(\);\s+return t\.includes\([^)]+\) \|\| t\.includes\([^)]+\) \|\| t\.includes\([^)]+\);\s+\}\);\s+if \(schedBtn\) schedBtn\.click\(\);\s+\}\);\s+await wait\(\d+\);/g,
        `console.log(\`[\${state.name}] -> Calendar (Schedule)\`);
    await page.evaluate(async () => {
      window.location.hash = "schedule";
      await new Promise(r => setTimeout(r, 1000));
    });
    await wait(1500);`
    );

    // 4. Fix Odontogram navigation
    content = content.replace(
        /console\.log\(`\[\$\{state\.name\}\] [^`]+ Odontogram \(Patient EMK\)`\);\s+await page\.evaluate\(\(\) => \{\s+const links = Array\.from\(document\.querySelectorAll\("a, button, \[role='button'\]"\)\);\s+const pBtn = links\.find\(el => \{\s+const t = \(el\.textContent \|\| ""\)\.toLowerCase\(\);\s+return t\.includes\([^)]+\) \|\| t\.includes\([^)]+\);\s+\}\);\s+if \(pBtn\) pBtn\.click\(\);\s+\}\);\s+await wait\(\d+\);/g,
        `console.log(\`[\${state.name}] -> Odontogram (Patient EMK)\`);
    await page.evaluate(async () => {
      window.location.hash = "patients";
      await new Promise(r => setTimeout(r, 1000));
    });
    await wait(1500);`
    );

    fs.writeFileSync('test_master_clinical_crm_flow_fixed.cjs', content, 'utf-8');
    console.log('Fixed to test_master_clinical_crm_flow_fixed.cjs');
}

fix();
