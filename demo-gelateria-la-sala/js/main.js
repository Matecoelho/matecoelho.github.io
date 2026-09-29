(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 769px) and (min-height: 600px)');
  const gallery = document.querySelector('.hero-gallery');
  const slides = [...gallery.querySelectorAll('.hero-slide')];
  const toggle = gallery.querySelector('.slideshow-toggle');
  let slideIndex = 0;
  let timer;
  let paused = reducedMotion.matches;
  let inView = true;

  const SLIDE_TIME = 2800;
  const running = () => !paused && inView && !document.hidden;

  // Foto: 2,8 s. Vídeo: toca até o fim e só então avança.
  function showNextSlide() {
    if (!running()) return;
    const next = (slideIndex + 1) % slides.length;
    const image = slides[next].querySelector('img');
    if (image && (!image.complete || !image.naturalWidth)) {
      clearTimeout(timer);
      timer = setTimeout(showNextSlide, 1000);
      return;
    }
    const leaving = slides[slideIndex].querySelector('video');
    if (leaving) leaving.pause();
    slides[slideIndex].classList.remove('is-active');
    slides[slideIndex].setAttribute('aria-hidden', 'true');
    slides[next].classList.add('is-active');
    slides[next].setAttribute('aria-hidden', 'false');
    slideIndex = next;
    const entering = slides[next].querySelector('video');
    if (entering) entering.currentTime = 0;
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    const video = slides[slideIndex].querySelector('video');
    if (!running()) {
      if (video) video.pause();
      return;
    }
    if (video) {
      const attempt = video.play();
      // Autoplay bloqueado: fica no poster pelo tempo de uma foto e segue.
      if (attempt) attempt.catch(() => { timer = setTimeout(showNextSlide, SLIDE_TIME); });
      return;
    }
    timer = setTimeout(showNextSlide, SLIDE_TIME);
  }

  function updatePlayback() {
    schedule();
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Riprendi le foto' : 'Metti in pausa le foto');
    toggle.querySelector('use').setAttribute('href', paused ? '#icon-play' : '#icon-pause');
  }

  gallery.querySelectorAll('video').forEach(video => {
    video.addEventListener('ended', showNextSlide);
  });

  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; updatePlayback(); });
  document.addEventListener('visibilitychange', updatePlayback);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; updatePlayback(); }).observe(gallery);

  // Botão flutuante do WhatsApp só aparece depois que o botão do hero sai da tela.
  const floatButton = document.querySelector('.whatsapp-float');
  const heroOrder = document.querySelector('.hero-order');
  floatButton.classList.add('is-hidden');
  new IntersectionObserver(([entry]) => {
    floatButton.classList.toggle('is-hidden', entry.isIntersecting);
  }).observe(heroOrder);

  const reviews = document.querySelector('.reviews-track');
  const reviewPrevious = document.querySelector('.reviews-previous');
  const reviewNext = document.querySelector('.reviews-next');

  const reviewButtons = document.querySelector('.reviews-buttons');

  function updateReviewButtons() {
    // Sem setas quando todas as avaliações já cabem na tela.
    reviewButtons.hidden = reviews.scrollWidth <= reviews.clientWidth + 2;
    reviewPrevious.disabled = reviews.scrollLeft < 2;
    reviewNext.disabled = reviews.scrollLeft >= reviews.scrollWidth - reviews.clientWidth - 2;
  }

  function moveReview(direction) {
    const cards = [...reviews.querySelectorAll('.review-card')];
    const stops = cards.map(card => card.offsetLeft - cards[0].offsetLeft);
    const target = direction > 0
      ? stops.find(stop => stop > reviews.scrollLeft + 5) ?? reviews.scrollWidth
      : stops.reverse().find(stop => stop < reviews.scrollLeft - 5) ?? 0;
    reviews.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  // Bolinhas (celular): uma por avaliação; a ativa acompanha a rolagem.
  const reviewCards = [...reviews.querySelectorAll('.review-card')];
  const dotsBox = document.querySelector('.reviews-dots');
  const dots = reviewCards.map((card, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Recensione ${index + 1} di ${reviewCards.length}`);
    dot.addEventListener('click', () => reviews.scrollTo({ left: card.offsetLeft - reviewCards[0].offsetLeft, behavior: reducedMotion.matches ? 'instant' : 'smooth' }));
    dotsBox.append(dot);
    return dot;
  });
  function updateDots() {
    const stops = reviewCards.map(card => Math.abs(card.offsetLeft - reviewCards[0].offsetLeft - reviews.scrollLeft));
    const active = reviews.scrollLeft >= reviews.scrollWidth - reviews.clientWidth - 2 ? dots.length - 1 : stops.indexOf(Math.min(...stops));
    dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === active)));
  }
  reviews.addEventListener('scroll', updateDots, { passive: true });
  updateDots();

  reviewPrevious.hidden = false;
  reviewNext.hidden = false;
  reviewPrevious.addEventListener('click', () => moveReview(-1));
  reviewNext.addEventListener('click', () => moveReview(1));
  reviews.addEventListener('scroll', updateReviewButtons, { passive: true });
  window.addEventListener('resize', updateReviewButtons);
  document.fonts.ready.then(updateReviewButtons);
  updateReviewButtons();

  const section = document.querySelector('.celebrations');
  const viewport = section.querySelector('.timeline-viewport');
  const track = section.querySelector('.timeline-track');
  const items = [...section.querySelectorAll('.occasion')];
  const progressBar = section.querySelector('.timeline-progress span');
  const previous = section.querySelector('.previous');
  const next = section.querySelector('.next');
  let sticky = false;
  let maxTravel = 0;
  let start = 0;
  let queued = false;
  let position = 0;

  function paint() {
    queued = false;
    position = sticky ? Math.max(0, Math.min(maxTravel, window.scrollY - start)) : viewport.scrollLeft;
    if (sticky) track.style.transform = `translate3d(${-position}px, 0, 0)`;
    const progress = maxTravel > 0 ? position / maxTravel : 0;
    progressBar.style.transform = `scaleX(${.08 + progress * .92})`;
    previous.disabled = position < 2;
    next.disabled = position >= maxTravel - 2;
  }

  function requestPaint() {
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }

  function measure() {
    sticky = desktop.matches && !reducedMotion.matches;
    section.classList.toggle('sticky-enabled', sticky);
    track.style.transform = '';
    section.style.height = '';
    maxTravel = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (sticky) {
      viewport.scrollLeft = 0;
      section.style.height = `${section.querySelector('.celebrations-sticky').offsetHeight + maxTravel}px`;
    }
    start = section.getBoundingClientRect().top + window.scrollY;
    paint();
  }

  function moveTo(offset) {
    const destination = Math.min(maxTravel, Math.max(0, offset));
    const behavior = reducedMotion.matches ? 'instant' : 'smooth';
    if (sticky) window.scrollTo({ top: start + destination, behavior });
    else viewport.scrollTo({ left: destination, behavior });
  }

  function step(direction) {
    const stops = items.map(item => item.offsetLeft - items[0].offsetLeft);
    const target = direction > 0
      ? stops.find(stop => stop > position + 5) ?? maxTravel
      : stops.reverse().find(stop => stop < position - 5) ?? 0;
    moveTo(target);
  }

  previous.hidden = false;
  next.hidden = false;
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') moveTo(0);
    else if (event.key === 'End') moveTo(maxTravel);
    else step(event.key === 'ArrowRight' ? 1 : -1);
  });
  // Keep links reached with Tab visible within the transformed desktop track.
  viewport.addEventListener('focusin', event => {
    if (!sticky) return;
    const item = event.target.closest('.occasion');
    if (!item) return;
    const offset = item.offsetLeft - items[0].offsetLeft;
    if (offset < position || offset + item.offsetWidth > position + viewport.clientWidth) moveTo(offset);
  });
  window.addEventListener('scroll', requestPaint, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (sticky && viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
    requestPaint();
  }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  desktop.addEventListener('change', measure);
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    updatePlayback();
    measure();
  });
  document.fonts.ready.then(measure);
  measure();
  updatePlayback();
})();
