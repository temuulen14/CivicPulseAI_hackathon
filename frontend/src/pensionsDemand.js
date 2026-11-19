// Demanda de pensiones: cuántas personas las cobran y cuántas tienen 65 años o más.
// Cifras oficiales de Eurostat, descargadas de su API el 19-11-2026 (consultas exactas abajo).
// Van aquí y no en data/ porque se añadieron a última hora desde el frontend; lo ideal es
// que el pipeline de Mario las incorpore a dataset.json y el backend las sirva.
//
// - Pensionistas de jubilación y supervivencia (viudedad y orfandad), sin contar dos veces a quien
//   cobra ambas: spr_pns_ben, spdepb=OLD_SRV, sex=T, spdepm=TOTAL, unit=PER, geo=ES.
//   Es la población que cubre el gasto en "Vejez" + "Supervivientes" de la COFOG.
// - Población de 65 años o más a 1 de enero: demo_pjanbroad, age=Y_GE65, sex=T, unit=NR, geo=ES.

export const PENSIONERS_SOURCE = {
  name: 'Eurostat · Beneficiarios de pensiones por tipo (spr_pns_ben)',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/spr_pns_ben/default/table',
};

export const POPULATION_SOURCE = {
  name: 'Eurostat · Población a 1 de enero por grandes grupos de edad (demo_pjanbroad)',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/demo_pjanbroad/default/table',
};

export const PENSIONERS = {
  2015: 8318719,
  2016: 8420489,
  2017: 8522346,
  2018: 8638098,
  2019: 8738701,
  2020: 8768847,
  2021: 8876944,
  2022: 8969227,
  2023: 9097763,
  2024: 9259549,
};

export const POPULATION_65 = {
  2015: 8564614,
  2016: 8664203,
  2017: 8784299,
  2018: 8918454,
  2019: 9056923,
  2020: 9211438,
  2021: 9311484,
  2022: 9481808,
  2023: 9687776,
  2024: 9928368,
  2025: 10178625,
};

// Ámbitos COFOG que pagan estas pensiones (dentro de Protección social).
export const PENSION_AREAS = ['GF1002', 'GF1003'];
