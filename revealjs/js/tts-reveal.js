document.addEventListener('DOMContentLoaded', () => {
  if (window.location.search.match(/print-pdf/gi)) return;

  const synth = window.speechSynthesis;
  let utterance = null;
  let paused = false;

  // -----------------------------
  // BOTÓN PANTALLA COMPLETA
  // -----------------------------

  const fullscreenButton = document.createElement('button');
  fullscreenButton.id = 'fullscreenButton';
  fullscreenButton.textContent = 'Pantalla completa';

  fullscreenButton.style.cssText = `
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

  document.body.appendChild(fullscreenButton);

  // -----------------------------
  // VOZ
  // -----------------------------

  const getSpanishVoice = () => {
    const voices = synth.getVoices();

    return (
      voices.find(v => v.lang === 'es-MX') ||
      voices.find(v => v.lang.startsWith('es-MX')) ||
      voices.find(v => v.lang.startsWith('es-')) ||
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
  // VISIBILIDAD
  // -----------------------------

  const isReadable = el => {
    if (!el) return false;

    const style = window.getComputedStyle(el);

    if (
      style.display === 'none' ||
      style.visibility === 'hidden'
    ) {
      return false;
    }

    const fragment = el.closest('.fragment');

    if (
      fragment &&
      !fragment.classList.contains('visible') &&
      !fragment.classList.contains('current-fragment')
    ) {
      return false;
    }

    return true;
  };

  // -----------------------------
  // HABLAR
  // -----------------------------

  const speakText = text => {
    const finalText = cleanText(text);

    if (!finalText) return;

    synth.cancel();

    utterance = new SpeechSynthesisUtterance(finalText);

    utterance.lang = 'es-MX';

    const voice = getSpanishVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => {
      paused = false;
    };

    synth.speak(utterance);
  };

  // -----------------------------
  // LEER DIAPOSITIVA ACTUAL
  // -----------------------------

  const readCurrentSlide = () => {
    if (typeof Reveal === 'undefined') return;

    const currentSlide = Reveal.getCurrentSlide();

    if (!currentSlide) return;

    const elements = currentSlide.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, li, blockquote'
    );

    const pieces = [];

    elements.forEach(el => {
      if (!isReadable(el)) return;

      if (
        el.tagName === 'P' &&
        el.closest('blockquote')
      ) {
        return;
      }

      const text = getReadableText(el);

      if (text) {
        pieces.push(text);
      }
    });

    speakText(pieces.join('. '));
  };

  // -----------------------------
  // LEER FRAGMENTO
  // -----------------------------

  const readFragment = fragment => {
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
      synth.cancel();
      paused = false;

      setTimeout(readCurrentSlide, 80);
    });

    Reveal.on('fragmentshown', event => {
      paused = false;

      setTimeout(() => {
        readFragment(event.fragment);
      }, 40);
    });

    setTimeout(readCurrentSlide, 150);
  };

  if (typeof Reveal !== 'undefined') {
    if (Reveal.isReady()) {
      initializeTTS();
    } else {
      Reveal.on('ready', initializeTTS);
    }
  }

  // -----------------------------
  // TECLADO
  // -----------------------------

  document.addEventListener('keydown', e => {

    // Q = pausa / continuar
    if (e.key.toLowerCase() === 'q') {

      if (paused) {
        synth.resume();
        paused = false;
      } else if (synth.speaking) {
        synth.pause();
        paused = true;
      }
    }

    // R = volver a leer diapositiva
    if (e.key.toLowerCase() === 'r') {
      paused = false;
      readCurrentSlide();
    }
  });

  // -----------------------------
  // PANTALLA COMPLETA
  // -----------------------------

  fullscreenButton.addEventListener('click', async () => {

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.style.display =
      document.fullscreenElement ? 'none' : 'block';
  });
});