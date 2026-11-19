import Segmented from './Segmented.jsx';
import { MEASURE_SWITCH } from '../measures.js';

// Interruptor euros / % del PIB. Va junto a cada gráfico o tabla cuyas cifras cambian
// con la medida. La elección se guarda en App, así que vale igual en toda la web.
export default function MeasureSwitch({ value, onChange }) {
  return (
    <div className="measure-switch">
      <span className="measure-switch-label">Ver en</span>
      <Segmented label="Ver las cifras en" options={MEASURE_SWITCH} value={value} onChange={onChange} />
    </div>
  );
}
