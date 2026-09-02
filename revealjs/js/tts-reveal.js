document.addEventListener('DOMContentLoaded', () => {
  if (window.location.search.match(/print-pdf/gi)) return;
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  const synth = window.speechSynthesis;
  let utterance = null;
  let paused = false;
  let ttsActivated = false;

  // -----------------------------
  // BOTÓN ÚNICO DE INICIO
  // -----------------------------

  const startButton = document.createElement('button');
  startButton.id = 'startPresentationButton';
  startButton.textContent = 'Iniciar presentación';

  startButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 1000;
    padding: 12px 20px;
    background-color: #ff7300;
    color: #ffffcc;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  `;

  document.body.appendChild(startButton);

  // -----------------------------
  // VOZ
  // -----------------------------

  const getSpanishVoice = () => {
    const voices = synth.getVoices();

    return (
      voices.find(v => v.lang && v.lang.startsWith('es-')) ||
      null
    );
  };

  // -----------------------------
  // LIMPIEZA DE TEXTO
  // -----------------------------

  const cleanText = text =>
    (text || '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

  const getReadableText = el => {
    if (!el) return '';

    const clone = el.cloneNode(true);

    clone
      .querySelectorAll(
        'script, style, button, .controls, .progress, .slide-number'
      )
      .forEach(x => x.remove());

    return cleanText(clone.textContent);
  };

  // -----------------------------
  // HABLAR
  // -----------------------------

  const speakText = text => {
    const finalText = cleanText(text);

    if (!finalText) return;

    // En iOS evitamos cancelar antes de la primera reproducción.
    if (utterance && synth.speaking) {
      synth.cancel();
    }

    utterance = new SpeechSynthesisUtterance(finalText);

    const voice = getSpanishVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.lang = 'es-MX';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => {
      paused = false;
    };

    synth.speak(utterance);
  };

  // -----------------------------
  // LEER CONTENIDO BASE
  // DE LA DIAPOSITIVA
  // -----------------------------

  const readCurrentSlide = () => {
    if (typeof Reveal === 'undefined') return;

    const currentSlide =
      Reveal.getCurrentSlide?.() ||
      document.querySelector('.reveal .slides section.present');

    if (!currentSlide) return;

    // Clonamos toda la diapositiva para poder limpiar
    // sin modificar lo que se ve en pantalla.
    const clone = currentSlide.cloneNode(true);

    // El contenido incremental NO se lee al entrar.
    // Cada fragmento se leerá cuando Reveal dispare fragmentshown.
    clone
      .querySelectorAll('.fragment')
      .forEach(el => el.remove());

    // Eliminamos elementos que no deben formar parte de la lectura.
    clone
      .querySelectorAll(
        'script, style, button, .controls, .progress, .slide-number'
      )
      .forEach(el => el.remove());

    const text = cleanText(clone.textContent);

    if (text) {
      speakText(text);
    }
  };

  // -----------------------------
  // LEER SOLO EL FRAGMENTO NUEVO
  // -----------------------------

  const readIncrementalContent = fragment => {
    if (!fragment) return;

    const text = getReadableText(fragment);

    if (text) {
      speakText(text);
    }
  };

  // -----------------------------
  // REVEAL
  // -----------------------------

  const initializeTTS = () => {

    Reveal.on('slidechanged', () => {
      if (!ttsActivated) return;

      paused = false;
      readCurrentSlide();
    });

    Reveal.on('fragmentshown', event => {
      if (!ttsActivated) return;

      paused = false;
      readIncrementalContent(event.fragment);
    });
  };

  if (typeof Reveal !== 'undefined') {
    if (Reveal.isReady?.()) {
      initializeTTS();
    } else {
      Reveal.on('ready', initializeTTS);
    }
  }

  // -----------------------------
  // INICIAR PRESENTACIÓN
  // -----------------------------

  startButton.addEventListener('click', () => {
    ttsActivated = true;
    paused = false;

    // Debe ejecutarse directamente dentro del gesto
    // del usuario para funcionar correctamente en iOS.
    readCurrentSlide();

    // Después solicitamos pantalla completa.
    if (!document.fullscreenElement) {
      const request =
        document.documentElement.requestFullscreen?.();

      request?.catch?.(() => {});
    }
  });

  // -----------------------------
  // PANTALLA COMPLETA
  // -----------------------------

  document.addEventListener('fullscreenchange', () => {
    startButton.style.display =
      document.fullscreenElement
        ? 'none'
        : 'block';
  });

  // -----------------------------
  // TECLADO
  // -----------------------------

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();

    // Q = pausa / continuar
    if (key === 'q') {
      if (paused) {
        synth.resume();
        paused = false;
      } else if (synth.speaking) {
        synth.pause();
        paused = true;
      }
    }

    // R = volver a leer la diapositiva actual
    if (
      key === 'r' &&
      ttsActivated
    ) {
      paused = false;
      readCurrentSlide();
    }
  });
});
