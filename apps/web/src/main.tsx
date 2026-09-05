import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Listing, RecentServiceSummary } from '@super-app/shared-types';
import { loadNexoraReadModel } from './services';
import { useAuth } from './hooks/useAuth';
import './styles.css';

const recentService: RecentServiceSummary = { id: 'example', status: 'CLOSED', title: 'Último servicio' };

function NexoraPreview() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadNexoraReadModel().then((model) => {
      if (active) setListings(model.listings.slice(0, 6));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar Nexora.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <section aria-labelledby="nexora-title">
    <span className="eyebrow">NEXORA</span>
    <h2 id="nexora-title">Productos destacados</h2>
    {loading && <p>Cargando catálogo…</p>}
    {error && <p role="alert">No se pudo cargar el catálogo: {error}</p>}
    {!loading && !error && listings.length === 0 && <p>No hay publicaciones disponibles todavía.</p>}
    {!loading && !error && listings.length > 0 && <div className="cards" aria-label="Publicaciones Nexora">
      {listings.map((listing) => <article className="listing-card" key={listing.id}>
        <strong>{listing.title}</strong>
        <span>{listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}</span>
        <b>{listing.currency} {listing.price.toLocaleString('es-AR')}</b>
      </article>)}
    </div>}
  </section>;
}

function App() {
  const { user, loading: authLoading } = useAuth();
  const showNexoraOffer = recentService.status === 'CLOSED' || recentService.status === 'SETTLED';
  return <main className="shell">
    <header><span className="eyebrow">SUPER APP</span><h1>Tu ecosistema en un solo lugar</h1><p>Conexa para servicios profesionales y Nexora para productos, compras y vendedores.</p>
      <p aria-live="polite">{authLoading ? 'Verificando sesión…' : user ? `Sesión activa: ${user.email ?? user.uid}` : 'Sesión no iniciada'}</p>
    </header>
    <section className="cards" aria-label="Módulos">
      <button type="button"><strong>Conexa</strong><span>Servicios profesionales, RADAR y seguimiento.</span></button>
      <button type="button"><strong>Nexora</strong><span>Marketplace, tiendas y compras seguras.</span></button>
    </section>
    {showNexoraOffer && <aside className="cross-sell"><strong>¿Necesitas repuestos o accesorios para tu último servicio?</strong><span>Explora Nexora con 15% OFF.</span></aside>}
    <NexoraPreview />
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
