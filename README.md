# IsAcademy

> La Inteligencia Artificial (IA) te da respuestas. *Aquí te enseñamos a pensar.*

Web de **IsAcademy by Ismael Sarmiento**, academia online de programación, datos e IA
(Python, POO, SQL, analítica, Big Data/Spark, Data Engineering, IA, TFG/TFM y orientación profesional).
Su objetivo es captar alumnos: todas las secciones llevan al contacto.

- **URL de producción:** https://ismael-sarmiento.github.io/isacademy/
- **Hosting:** GitHub Pages (sitio 100 % estático, sin backend ni build).
- **Idiomas:** español e inglés · **Temas:** claro y oscuro.

## Cómo funciona

1. **Intro (en cada visita):** el "Is" caligráfico se esboza a mano y "Academy" se decodifica como una IA. Botones ES/EN y claro/oscuro, y "Entrar a la academia".
2. **Apertura (cinemática):** manos ilustradas (humana dorada y robótica con LED) pellizcan las palabras y las separan con una estela sutil de tinta y píxeles. También en móvil.
3. **Landing:** barra fija (Quiénes somos, Metodología, Materias, Por qué elegirnos, Opiniones, Recursos, **Reservar clase**; idioma y tema a la derecha), franja de **aulas abiertas gratuitas cada 15 días**, mini-clases animadas en el hero y **consola de Python** (Pyodide) en Recursos con **depurador paso a paso** (línea actual, variables, pila de llamadas, salida, puntos de parada; tope de 1000 pasos).
4. **Asistente "Alan":** avatar ilustrado con chat local (sin servidor) que responde sobre la academia y deriva al formulario.
5. **Reservar clase:** formulario propio que llega por email vía FormSubmit (`js/config.js` → `formEmail`).

Los enlaces directos (`/#contacto`, `/#materias`) saltan la intro.

## Estructura

```
index.html            Intro + landing (secciones)
css/main.css          Tokens de diseño (claro/oscuro), intro, manos, secciones
js/app.js             Pinta las secciones desde i18n, scroll spy, contacto, curiosidades
js/intro.js           Animación del logo
js/opening.js         Cinemática de apertura (manos SVG, secuencia)
js/fx.js              Partículas de la cinemática (tinta y píxeles)
js/assistant.js       Asistente "Alan": motor de respuestas local + panel de chat
js/avatar.js          Avatar SVG animado del asistente
js/i18n.js            Carga i18n/<lang>.json y traduce [data-i18n]
js/theme.js           Modo claro/oscuro (sigue al sistema, recuerda la elección)
js/console.js         Consola de Python (Pyodide desde jsDelivr con SRI, bajo demanda) y depurador paso a paso (sys.settrace)
js/config.js          Email de destino del formulario (FormSubmit) y futuros WhatsApp/teléfono
i18n/es.json, en.json Todos los textos (materias, FAQ, curiosidades, código del hero…)
assets/brand/         logo.svg, favicon-32.png, apple-touch-icon.png, icon-512.png y og.png (imagen al compartir, 1200×630)
assets/brand/print/   Logos con texto en trazados, monograma «Is» y QR (para carteles); ver su README
tools/brand/          Scripts para regenerar logos y QR (macOS: CoreText y CoreImage)
assets/fonts/         Allura y Space Grotesk alojadas en local (OFL)
assets/img/           Foto del fundador
docs/                 PROJECT_CONTEXT.md (decisiones) y TODO.md (pendientes)
```

## Probar en local

Los módulos JS y los `fetch` de `i18n/` necesitan servirse por HTTP (no abrir el fichero con doble clic):

```bash
python3 -m http.server 8000
```

Abrir http://localhost:8000/

## Versionado (caché)

CSS, módulos JS y textos llevan `?v=<versión>` para que nadie mezcle ficheros viejos y nuevos.
**Antes de publicar cambios**, ejecuta:

```bash
tools/bump-version.sh
```

## Publicar en GitHub Pages

> Si tu equipo no permite `git push` a GitHub, usa la opción A (subida desde el navegador).

### Opción A — sin git (subida desde el navegador)

1. Entra en https://github.com/new, crea el repositorio **`isacademy`** (público, sin README).
2. En la página del repositorio vacío pulsa **"uploading an existing file"**.
3. Arrastra **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `.nojekyll`,
   `css/`, `js/`, `i18n/`, `assets/`, `docs/`, `README.md`, `AGENTS.md`.
   - `.nojekyll` es un fichero oculto: en macOS pulsa `Cmd + Shift + .` en Finder para verlo.
4. Escribe un mensaje de commit y pulsa **Commit changes**.
5. Ve a **Settings → Pages** y en *Build and deployment* elige **Deploy from a branch**,
   rama **`main`**, carpeta **`/ (root)`** → **Save**.
6. En 1–2 minutos la web estará en https://ismael-sarmiento.github.io/isacademy/

### Opción B — con git (cualquier PC sin bloqueo, o un LLM en otro equipo)

Requisitos: `git` y acceso a la cuenta `ismael-sarmiento` (HTTPS con token o SSH).

```bash
# 1. Crear el repositorio vacío en GitHub (web: https://github.com/new → "isacademy")
#    o con la CLI de GitHub:
gh repo create ismael-sarmiento/isacademy --public --description "IsAcademy · Humanos en un mundo artificial"

# 2. Desde esta carpeta, confirmar los cambios (si aún no hay commits) y subir el código
git add -A
git commit -m "feat: bootstrap IsAcademy site"   # omitir si 'git log' ya muestra commits
git remote add origin https://github.com/ismael-sarmiento/isacademy.git
git push -u origin main

# 3. Activar GitHub Pages desde la rama main (raíz)
gh api -X POST repos/ismael-sarmiento/isacademy/pages -f "source[branch]=main" -f "source[path]=/"

# 4. Comprobar (puede tardar 1–2 minutos)
curl -sI https://ismael-sarmiento.github.io/isacademy/ | head -1   # → HTTP/2 200
```

Si no hay `gh`, los pasos 1 y 3 se hacen desde la web (ver opción A, pasos 1 y 5).

### Estado del repositorio remoto

El repositorio `ismael-sarmiento/isacademy` se publicó el 2026-10-11 **subiendo ficheros desde la web**, así que su
historial (commits "feat: publish IsAcademy site (…)") es distinto del historial local de desarrollo, aunque el contenido es
idéntico. Para trabajar con git en otro equipo, **clona el remoto** (`git clone https://github.com/ismael-sarmiento/isacademy.git`)
en lugar de añadir el remoto a esta copia local; si no, el `push` será rechazado por historiales distintos.

### Actualizar la web más adelante

- **Opción A:** en el repositorio, *Add file → Upload files* y arrastra los ficheros cambiados.
- **Opción B:** `git add -A && git commit -m "..." && git push`.

GitHub Pages redespliega solo en cada commit a `main`.

## Dominio propio (futuro)

Cuando haya dominio (p. ej. `isacademy.es`): *Settings → Pages → Custom domain*, crear el registro DNS
que indique GitHub y activar *Enforce HTTPS*. Las rutas de ficheros son relativas, pero hay que actualizar la URL
absoluta en `index.html`: `<link rel="canonical">`, `og:url` y la `url` del bloque JSON-LD.

## Contacto (formulario)

El formulario de «Reservar clase» envía los datos a FormSubmit, que los reenvía al email de `js/config.js`
(**isacademy.notification@gmail.com**, activado el 2026-10-13).
- **Cambiar de correo:** edita `formEmail` y `publicEmail`, publica y haz un envío de prueba desde la web publicada:
  FormSubmit manda un email «Activate Form» al nuevo correo y hay que pulsarlo (el enlace caduca).
- **Alias de FormSubmit:** opcional; el correo ya es público en el texto de privacidad y en el pie.
- Si eliges «Aula abierta», el mensaje es opcional.

## Seguridad

Sitio estático sin backend ni secretos. Medidas en el propio código:
- **Content-Security-Policy** (meta en `index.html` y `404.html`): solo scripts propios y de jsDelivr (Pyodide), conexiones solo a FormSubmit y jsDelivr, sin `object`, `base` ni envíos de formularios nativos.
- **SRI** en `pyodide.js` (`js/console.js` → `PYODIDE_SRI`). Si se cambia la versión de Pyodide, recalcula el hash:
  `curl -s <url>/pyodide.js | openssl dgst -sha384 -binary | openssl base64 -A`.
- **Anti-clickjacking**: la web sale de cualquier marco de otro dominio (GitHub Pages no permite `frame-ancestors`).
- Todo el texto dinámico se escapa antes de pintarse; enlaces externos con `rel="noopener"`.
- Recomendado al propietario: verificación en dos pasos en GitHub y en el Gmail de la academia.
