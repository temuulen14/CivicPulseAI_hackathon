// Textos de los Gobiernos para los Presupuestos. Solo describen: no se suma ni se valora
// nada por Gobierno ni por partido (ver data/README.md).

// "Pedro Sánchez Pérez-Castejón" -> "Sánchez" (primer apellido: el nombre de pila va delante).
const surname = (president) => president.split(' ')[1] ?? president;

export const partiesText = (parties) =>
  parties.length > 1 ? `${parties.slice(0, -1).join(', ')} y ${parties[parties.length - 1]}` : parties[0];

export const governmentLabel = (g) => `${surname(g.president)} (${partiesText(g.parties)})`;
