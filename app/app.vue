<template>
  <div>
    <!--
      Rule 2 (04-02): componente que inyecta `<link rel="manifest">` apuntando
      a manifest.webmanifest. @vite-pwa/nuxt lo registra como componente
      auto-importado pero NO lo coloca solo en ningún sitio — sin esta línea
      el navegador no descubre el manifiesto y Chrome nunca ofrece instalar la
      app, con independencia de que el manifiesto tenga `icons` bien
      declarados (04-RESEARCH.md/documentación oficial del módulo). No
      renderiza nada visualmente.
    -->
    <NuxtPwaManifest />
    <!--
      Franja de avisos EN FLUJO (quick 260923-3rm, cierre de WR-04/WR-05
      ronda 4; sustituye el mecanismo `fixed` de 09-22 conservando su
      propiedad — ver la re-comprobación de WR-05(b) en deferred-items.md):
      `#app-root` es una columna `h-dvh flex flex-col` con DOS hijos, en
      este orden de prioridad EXPLÍCITO — versión nueva primero, aviso de
      registro debajo, porque una versión nueva es la más urgente de
      atender y no debe quedar tapada por el aviso transitorio de registro:

      1. Un contenedor `shrink-0 flex flex-col` con `UpdateBanner` y
         `HistorySavedNotice` EN FLUJO, uno debajo del otro — si las dos
         bandas están visibles a la vez, se APILAN en la franja en vez de
         superponerse en el mismo rectángulo (WR-04 ronda 4): ninguna tapa a
         la otra, las dos son visibles y pulsables a la vez.
      2. Un envoltorio `flex-1 min-h-0` que contiene solo `<NuxtPage/>`: la
         página ocupa el RESTO de la altura del viewport, así que la franja
         de avisos RESTA su altura real en vez de sumarla — ninguna pantalla
         `h-full` (antes `h-dvh`) queda empujada fuera del viewport mientras
         haya una banda visible (WR-05(b), cierre estructural que sustituye
         al `fixed`+`pointer-events` de 09-22), y ningún toque sobre la
         franja atraviesa hacia un control oculto de la pantalla de debajo
         (WR-05 ronda 4, la cabecera `h-16` de /historico ya no queda tapada
         por nada: la franja le resta altura, no se superpone).

      `ClientOnly` sigue envolviendo las dos bandas para evitar el parpadeo
      de hidratación ($pwa y la variante de HistorySavedNotice solo existen
      en el cliente) — mismo motivo que antes, el mecanismo que cambia es
      solo el de maquetación, no el de montaje.

      Los diálogos de pantalla completa (GameOutcomeDialog, WarningDetailModal,
      ConfirmDialog, VillainPickerModal, PlayerModal, IndexOverlay, capa 50;
      ResumePrompt/ContentChangedNotice, capa 40) siguen pintando POR ENCIMA
      de esta franja sin depender de en qué orden del DOM se monten: viven
      dentro de `<NuxtPage/>` (posicionados con `fixed inset-0`), así que su
      capa de apilamiento los saca por completo del flujo de la franja —a
      diferencia de UpdateBanner/HistorySavedNotice, que SÍ dependen del
      orden del DOM entre sí porque ninguna de las dos usa posicionamiento.
    -->
    <div id="app-root" class="h-dvh flex flex-col">
      <div class="shrink-0 flex flex-col">
        <ClientOnly>
          <UpdateBanner />
          <HistorySavedNotice />
        </ClientOnly>
      </div>
      <div class="flex-1 min-h-0">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
