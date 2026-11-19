// Una función por endpoint de docs/API_CONTRACT.md.
// Si VITE_API_URL está vacía, devuelve los datos de ejemplo de mocks.js;
// si tiene valor (p. ej. http://localhost:8000/api), llama al backend con fetch.

import * as mocks from './mocks.js';
import * as budgetMocks from './mocksBudget.js';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const usingMocks = BASE_URL === '';

// Simula una pequeña espera para que también se vean los estados de carga.
function fromMocks(build) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(build());
      } catch (err) {
        reject(err);
      }
    }, 250);
  });
}

async function get(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const url = `${BASE_URL}${path}${query.size ? `?${query}` : ''}`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    // fetch solo falla así si no hay conexión con el servidor (apagado, URL mal escrita…)
    throw new Error('el servidor no responde. ¿Está arrancado el backend?');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : `Error ${response.status} al pedir ${path}`);
  }
  return response.json();
}

export function getMeta() {
  return usingMocks ? fromMocks(() => mocks.meta()) : get('/meta');
}

export function getAreas(year) {
  return usingMocks ? fromMocks(() => mocks.areas(year)) : get('/areas', { year });
}

export function getArea(id, year) {
  return usingMocks ? fromMocks(() => mocks.area(id, year)) : get(`/areas/${id}`, { year });
}

export function getAlerts({ year, severity, type } = {}) {
  return usingMocks ? fromMocks(() => mocks.alerts({ year, severity, type })) : get('/alerts', { year, severity, type });
}

export function getCompare({ area, year, countries } = {}) {
  return usingMocks ? fromMocks(() => mocks.compare({ area, year })) : get('/compare', { area, year, countries });
}

export function getSources() {
  return usingMocks ? fromMocks(() => mocks.sources()) : get('/sources');
}

// --- Presupuestos Generales del Estado (contrato v1.1) ---------------------
// Otra fuente: lo que la Ley presupuesta para el Estado central, en miles de euros.

export function getBudgetYears() {
  return usingMocks ? fromMocks(() => budgetMocks.budgetYears()) : get('/budget/years');
}

export function getBudget(year) {
  return usingMocks ? fromMocks(() => budgetMocks.budget(year)) : get('/budget', { year });
}

export function getBudgetPolicy(id, year) {
  return usingMocks ? fromMocks(() => budgetMocks.policy(id, year)) : get(`/budget/policies/${id}`, { year });
}

export function getBudgetProgram(programId, year) {
  return usingMocks ? fromMocks(() => budgetMocks.program(programId, year)) : get(`/budget/programs/${programId}`, { year });
}
