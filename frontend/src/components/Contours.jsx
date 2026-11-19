// Curvas de nivel muy tenues detrás de la cifra de la portada: el toque "sostenible"
// del diseño, sin imágenes. Se calculan una vez: anillos irregulares concéntricos,
// suavizados con curvas de Bézier (Catmull-Rom). Es decoración pura (aria-hidden).

function ring(k) {
  const points = [];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wobble = 1 + 0.08 * Math.sin(angle * 3 + k * 0.7) + 0.05 * Math.cos(angle * 2 - k);
    const r = 34 + k * 30;
    points.push([300 + Math.cos(angle) * r * 1.35 * wobble, 170 + Math.sin(angle) * r * wobble]);
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < steps; i++) {
    const p0 = points[(i - 1 + steps) % steps];
    const p1 = points[i];
    const p2 = points[(i + 1) % steps];
    const p3 = points[(i + 2) % steps];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const RINGS = Array.from({ length: 7 }, (_, k) => ring(k));

export default function Contours() {
  return (
    <svg className="hero-contours" viewBox="0 0 600 340" aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      {RINGS.map((d, k) => (
        <path key={k} d={d} fill="none" stroke="var(--forest)" strokeOpacity={0.16 - k * 0.015} strokeWidth="1" />
      ))}
    </svg>
  );
}
