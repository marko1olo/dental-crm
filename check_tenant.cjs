const fs = require('fs');
const path = require('path');

const routesDir = 'c:/Clinic_MVP/dental-crm/apps/api/src/routes';

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            checkFile(fullPath);
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Quick regex to find .update(...) or .delete(...) followed by .where(...)
    // and check if organizationId is present in that where
    const updateMatches = content.matchAll(/\.update\([^\)]+\)[\s\S]*?\.where\(([\s\S]*?)\)/g);
    for (const match of updateMatches) {
        if (!match[1].includes('organizationId')) {
            console.log(`Missing organizationId in update: ${filePath}`);
        }
    }
    
    const deleteMatches = content.matchAll(/\.delete\([^\)]+\)[\s\S]*?\.where\(([\s\S]*?)\)/g);
    for (const match of deleteMatches) {
        if (!match[1].includes('organizationId')) {
            console.log(`Missing organizationId in delete: ${filePath}`);
        }
    }
}

traverse(routesDir);
