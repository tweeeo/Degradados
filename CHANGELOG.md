# Changelog

Todos los cambios relevantes del proyecto se registran aqui.

---

## [0.0.1] - 2026-09-21

### Reorganizacion estructural del proyecto

#### Estructura de carpetas
- Creada carpeta `assets/` para recursos estaticos (imagenes, iconos)
- Creada carpeta `css/` para hojas de estilo
- Creada carpeta `js/` para modulos JavaScript

#### Activos movidos
- `favicon.svg` movido a `assets/favicon.svg`
- `social-preview.png` movido a `assets/social-preview.png`
- `styles.css` movido a `css/styles.css`

#### JavaScript modularizado
El archivo monolitico `script.js` (678 lineas, 5 responsabilidades mezcladas) fue dividido en modulos independientes:
- `js/config.js` — constantes globales (`CONFIG`, `TEXT_MODE`, colores de referencia)
- `js/color-math.js` — conversion RGB/HSL/HEX y calculo de contraste WCAG (`ColorMath`)
- `js/sampler.js` — analisis de pixeles de imagen y agrupacion por matiz (`Sampler`)
- `js/contrast-adjust.js` — ajuste de luminosidad para cumplir WCAG AA (`ContrastAdjust`)
- `js/app.js` — estado de la aplicacion, DOM y eventos (`App`)
- `script.js` original eliminado

#### CSS extraido de 404.html
- Bloque `<style>` embebido en `404.html` extraido a `css/404.css`
- Atributo `style=""` inline del boton eliminado; reemplazado por clase `.btn-back` en `css/404.css`

#### HTML actualizado
- `index.html` actualizado con paths correctos a `assets/`, `css/` y los 5 modulos `js/`
- `404.html` limpiado: sin estilos embebidos, apunta a `css/styles.css` y `css/404.css`

#### Creado este archivo
- `CHANGELOG.md` creado para registrar la evolucion del proyecto

---

## [Sin version] - 2026-09-21

### Documentacion y configuracion de repositorio

- `README.md` creado con vision general, funcionalidades, estructura del proyecto, explicacion
  del algoritmo, tabla de parametros de configuracion y tabla de modulos JavaScript
- `LICENSE` creado con licencia propietaria exclusiva (todos los derechos reservados, prohibida
  la copia, modificacion, distribucion y uso sin permiso expreso)
- `.gitignore` creado con exclusiones para sistemas operativos, editores, Node.js y builds

---

## [Sin version] - 2026-09-21

### Configuracion del repositorio Git y GitHub Pages

- Repositorio Git inicializado en rama `main`
- Remote conectado a `https://github.com/tweeeo/Degradados`
- `.gitattributes` creado para normalizar saltos de linea a LF
- URLs placeholder `TU-DOMINIO-AQUI.com` reemplazadas por el dominio real de GitHub Pages
  en `index.html`, `robots.txt` y `sitemap.xml`
- Sitio publicado en `https://tweeeo.github.io/Degradados/` via GitHub Pages
