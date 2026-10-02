// app/data/spanish-villain-aliases.ts
//
// Datos de la CAPA DE INTERFAZ (mismo criterio que `spanish-hero-aliases.ts`,
// D-05 de la Fase 6): indexados por el `id` del catálogo (p. ej. `rhino`),
// versionados por commit, y NUNCA entran en `content/marvel-characters.json`
// ni en el generador (`scripts/catalogue/`). Un villano SIN entrada aquí (o
// con entrada vacía) cae a su nombre de catálogo y nada rompe — ver
// `resolveVillainSpanishName` en `app/composables/useHeroSearch.ts`.
//
// Origen: petición del usuario del 2026-10-02: «Supongo que tener las dos
// opciones; yo los conozco a todos por su nombre en inglés pero alguna vez
// alguien puede pedírtelo en español y no encontrarlo». Fuente de los
// nombres: API pública española de MarvelCDB, cartas de villano de
// fase I, consultada el 2026-10-02; Encantadora y Loki, confirmados en la
// misma base de datos el 2026-10-01.
//
// PENDIENTE: LAS 12 FILAS quedan sin contrastar por el usuario con las cartas
// físicas del grupo, como se hizo con los héroes en la revisión D-07.
export const spanishVillainAliases: Record<string, string> = {
  'rhino': 'Rino',
  'klaw': 'Klaw',
  'kang': 'Kang',
  'ultron': 'Ultrón',
  'enchantress': 'Encantadora',
  'loki': 'Loki',
  'crossbones': 'Calavera',
  'absorbing-man': 'Hombre Absorbente',
  'taskmaster': 'Supervisor',
  'zola': 'Zola',
  'red-skull': 'Cráneo Rojo',
  'brigada-de-demolicion': 'Brigada de Demolición',
}

// Para todos los villanos el rótulo inglés ES el nombre del catálogo, salvo
// para el único cuyo nombre de catálogo ya está en español: la Brigada de
// Demolición, cuyo rótulo inglés no puede salir del catálogo.
export const englishVillainNameOverrides: Record<string, string> = {
  'brigada-de-demolicion': 'The Wrecking Crew',
}
