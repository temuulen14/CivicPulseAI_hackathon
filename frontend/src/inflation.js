// Inflación de España: Índice de Precios de Consumo Armonizado (IPCA), media anual.
// Cifras oficiales de Eurostat, descargadas de su API el 19-11-2026 con esta consulta:
//   prc_hicp_aind, coicop=CP00 (todos los bienes y servicios), geo=ES,
//   unit=INX_A_AVG (índice, 2015 = 100) y unit=RCH_A_AVG (variación anual, %).
// Van aquí y no en data/ porque se añadieron a última hora desde el frontend (igual que
// pensionsDemand.js); lo ideal es que el pipeline de Mario las incorpore y el backend las sirva.

export const INFLATION_SOURCE = {
  name: 'Eurostat · IPCA, media anual (prc_hicp_aind)',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table',
};

// Índice de precios: 2015 = 100. 126,65 en 2025 quiere decir que lo que costaba 100 € en 2015
// costaba 126,65 € en 2025.
export const PRICE_INDEX = {
  2014: 100.63,
  2015: 100.0,
  2016: 99.66,
  2017: 101.69,
  2018: 103.46,
  2019: 104.26,
  2020: 103.91,
  2021: 107.04,
  2022: 115.95,
  2023: 119.89,
  2024: 123.33,
  2025: 126.65,
};

// Inflación de cada año: cuánto subieron los precios frente al año anterior, en %.
export const INFLATION_PCT = {
  2014: -0.2,
  2015: -0.6,
  2016: -0.3,
  2017: 2.0,
  2018: 1.7,
  2019: 0.8,
  2020: -0.3,
  2021: 3.0,
  2022: 8.3,
  2023: 3.4,
  2024: 2.9,
  2025: 2.7,
};

// Pasa euros de un año a euros de otro con el índice de precios:
// 100 € de 2015 son 100 × 123,33 / 100 = 123,33 € de 2024.
export function toEurosOf(value, fromYear, toYear) {
  const from = PRICE_INDEX[fromYear];
  const to = PRICE_INDEX[toYear];
  if (value == null || !from || !to) return null;
  return (value * to) / from;
}
