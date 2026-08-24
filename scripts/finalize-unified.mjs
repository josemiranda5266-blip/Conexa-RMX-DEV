import fs from 'node:fs';

const serverPath = 'server.ts';
let server = fs.readFileSync(serverPath, 'utf8');
const serverNeedle = 'requestId: body.requestId, professionalId: auth.userId';
if (!server.includes('clientId: request.clientId') && server.includes(serverNeedle)) {
  server = server.replace(serverNeedle, 'requestId: body.requestId, clientId: request.clientId, professionalId: auth.userId');
}
fs.writeFileSync(serverPath, server);

const typesPath = 'src/types.ts';
let types = fs.readFileSync(typesPath, 'utf8');
const quoteNeedle = 'export interface Quote {\n  id: string;\n  requestId: string;\n  professionalId: string;';
if (types.includes(quoteNeedle) && !types.includes('requestId: string;\n  clientId?: string;')) {
  types = types.replace(quoteNeedle, 'export interface Quote {\n  id: string;\n  requestId: string;\n  clientId?: string;\n  professionalId: string;');
}
fs.writeFileSync(typesPath, types);
console.log('Final unified data-contract fixes applied.');
