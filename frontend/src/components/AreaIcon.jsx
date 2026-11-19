// Un emblema por ámbito para las banderas del mapa. La clave es el campo `icon` que da la
// API en /areas. Son siluetas macizas dibujadas a mano en una cuadrícula de 24×24, pensadas
// como los emblemas de una bandera y no como iconos de interfaz: cada una es una metáfora
// del ámbito (un paraguas para la protección social, una llave para la vivienda…).
// `fillRule="evenodd"` hace que una forma dibujada dentro de otra quede hueca (la puerta de
// la torre, los ojos de la máscara).
const PATHS = {
  // Servicios públicos generales: el sello de la Administración
  landmark: 'M12 2a4 4 0 0 0-2.5 7.1c.5.5.5 1.2.3 1.9L9 14H6a2 2 0 0 0-2 2v2h16v-2a2 2 0 0 0-2-2h-3l-.8-3c-.2-.7-.2-1.4.3-1.9A4 4 0 0 0 12 2zM4 20h16v2H4z',
  // Defensa: una torre almenada
  shield: 'M5 3h3v3h2.5V3h3v3H16V3h3v7l-2 2v9H7v-9L5 10zM10.5 21v-5a1.5 1.5 0 0 1 3 0v5z',
  // Orden público y seguridad: una placa con estrella
  siren: 'M12 2l8 3v6c0 5.5-3.4 9.3-8 11-4.6-1.7-8-5.5-8-11V5zM12 6.8L13 9.6L16 9.7L13.6 11.5L14.5 14.4L12 12.7L9.5 14.4L10.4 11.5L8 9.7L11 9.6z',
  // Asuntos económicos: un engranaje
  briefcase: 'M19.2 10.1L21.9 10.3L21.9 13.7L19.2 13.9L18.4 15.7L20.2 17.8L17.8 20.2L15.7 18.4L13.9 19.2L13.7 21.9L10.3 21.9L10.1 19.2L8.3 18.4L6.2 20.2L3.8 17.8L5.6 15.7L4.8 13.9L2.1 13.7L2.1 10.3L4.8 10.1L5.6 8.3L3.8 6.2L6.2 3.8L8.3 5.6L10.1 4.8L10.3 2.1L13.7 2.1L13.9 4.8L15.7 5.6L17.8 3.8L20.2 6.2L18.4 8.3zM12 8.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z',
  // Protección del medio ambiente: un árbol
  leaf: 'M12 2l6 8h-3l4 6h-5.5v6h-3v-6H5l4-6H6z',
  // Vivienda y servicios comunitarios: una llave
  home: 'M8 6a5 5 0 1 0 4.6 7H15v2h3v-2h1v3h3V9h-9.4A5 5 0 0 0 8 6zM7 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  // Sanidad: la cruz sanitaria
  'heart-pulse': 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  // Ocio, cultura y religión: una máscara de teatro
  palette: 'M4 4h16v7c0 5-3.5 9-8 9s-8-4-8-9zM7 9c1-1.2 3-1.2 4 0-1 .8-3 .8-4 0zM13 9c1-1.2 3-1.2 4 0-1 .8-3 .8-4 0zM8 13c1.5 3.5 6.5 3.5 8 0-2.5 1-5.5 1-8 0z',
  // Educación: un libro abierto
  'graduation-cap': 'M2 5c3.5-1 6.5-.6 9 1v14c-2.5-1.6-5.5-2-9-1zM22 5c-3.5-1-6.5-.6-9 1v14c2.5-1.6 5.5-2 9-1z',
  // Protección social: un paraguas
  users: 'M11 1.5h2v1h-2zM2.5 12a9.5 9.5 0 0 1 19 0c-1.6-1.6-4.7-1.6-6.3 0-1.6-1.6-4.8-1.6-6.4 0-1.6-1.6-4.7-1.6-6.3 0zM11 10.9h2V19a3 3 0 0 1-6 0v-1h2v1a1 1 0 0 0 2 0z',
};
const FALLBACK = 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'; // un círculo, si llega un icono que no conocemos

// Acepta x, y, width y height para poder colocarlo también dentro de otro SVG (el mapa).
export default function AreaIcon({ name, size = 20, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" fillRule="evenodd" aria-hidden="true" {...rest}>
      <path d={PATHS[name] ?? FALLBACK} />
    </svg>
  );
}
