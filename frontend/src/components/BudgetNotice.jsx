// Aviso fijo en las páginas de Presupuestos: son otra fuente y otra cifra que el resto de
// la app (contrato v1.1). Sumarlas o compararlas con el gasto de Eurostat sería un error.
export default function BudgetNotice() {
  return (
    <p className="budget-notice">
      <strong>No es la misma cifra que la portada.</strong> Aquí está lo que <em>presupuesta</em> la Ley para el
      Estado central (y la Seguridad Social cuando la ley la incluye). La portada muestra lo que <em>gastan</em> todas
      las administraciones, también comunidades autónomas y ayuntamientos, según Eurostat. Por eso las cifras de un
      mismo tema son mucho menores aquí, y no se suman ni se comparan.
    </p>
  );
}
