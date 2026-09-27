/* Compact and reduced-motion version: native playback, no scroll lock. */
(function () {
  const video = document.querySelector('[data-atelier-video]');
  const caption = document.querySelector('[data-atelier-caption]');
  if (!video || !caption) return;
  const cues = [{"start": 0, "end": 0.75, "text": "Entrez. Dans l’atelier."}, {"start": 0.75, "end": 2.1, "text": "Révéler la profondeur."}, {"start": 2.2, "end": 3.6, "text": "La matière. Le caractère."}, {"start": 4.05, "end": 5.7, "text": "La précision. De l’intérieur."}, {"start": 6.1, "end": 6.9, "text": "ADMISSION — Le souffle"}, {"start": 6.9, "end": 7.7, "text": "CULASSES — La précision"}, {"start": 7.7, "end": 8.55, "text": "PISTONS & BIELLES — Le mouvement"}];
  function updateCaption() {
    const cue = cues.find(c => video.currentTime >= c.start && video.currentTime < c.end);
    caption.textContent = cue ? cue.text : video.currentTime >= 9.65 ? 'NOCTIS — Chaque détail, choisi avec intention.' : ' ';
  }
  video.addEventListener('timeupdate', updateCaption);
  video.addEventListener('seeked', updateCaption);
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) video.pause(); }).observe(video);
})();
