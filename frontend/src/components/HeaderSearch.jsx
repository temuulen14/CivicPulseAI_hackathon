import { useState } from 'react';

// Lupa de la cabecera. Al pulsarla se abre ahí mismo una caja para escribir; con Intro
// (o pulsando otra vez la lupa) se va a la página de resultados (#/buscar/becas).
// Escape, o pulsar fuera, la cierra.
export default function HeaderSearch({ active }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function close() {
    setOpen(false);
    setText('');
  }

  function submit(event) {
    event.preventDefault();
    if (!open) return setOpen(true);
    const clean = text.trim();
    if (clean.length >= 2) window.location.hash = `#/buscar/${encodeURIComponent(clean)}`;
    close();
  }

  // Se cierra al salir de la caja, salvo que el foco pase a la propia lupa.
  function onBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }

  return (
    <form className="header-search-form" role="search" onSubmit={submit} onBlur={onBlur}>
      {open && (
        <input
          type="search"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          placeholder="Becas, incendios…"
          aria-label="Buscar en los Presupuestos del Estado"
          maxLength={80}
        />
      )}
      <button
        type="submit"
        className="header-search"
        aria-label="Buscar en los Presupuestos"
        title="Buscar"
        aria-expanded={open}
        aria-current={active ? 'page' : undefined}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
        </svg>
      </button>
    </form>
  );
}
