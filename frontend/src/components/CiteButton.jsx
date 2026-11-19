import { useState } from 'react';

// Copia al portapapeles una cifra lista para pegar: la frase, su fuente oficial con enlace,
// la ley si la hay y la dirección de esta página. Así el dato viaja siempre con su origen.
export default function CiteButton({ text, source, legal }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'copied' | 'failed'
  if (!text || !source) return null;

  async function copy() {
    const parts = [text, `Fuente: ${source.name} (${source.url}).`];
    if (legal) parts.push(`${legal.law_title} (${legal.boe_url}).`);
    parts.push(`Visto en CuentasClaras: ${window.location.href}`);
    try {
      await navigator.clipboard.writeText(parts.join(' '));
      setStatus('copied');
    } catch {
      setStatus('failed'); // el navegador no deja copiar (página sin https, permiso denegado…)
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <p className="cite">
      <button type="button" className="cite-button" onClick={copy}>
        Copiar el dato con su fuente
      </button>
      <span className="muted" role="status">
        {status === 'copied' && 'Copiado: ya puedes pegarlo.'}
        {status === 'failed' && 'El navegador no ha dejado copiar.'}
      </span>
    </p>
  );
}
