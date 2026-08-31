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
    <div id="app-root" class="portrait:hidden">
      <NuxtPage />
    </div>

    <!--
      Guardia de orientación (UI-04): puramente CSS, sin JS.
      La visibilidad la decide solo la variante `portrait:` de Tailwind:
      `#app-root` se oculta en vertical, este overlay se muestra en su lugar.
      Nada se reorganiza porque la app entera queda oculta.
    -->
    <div
      id="orientation-guard"
      class="hidden portrait:flex bg-background text-primary-text fixed inset-0 flex-col items-center justify-center gap-md p-lg"
    >
      <h1 class="text-heading font-bold text-primary-text text-center">
        Girad la tablet
      </h1>
      <p class="text-body font-normal text-secondary-text text-center max-w-[400px]">
        Esta aplicación se usa en horizontal.
      </p>
    </div>
  </div>
</template>
