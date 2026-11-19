// Control segmentado: botones que se excluyen entre sí (vista, medida, orden).
// aria-pressed indica cuál está activo a los lectores de pantalla.
export default function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
