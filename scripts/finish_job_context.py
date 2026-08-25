from pathlib import Path

p = Path('src/context/AppContext.tsx')
c = p.read_text(encoding='utf-8')

# Remove the accidental duplicate declaration created during the first migration.
dup = " deleteAccount: (userId: string) => Promise<boolean>; completeJob: (requestId: string) => Promise<void>; deleteAccount: (userId: string) => Promise<boolean>;"
clean = " deleteAccount: (userId: string) => Promise<boolean>; startJob: (requestId: string) => Promise<void>; completeJob: (requestId: string) => Promise<void>;"
if dup in c:
    c = c.replace(dup, clean, 1)
elif 'startJob: (requestId: string) => Promise<void>;' not in c:
    marker = " deleteAccount: (userId: string) => Promise<boolean>; completeJob: (requestId: string) => Promise<void>;"
    if marker not in c:
        raise SystemExit('Cannot locate AppContext interface lifecycle marker')
    c = c.replace(marker, clean, 1)

if 'const startJob = async (requestId: string): Promise<void>' not in c:
    marker = '  const completeJob = async (requestId: string): Promise<void> => {'
    start = '''  const startJob = async (requestId: string): Promise<void> => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para comenzar el trabajo.');
    if (!currentUser || currentUser.role !== 'PROFESSIONAL') throw new Error('Solo el profesional contratado puede iniciar el trabajo.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/jobs/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo iniciar el trabajo.');
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'IN_PROGRESS' } : r));
    setTransactions(prev => prev.map(t => t.serviceRequestId === requestId ? { ...t, status: 'SERVICE_IN_PROGRESS' } : t));
  };

'''
    if marker not in c:
        raise SystemExit('Cannot locate completeJob implementation marker')
    c = c.replace(marker, start + marker, 1)

if 'startJob, completeJob' not in c:
    c = c.replace('submitQuote, deleteAccount, acceptQuote, completeJob, createMercadoPagoCheckout, connectMercadoPago', 'submitQuote, deleteAccount, acceptQuote, startJob, completeJob, createMercadoPagoCheckout, connectMercadoPago', 1)

p.write_text(c, encoding='utf-8')
print('startJob context action applied.')
