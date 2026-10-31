# Daily Inventory PWA

A mobile-first Progressive Web App (PWA) and interactive web dashboard for daily team inventory counting, featuring live scannable UPC-A / Code128 inline SVG barcodes, handheld scanner lightbox mode, full category and product CRUD management, and one-tap plain-text & CSV export.

## Key Features

- **Website View & Full-Screen Workspace Modes**:
  - **Workspace View**: Responsive mobile-first and multi-column desktop layout for rapid daily counting.
  - **Interactive Website View**: Split-screen web showcase with an interactive **Handheld Mobile Frame (`390px`)** alongside a live **Web Inventory Dashboard** with category progress bars, instant `.csv` / `.txt` export, and GitHub Pages deployment instructions.
- **Physically Scannable Inline SVG Barcodes (`jsbarcode`)**:
  - Every product's 12-digit UPC renders a crisp vector barcode directly on screen without external image dependencies.
  - Tap any product thumbnail or barcode to open **Handheld Scanner Mode**—a high-contrast full-screen lightbox designed for laser and CCD barcode scanners.
- **Full Product & Category Management**:
  - Add, edit, or delete any product (Name, Category, Counting Unit, 12-Digit UPC with valid modulo-10 check-digit generator, and custom or generated graphic thumbnail).
  - Add, rename, reorder, or remove categories with automatic product reassignment.
- **iOS Safari & Android Chrome PWA Ready**:
  - Zero-zoom viewport rules (`user-scalable=no`), `touch-manipulation` controls, auto-selecting numeric inputs, offline service worker caching, and Dark / High-Contrast Warehouse / Light themes.
- **Zero Backend Required**:
  - Catalog, categories, and daily counts persist automatically in `localStorage`, with full JSON catalog import/export and plain-text / CSV count export.


