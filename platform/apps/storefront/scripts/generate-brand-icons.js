#!/usr/bin/env node
/**
 * Gera favicon + ícones de PWA a partir de um logo real, ou de um
 * placeholder (inicial do nome da loja sobre a cor primária) quando
 * nenhum logo é passado.
 *
 * Uso:
 *   node scripts/generate-brand-icons.js
 *   node scripts/generate-brand-icons.js --logo caminho/para/logo.png
 *   node scripts/generate-brand-icons.js --name "Vruumoto" --color "#1B1B1B" --logo logo-vruumoto.png
 *
 * Lê nome/cor de src/config/brand.config.ts por padrão; --name e
 * --color sobrescrevem isso pontualmente (útil pra gerar o set de
 * ícones de uma marca antes de criar o brand.config.ts dela, ex: numa
 * branch nova como brand/vruumoto).
 *
 * Escreve em public/icons/*.png (favicon + ícones do manifest.webmanifest,
 * referenciados explicitamente em app/layout.tsx `metadata.icons`) e
 * também em app/icon.png como fallback via convenção nativa do Next.js
 * (só é usado se o `metadata.icons` do layout for removido).
 */
const sharp = require("sharp")
const path = require("path")
const fs = require("fs")

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1]
      i++
    }
  }
  return args
}

function loadBrandDefaults() {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, "..", "src", "config", "brand.config.ts"),
      "utf8"
    )
    const name = raw.match(/storeName:.*?\|\|\s*"([^"]+)"/)?.[1]
    const color = raw.match(/primaryHex:\s*"([^"]+)"/)?.[1]
    return { name, color }
  } catch {
    return {}
  }
}

function placeholderSvg({ size, padding = 0, initial, color }) {
  const inner = size - padding * 2
  const fontSize = Math.round(inner * 0.5)
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${color}"/>
    <text x="50%" y="50%" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"
      font-size="${fontSize}" font-weight="800" fill="#FFFFFF"
      text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`
}

async function makeIcon({ source, size, padding = 0, initial, color, outPath }) {
  if (source) {
    const inner = size - padding * 2
    const resized = await sharp(source)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: padding ? color : { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: "center" }])
      .png()
      .toFile(outPath)
    return
  }
  await sharp(Buffer.from(placeholderSvg({ size, padding, initial, color })))
    .png()
    .toFile(outPath)
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const defaults = loadBrandDefaults()
  const storeName = args.name || defaults.name || "Loja"
  const color = args.color || defaults.color || "#EE4D2D"
  const initial = storeName.trim().charAt(0).toUpperCase() || "L"
  const source = args.logo ? path.resolve(args.logo) : null

  if (source && !fs.existsSync(source)) {
    console.error(`Logo não encontrado: ${source}`)
    process.exit(1)
  }

  const iconsDir = path.join(__dirname, "..", "public", "icons")
  fs.mkdirSync(iconsDir, { recursive: true })

  const jobs = [
    { outPath: path.join(iconsDir, "icon-192.png"), size: 192 },
    { outPath: path.join(iconsDir, "icon-512.png"), size: 512 },
    { outPath: path.join(iconsDir, "icon-maskable-512.png"), size: 512, padding: 64 },
    { outPath: path.join(iconsDir, "apple-touch-icon.png"), size: 180 },
    { outPath: path.join(__dirname, "..", "app", "icon.png"), size: 256 }, // favicon
  ]

  for (const job of jobs) {
    await makeIcon({ source, color, initial, ...job })
    console.log("gerado:", path.relative(path.join(__dirname, ".."), job.outPath))
  }

  console.log(
    source
      ? "\nÍcones gerados a partir do logo informado."
      : "\nÍcones placeholder gerados (inicial do nome sobre a cor primária). Rode de novo com --logo quando tiver a arte final."
  )
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
