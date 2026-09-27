/* Reduced-motion / no-scroll fallback: source and cues follow the viewport. */
(function () {
  const video = document.querySelector('[data-atelier-video]');
  const caption = document.querySelector('[data-atelier-caption]');
  if (!video || !caption) return;
  const portrait = matchMedia('(max-width: 1000px) and (orientation: portrait), (pointer: coarse) and (orientation: portrait)');
  const mobileCues = [
    {start: 0, end: 57 / 24, text: 'Entrez. Dans l’atelier.'},
    {start: 57 / 24, end: 84 / 24, text: 'Révéler la profondeur.'},
    {start: 84 / 24, end: 110 / 24, text: 'La matière. Le caractère.'},
    {start: 110 / 24, end: 154 / 24, text: 'La précision. De l’intérieur.'},
    {start: 154 / 24, end: 173 / 24, text: 'ADMISSION — Le souffle'},
    {start: 173 / 24, end: 191 / 24, text: 'CULASSES — La précision'},
    {start: 191 / 24, end: 216 / 24, text: 'PISTONS & BIELLES — Le mouvement'}
  ];
  function updatePoster() {
    video.poster = portrait.matches ? 'assets/frames/atelier-mobile-1080p24-20260927/001.webp' : 'assets/frames/atelier-v2-1080p24-20260927/001.webp';
  }
  updatePoster();
  portrait.addEventListener('change', updatePoster);
  const cues = [{"start": 0, "end": 0.75, "text": "Entrez. Dans l’atelier."}, {"start": 0.75, "end": 2.1, "text": "Révéler la profondeur."}, {"start": 2.2, "end": 3.6, "text": "La matière. Le caractère."}, {"start": 4.05, "end": 5.7, "text": "La précision. De l’intérieur."}, {"start": 6.1, "end": 6.9, "text": "ADMISSION — Le souffle"}, {"start": 6.9, "end": 7.7, "text": "CULASSES — La précision"}, {"start": 7.7, "end": 8.55, "text": "PISTONS & BIELLES — Le mouvement"}];
  function updateCaption() {
    const isMobileSource = video.currentSrc ? video.currentSrc.includes('atelier-mobile-') : portrait.matches;
    const cue = (isMobileSource ? mobileCues : cues).find(c => video.currentTime >= c.start && video.currentTime < c.end);
    caption.textContent = cue ? cue.text : video.currentTime >= 9.65 ? 'NOCTIS — Chaque détail, choisi avec intention.' : ' ';
  }
  video.addEventListener('timeupdate', updateCaption);
  video.addEventListener('seeked', updateCaption);
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) video.pause(); }).observe(video);
})();
