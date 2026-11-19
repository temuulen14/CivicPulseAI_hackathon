// Textos de severidad y tipo de aviso, en un solo sitio.
// Los textos informan sin acusar: un aviso "señala", no denuncia.
export const SEVERITY = {
  critical: { label: 'Importante', icon: '!!' },
  warning: { label: 'Merece una mirada', icon: '!' },
  info: { label: 'Para tu información', icon: 'i' },
};

export const ALERT_TYPES = {
  usage_mismatch: 'Gasto frente a uso',
  international_outlier: 'Comparación con la UE',
};

// Los nombres de ministerios y capítulos vienen en mayúsculas en el documento de Hacienda:
// "MINISTERIO DE SANIDAD" -> "Ministerio de sanidad". Se lee mejor y no grita.
export function sentenceCase(text) {
  if (!text) return text;
  const lower = text.toLocaleLowerCase('es-ES');
  return lower.charAt(0).toLocaleUpperCase('es-ES') + lower.slice(1);
}
