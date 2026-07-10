const fs = require('fs');

let visitContent = fs.readFileSync('apps/web/src/VisitView.tsx', 'utf8');

const styleRegex = /<style dangerouslySetInnerHTML=\{\{\s*__html:\s*`([\s\S]*?)`\s*\}\}\s*\/>/;
const match = visitContent.match(styleRegex);

if (match) {
  let styleBlock = match[1];
  
  // Replace hardcoded z-indexes
  styleBlock = styleBlock.replace(/z-index:\s*3000/g, 'z-index: var(--z-modal-overlay)');
  styleBlock = styleBlock.replace(/z-index:\s*3001/g, 'z-index: var(--z-modal)');
  
  // Remove the block from VisitView.tsx
  visitContent = visitContent.replace(styleRegex, '');
  fs.writeFileSync('apps/web/src/VisitView.tsx', visitContent, 'utf8');
  
  // Append to main.css
  let mainCss = fs.readFileSync('apps/web/src/styles/main.css', 'utf8');
  mainCss += '\n\n/* CLINICAL CONTEXT MODAL STYLES (from VisitView) */\n' + styleBlock + '\n';
  fs.writeFileSync('apps/web/src/styles/main.css', mainCss, 'utf8');
  
  console.log('Successfully moved _ccm styles to main.css');
} else {
  console.log('Style block not found in VisitView.tsx');
}
