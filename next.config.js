/** @type {import('next').NextConfig} */
// GitHub Pages hosts the site under /SchemaCreator/. When building for Pages
// (CI sets GITHUB_PAGES=1), prefix all routes and assets with that base path.
// Local `npm run dev` / `npm run build` keep the empty base path so the dev
// experience is unchanged.
const isGhPages = process.env.GITHUB_PAGES === '1';
const basePath = isGhPages ? '/SchemaCreator' : '';
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
