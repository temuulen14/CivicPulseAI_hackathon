import { useRef, useState } from 'react';

// Resaltado al pasar el ratón por un diagrama de flujo (BudgetSankey y TaxSankey).
// `active` es la clave del nodo resaltado, o null si no hay ninguno.
// Entre dos cintas hay huecos vacíos. Si el resaltado se apagara al instante, al cruzar un
// abanico de cintas parpadearía (una, nada, otra, nada…). Por eso resaltar (`show`) es
// inmediato y apagar (`hideSoon`) espera un momento: si antes se entra en otra cinta, no
// llega a apagarse.
export function useHighlight() {
  const [active, setActive] = useState(null);
  const timer = useRef(null);
  const show = (key) => {
    clearTimeout(timer.current);
    setActive(key);
  };
  const hideSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(null), 300);
  };
  // Ratón y teclado resaltan lo mismo; al quitar el foco se apaga.
  const hover = (key) => ({
    onMouseEnter: () => show(key),
    onFocus: () => show(key),
    onBlur: () => show(null),
  });
  return { active, show, hideSoon, hover };
}
