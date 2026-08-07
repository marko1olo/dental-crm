const fs = require('fs');
const meta = require('./apps/api/drizzle/meta/0037_snapshot.json');
const schema = fs.readFileSync('./apps/api/src/db/schema.ts', 'utf-8');
const enumMatches = [...schema.matchAll(/pgEnum\([\"\'](.*?)[\"\'],\s*\[(.*?)\]/gs)];
const schemaEnums = {};
for (const match of enumMatches) {
    const name = match[1];
    const values = match[2].match(/[\"\'](.*?)[\"\']/g).map(v => v.replace(/[\"\']/g, ''));
    schemaEnums['public.' + name] = values;
}
for (const [key, val] of Object.entries(meta.enums)) {
    if (!schemaEnums[key]) {
        console.log('Deleted enum in schema: ' + key);
        continue;
    }
    const snapVals = val.values;
    const schemVals = schemaEnums[key];
    const removed = snapVals.filter(v => !schemVals.includes(v));
    const added = schemVals.filter(v => !snapVals.includes(v));
    if (removed.length > 0 || added.length > 0) {
        console.log('Enum diff for ' + key + ': removed ' + removed + ', added ' + added);
    }
}
for (const key of Object.keys(schemaEnums)) {
    if (!meta.enums[key]) {
        console.log('New enum in schema: ' + key);
    }
}
