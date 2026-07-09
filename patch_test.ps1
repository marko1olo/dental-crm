const fs = require('fs');
let code = fs.readFileSync('test_master_clinical_crm_flow.cjs', 'utf8');

const newCheck = 
    // ?: 7. PATIENT SWITCH DATA LEAK VERIFICATION
    console.log('[\\] ?"" Patient Switch Data Leak Verification');
    await navigateTo(page, 'patient', 1000);
    
    // Simulate setting data in odontogram state via evaluate
    await page.evaluate(() => {
       window.__TEST_SET_ODONTOGRAM = true;
       // We can mock it by setting local storage or store
       localStorage.setItem('dente_temp_odon_state', '{\"teeth\":[11,12]}');
    });
    
    await navigateTo(page, 'schedule', 1000);
    await navigateTo(page, 'patient', 1000);
    
    // After returning, check if state was reset
    const odonLeak = await page.evaluate(() => {
       // Just checking if our unmount destroyed temporary views or triggered reset
       // Since zustand is in memory, we verify UI states or localStorage
       return localStorage.getItem('dente_temp_odon_state');
    });
    
    console.log('[\\] ?" Patient switch data reset check. Leak found: \\');
;

code = code.replace('await context.close();', newCheck + '\n    await context.close();');
fs.writeFileSync('test_master_clinical_crm_flow.cjs', code, 'utf8');
