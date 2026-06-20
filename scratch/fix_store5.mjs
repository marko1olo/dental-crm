import fs from 'fs';

const storePath = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts';
let code = fs.readFileSync(storePath, 'utf8');

code = code.replace(/import \{ dateInputValuePlusDays \} from "\.\.\/helpers";/, 'import { dateInputValuePlusDays } from "../AppHelpers";');

fs.writeFileSync(storePath, code);
console.log('Fixed helper import.');
