// Escala de magnitud de 5 pasos (un solo tono verde, de claro a oscuro), validada con la
// skill dataviz. Se asigna por la cuota del gasto total, no por la posición en el ranking,
// para que el color signifique lo mismo en cualquier año. Los colores son variables CSS
// (--seq-1 … --seq-5 en index.css) para que el modo oscuro tenga su propia escala validada.
export const SHARE_STEPS = [
  { min: 25, fill: 'var(--seq-5)', ink: 'var(--seq-ink-5)', label: '25 % o más' },
  { min: 10, fill: 'var(--seq-4)', ink: 'var(--seq-ink-4)', label: '10–25 %' },
  { min: 5, fill: 'var(--seq-3)', ink: 'var(--seq-ink-3)', label: '5–10 %' },
  { min: 2, fill: 'var(--seq-2)', ink: 'var(--seq-ink-2)', label: '2–5 %' },
  { min: -Infinity, fill: 'var(--seq-1)', ink: 'var(--seq-ink-1)', label: 'Menos del 2 %' },
];

export function shareStep(share) {
  return SHARE_STEPS.find((s) => (share ?? 0) >= s.min);
}
