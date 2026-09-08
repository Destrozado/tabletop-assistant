---
id: SEED-001
status: dormant
planted: 2026-09-08
planted_during: v1.8 — Phase 7 (ready to plan; Phase 6 completada 2026-09-08)
trigger_when: al cerrar el hito v1.8, antes de arrancar el siguiente (decisión explícita del usuario)
scope: small
---

# SEED-001: Caché local de la respuesta de MarvelCDB, para dejar de depender de la API viva

## Why This Matters

Hoy `scripts/catalogue/fetch-marvelcdb.mjs` es la única puerta al catálogo y **tira
de red cada vez**. Eso tiene tres costes:

1. **Cada campo nuevo cuesta una llamada a la API.** El script proyecta hoy solo 6
   campos de héroe y 4 de etapa de villano. Querer `cost`, `aspect`,
   `card_set_code`, `deck_limit`, `attack`, `thwart`, `defense`… obliga a volver a
   salir a internet y a reprocesar todo.
2. **La reproducibilidad declarada es más débil de lo que parece.** D-10 del script
   promete que «re-ejecutarlo sin que MarvelCDB haya cambiado nada deja el diff
   vacío» — pero eso depende de que la API no se mueva, no del repo. Con una caché
   la promesa pasa a depender solo de ficheros versionados.
3. **Sin caché no hay diff legible** cuando MarvelCDB corrige una cifra: se ve el
   resultado proyectado cambiando, no el dato de origen.

## When to Surface

**Trigger:** al terminar el hito v1.8 (el usuario lo pidió explícitamente para
después del hito, no durante).

**Nota de coste de ese timing:** la Fase 8 («Valores conocidos dentro del paso») es
justo la primera que va a querer más cifras del catálogo (tamaño de mano por cara,
etc.). Hacer esto *después* del hito implica volver a la API una vez más durante la
Fase 8. Es una decisión consciente del usuario, no un descuido: el orden natural
técnico habría sido antes de la Fase 8.

**No toca la Fase 7:** esa fase no roza ni el script ni el catálogo, solo consume
cifras ya committeadas.

## Scope Estimate

**Small** — un `/gsd:quick`: cambio en un script, un fichero de caché, un gate de
CI nuevo y un flag `--refresh`. Lo que no es pequeño es **la decisión** de la
sección siguiente: eso hay que cerrarlo antes de escribir código.

## La decisión abierta (esto es el nudo, no un detalle)

Hay dos variantes sobre la mesa y **compran cosas distintas**:

| Variante | Qué compra | Qué cuesta |
|---|---|---|
| **A. Caché committeada** (respuesta completa menos blacklist) | Reproducibilidad real (depende solo del repo) + diff legible cuando MarvelCDB cambia una cifra + no volver a la API | Mete datos de MarvelCDB en un repo público; obliga a un gate anti-copyright nuevo |
| **B. Caché local ignorada** (SQLite o JSON en `.gitignore`) | Solo comodidad local: no re-llamar a la API desde mi máquina | **No** da reproducibilidad ni diffs — los dos beneficios 2 y 3 del «Why» desaparecen |

Es decir: **la variante B no es una versión más segura de A, es una idea distinta.**
Si lo que se quiere de verdad es el punto 2 y el 3, tiene que estar en el repo.

### Sobre «cifrado con contraseña pero committeado»

Idea del usuario para que «no se pierda». Reservas a valorar en frío:

- En un repo **público** que se despliega en Vercel, un blob cifrado sigue siendo
  redistribución, solo ofuscada. No mejora la posición legal declarada en
  `CLAUDE.md` §Constraints, la disimula.
- La contraseña no puede vivir en el repo ni cerca de la app, así que en la práctica
  vive en la cabeza del usuario → si el objetivo era «que no se pierda», el punto
  único de fallo se mueve de un fichero a una contraseña.
- **Ya hay precedente en este repo para esta forma exacta de problema:**
  `reference/*.pdf` está en `.gitignore` con un `reference/README.md` committeado
  que explica de dónde sacarlo (es el Rules Reference v1.7). Mismo patrón aquí:
  artefacto local ignorado + README versionado.
- La durabilidad se resuelve **fuera** del repo público (repo o gist privado,
  respaldo propio), no con cifrado dentro de él.

### CONFLICTO SIN RESOLVER: la blocklist ya prohíbe parte del botín

Si se va por la variante A y se extiende el guardarraíl al fichero nuevo —que hay
que hacerlo, o la caché se convierte en la puerta trasera por la que entra justo lo
que el gate existe para impedir— **el gate falla el primer día**:

- La blocklist real de CI son **20 claves**, no 5
  (`engine/__tests__/characters.test.ts:60-80`): `text`, `real_text`, `flavor`,
  `traits`, `real_traits`, `back_text`, `back_flavor`, `back_name`, `imagesrc`,
  `backimagesrc`, `illustrator`, `octgn_id`, `url`, `meta`, `subname`, `boost`,
  `deck_requirements`, `deck_options`, `restrictions`, `errata`.
- Entre ellas están **`traits`, `real_traits` y `boost`** — y `traits` es uno de los
  campos que motivan la caché.

Hay que elegir a sabiendas:

1. **Dos gates con listas distintas**, argumentando por qué `traits` («Vengador.
   Genio.») es dato factual corto y no texto de carta, mientras `text`/`flavor` sí lo
   son. Exige justificar la asimetría por escrito, no solo cambiar el array.
2. **Misma lista en los dos**, y renunciar a `traits`/`boost` en la caché. Más simple
   y más defendible; la caché sigue valiendo para `cost`, `aspect`, `card_set_code`,
   `deck_limit`, `attack`, `thwart`, `defense`.

Recomendación de partida: la 2, y si algún día hace falta `traits`, tratarlo como una
decisión aparte con su propio argumento.

## Cómo se haría (variante A, si es la elegida)

- Guardar la respuesta completa **menos** blacklist, en vez de proyectar lista blanca
  al vuelo.
- El generador **lee de la caché por defecto**; solo sale a la red con `--refresh`
  explícito. Refuerza D-06 (nada de red en `build`/CI/Vercel).
- Extender el guardarraíl anti-copyright al fichero de caché, no solo a
  `content/marvel-characters.json`.
- Mantener la salida determinista (D-10): sin marcas temporales dentro del fichero.
- `content/marvel-characters.json` sigue siendo la única fuente que consume la app;
  la caché es material de generación, no contenido de runtime.

## Breadcrumbs

- `scripts/catalogue/fetch-marvelcdb.mjs` — el único escritor del catálogo (D-09);
  CAT-04 y la lista blanca están documentados en su cabecera (líneas 26-36).
- `engine/__tests__/characters.test.ts:60-80` — la blocklist de 20 claves y el gate
  sobre el string crudo.
- `engine/__tests__/catalogueSchema.test.ts` — `strictObject`: una clave desconocida
  lanza ZodError.
- `content/marvel-characters.json` — la salida proyectada actual.
- `reference/README.md` + `.gitignore` (`reference/*.pdf`) — el precedente de
  «artefacto local ignorado + README versionado».
- `.planning/ROADMAP.md:99-111` — Fase 8, la primera que pedirá más cifras.
- `CLAUDE.md` §Constraints — la restricción legal que gobierna toda esta decisión.

## Notes

Capturado a partir de una conversación de reglas que derivó en esto. La variante
committeada y las reservas sobre el cifrado vienen de análisis; la variante SQLite
ignorada y el timing post-hito son petición explícita del usuario. Nada de esto está
decidido todavía: el seed existe para que la decisión se tome con los tres datos
delante (qué compra cada variante, el precedente del PDF, y el choque con la
blocklist), no para prescribir una.
