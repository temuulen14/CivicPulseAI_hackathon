# Frontend · CuentasClaras

React + Vite + Recharts, en JavaScript y CSS normales.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

- Por defecto la app llama al backend real en `http://localhost:8000/api` (arráncalo antes).
- Otro backend: crea `frontend/.env.local` con `VITE_API_URL=<url>/api`.
- Sin backend: `VITE_API_URL=mocks` usa los datos de ejemplo (`src/mocks.js`), solo para desarrollar.

Registro de cambios explicado, paso a paso: [`CAMBIOS.md`](CAMBIOS.md).
