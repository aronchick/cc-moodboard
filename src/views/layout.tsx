import type { FC, PropsWithChildren } from "hono/jsx";

export const Layout: FC<PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title ?? "cc-moodboard"}</title>
      <link rel="stylesheet" href="/styles.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <script src="https://unpkg.com/htmx.org@2.0.4" defer></script>
      <script src="https://unpkg.com/alpinejs@3.14.8/dist/cdn.min.js" defer></script>
    </head>
    <body class="min-h-screen">
      <header class="sticky top-0 z-50 bg-surface-0/90 backdrop-blur border-b border-surface-3">
        <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" class="flex items-center gap-2 text-white font-semibold text-lg">
            <span class="text-accent">&#9632;</span> cc-moodboard
          </a>
          <nav class="flex items-center gap-4">
            <a href="/" class="btn btn-ghost text-sm">Board</a>
            <a href="/collections" class="btn btn-ghost text-sm">Collections</a>
            <a href="/add" class="btn btn-primary text-sm">+ Add</a>
          </nav>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-6">{children}</main>

      <div
        id="lightbox"
        class="fixed inset-0 z-[100] bg-black/80 hidden items-center justify-center cursor-pointer"
        onclick="this.classList.add('hidden'); this.classList.remove('flex');"
      >
        <img id="lightbox-img" class="max-w-[90vw] max-h-[90vh] rounded-lg" />
      </div>

      <script>{`
        function openLightbox(src) {
          var lb = document.getElementById('lightbox');
          document.getElementById('lightbox-img').src = src;
          lb.classList.remove('hidden');
          lb.classList.add('flex');
        }
      `}</script>
    </body>
  </html>
);
