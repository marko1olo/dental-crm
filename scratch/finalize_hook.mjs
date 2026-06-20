import fs from 'fs';

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/scratch/useDocumentLogicRaw.ts', 'utf8');
const vars = [];

code.replace(/const \[(.+?), (.+?)\] = useState/g, (m, state, setter) => {
  vars.push(state.trim());
  vars.push(setter.trim());
  return m;
});

// Also add the extra ones like documentPatient
vars.push('documentPatient');
vars.push('documentPayloadForKind');
vars.push('validateDocumentPayloadForKind');
vars.push('createDocument');

console.log(`Found ${vars.length} exports`);

const returnBlock = `
  return {
    ${vars.join(',\n    ')}
  };
`;

code = code.replace(/return \{\s*\/\/ we would return all state variables here\s*\};/, returnBlock);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/hooks/useDocumentLogic.ts', code);
console.log('Hook is fully wired and written to src/hooks/useDocumentLogic.ts');
