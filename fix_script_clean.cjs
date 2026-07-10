const fs = require('fs');

function fix() {
    let content = fs.readFileSync('test_master_clinical_crm_flow.cjs', 'utf-8');

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

    fs.writeFileSync('test_master_clinical_crm_flow.cjs', content, 'utf-8');
    console.log('Fixed to test_master_clinical_crm_flow.cjs');
}

fix();
