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

---

## Deploying to GitHub & GitHub Pages

This project includes a preconfigured GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically runs unit tests, builds the production PWA with the correct repository base path, and publishes the live website to **GitHub Pages**.

### 1. Push to a GitHub Repository

Run the following commands in your project folder:

```bash
git init
git add .
git commit -m "Initial commit: Daily Inventory PWA"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 2. Enable GitHub Pages (1 Click)

1. Open your repository on GitHub and go to **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. The **Deploy Daily Inventory PWA to GitHub Pages** workflow will run automatically and publish your live interactive website at:
   `https://<your-username>.github.io/<your-repo-name>/`

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests
npx --yes tsx --test src/utils/inventoryLogic.test.ts

# Start development server on http://localhost:3000
npm run dev

# Build for production
npm run build
```
