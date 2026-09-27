import { createIcons, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide';

// Use the official library; only these three icons enter the local bundle.
createIcons({
  icons: { ChevronLeft, ChevronRight, ArrowUpRight },
  attrs: {
    width: 18,
    height: 18,
    'stroke-width': 2.6,
    'aria-hidden': 'true',
    focusable: 'false'
  }
});
