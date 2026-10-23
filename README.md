# KitWeb

A modern web application for **KitCraft**, featuring an interactive product catalog and a streamlined ordering system.

## Project Description
KitWeb is designed to providing a seamless experience for users to browse high-quality crafts and place orders. The application is built with a focus on performance, internationalization (TH/EN support), and a modular architecture.

## Tech Stack
- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Internationalization**: [Vue I18n](https://vue-i18n.intlify.dev/)
- **Deployment**: Configured for Netlify (see `netlify.toml`)

## Project Structure
```text
KitWeb/
├── backend/            # Future backend services
├── frontend/
│   └── kitweb/         # Main Vue 3 Project
│       ├── src/
│       │   ├── assets/     # Static assets (images, styles)
│       │   ├── components/ # Reusable UI components
│       │   ├── locales/    # Translation files (i18n)
│       │   ├── router/     # Route definitions
│       │   ├── views/      # Page-level components (Catalog, Order, etc.)
│       │   ├── App.vue     # Root component
│       │   └── main.js     # Entry point
│       ├── public/          # Public assets
│       ├── index.html       # Entry HTML
│       ├── package.json     # Project dependencies and scripts
│       └── vite.config.js   # Vite configuration
├── README.md           # Project overview
└── manual.md           # Installation and usage guide
```

---

## Staff area (admin)

Everything for staff lives under `/:lang/admin/*` in one shell (admin login, shared navbar, public header and
footer hidden): `inventory`, `invoices`, `customers`, `orders`, and the content tools under "More" (`diy-set-collection`,
`project-article`, `color-of-the-month`, `creator-gallery`, `workshops-events`, `business-sets`, `categories`, `cash-sale`).
The route table is `frontend/kitweb/src/router/adminRoutes.js`, built from `src/utils/adminNav.js`.

The Standard Inventory page never deletes: "Archive" hides a product and stamps `products.archived_at`, and it can be
restored. Invoices and Customers show placeholder data until their backends exist (`useInvoices` / `useCustomers`).

**Try admin changes without touching production.** The frontend talks to the deployed Worker by default. To use a local
Worker and database instead:

```bash
cd hidden-water-ed9d && npx wrangler dev                      # local Worker + local D1 on :8787
cd frontend/kitweb && VITE_API_URL=http://127.0.0.1:8787 npm run dev
```

---

## Development Roadmap
- [ ] Special request function near ordering section
- [ ] Article section inside KitCraft
- [ ] Fix Instagram rendering bugs
- [ ] Real Contact Us page functionality
- [ ] Homepage "About Us" section