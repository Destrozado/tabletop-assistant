# Reglamentos de referencia

Documentos oficiales usados para contrastar la fidelidad del contenido, tal como
exige `CLAUDE.md` §Constraints ("el contenido de Marvel Champions debe contrastarse
con el Rules Reference oficial v17 antes de darse por bueno").

## Por que los PDF no estan versionados

`reference/*.pdf` esta en `.gitignore` **a proposito**. Este repositorio es publico
y se despliega en Vercel; subir el reglamento completo seria redistribuir material
con copyright, contra la restriccion legal del proyecto ("contenido de reglas para
uso privado del grupo; no se reproducen cartas, arte ni textos extensos con
copyright"). Las citas cortas y las referencias a pagina si son legitimas y son las
que viven en `content/marvel-champions.json` bajo la clave `citation`.

## Fichero esperado en local

| Fichero | Que es | De donde sale |
|---|---|---|
| `mc_rulesreference_v17-compressed.pdf` | Marvel Champions LCG — Rules Reference v1.7, 68 paginas | Descarga oficial de Fantasy Flight Games |

Si no lo tienes, descargalo de la pagina oficial del juego y deposítalo aqui con ese
nombre. Sin el, cualquier revision de fidelidad de reglas queda sin verificar.

## Como consultarlo

`pdftotext` (Homebrew) da texto plano buscable, que es mucho mas barato que leer el
PDF pagina a pagina:

```
pdftotext -layout reference/mc_rulesreference_v17-compressed.pdf /tmp/rr17.txt
grep -n -i "status card" /tmp/rr17.txt
```

El Rules Reference esta ordenado alfabeticamente por entrada, no por flujo de juego.
