const fs = require('fs');

let mainCss = fs.readFileSync('apps/web/src/styles/main.css', 'utf8');

// Optimize paddings
mainCss = mainCss.replace(/gap: 1.5rem !important;/g, 'gap: 1rem !important;');
mainCss = mainCss.replace(/padding: 16px 14px 10px 14px;/g, 'padding: 14px 12px 8px 12px;'); // smart-field input
mainCss = mainCss.replace(/margin-bottom: 20px;/g, 'margin-bottom: 12px;'); // smart-details
mainCss = mainCss.replace(/padding: 16px 20px;/g, 'padding: 12px 16px;'); // smart-details summary
mainCss = mainCss.replace(/padding: 20px;/g, 'padding: 12px;'); // smart-details-content
mainCss = mainCss.replace(/flex: 1 1 240px;/g, 'flex: 1 1 200px;'); // dense grid items

fs.writeFileSync('apps/web/src/styles/main.css', mainCss, 'utf8');
console.log('Successfully optimized paddings in main.css');
