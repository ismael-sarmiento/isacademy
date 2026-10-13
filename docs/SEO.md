# IsAcademy · Visibilidad en buscadores (SEO)

Última actualización: 2026-10-13

Objetivo: que IsAcademy aparezca cuando alguien busca **«Ismael Sarmiento»**, **«IsAcademy»** o lo que necesita
(«clases de Python online», «academia de programación online», «clases particulares de SQL», «ayuda TFG datos»…).

## Ya hecho en la web (F1.8)

| Medida | Por qué |
|---|---|
| Español por defecto; inglés solo con `?lang=en` o con el botón | Google navega en inglés: antes indexaba la versión inglesa |
| `hreflang` es/en/x-default, canonical y `og:locale` según el idioma | Cada idioma es una URL propia y Google no las mezcla |
| Texto en español escrito dentro de `index.html` (`tools/prerender.py`) | Bing y los buscadores con IA casi no ejecutan JavaScript |
| Título y descripción con palabras clave | Es lo primero que ve la gente en los resultados |
| Materias como encabezados `<h3>` y entradilla «Clases particulares online…» | Estructura clara de los temas |
| Datos estructurados: `EducationalOrganization` + catálogo de 9 cursos + fundador | Google entiende qué es la academia y qué enseña |
| `sitemap.xml` con las dos versiones | Para darlo de alta en Search Console |
| Web rápida, móvil, HTTPS, sin errores | Requisitos básicos de Google |

> Las preguntas frecuentes no llevan marcado `FAQPage`: Google retiró esos resultados enriquecidos en mayo de 2026.
> Su texto sí está en el HTML, que es lo que cuenta.

## Lo que depende del propietario (por orden de impacto)

1. **Google Search Console** (imprescindible, gratis)
   - https://search.google.com/search-console → «Añadir propiedad» → **Prefijo de URL** → `https://ismael-sarmiento.github.io/isacademy/`.
   - Método de verificación: **Etiqueta HTML**. Pasa la línea `<meta name="google-site-verification" …>` y la añadimos.
   - Después: *Sitemaps* → `sitemap.xml` → Enviar. Y *Inspección de URL* → «Solicitar indexación».
2. **Ficha de Google Business** (cuando haya teléfono): negocio «sin dirección, de área de servicio» (clases online).
   Es lo que más ayuda en búsquedas tipo «academia de programación». Pedir a los alumnos **reseñas en Google**.
3. **Dominio propio** (`isacademy.es` u otro, ~10 €/año): más confianza y mejor posicionamiento a largo plazo.
   Si se compra: *Settings → Pages → Custom domain*, actualizar URLs absolutas (canonical, og, JSON-LD, sitemap,
   hreflang) y regenerar el QR (`assets/brand/print/README.md`).
4. **Enlaces hacia la web** (Google los valora mucho):
   - LinkedIn: sección *Destacados* y web de contacto del perfil.
   - GitHub: README del perfil `ismael-sarmiento`.
   - Web personal `ismael-sarmiento.github.io`: enlace a la academia.
   - Perfiles de profesor (tusclasesparticulares, Superprof…): campo «web» si lo permiten.
   - Tablones de universidades y carteles con el QR.
5. **Bing Webmaster Tools** (https://www.bing.com/webmasters): se puede importar desde Search Console.
6. **Contenido** (fase futura): artículos o páginas por tema que la gente busca, p. ej. «Cómo usar IA gratis en tu
   ordenador», «Cómo preparar un TFG de datos», «Python desde cero: por dónde empezar». Cada página es una puerta
   de entrada más desde Google.

## Palabras clave objetivo

clases de programación online · academia de programación online · clases de Python online · profesor de Python ·
clases particulares de SQL · clases de inteligencia artificial · curso de Big Data / Spark · Data Engineering ·
ayuda TFG / TFM informática · orientación profesional datos · IsAcademy · Ismael Sarmiento

## Mantenimiento

Antes de cada publicación: `tools/bump-version.sh <versión>` y, con la web servida en local
(`python3 -m http.server 8766`), `python3 tools/prerender.py`. Actualizar `<lastmod>` en `sitemap.xml`.
