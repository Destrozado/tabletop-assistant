# Phase 4: Instalación y funcionamiento offline — Discussion Log

**Date:** 2026-08-31
**Mode:** discuss (interactivo, sin flags)

> Registro para consulta humana. **No lo consumen los agentes downstream** — el
> artefacto canónico es `04-CONTEXT.md`.

## Áreas presentadas

Se ofrecieron cuatro. El usuario las seleccionó **todas**.

1. Aviso de versión nueva
2. Qué se precachea
3. Identidad instalada
4. Cómo verificamos lo offline

## Área 1 — Aviso de versión nueva

**P: Sale el aviso a mitad de partida y lo descartas. ¿Qué debería pasar después?**
- Opciones: no vuelve en toda la sesión (recomendada) · reaparece al cerrar cada
  ronda · se queda fijo hasta que decidas
- **Elegida:** no vuelve en toda la sesión → D-01

**P: Cuando pulsas "actualizar", ¿cuándo se aplica?**
- Opciones: al momento (recomendada) · al terminar la ronda en curso · tú decides
- **Elegida:** al momento → D-02

## Área 2 — Qué se precachea

**P: Los 37 audios (~650 KB), ¿entran en el precacheo del service worker?**
- Opciones: sí, todo al precacheo (recomendada) · no, solo al usarlos · tú decides
- **Elegida:** sí, todo al precacheo → D-04

**P: ¿Y la precarga de la 3.1 (`usePreloadedAudio`)?**
- Opciones: se queda como red de seguridad (recomendada) · se retira · tú decides
- **Elegida:** se queda → D-05
- Nota: el solape entre las dos capas es deliberado. Se registró en CONTEXT.md un
  aviso explícito para que nadie lo "simplifique" retirando una.

## Área 3 — Identidad instalada

Antes de preguntar se planteó la restricción legal: el icono no puede llevar arte
de Marvel Champions ni de Fantasy Flight → D-07.

**P: ¿De dónde sale el icono?**
- Opciones: generado con la tipografía del proyecto (recomendada) · emoji o
  símbolo renderizado · ya tengo una imagen
- **Elegida:** generado con la tipografía del proyecto → D-06

**P: ¿Forzamos orientación horizontal en el manifiesto?**
- Opciones: no forzarla (recomendada) · forzar horizontal · tú decides
- **Respuesta libre del usuario:** *"Te diria que no forcemos nada, si alguien la
  quiere usar en el movil que pueda hacerlo sin problemas, lo vera peor pero es un
  tema de espacio, yo no forzaria nada"* → D-08
- Consecuencia registrada: que la app se vea peor en móvil es aceptable y
  esperado. Queda **fuera de alcance** cualquier trabajo responsive en esta fase.

## Área 4 — Cómo verificamos lo offline

Se aportó como contexto que los 278 tests automáticos no cazaron el bug del audio
de esta misma sesión; hizo falta un dispositivo real.

**P: ¿Añadimos Playwright en esta fase?**
- Opciones: sí, una suite pequeña (recomendada) · no, a mano en la tablet · las
  dos cosas
- **Elegida:** sí, una suite pequeña → D-09

**P: ¿Cómo damos por bueno OFF-03?**
- Opciones: modo avión en la tablet a mitad de partida (recomendada) · basta con
  la prueba automatizada
- **Elegida:** modo avión en la tablet → D-10

## Decisiones arrastradas de fases anteriores (no se rediscutieron)

- `@vite-pwa/nuxt` con `registerType: 'prompt'`, nunca `'autoUpdate'`.
- Cabeceras de caché en `routeRules`, no en configuración del host — ya escritas
  en `nuxt.config.ts`.
- Build por `nuxt generate` (SSG).
- El patrón de banda descartable no modal ya existe (Fase 3, "sin voz española").

## Ideas aparcadas

- `IndexOverlay` sin cierre por Escape (de la quick 260831-g2s).
- El truco táctico de los Estados, que no cupo en el aviso.
- Modelo y SO de la tablet: bloqueante abierto desde la Fase 1.

## Aviso de alcance registrado

La verificación de OFF-02 y OFF-03 **no puede cerrarse** hasta que la Fase 03.1
complete sus 37 clips (hoy 9). Planificar y ejecutar la Fase 4 sí puede
adelantarse; darla por buena no.
