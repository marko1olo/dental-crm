START: investigating backdrop-filter on imaging panels + silent-void §3 defect in ImagingView.tsx.
DONE: cause was NOT backdrop-filter — `.workspace > *` entry animation with fill-mode `both` held opacity:0; fixed in main.css, committed f3dee4b08 (earlier hunks absorbed by c495c2b43).
