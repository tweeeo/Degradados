"use strict";

/* ==========================================================
   App — estado y wiring de la interfaz.
   Depende de: config.js, color-math.js, sampler.js, contrast-adjust.js
   ========================================================== */
const App = (() => {
  const state = {
    image: null,               // Image cargada, para poder re-analizarla al expandir la seleccion
    expanded: false,           // false = solo bordes, true = toda la imagen (mitad superior / mitad inferior)
    candidates: null,          // { top: [...], bottom: [...] }
    variant: 0,                // ciclo de "Otro"; cada zona avanza segun su propia lista
    results: null,
    mode: TEXT_MODE.BLACK,
  };

  const el = {
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("fileInput"),
    urlForm: document.getElementById("urlForm"),
    urlInput: document.getElementById("urlInput"),
    urlSubmitBtn: document.getElementById("urlSubmitBtn"),
    errorMsg: document.getElementById("errorMsg"),
    workspace: document.getElementById("workspace"),
    reuploadBtn: document.getElementById("reuploadBtn"),

    previewCard: document.getElementById("previewCard"),
    gradientLayerA: document.getElementById("gradientLayerA"),
    gradientLayerB: document.getElementById("gradientLayerB"),
    previewImg: document.getElementById("previewImg"),
    previewDate: document.getElementById("previewDate"),
    previewViews: document.getElementById("previewViews"),
    sampleImg: document.getElementById("sampleImg"),
    sampleBandTop: document.getElementById("sampleBandTop"),
    sampleBandBottom: document.getElementById("sampleBandBottom"),

    segmented: document.getElementById("segmented"),
    modeBlackBtn: document.getElementById("modeBlackBtn"),
    modeWhiteBtn: document.getElementById("modeWhiteBtn"),

    regenerateBtn: document.getElementById("regenerateBtn"),
    expandBtn: document.getElementById("expandBtn"),
    expandBtnLabel: document.getElementById("expandBtnLabel"),
    variantLabel: document.getElementById("variantLabel"),

    swatchTop: document.getElementById("swatchTop"),
    swatchBottom: document.getElementById("swatchBottom"),
    hexTop: document.getElementById("hexTop"),
    hexBottom: document.getElementById("hexBottom"),
    copyTop: document.getElementById("copyTop"),
    copyBottom: document.getElementById("copyBottom"),
  };

  let activeLayer = el.gradientLayerA;
  let idleLayer = el.gradientLayerB;

  function showError(message) {
    el.errorMsg.textContent = message;
    el.errorMsg.classList.add("visible");
  }

  function clearError() {
    el.errorMsg.classList.remove("visible");
  }

  function gradientCss(top, bottom) {
    return `linear-gradient(to bottom, ${top.hex}, ${bottom.hex})`;
  }

  function currentBandFraction() {
    return state.expanded ? CONFIG.BAND_FRACTION_FULL : CONFIG.BAND_FRACTION_EDGES;
  }

  function updateBandVisual() {
    const pct = `${currentBandFraction() * 100}%`;
    el.sampleBandTop.style.height = pct;
    el.sampleBandBottom.style.height = pct;
  }

  // Metadatos ilustrativos de la tarjeta: la fecha real del sistema del
  // usuario, y un numero de vistas al azar (1–1000; exactamente 1000 se
  // muestra como "1k") — solo para que la vista previa se sienta real.
  function refreshPreviewMeta() {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" });
    el.previewDate.textContent = `${month}. ${now.getDate()}, ${now.getFullYear()}`;

    const views = Math.floor(Math.random() * 1000) + 1;
    el.previewViews.textContent = views === 1000 ? "1k" : String(views);
  }

  function resampleCandidates() {
    state.candidates = Sampler.analyze(state.image, currentBandFraction());
    state.variant = 0;
  }

  // Resuelve arriba/abajo para un modo y, si quedan demasiado parecidos,
  // los separa dentro del rango de luminosidad que el modo permite —
  // asi el resultado siempre se lee como un degradado, no como un color plano
  function resolvePairWithSeparation(topCandidate, bottomCandidate, mode) {
    let top = ContrastAdjust.resolve(topCandidate, mode);
    let bottom = ContrastAdjust.resolve(bottomCandidate, mode);

    const lightnessGap = Math.abs(top.l - bottom.l);
    const rgbGap = Math.sqrt(
      (top.rgb.r - bottom.rgb.r) ** 2 +
      (top.rgb.g - bottom.rgb.g) ** 2 +
      (top.rgb.b - bottom.rgb.b) ** 2
    );

    if (lightnessGap < CONFIG.MIN_GRADIENT_L_SEPARATION && rgbGap < CONFIG.MIN_GRADIENT_RGB_DISTANCE) {
      const { floor, ceil } = ContrastAdjust.rangeFor(mode);
      const half = Math.min(CONFIG.MIN_GRADIENT_L_SEPARATION / 2, (ceil - floor) / 2);
      const midpoint = ColorMath.clamp((top.l + bottom.l) / 2, floor + half, ceil - half);

      top = ContrastAdjust.resolve(topCandidate, mode, midpoint + half);
      bottom = ContrastAdjust.resolve(bottomCandidate, mode, midpoint - half);
    }

    return { top, bottom };
  }

  function recomputeResults() {
    const topCandidate = state.candidates.top[state.variant % state.candidates.top.length];
    const bottomCandidate = state.candidates.bottom[state.variant % state.candidates.bottom.length];

    state.results = {
      [TEXT_MODE.BLACK]: resolvePairWithSeparation(topCandidate, bottomCandidate, TEXT_MODE.BLACK),
      [TEXT_MODE.WHITE]: resolvePairWithSeparation(topCandidate, bottomCandidate, TEXT_MODE.WHITE),
    };

    const totalVariants = Math.max(state.candidates.top.length, state.candidates.bottom.length);
    el.variantLabel.textContent = totalVariants > 1
      ? `Opcion ${(state.variant % totalVariants) + 1} de ${totalVariants}`
      : "";
  }

  function render() {
    const result = state.results[state.mode];

    idleLayer.style.background = gradientCss(result.top, result.bottom);
    idleLayer.classList.add("active");
    idleLayer.classList.remove("incoming");
    activeLayer.classList.remove("active");
    activeLayer.classList.add("incoming");
    [activeLayer, idleLayer] = [idleLayer, activeLayer];

    const textColor = state.mode === TEXT_MODE.BLACK ? "#000000" : "#ffffff";
    el.previewCard.style.color = textColor;

    el.swatchTop.style.background = result.top.hex;
    el.swatchBottom.style.background = result.bottom.hex;
    el.hexTop.textContent = result.top.hex;
    el.hexBottom.textContent = result.bottom.hex;

    el.segmented.dataset.mode = state.mode;
    el.modeBlackBtn.setAttribute("aria-pressed", String(state.mode === TEXT_MODE.BLACK));
    el.modeWhiteBtn.setAttribute("aria-pressed", String(state.mode === TEXT_MODE.WHITE));
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    render();
  }

  function motionDuration(ms) {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return prefersReduced ? 0 : ms;
  }

  function playAppear(target) {
    target.classList.remove("appear");
    void target.offsetWidth; // reflow: permite reiniciar la animacion si se repite
    target.classList.add("appear");
  }

  function pulse(button) {
    button.classList.remove("spin");
    void button.offsetWidth; // fuerza un reflow para reiniciar la animacion en clicks consecutivos
    button.classList.add("spin");
  }

  function regenerate() {
    if (!state.candidates) return;
    state.variant += 1;
    recomputeResults();
    render();
    pulse(el.regenerateBtn);
  }

  function toggleExpand() {
    if (!state.image) return;
    state.expanded = !state.expanded;
    el.expandBtn.setAttribute("aria-pressed", String(state.expanded));
    el.expandBtnLabel.textContent = state.expanded ? "Solo bordes" : "Expandir seleccion";

    resampleCandidates();
    recomputeResults();
    render();
    updateBandVisual();
    pulse(el.expandBtn);
  }

  // Todo lo que ocurre una vez que ya hay una imagen cargada (venga de un
  // archivo o de un link) vive aqui, para no duplicar el flujo dos veces.
  // previewSrc es lo que se muestra en las miniaturas: el data URL del
  // archivo, o directamente la URL cuando la imagen vino de un link.
  function useImage(img, previewSrc) {
    state.image = img;
    state.expanded = false;
    state.mode = TEXT_MODE.BLACK;

    el.expandBtn.setAttribute("aria-pressed", "false");
    el.expandBtnLabel.textContent = "Expandir seleccion";

    try {
      resampleCandidates();
    } catch (err) {
      // El sitio de origen no permite leer los pixeles desde el navegador (CORS)
      showError("No pudimos analizar los colores de esa imagen. Prueba con otro link o descargala y subela directamente.");
      return;
    }
    recomputeResults();

    el.previewImg.src = previewSrc;
    el.sampleImg.src = previewSrc;
    updateBandVisual();
    refreshPreviewMeta();

    activeLayer = el.gradientLayerA;
    idleLayer = el.gradientLayerB;
    activeLayer.classList.add("active");
    activeLayer.classList.remove("incoming");
    idleLayer.classList.remove("active");
    idleLayer.classList.add("incoming");

    render();

    el.dropzone.style.display = "none";
    el.urlForm.style.display = "none";
    document.querySelector(".url-divider").style.display = "none";
    el.workspace.classList.add("visible");
    requestAnimationFrame(() => el.workspace.classList.add("settled"));
  }

  function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showError("Ese archivo no parece ser una imagen. Prueba con otro.");
      return;
    }
    clearError();

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => useImage(img, reader.result);
      img.onerror = () => showError("No pudimos leer esa imagen. Prueba con otro archivo.");
      img.src = reader.result;
    };
    reader.onerror = () => showError("No pudimos leer ese archivo.");
    reader.readAsDataURL(file);
  }

  function loadFromUrl(rawUrl) {
    const url = rawUrl.trim();
    if (!url) return;
    clearError();

    if (!/^https?:\/\/.+/i.test(url)) {
      showError("Ese no parece ser un link valido. Debe empezar con http:// o https://.");
      return;
    }

    el.urlSubmitBtn.disabled = true;
    el.urlSubmitBtn.textContent = "Cargando...";

    const restoreButton = () => {
      el.urlSubmitBtn.disabled = false;
      el.urlSubmitBtn.textContent = "Usar imagen";
    };

    const img = new Image();
    img.crossOrigin = "anonymous"; // necesario para poder leer los pixeles del canvas
    img.onload = () => {
      restoreButton();
      useImage(img, url);
    };
    img.onerror = () => {
      restoreButton();
      showError("No pudimos cargar esa imagen. Revisa el enlace e intenta de nuevo.");
    };
    img.src = url;
  }

  async function copyHex(hex, button) {
    try {
      await navigator.clipboard.writeText(hex);
    } catch (err) {
      const temp = document.createElement("textarea");
      temp.value = hex;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      try { document.execCommand("copy"); } catch (e) { /* silencioso: nada mas que ofrecer aqui */ }
      document.body.removeChild(temp);
    }
    button.classList.add("copied");
    window.clearTimeout(button._copyTimeout);
    button._copyTimeout = window.setTimeout(() => button.classList.remove("copied"), 1400);
  }

  function bindEvents() {
    el.dropzone.addEventListener("click", () => el.fileInput.click());
    el.dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.fileInput.click(); }
    });
    el.dropzone.addEventListener("dragover", (e) => { e.preventDefault(); el.dropzone.classList.add("drag-over"); });
    el.dropzone.addEventListener("dragleave", () => el.dropzone.classList.remove("drag-over"));
    el.dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      el.dropzone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
    });

    el.fileInput.addEventListener("change", () => {
      if (el.fileInput.files && el.fileInput.files[0]) processFile(el.fileInput.files[0]);
    });

    // Pegar una imagen (Ctrl+V) desde cualquier parte de la pagina —
    // por ejemplo, una captura de pantalla copiada al portapapeles. Si lo que
    // se pega es texto normal (como un link en el campo de URL), no hay
    // ningun item de tipo imagen y este listener no interfiere.
    document.addEventListener("paste", (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items || [];
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
          }
          break;
        }
      }
    });

    el.reuploadBtn.addEventListener("click", () => {
      el.workspace.classList.remove("settled"); // dispara el fundido/deslizamiento de salida de la tarjeta
      window.setTimeout(() => {
        el.workspace.classList.remove("visible");
        el.dropzone.style.display = "";
        el.urlForm.style.display = "";
        document.querySelector(".url-divider").style.display = "";
        playAppear(el.dropzone);
        el.fileInput.value = "";
        el.urlInput.value = "";
        clearError();
      }, motionDuration(420)); // debe coincidir con la duracion de salida de .workspace en el CSS
    });

    el.urlForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadFromUrl(el.urlInput.value);
    });

    el.modeBlackBtn.addEventListener("click", () => setMode(TEXT_MODE.BLACK));
    el.modeWhiteBtn.addEventListener("click", () => setMode(TEXT_MODE.WHITE));

    el.regenerateBtn.addEventListener("click", regenerate);
    el.expandBtn.addEventListener("click", toggleExpand);

    el.copyTop.addEventListener("click", () => copyHex(el.hexTop.textContent, el.copyTop));
    el.copyBottom.addEventListener("click", () => copyHex(el.hexBottom.textContent, el.copyBottom));
  }

  function init() {
    bindEvents();
  }

  return { init };
})();

App.init();
