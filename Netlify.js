[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/mandi"
  to = "/.netlify/functions/mandi"
  status = 200

[[redirects]]
  from = "/api/news"
  to = "/.netlify/functions/news"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(self), camera=(), microphone=()"

[[headers]]
  for = "/*.svg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"