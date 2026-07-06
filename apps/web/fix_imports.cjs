const fs = require('fs');
let content = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx', 'utf8');

content = content.replace(/from "\.\/components\/workspace\//g, 'from "./');
content = content.replace(/from "\.\/components\//g, 'from "../');
content = content.replace(/from "\.\/views\//g, 'from "../../views/');
content = content.replace(/from "\.\/logic\//g, 'from "../../logic/');
content = content.replace(/from "\.\/AppHelpers/g, 'from "../../AppHelpers');
content = content.replace(/from "\.\/AppBootState/g, 'from "../../AppBootState');
content = content.replace(/from "\.\/useAppLogic/g, 'from "../../useAppLogic');
// WorkspaceShell import is circular now because it was copied from App
content = content.replace(/import \{ WorkspaceShell \} from "\.\/WorkspaceShell";\n/g, '');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx', content);
console.log('Fixed imports!');
