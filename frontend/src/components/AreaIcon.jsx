// Un dibujo sencillo por ámbito, para las banderas del mapa. La clave es el campo `icon`
// que da la API en /areas (shield = Defensa, leaf = Medio ambiente…).
// Son trazos de línea en una cuadrícula de 24×24, escritos a mano: no hace falta librería de iconos.
const PATHS = {
  landmark: 'M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M3 10l9-6 9 6z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  siren: 'M7 18v-6a5 5 0 0 1 10 0v6M5 21h14v-3H5zM12 2v2M4.5 5.5L6 7M19.5 5.5L18 7',
  briefcase: 'M3 8h18v11H3zM9 8V5h6v3M3 13h18',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-13 15zM5 19l8-8',
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  'heart-pulse': 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11zM7 12h3l1.5-2.5 2 4 1-1.5H17',
  palette: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', // una nota musical: ocio y cultura
  'graduation-cap': 'M2 9l10-5 10 5-10 5zM6 11.5V16c2 2 10 2 12 0v-4.5M22 9v6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2.5.6 4 2.4 4 5.5',
};
const FALLBACK = 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'; // un círculo, si llega un icono que no conocemos

// Acepta x, y, width y height para poder colocarlo también dentro de otro SVG (el mapa).
export default function AreaIcon({ name, size = 20, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name] ?? FALLBACK} />
    </svg>
  );
}
