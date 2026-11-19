import { useState } from 'react';

// Caja de búsqueda de los Presupuestos. Al enviar solo cambia la URL (#/buscar/becas):
// la página de resultados lee de ahí el texto, así que cualquier búsqueda se puede
// enlazar y funciona el botón «atrás».
export default function SearchBox({ initial = '' }) {
  const [text, setText] = useState(initial);

  function submit(event) {
    event.preventDefault();
    const clean = text.trim();
    if (clean.length >= 2) window.location.hash = `#/buscar/${encodeURIComponent(clean)}`;
  }

  return (
    <form className="search-box" role="search" onSubmit={submit}>
      <label className="field-input">
        <span className="visually-hidden">Buscar en los Presupuestos del Estado</span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Becas, meteorología, Guardia Civil, incendios…"
          minLength={2}
          maxLength={80}
        />
      </label>
      <button type="submit" className="button-link">
        Buscar
      </button>
    </form>
  );
}
