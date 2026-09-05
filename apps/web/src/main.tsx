import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RecentServiceSummary } from '@super-app/shared-types';
import './styles.css';

const recentService: RecentServiceSummary = {
  id: 'example',
  status: 'CLOSED',
  title: 'Último servicio',
};

function App() {
  const showNexoraOffer = recentService.status === 'CLOSED' || recentService.status === 'SETTLED';

  return (
    <main className="shell">
      <header>
        <span className="eyebrow">SUPER APP</span>
        <h1>Tu ecosistema en un solo lugar</h1>
        <p>Conexa para servicios profesionales y Nexora para productos, compras y vendedores.</p>
      </header>

      <section className="cards" aria-label="Módulos">
        <button type="button"><strong>Conexa</strong><span>Servicios profesionales, RADAR y seguimiento.</span></button>
        <button type="button"><strong>Nexora</strong><span>Marketplace, tiendas y compras seguras.</span></button>
      </section>

      {showNexoraOffer && (
        <aside className="cross-sell">
          <strong>¿Necesitas repuestos o accesorios para tu último servicio?</strong>
          <span>Explora Nexora con 15% OFF.</span>
        </aside>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
