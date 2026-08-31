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
    <div id="app-root">
      <!--
        Banda de "versión nueva" (OFF-04, D-01/D-02/D-03): se monta aquí y no
        dentro de la pantalla de juego porque una versión nueva puede
        detectarse en cualquier pantalla, incluido el selector — app.vue es
        el único punto compartido por las dos rutas (no hay app/layouts/ en
        este proyecto). Envuelta en ClientOnly para evitar el parpadeo de
        hidratación (mismo patrón que app/pages/[game]/index.vue), ya que
        $pwa solo existe en el cliente.
      -->
      <ClientOnly>
        <UpdateBanner />
      </ClientOnly>
      <NuxtPage />
    </div>
  </div>
</template>
