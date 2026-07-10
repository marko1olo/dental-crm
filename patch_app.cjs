const fs = require('fs');
let code = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
code = code.replace(/if \(\!clinicAuthed\)/, 'if (false)');
code = code.replace(/if \(\!staffAuthed \|\| showStaffPinPad\)/, 'if (false)');
code = code.replace(/if \(error \&\& \!dashboard\)/, 'if (false)');
code = code.replace(/if \(\!dashboard\)/, 'if (false)');
code = code.replace(/<WorkspaceShell[\s\S]*?dashboard=\{dashboard\}/, '<WorkspaceShell\n      dashboard={dashboard || { clinicSettings: { staff: [], name: \'Demo Clinic\' }, visits: [], patients: [], billing: [], analytics: [], documents: [] } as any}');
fs.writeFileSync('apps/web/src/App.tsx', code);
