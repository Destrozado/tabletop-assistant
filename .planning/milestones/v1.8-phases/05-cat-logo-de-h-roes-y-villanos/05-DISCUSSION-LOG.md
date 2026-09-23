# Phase 5: Catálogo de héroes y villanos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 5-Catálogo de héroes y villanos
**Areas discussed:** La lista exacta, Idioma de los nombres, Vida de villano en el fichero, Cifras mal y correcciones

---

## La lista exacta

### ¿El catálogo contiene solo lo que tenéis en casa, o todo lo que MarvelCDB conozca?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo lo vuestro | El selector muestra exactamente lo jugable; comprar una caja obliga a re-ejecutar el script y commitear | ✓ |
| Todo MarvelCDB, filtrar en la app | Comprar una caja no toca el repo, pero mete ~60 héroes en el bundle y exige una pantalla de "qué tengo" fuera de alcance | |
| Todo MarvelCDB, sin filtro | Más simple de código, peor en mesa: hay que recordar qué cajas tenéis | |

**User's choice:** Solo lo vuestro.

### ¿Cómo se declara en el script qué entra? (CAT-07 pide "una sola fila")

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Lista de ids de carta | Un array al principio del script; un héroe = una fila; diff legible | ✓ |
| Lista de códigos de pack | Comprar un Hero Pack = una fila, pero un pack entero entra sin decidirlo | |
| Fichero de datos aparte | Ceremonioso para ~26 filas; el script deja de ser autocontenido | |

**User's choice:** Lista de ids de carta.

### Si un id no aparece en MarvelCDB, ¿qué hace el script?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Aborta sin escribir nada | "Fail loudly": un catálogo incompleto pasaría el esquema Zod sin protestar | ✓ |
| Avisa y escribe lo encontrado | Tolerante, pero el héroe desaparece del selector en silencio | |
| Aborta + el test exige el recuento exacto | Cinturón y tirantes, pero comprar una caja obligaría a tocar también el test | |

**User's choice:** Aborta sin escribir nada.

### ¿Es a propósito que no haya ninguno de los 5 héroes del Core Set?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sí, los 18 son exactos | Tenéis el Core Set por los villanos pero no jugáis esos héroes | |
| No, faltan los 5 del Core Set | Serían 23 héroes; hay que actualizar CAT-01 y el criterio de éxito nº 1 | ✓ |
| No los tenemos, es otra caja | Los villanos vendrían de otro sitio | |

**User's choice:** No, faltan los 5 del Core Set.
**Notes:** El usuario dictó por escrito los 18 héroes de packs sueltos y los 3
villanos (Rhino, Kang, Ultron), excluyendo Klaw del Core Set a propósito. Al
señalársele que Rhino y Ultron son villanos del Core Set pero no aparecía ninguno
de sus 5 héroes, confirmó que faltaban. Recuento final: **23 héroes + 3 villanos**.
Esto convierte el "18" de `CAT-01` y del criterio de éxito nº 1 del roadmap en un
error de requisitos que hay que corregir antes de planificar.

---

## Idioma de los nombres

### ¿En qué idioma están las cartas físicas?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Español | Las cartas dicen "Hulka", "Capitán América" | ✓ |
| Inglés | Coincidirían con MarvelCDB y no habría nada que traducir | |
| Mezcladas | Cajas compradas en momentos distintos | |

**User's choice:** Español.

### ¿Qué nombre se guarda en el catálogo?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo el de MarvelCDB, tal cual | Una columna; script 100% reproducible; hay que traducir mentalmente en mesa | ✓ |
| MarvelCDB + etiqueta española a mano | El selector muestra español, pero el script debe preservar contenido escrito a mano | |
| Solo español, escrito a mano | El catálogo deja de ser regenerable; choca con CAT-03 | |

**User's choice:** Solo el de MarvelCDB, tal cual.
**Notes:** Elegida a sabiendas de que las cartas están en español — el usuario acepta
la fricción a cambio de reproducibilidad. Atenuante registrado durante la discusión:
los nombres de alter ego (Peter Parker, Carol Danvers, T'Challa) no se traducen, así
que el filtro por alter ego de SEL-05 seguirá funcionando; la fricción se limita a los
nombres de héroe.

---

## Vida de villano en el fichero

### ¿Cómo se guarda la vida del villano?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Base + flags, tal como lo da la API | `{health, healthPerHero, healthPerGroup}` por etapa; la app multiplica en Fase 7 | ✓ |
| Tabla ya calculada por etapa × jugadores | Se lee de un vistazo, pero ~36 números derivados y diffs ilegibles | |
| Las dos cosas | Dos representaciones del mismo hecho que pueden divergir | |

**User's choice:** Base + flags.

### Si las etapas de Kang no mapean limpiamente, ¿qué hace el script?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Aborta, como con un id que falta | Coherente con lo ya decidido; se decide con los datos delante | ✓ |
| Lo escribe con las etapas que encuentre | Kang entra parcial y el contador arranca mal | |
| Deja Kang para investigación | El script cubre Rhino y Ultron y Kang se modela en research | |

**User's choice:** Aborta.

---

## Cifras mal y correcciones

### ¿Dónde vive la corrección de un número equivocado?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Se arregla la regla del script | Sin overrides; el JSON es 100% derivado y nadie lo edita a mano | ✓ |
| Regla + bloque de overrides | Una fila por excepción que el script preserva al re-ejecutarse | |
| Editar el JSON a mano | Re-ejecutar lo pisa en silencio — el fallo que CAT-03/CAT-07 evitan | |

**User's choice:** Se arregla la regla del script.
**Notes:** Contexto dado antes de preguntar: el `hand_size` correcto está en la carta
de alter ego (`linked_card`), no en la de héroe, que expone un modificador de habilidad
con el mismo nombre de campo (Iron Man 1 vs. Tony Stark 6). Esta decisión obliga a que
el script lea el `linked_card` en vez de parchear el número después.

### ¿El fichero lleva metadatos de generación?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Determinista puro, sin fecha | Re-ejecutar sin cambios deja `git diff` vacío; la fecha la guarda el commit | ✓ |
| Con `generatedAt`, como el manifiesto de voz | Cada ejecución produce diff aunque no cambie ningún dato | |
| Determinista + versión de los packs | Sin fecha pero con constancia de la fuente dentro del fichero | |

**User's choice:** Determinista puro, sin fecha.

---

## Claude's Discretion

El usuario no quiso discutir, y quedan a criterio de research/planning (detalle en
CONTEXT.md `<decisions>` § Claude's Discretion):

- Nombre y ubicación del fichero de catálogo, y si es uno o dos ficheros.
- Nombre y ubicación del script de generación.
- Qué cifras de héroe entran además de las que exige CAT-01.
- Forma exacta del guardarraíl anti-copyright de CAT-04 (que exista no es discrecional).
- Estructura del esquema Zod (fichero nuevo vs. ampliar `engine/schema.ts`).
- Cómo se documenta el procedimiento de CAT-03/CAT-07.

## Deferred Ideas

- **Alias en español para el filtro de héroes** — para la Fase 6, y solo si molesta en
  mesa; viviría en la capa de UI, nunca en el catálogo.
- **Catálogo completo de MarvelCDB + pantalla de "qué cajas tengo"** — descartado para
  v1.8 por D-01; reconsiderable en un hito posterior.
- **UI para añadir o editar héroes desde la app** — sigue explícitamente fuera de
  alcance (Pitfall 14; exclusión permanente "editor de juegos desde la web").
