from pathlib import Path

SERVER = Path('server.ts')
CONTEXT = Path('src/context/AppContext.tsx')

server = SERVER.read_text(encoding='utf-8')
marker = '  // Account Deletion API Endpoint (GDPR/ARCO Compliance)'

if '/api/jobs/start' not in server:
    if marker not in server:
        raise SystemExit('Cannot locate server insertion marker')

    routes = '''  // Authoritative job lifecycle: paid contract -> in progress.
  app.post("/api/jobs/start", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: "Se requiere autenticación válida.", code: "UNAUTHORIZED" });
      const { requestId } = req.body || {};
      if (!requestId || typeof requestId !== 'string') return res.status(400).json({ success: false, error: "requestId es obligatorio.", code: "INVALID_REQUEST_ID" });

      const firestore = await getAdminDb();
      const requestRef = firestore.collection('service_requests').doc(requestId);
      const requestSnap = await requestRef.get();
      if (!requestSnap.exists) return res.status(404).json({ success: false, error: "Solicitud no encontrada.", code: "REQUEST_NOT_FOUND" });
      const txSnap = await firestore.collection('transactions').where('serviceRequestId', '==', requestId).limit(1).get();
      if (txSnap.empty) return res.status(409).json({ success: false, error: "No existe una transacción asociada al trabajo.", code: "TRANSACTION_NOT_FOUND" });

      const transactionRef = txSnap.docs[0].ref;
      const transaction = txSnap.docs[0].data() || {};
      const request = requestSnap.data() || {};
      if (transaction.professionalId !== auth.userId) return res.status(403).json({ success: false, error: "Solo el profesional contratado puede iniciar el trabajo.", code: "FORBIDDEN_JOB_ACTOR" });
      if (request.status !== 'PROFESSIONAL_SELECTED') return res.status(409).json({ success: false, error: "El trabajo no está listo para iniciarse.", code: "JOB_NOT_STARTABLE" });
      if (transaction.status !== 'PAID') return res.status(409).json({ success: false, error: "El pago del trabajo todavía no está confirmado.", code: "PAYMENT_NOT_CONFIRMED" });

      await firestore.runTransaction(async (tx: any) => {
        const currentRequest = await tx.get(requestRef);
        const currentTransaction = await tx.get(transactionRef);
        const currentRequestData = currentRequest.data() || {};
        const currentTransactionData = currentTransaction.data() || {};
        if (currentTransactionData.professionalId !== auth.userId) throw new Error('FORBIDDEN_JOB_ACTOR');
        if (currentRequestData.status !== 'PROFESSIONAL_SELECTED') throw new Error('JOB_NOT_STARTABLE');
        if (currentTransactionData.status !== 'PAID') throw new Error('PAYMENT_NOT_CONFIRMED');
        const startedAt = new Date().toISOString();
        tx.update(requestRef, { status: 'IN_PROGRESS', startedAt });
        tx.update(transactionRef, { status: 'SERVICE_IN_PROGRESS', serviceStartedAt: startedAt });
      });
      return res.json({ success: true, requestId, status: 'IN_PROGRESS' });
    } catch (err: any) {
      const code = err?.message || 'JOB_START_ERROR';
      const map: Record<string, number> = { FORBIDDEN_JOB_ACTOR: 403, JOB_NOT_STARTABLE: 409, PAYMENT_NOT_CONFIRMED: 409, REQUEST_NOT_FOUND: 404, TRANSACTION_NOT_FOUND: 409 };
      return res.status(map[code] || 500).json({ success: false, error: map[code] ? `No se puede iniciar el trabajo: ${code}.` : "Error interno al iniciar el trabajo.", code });
    }
  });

  // Authoritative job completion: only the contracted professional can close the service.
  app.post("/api/jobs/complete", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: "Se requiere autenticación válida.", code: "UNAUTHORIZED" });
      const { requestId } = req.body || {};
      if (!requestId || typeof requestId !== 'string') return res.status(400).json({ success: false, error: "requestId es obligatorio.", code: "INVALID_REQUEST_ID" });

      const firestore = await getAdminDb();
      const requestRef = firestore.collection('service_requests').doc(requestId);
      const requestSnap = await requestRef.get();
      if (!requestSnap.exists) return res.status(404).json({ success: false, error: "Solicitud no encontrada.", code: "REQUEST_NOT_FOUND" });
      const txSnap = await firestore.collection('transactions').where('serviceRequestId', '==', requestId).limit(1).get();
      if (txSnap.empty) return res.status(409).json({ success: false, error: "No existe una transacción asociada al trabajo.", code: "TRANSACTION_NOT_FOUND" });

      const transactionRef = txSnap.docs[0].ref;
      const transaction = txSnap.docs[0].data() || {};
      const request = requestSnap.data() || {};
      if (transaction.professionalId !== auth.userId) return res.status(403).json({ success: false, error: "Solo el profesional contratado puede completar el trabajo.", code: "FORBIDDEN_JOB_ACTOR" });
      if (request.status !== 'IN_PROGRESS') return res.status(409).json({ success: false, error: "El trabajo no está en ejecución.", code: "JOB_NOT_COMPLETABLE" });
      if (transaction.status !== 'SERVICE_IN_PROGRESS') return res.status(409).json({ success: false, error: "La transacción no está en estado de servicio en curso.", code: "TRANSACTION_NOT_IN_PROGRESS" });

      await firestore.runTransaction(async (tx: any) => {
        const currentRequest = await tx.get(requestRef);
        const currentTransaction = await tx.get(transactionRef);
        const currentRequestData = currentRequest.data() || {};
        const currentTransactionData = currentTransaction.data() || {};
        if (currentTransactionData.professionalId !== auth.userId) throw new Error('FORBIDDEN_JOB_ACTOR');
        if (currentRequestData.status !== 'IN_PROGRESS') throw new Error('JOB_NOT_COMPLETABLE');
        if (currentTransactionData.status !== 'SERVICE_IN_PROGRESS') throw new Error('TRANSACTION_NOT_IN_PROGRESS');
        const completedAt = new Date().toISOString();
        tx.update(requestRef, { status: 'REVIEW_PENDING', completedAt });
        tx.update(transactionRef, { status: 'SERVICE_COMPLETED', serviceCompletedAt: completedAt });
      });
      return res.json({ success: true, requestId, status: 'REVIEW_PENDING' });
    } catch (err: any) {
      const code = err?.message || 'JOB_COMPLETE_ERROR';
      const map: Record<string, number> = { FORBIDDEN_JOB_ACTOR: 403, JOB_NOT_COMPLETABLE: 409, TRANSACTION_NOT_IN_PROGRESS: 409, REQUEST_NOT_FOUND: 404, TRANSACTION_NOT_FOUND: 409 };
      return res.status(map[code] || 500).json({ success: false, error: map[code] ? `No se puede completar el trabajo: ${code}.` : "Error interno al completar el trabajo.", code });
    }
  });

'''
    SERVER.write_text(server.replace(marker, routes + marker, 1), encoding='utf-8')

context = CONTEXT.read_text(encoding='utf-8')
if 'completeJob: (requestId: string) => Promise<void>;' not in context:
    interface_marker = "  submitQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => Promise<Quote>;"
    if interface_marker not in context:
        raise SystemExit('Cannot locate AppContext interface marker')
    context = context.replace(interface_marker, interface_marker + " deleteAccount: (userId: string) => Promise<boolean>; completeJob: (requestId: string) => Promise<void>;", 1)
    value_marker = '  const value: AppContextType = {'
    complete = '''  const completeJob = async (requestId: string): Promise<void> => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para completar el trabajo.');
    if (!currentUser || currentUser.role !== 'PROFESSIONAL') throw new Error('Solo el profesional contratado puede completar el trabajo.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/jobs/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo completar el trabajo.');
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REVIEW_PENDING' } : r));
    setTransactions(prev => prev.map(t => t.serviceRequestId === requestId ? { ...t, status: 'SERVICE_COMPLETED' } : t));
  };

'''
    context = context.replace(value_marker, complete + value_marker, 1)
    context = context.replace('submitQuote, deleteAccount, acceptQuote, createMercadoPagoCheckout, connectMercadoPago', 'submitQuote, deleteAccount, acceptQuote, completeJob, createMercadoPagoCheckout, connectMercadoPago', 1)
    CONTEXT.write_text(context, encoding='utf-8')

print('Job lifecycle patch applied or already present.')
