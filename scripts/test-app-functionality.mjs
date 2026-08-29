import fs from 'node:fs';

console.log('====================================================');
console.log('   CONEXA PLATFORM — PRUEBA DE FUNCIONALIDAD COMPLETA   ');
console.log('====================================================\n');

// Mock in-memory database representing Firestore state
class MockDb {
  constructor() {
    this.users = new Map([
      ['pro-123', { name: 'Juan Pérez (Gasista)', role: 'PROFESSIONAL', isProfessional: true, rating: 4.9 }],
      ['cli-456', { name: 'Maria Lopez (Cliente)', role: 'CLIENT', isProfessional: false }],
      ['other-pro-789', { name: 'Carlos Gomez (Electricista)', role: 'PROFESSIONAL', isProfessional: true }]
    ]);

    this.service_requests = new Map([
      ['req-1', { id: 'req-1', clientId: 'cli-456', title: 'Reparación de calefón', status: 'OPEN', quotesCount: 0 }],
      ['req-completed', { id: 'req-completed', clientId: 'cli-456', title: 'Instalación de luz', status: 'COMPLETED', quotesCount: 2 }],
      ['req-in-progress', { id: 'req-in-progress', clientId: 'cli-456', title: 'Pintura de departamento', status: 'IN_PROGRESS', quotesCount: 1 }]
    ]);

    this.quotes = new Map();

    this.transactions = new Map([
      ['tx-1', { id: 'tx-1', serviceRequestId: 'req-in-progress', professionalId: 'pro-123', clientId: 'cli-456', status: 'IN_PROGRESS' }]
    ]);
  }
}

// Logic implementations matching harden-unified.mjs & finalize-unified.mjs
function handleSubmitQuote(db, auth, body) {
  if (!auth || !auth.isAuthenticated || !auth.userId) {
    return { status: 401, body: { success: false, error: 'UNAUTHORIZED' } };
  }

  if (!body.requestId || typeof body.requestId !== 'string') {
    return { status: 400, body: { success: false, error: 'INVALID_REQUEST_ID' } };
  }

  const priceArs = Number(body.priceArs);
  if (!Number.isFinite(priceArs) || priceArs <= 0 || priceArs > 1000000000) {
    return { status: 422, body: { success: false, error: 'INVALID_QUOTE_AMOUNT' } };
  }

  if (typeof body.description !== 'string' || body.description.trim().length < 3 || body.description.length > 4000) {
    return { status: 422, body: { success: false, error: 'INVALID_QUOTE_DESCRIPTION' } };
  }

  const user = db.users.get(auth.userId) || {};
  const effectiveProfessional = auth.role === 'PROFESSIONAL' || user.role === 'PROFESSIONAL' || user.isProfessional === true;
  if (!effectiveProfessional) {
    return { status: 403, body: { success: false, error: 'PROFESSIONAL_ROLE_REQUIRED' } };
  }

  const request = db.service_requests.get(body.requestId);
  if (!request) {
    return { status: 404, body: { success: false, error: 'REQUEST_NOT_FOUND' } };
  }

  if (['CANCELLED', 'COMPLETED', 'CLOSED'].includes(request.status)) {
    return { status: 409, body: { success: false, error: 'REQUEST_NOT_AVAILABLE' } };
  }

  if (request.clientId === auth.userId) {
    return { status: 403, body: { success: false, error: 'SELF_QUOTE_FORBIDDEN' } };
  }

  const quoteId = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const quote = {
    id: quoteId,
    requestId: body.requestId,
    clientId: request.clientId,
    professionalId: auth.userId,
    professionalName: user.name || 'Profesional CONEXA',
    priceArs,
    description: body.description.trim(),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.quotes.set(quoteId, quote);
  request.quotesCount = (request.quotesCount || 0) + 1;
  request.status = 'QUOTES_RECEIVED';

  return { status: 201, body: { success: true, quote } };
}

function handleCompleteJob(db, auth, body) {
  if (!auth || !auth.isAuthenticated || !auth.userId) {
    return { status: 401, body: { success: false, error: 'UNAUTHORIZED' } };
  }

  const requestId = body?.requestId;
  if (!requestId || typeof requestId !== 'string') {
    return { status: 400, body: { success: false, error: 'INVALID_REQUEST_ID' } };
  }

  const request = db.service_requests.get(requestId);
  if (!request) {
    return { status: 404, body: { success: false, error: 'REQUEST_NOT_FOUND' } };
  }

  if (request.clientId === auth.userId) {
    return { status: 403, body: { success: false, error: 'CLIENT_CANNOT_COMPLETE_JOB' } };
  }

  let matchingTx = null;
  for (const tx of db.transactions.values()) {
    if (tx.serviceRequestId === requestId && tx.professionalId === auth.userId) {
      matchingTx = tx;
      break;
    }
  }

  if (!matchingTx) {
    return { status: 403, body: { success: false, error: 'ASSIGNED_PROFESSIONAL_REQUIRED' } };
  }

  if (!['PROFESSIONAL_SELECTED', 'IN_PROGRESS', 'REVIEW_PENDING'].includes(request.status)) {
    return { status: 409, body: { success: false, error: 'INVALID_JOB_STATE' } };
  }

  request.status = 'REVIEW_PENDING';
  matchingTx.status = 'SERVICE_COMPLETED';
  matchingTx.completedAt = new Date().toISOString();

  return { status: 200, body: { success: true, requestId, status: 'REVIEW_PENDING', transaction: matchingTx } };
}

// Test Runner Framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  const db = new MockDb();
  try {
    fn(db);
    console.log(`  ✓ PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Details: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('--- 1. PRUEBAS DE COTIZACIÓN Y PRESUPUESTOS (/api/quotes/submit) ---');

test('Profesional envía presupuesto válido exitosamente', (db) => {
  const auth = { isAuthenticated: true, userId: 'pro-123', role: 'PROFESSIONAL' };
  const payload = { requestId: 'req-1', priceArs: 45000, description: 'Cambio de diafragma y revisión general' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 201, `Esperado 201, obtenido ${res.status}`);
  assert(res.body.success === true, 'Respuesta debe indicar success=true');
  assert(res.body.quote.clientId === 'cli-456', 'El campo clientId debe coincidir con el cliente de la solicitud');
  assert(res.body.quote.priceArs === 45000, 'El precio debe coincidir');
  assert(db.service_requests.get('req-1').status === 'QUOTES_RECEIVED', 'La solicitud debe pasar a QUOTES_RECEIVED');
});

test('Bloqueo de autocotización (cliente cotiza su propia solicitud)', (db) => {
  const auth = { isAuthenticated: true, userId: 'cli-456', role: 'PROFESSIONAL' }; // Intento con doble rol
  const payload = { requestId: 'req-1', priceArs: 10000, description: 'Autocotización fraudulenta' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 403, `Esperado 403, obtenido ${res.status}`);
  assert(res.body.error === 'SELF_QUOTE_FORBIDDEN', `Error esperado SELF_QUOTE_FORBIDDEN, obtenido ${res.body.error}`);
});

test('Rechazo si el usuario no tiene rol profesional', (db) => {
  const auth = { isAuthenticated: true, userId: 'cli-456', role: 'CLIENT' };
  const payload = { requestId: 'req-1', priceArs: 20000, description: 'Cotización desde cliente' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 403, `Esperado 403, obtenido ${res.status}`);
  assert(res.body.error === 'PROFESSIONAL_ROLE_REQUIRED', `Error esperado PROFESSIONAL_ROLE_REQUIRED, obtenido ${res.body.error}`);
});

test('Validación de límites de precio (inválido: 0 o negativo)', (db) => {
  const auth = { isAuthenticated: true, userId: 'pro-123', role: 'PROFESSIONAL' };
  const payload = { requestId: 'req-1', priceArs: -500, description: 'Precio inválido' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 422, `Esperado 422, obtenido ${res.status}`);
  assert(res.body.error === 'INVALID_QUOTE_AMOUNT', `Error esperado INVALID_QUOTE_AMOUNT, obtenido ${res.body.error}`);
});

test('Validación de longitud de descripción (< 3 caracteres)', (db) => {
  const auth = { isAuthenticated: true, userId: 'pro-123', role: 'PROFESSIONAL' };
  const payload = { requestId: 'req-1', priceArs: 15000, description: 'Ok' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 422, `Esperado 422, obtenido ${res.status}`);
  assert(res.body.error === 'INVALID_QUOTE_DESCRIPTION', `Error esperado INVALID_QUOTE_DESCRIPTION, obtenido ${res.body.error}`);
});

test('Rechazo de solicitudes sin autenticación', (db) => {
  const auth = { isAuthenticated: false };
  const payload = { requestId: 'req-1', priceArs: 15000, description: 'Sin login' };
  const res = handleSubmitQuote(db, auth, payload);

  assert(res.status === 401, `Esperado 401, obtenido ${res.status}`);
  assert(res.body.error === 'UNAUTHORIZED', `Error esperado UNAUTHORIZED, obtenido ${res.body.error}`);
});

console.log('\n--- 2. PRUEBAS DE FINALIZACIÓN DE TRABAJOS (/api/jobs/complete) ---');

test('Profesional asignado finaliza trabajo exitosamente', (db) => {
  const auth = { isAuthenticated: true, userId: 'pro-123', role: 'PROFESSIONAL' };
  const payload = { requestId: 'req-in-progress' };
  const res = handleCompleteJob(db, auth, payload);

  assert(res.status === 200, `Esperado 200, obtenido ${res.status}`);
  assert(res.body.success === true, 'Respuesta debe indicar success=true');
  assert(db.service_requests.get('req-in-progress').status === 'REVIEW_PENDING', 'Estado debe ser REVIEW_PENDING');
  assert(res.body.transaction.status === 'SERVICE_COMPLETED', 'La transacción debe estar SERVICE_COMPLETED');
});

test('Rechazo si el cliente intenta finalizar mediante el endpoint del profesional', (db) => {
  const auth = { isAuthenticated: true, userId: 'cli-456', role: 'CLIENT' };
  const payload = { requestId: 'req-in-progress' };
  const res = handleCompleteJob(db, auth, payload);

  assert(res.status === 403, `Esperado 403, obtenido ${res.status}`);
  assert(res.body.error === 'CLIENT_CANNOT_COMPLETE_JOB', `Error esperado CLIENT_CANNOT_COMPLETE_JOB, obtenido ${res.body.error}`);
});

test('Rechazo si profesional NO asignado intenta finalizar trabajo ajeno', (db) => {
  const auth = { isAuthenticated: true, userId: 'other-pro-789', role: 'PROFESSIONAL' };
  const payload = { requestId: 'req-in-progress' };
  const res = handleCompleteJob(db, auth, payload);

  assert(res.status === 403, `Esperado 403, obtenido ${res.status}`);
  assert(res.body.error === 'ASSIGNED_PROFESSIONAL_REQUIRED', `Error esperado ASSIGNED_PROFESSIONAL_REQUIRED, obtenido ${res.body.error}`);
});

console.log('\n--- 3. VERIFICACIÓN DE REGLAS DE SEGURIDAD Y CONFIGURACIÓN ---');

test('Verificación de sintaxis de reglas firestore.rules', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert(rules.includes("rules_version = '2';"), 'Debe incluir versión 2 de reglas');
  assert(rules.includes('match /quotes/{quoteId}') && rules.includes('allow write: if false;'), 'Colección quotes debe bloquear escrituras directas cliente');
  assert(rules.includes('match /transactions/{transactionId}') && rules.includes('allow write: if false;'), 'Colección transactions debe bloquear escrituras directas cliente');
});

test('Verificación de configuración firebase.json', () => {
  const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
  assert(config.firestore.rules === 'firestore.rules', 'firebase.json debe apuntar a firestore.rules');
});

console.log('\n====================================================');
console.log(` RESULTADO FINAL: ${passed} PASADOS | ${failed} FALLADOS `);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
