// app/data/spanish-hero-aliases.ts
//
// D-05 de la Fase 6 (`06-CONTEXT.md`) — este mapa son datos de la CAPA DE
// INTERFAZ, versionados por commit, y NUNCA entran en
// `content/marvel-characters.json`, que sigue siendo 100% derivado del
// script generador del catálogo (D-09 de la Fase 5, ver
// `scripts/catalogue/`). La clave es el `id` del catálogo (p. ej.
// `spider-man`), nunca el nombre en inglés. Un héroe SIN entrada aquí (o con
// entrada de cadena vacía) cae a su nombre inglés del catálogo
// (`CatalogueHero.name`) y esto nunca rompe la lista ni el filtro — ver
// `resolveHeroSpanishName` en `app/composables/useHeroSearch.ts`.
//
// Revisión humana D-07 — hecha el 2026-09-08.
// El usuario contrastó las 23 filas contra las cartas físicas del grupo y las
// aprobó, con una sola corrección: `she-hulk` pasa de «She-Hulk» a «Hulka»,
// que es lo que dice literalmente el lado de héroe de su carta (su alter ego,
// «Jennifer Walters», ya coincidía con el catálogo). Palabras suyas sobre esa
// fila: «me da igual She-hulk que Hulka, lo importante es saber a quién nos
// referimos» — se eligió «Hulka» por ser lo que se lee en la mesa, que es
// justo para lo que existe este mapa (D-06: el nombre español es el rótulo
// dominante de cada fila del modal). Las otras 22 quedaron tal cual se
// propusieron. Ya no hay nada pendiente de confirmar en este fichero.
export const spanishHeroAliases: Record<string, string> = {
  'spider-man': 'Spider-Man',
  'captain-marvel': 'Capitana Marvel',
  'she-hulk': 'Hulka',
  'iron-man': 'Iron Man',
  'black-panther': 'Pantera Negra',
  'captain-america': 'Capitán América',
  'ms-marvel': 'Ms. Marvel',
  'thor': 'Thor',
  'black-widow': 'Viuda Negra',
  'doctor-strange': 'Doctor Extraño',
  'hulk': 'Hulk',
  'ant-man': 'Ant-Man',
  'wasp': 'Avispa',
  'quicksilver': 'Mercurio',
  'scarlet-witch': 'Bruja Escarlata',
  'drax': 'Drax',
  'valkyrie': 'Valquiria',
  'vision': 'Visión',
  'nova': 'Nova',
  'storm': 'Tormenta',
  'deadpool': 'Masacre',
  'iceman': 'Hombre de Hielo',
  'jubilee': 'Jubilee',
}
