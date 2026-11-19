// Escala de magnitud de 5 pasos (un solo tono verde, de claro a oscuro), validada con la
// skill dataviz. Se asigna por la cuota del gasto total, no por la posición en el ranking,
// para que el color signifique lo mismo en cualquier año. Texto blanco en los 3 más oscuros.
export const SHARE_STEPS = [
  { min: 25, fill: '#063323', ink: '#ffffff', label: '25 % o más' },
  { min: 10, fill: '#165c42', ink: '#ffffff', label: '10–25 %' },
  { min: 5, fill: '#2a7a5a', ink: '#ffffff', label: '5–10 %' },
  { min: 2, fill: '#4b9776', ink: '#191b18', label: '2–5 %' },
  { min: -Infinity, fill: '#74b598', ink: '#191b18', label: 'Menos del 2 %' },
];

export function shareStep(share) {
  return SHARE_STEPS.find((s) => (share ?? 0) >= s.min);
}
