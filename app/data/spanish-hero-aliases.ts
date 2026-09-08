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
// ⚠ PENDIENTE DE REVISIÓN HUMANA (D-07, plan 06-03) ⚠
// Los alias de esta tabla los ha propuesto Claude a partir del nombre
// habitual en español de cada personaje de Marvel Comics. El usuario debe
// revisarlos contra las cartas físicas del grupo antes de darlos por
// definitivos — un alias equivocado solo cuesta una búsqueda fallida (nunca
// rompe nada), pero no son fiables hasta esa revisión. Las líneas marcadas
// con `// D-07: confirmar` son las que más dudas admiten (traducción no
// literal o variante conocida); las no marcadas coinciden con el nombre en
// inglés del catálogo y no necesitan confirmación. NO retirar esta marca de
// PENDIENTE: es el plan 06-03, no este fichero, quien la retira tras el
// veredicto del usuario.
export const spanishHeroAliases: Record<string, string> = {
  'spider-man': 'Spider-Man', // D-07: confirmar
  'captain-marvel': 'Capitana Marvel', // D-07: confirmar
  'she-hulk': 'She-Hulk', // D-07: confirmar
  'iron-man': 'Iron Man',
  'black-panther': 'Pantera Negra', // D-07: confirmar
  'captain-america': 'Capitán América', // D-07: confirmar
  'ms-marvel': 'Ms. Marvel', // D-07: confirmar
  'thor': 'Thor',
  'black-widow': 'Viuda Negra', // D-07: confirmar
  'doctor-strange': 'Doctor Extraño', // D-07: confirmar
  'hulk': 'Hulk',
  'ant-man': 'Ant-Man', // D-07: confirmar
  'wasp': 'Avispa', // D-07: confirmar
  'quicksilver': 'Mercurio', // D-07: confirmar
  'scarlet-witch': 'Bruja Escarlata', // D-07: confirmar
  'drax': 'Drax',
  'valkyrie': 'Valquiria', // D-07: confirmar
  'vision': 'Visión', // D-07: confirmar
  'nova': 'Nova',
  'storm': 'Tormenta', // D-07: confirmar
  'deadpool': 'Masacre', // D-07: confirmar
  'iceman': 'Hombre de Hielo', // D-07: confirmar
  'jubilee': 'Jubilee', // D-07: confirmar
}
