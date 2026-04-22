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

## Development Roadmap
- [ ] Special request function near ordering section
- [ ] Article section inside KitCraft
- [ ] Fix Instagram rendering bugs
- [ ] Real Contact Us page functionality
- [ ] Homepage "About Us" section