const fs = require('fs');
let content = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx', 'utf8');

// Fix dynamic imports
content = content.replace(/import\("\.\/([^"]+)"\)/g, 'import("../../$1")');

// Remove the hardcoded Suspense and AppLoadingState imports that I added
content = content.replace(/import React, \{ Suspense \} from 'react';\n/, '');
content = content.replace(/import \{ AppLoadingState \} from '\.\.\/\.\.\/AppBootState';\n/, '');

// Add React back at the top if needed
content = 'import React from "react";\n' + content;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx', content);
console.log('Fixed dynamic imports!');
