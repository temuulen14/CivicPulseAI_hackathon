// Un icono por ámbito. La clave es el campo `icon` que da la API en /areas.
// Son dibujos de línea fina en una cuadrícula de 24×24: solo el contorno, sin relleno, con
// el mismo grosor y las puntas redondeadas en todos, para que se lean como una familia.
// Cada `d` puede llevar varios trazos seguidos (cada «M» empieza uno nuevo).
const PATHS = {
  // Servicios públicos generales: un edificio con columnas
  landmark: 'M4 10l8-6 8 6zM6.5 10v7M10.2 10v7M13.8 10v7M17.5 10v7M3.5 20h17',
  // Defensa: un escudo
  shield: 'M12 3l7 2.8V11c0 4.6-2.9 8.1-7 10-4.1-1.9-7-5.4-7-10V5.8z',
  // Orden público y seguridad: la balanza de la justicia
  siren: 'M12 4v16M8 20h8M5.5 7h13M5.5 7L3 13.5a2.6 2.6 0 0 0 5 0zM18.5 7L16 13.5a2.6 2.6 0 0 0 5 0z',
  // Asuntos económicos: un maletín
  briefcase: 'M5 7.5h14a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2zM9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18',
  // Protección del medio ambiente: una hoja
  leaf: 'M19 5C10 5 6 9.5 6 17c7.5 0 13-4 13-12zM4 20l9-9',
  // Vivienda y servicios comunitarios: una casa
  home: 'M3.5 11.5L12 4l8.5 7.5M6 9.5V20h12V9.5M10 20v-5.5h4V20',
  // Sanidad: la cruz sanitaria
  'heart-pulse': 'M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z',
  // Ocio, cultura y religión: una nota musical
  palette: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  // Educación: un birrete
  'graduation-cap': 'M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.3c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.3M21.5 9.5v5',
  // Protección social: un paraguas
  users: 'M3 12a9 9 0 0 1 18 0zM12 12v6a2.5 2.5 0 0 1-5 0M12 3V2',
};
const FALLBACK = 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'; // un círculo, si llega un icono que no conocemos

// Acepta x, y, width y height para poder colocarlo también dentro de otro SVG (el mapa).
export default function AreaIcon({ name, size = 20, ...rest }) {
  return (
    <svg
      className="area-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name] ?? FALLBACK} />
    </svg>
  );
}
