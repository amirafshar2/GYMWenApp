// تصویرهای برداری ساده و یکدست برای کالاهای شاپ و آیتم‌های بوفه (بدون عکس و برند واقعی).
// اجرا: node scripts/make-shop-images.mjs  → src/GymPlatform.Web/public/media/{shop,canteen}/*.svg
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = (dir) => { const d = path.join(root, 'src/GymPlatform.Web/public/media', dir); fs.mkdirSync(d, { recursive: true }); return d }
const shopDir = out('shop'), canteenDir = out('canteen')

const BLUE = '#0B5FB0', NAVY = '#0B2F57', INK = '#2C2C2C'
const shade = (hex, k) => { // k<0 تیره‌تر، k>0 روشن‌تر
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255
  const f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)
  return '#' + [f(r), f(g), f(b)].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
}
const frame = (inner, bg = '#EEF3F9') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<defs><radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${bg}"/></radialGradient>
<linearGradient id="gloss" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".22" stop-color="#fff" stop-opacity=".35"/><stop offset=".34" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#bg)"/><ellipse cx="300" cy="520" rx="170" ry="18" fill="#000" opacity=".08"/>${inner}</svg>`
const label = (x, y, t, size, color = '#fff', weight = 800, ls = 2) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${color}">${t}</text>`
const dumbbell = (cx, cy, s, c) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="${c}"><rect x="-34" y="-4" width="68" height="8" rx="3"/><rect x="-46" y="-16" width="10" height="32" rx="3"/><rect x="36" y="-16" width="10" height="32" rx="3"/><rect x="-56" y="-11" width="8" height="22" rx="3"/><rect x="48" y="-11" width="8" height="22" rx="3"/></g>`

// ---------------- شکل‌ها
const tub = ({ color, brand, name, sub = '', big = true }) => {
  const w = big ? 280 : 220, h = big ? 300 : 230, x = 300 - w / 2, y = 510 - h
  return frame(`<rect x="${x + 10}" y="${y - 34}" width="${w - 20}" height="46" rx="14" fill="${shade(color, -0.35)}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${color}"/>
<rect x="${x}" y="${y + h * 0.28}" width="${w}" height="${h * 0.44}" fill="#fff" opacity=".96"/>
${label(300, y + h * 0.2, brand, big ? 22 : 18, '#fff', 700, 4)}
${label(300, y + h * 0.5, name, big ? 46 : 36, shade(color, -0.25), 900, 1)}
${label(300, y + h * 0.64, sub, big ? 18 : 15, INK, 700, 2)}
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="url(#gloss)"/>`)
}
const pills = ({ color, brand, name, sub = '' }) => frame(`<rect x="215" y="200" width="170" height="44" rx="10" fill="${shade(color, -0.3)}"/>
<rect x="200" y="238" width="200" height="272" rx="30" fill="#fff" stroke="${shade(color, -0.1)}" stroke-width="4"/>
<rect x="200" y="300" width="200" height="140" fill="${color}"/>
${label(300, 340, brand, 16, '#fff', 700, 3)}${label(300, 392, name, 34, '#fff', 900, 1)}${label(300, 424, sub, 14, '#fff', 700, 2)}
<rect x="200" y="238" width="200" height="272" rx="30" fill="url(#gloss)"/>`)
const liquid = ({ color, brand, name }) => frame(`<rect x="268" y="120" width="64" height="56" rx="10" fill="${shade(color, -0.35)}"/>
<path d="M262 176 h76 v40 q50 30 50 90 v178 q0 26 -26 26 h-124 q-26 0 -26 -26 v-178 q0 -60 50 -90z" fill="${color}"/>
<rect x="212" y="320" width="176" height="110" fill="#fff" opacity=".95"/>
${label(300, 352, brand, 15, shade(color, -0.3), 700, 3)}${label(300, 400, name, 32, shade(color, -0.3), 900, 1)}
<path d="M262 176 h76 v40 q50 30 50 90 v178 q0 26 -26 26 h-124 q-26 0 -26 -26 v-178 q0 -60 50 -90z" fill="url(#gloss)"/>`)
const box = ({ color, brand, name, sub = '' }) => frame(`<path d="M150 250 L300 200 L450 250 L300 300z" fill="${shade(color, 0.25)}"/>
<path d="M150 250 L300 300 L300 500 L150 450z" fill="${color}"/><path d="M450 250 L300 300 L300 500 L450 450z" fill="${shade(color, -0.25)}"/>
<g transform="skewY(18) translate(0 -64)">${label(225, 380, name, 26, '#fff', 900, 1)}</g>
<g transform="skewY(-18) translate(0 168)">${label(375, 290, brand, 16, '#fff', 700, 3)}${label(375, 320, sub, 14, '#fff', 700, 2)}</g>`)
const pouch = ({ color, brand, name }) => frame(`<path d="M195 170 h210 l12 320 q0 20 -20 20 h-194 q-20 0 -20 -20z" fill="${color}"/>
<rect x="195" y="170" width="210" height="34" fill="${shade(color, -0.3)}"/><rect x="215" y="300" width="170" height="120" rx="14" fill="#fff" opacity=".95"/>
${label(300, 340, brand, 15, shade(color, -0.35), 700, 3)}${label(300, 388, name, 30, shade(color, -0.35), 900, 1)}
<path d="M195 170 h210 l12 320 q0 20 -20 20 h-194 q-20 0 -20 -20z" fill="url(#gloss)"/>`)

const TEE = 'M190 150 l60 -30 q50 40 100 0 l60 30 l70 90 l-56 44 l-34 -40 v266 h-180 v-266 l-34 40 l-56 -44z'
const tee = ({ color }) => frame(`<path d="${TEE}" fill="${color}"/><path d="M250 120 q50 40 100 0" fill="none" stroke="${shade(color, -0.3)}" stroke-width="8"/>${dumbbell(300, 230, 0.75, color === '#FFFFFF' ? BLUE : '#fff')}<path d="${TEE}" fill="none" stroke="${shade(color, -0.18)}" stroke-width="3"/>`)
const tank = ({ color }) => frame(`<path d="M225 120 q20 0 25 30 q50 40 100 0 q5 -30 25 -30 q10 90 45 130 v260 h-240 v-260 q35 -40 45 -130z" fill="${color}"/>${dumbbell(300, 270, 0.75, '#fff')}`)
const hoodie = ({ color }) => frame(`<path d="M180 170 l70 -40 q-10 -70 50 -78 q60 8 50 78 l70 40 l60 230 l-60 18 l-20 -150 v248 h-200 v-248 l-20 150 l-60 -18z" fill="${color}"/>
<path d="M255 130 q45 50 90 0" fill="${shade(color, -0.3)}"/><rect x="245" y="380" width="110" height="60" rx="10" fill="${shade(color, -0.18)}"/>${dumbbell(300, 270, 0.7, '#fff')}
<line x1="285" y1="150" x2="282" y2="220" stroke="#fff" stroke-width="4"/><line x1="315" y1="150" x2="318" y2="220" stroke="#fff" stroke-width="4"/>`)
const longtee = ({ color }) => frame(`<path d="M195 130 l55 -24 q50 34 100 0 l55 24 l55 260 l-52 10 l-40 -190 v330 h-180 v-330 l-40 190 l-52 -10z" fill="${color}"/><path d="M250 106 q50 34 100 0" fill="none" stroke="${shade(color, -0.3)}" stroke-width="8"/>${dumbbell(300, 240, 0.7, '#fff')}`)
const pants = ({ color }) => frame(`<path d="M220 110 h160 l20 400 h-80 l-20 -300 l-20 300 h-80z" fill="${color}"/><rect x="220" y="110" width="160" height="30" fill="${shade(color, -0.3)}"/>
<rect x="225" y="480" width="70" height="22" fill="${shade(color, -0.3)}"/><rect x="305" y="480" width="70" height="22" fill="${shade(color, -0.3)}"/>${dumbbell(345, 190, 0.35, '#fff')}`)
const leggings = ({ color }) => frame(`<path d="M232 100 h136 l6 410 h-62 l-12 -320 l-12 320 h-62z" fill="${color}"/><rect x="232" y="100" width="136" height="40" fill="${shade(color, -0.25)}"/>
<path d="M240 160 l20 340" stroke="${shade(color, 0.2)}" stroke-width="3" opacity=".6"/><path d="M360 160 l-20 340" stroke="${shade(color, 0.2)}" stroke-width="3" opacity=".6"/>`)
const shaker = ({ color }) => frame(`<rect x="255" y="110" width="40" height="40" rx="6" fill="${shade(color, -0.35)}"/><path d="M220 150 h160 l-6 56 h-148z" fill="${shade(color, -0.35)}"/>
<path d="M226 206 h148 l-16 300 q-2 10 -12 10 h-92 q-10 0 -12 -10z" fill="${color}" opacity=".88"/>
${[260, 310, 360, 410].map((y) => `<line x1="${240 + (y - 206) * 0.03}" y1="${y}" x2="268" y2="${y}" stroke="#fff" stroke-width="3"/>`).join('')}
${dumbbell(310, 380, 0.55, '#fff')}<path d="M226 206 h148 l-16 300 q-2 10 -12 10 h-92 q-10 0 -12 -10z" fill="url(#gloss)"/>`)
const bottle = ({ color }) => frame(`<rect x="262" y="96" width="76" height="40" rx="10" fill="${INK}"/><path d="M258 136 h84 v36 q36 18 36 60 v260 q0 22 -22 22 h-112 q-22 0 -22 -22 v-260 q0 -42 36 -60z" fill="${color}"/>
${dumbbell(300, 340, 0.6, '#fff')}<path d="M258 136 h84 v36 q36 18 36 60 v260 q0 22 -22 22 h-112 q-22 0 -22 -22 v-260 q0 -42 36 -60z" fill="url(#gloss)"/>`)
const towel = ({ color }) => frame(`${[0, 1, 2].map((i) => `<rect x="${170 + i * 8}" y="${390 - i * 80}" width="260" height="78" rx="18" fill="${shade(color, i % 2 ? -0.12 : 0)}"/><rect x="${170 + i * 8}" y="${452 - i * 80}" width="260" height="10" fill="${shade(color, -0.3)}" opacity=".5"/>`).join('')}${dumbbell(310, 270, 0.55, '#fff')}`)
const gloves = ({ color }) => frame(`<g transform="translate(300 300) rotate(-12) translate(-300 -300)"><path d="M230 250 v-90 q0 -16 16 -16 q16 0 16 16 v80 v-104 q0 -16 16 -16 q16 0 16 16 v104 v-96 q0 -16 16 -16 q16 0 16 16 v96 v-74 q0 -16 16 -16 q16 0 16 16 v150 q0 110 -100 110 q-60 0 -90 -60 l-40 -80 q-8 -16 6 -24 q14 -8 26 6z" fill="${color}"/>
<rect x="232" y="400" width="130" height="50" rx="10" fill="${BLUE}"/>${dumbbell(297, 425, 0.45, '#fff')}</g>`)
const belt = ({ color }) => frame(`<path d="M120 320 q180 -110 360 0 v110 q-180 -110 -360 0z" fill="${color}"/><rect x="270" y="270" width="60" height="110" rx="8" fill="none" stroke="#C9CED6" stroke-width="12"/>
<path d="M120 320 q180 -110 360 0" fill="none" stroke="${shade(color, 0.25)}" stroke-width="4" stroke-dasharray="10 8"/>${dumbbell(400, 320, 0.4, '#fff')}`)
const bag = ({ color }) => frame(`<path d="M230 240 q0 -80 70 -80 q70 0 70 80" fill="none" stroke="${shade(color, -0.3)}" stroke-width="16"/>
<rect x="140" y="240" width="320" height="250" rx="40" fill="${color}"/><rect x="140" y="300" width="320" height="16" fill="${shade(color, -0.3)}"/>${dumbbell(300, 400, 0.9, '#fff')}`)

// ---- بوفه
const cup = ({ color, small }) => frame(`${small ? '' : `<path d="M260 200 q-20 -40 10 -70" stroke="#C7CDD6" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M320 200 q-20 -40 10 -70" stroke="#C7CDD6" stroke-width="8" fill="none" stroke-linecap="round"/>`}
<ellipse cx="300" cy="490" rx="150" ry="24" fill="#E9EDF2"/><path d="M${small ? 220 : 190} ${small ? 330 : 240} h${small ? 160 : 220} l-${small ? 18 : 24} ${small ? 150 : 250} q-2 12 -14 12 h-${small ? 100 : 148} q-12 0 -14 -12z" fill="#fff" stroke="#D5DBE3" stroke-width="4"/>
<path d="M${small ? 380 : 410} ${small ? 360 : 290} q60 0 50 60 q-8 40 -60 40" fill="none" stroke="#D5DBE3" stroke-width="14"/>
<ellipse cx="300" cy="${small ? 334 : 246}" rx="${small ? 76 : 106}" ry="12" fill="${color}"/>`, '#F5EFE8')
const glass = ({ color, straw = true, top = '#fff' }) => frame(`${straw ? `<path d="M330 90 l-40 220" stroke="${BLUE}" stroke-width="14" stroke-linecap="round"/>` : ''}
<path d="M210 170 h180 l-24 330 q-2 14 -16 14 h-100 q-14 0 -16 -14z" fill="${color}"/><path d="M212 190 h176 l-2 26 h-172z" fill="${top}" opacity=".85"/>
<path d="M210 170 h180 l-24 330 q-2 14 -16 14 h-100 q-14 0 -16 -14z" fill="url(#gloss)"/>`, '#F1F5F9')
const water = ({ color }) => frame(`<rect x="270" y="100" width="60" height="34" rx="6" fill="${color}"/><path d="M262 134 h76 v30 q40 26 40 70 v256 q0 18 -18 18 h-120 q-18 0 -18 -18 v-256 q0 -44 40 -70z" fill="#D9ECFA" stroke="#A9CCEA" stroke-width="4"/>
<rect x="222" y="300" width="156" height="90" fill="${color}"/>${label(300, 356, 'AQUA', 30, '#fff', 900, 3)}`, '#F1F5F9')
const sandwich = () => frame(`<path d="M150 420 L300 200 L450 420z" fill="#E7B86A"/><path d="M170 400 L300 215 L430 400z" fill="#F6E2B8"/><path d="M165 410 h270" stroke="#5DAA4A" stroke-width="18" stroke-linecap="round"/>
<path d="M175 380 h250" stroke="#D9534F" stroke-width="12" stroke-linecap="round" opacity=".9"/><path d="M150 440 L300 220 L450 440z" fill="#E1A955"/>`, '#F5EFE8')
const bowl = ({ fill }) => frame(`<ellipse cx="300" cy="330" rx="180" ry="44" fill="${fill}"/>${fill === '#E9D5B1' ? '<circle cx="250" cy="320" r="16" fill="#7B4FA0"/><circle cx="330" cy="315" r="14" fill="#D9534F"/><circle cx="290" cy="335" r="12" fill="#F2C14E"/>' : '<circle cx="240" cy="320" r="22" fill="#5DAA4A"/><circle cx="300" cy="312" r="20" fill="#D9534F"/><circle cx="360" cy="322" r="22" fill="#F2C14E"/><rect x="270" y="326" width="70" height="18" rx="8" fill="#C98A4B"/>'}
<path d="M120 330 q0 170 180 170 q180 0 180 -170z" fill="${BLUE}"/><path d="M150 360 q40 110 150 110" fill="none" stroke="#fff" stroke-width="6" opacity=".35"/>`, '#F5EFE8')
const bar = ({ color }) => frame(`<g transform="rotate(-14 300 320)"><rect x="140" y="270" width="320" height="100" rx="18" fill="${color}"/><path d="M140 290 l-24 -10 v80 l24 -10z" fill="${shade(color, -0.3)}"/><path d="M460 290 l24 -10 v80 l-24 -10z" fill="${shade(color, -0.3)}"/>
${label(300, 334, 'PROTEIN', 34, '#fff', 900, 4)}</g>`, '#F1F5F9')

// ---------------- فهرست
const S = (slug, fn, o) => [slug, fn(o)]
const shop = [
  S('whey-2kg', tub, { color: BLUE, brand: 'IRONLAB', name: 'WHEY', sub: '2 KG' }),
  S('whey-iso-2kg', tub, { color: '#1A1A1A', brand: 'IRONLAB', name: 'ISO', sub: 'ISOLATE 2 KG' }),
  S('whey-1kg', tub, { color: '#3A86D4', brand: 'POWERFIT', name: 'WHEY', sub: '1 KG', big: false }),
  S('casein-1kg', tub, { color: '#6B4FA0', brand: 'NUTRIMAX', name: 'CASEIN', sub: 'NIGHT 1 KG', big: false }),
  S('mass-gainer-3kg', tub, { color: '#C0392B', brand: 'BODYPRO', name: 'GAINER', sub: '3 KG' }),
  S('creatine-300', tub, { color: '#2C3E50', brand: 'IRONLAB', name: 'CREATINE', sub: '300 G', big: false }),
  S('creatine-500', tub, { color: '#1F7A8C', brand: 'POWERFIT', name: 'CREATINE', sub: '500 G', big: false }),
  S('bcaa-400', tub, { color: '#E67E22', brand: 'NUTRIMAX', name: 'BCAA', sub: '2:1:1', big: false }),
  S('eaa-350', tub, { color: '#16A085', brand: 'BODYPRO', name: 'EAA', sub: '350 G', big: false }),
  S('glutamine-300', tub, { color: '#7F8C8D', brand: 'IRONLAB', name: 'GLUTAMINE', sub: '300 G', big: false }),
  S('preworkout-300', tub, { color: '#D35400', brand: 'POWERFIT', name: 'PRE', sub: 'WORKOUT', big: false }),
  S('citrulline-200', tub, { color: '#8E44AD', brand: 'NUTRIMAX', name: 'CITRULLINE', sub: '200 G', big: false }),
  S('beta-alanine-250', tub, { color: '#27AE60', brand: 'BODYPRO', name: 'BETA', sub: 'ALANINE', big: false }),
  S('l-carnitine', liquid, { color: '#E74C3C', brand: 'POWERFIT', name: 'L-CARN' }),
  S('fat-burner', pills, { color: '#C0392B', brand: 'BODYPRO', name: 'BURN', sub: '90 CAPS' }),
  S('omega3', pills, { color: '#F1C40F', brand: 'NUTRIMAX', name: 'OMEGA 3', sub: '60 SOFTGELS' }),
  S('multivitamin', pills, { color: BLUE, brand: 'IRONLAB', name: 'MULTI', sub: 'SPORT 60' }),
  S('vitamin-d3', pills, { color: '#F39C12', brand: 'NUTRIMAX', name: 'D3', sub: '1000 IU' }),
  S('zma', pills, { color: '#34495E', brand: 'POWERFIT', name: 'ZMA', sub: '90 CAPS' }),
  S('magnesium', pills, { color: '#1ABC9C', brand: 'NUTRIMAX', name: 'MAG', sub: '120 TABS' }),
  S('collagen', pouch, { color: '#E8A0B4', brand: 'BODYPRO', name: 'COLLAGEN' }),
  S('protein-bar-box', box, { color: '#6E4B3A', brand: 'IRONLAB', name: 'BAR', sub: '12 x 60G' }),
  S('electrolyte', pouch, { color: '#2E86DE', brand: 'POWERFIT', name: 'HYDRA' }),
  S('oats-powder', pouch, { color: '#C8A26B', brand: 'NUTRIMAX', name: 'OATS' }),
  S('peanut-butter', tub, { color: '#A0522D', brand: 'BODYPRO', name: 'PEANUT', sub: 'BUTTER', big: false }),
  S('tshirt-dry', tee, { color: '#1E1E1E' }),
  S('tank-top', tank, { color: '#3A3F47' }),
  S('hoodie', hoodie, { color: NAVY }),
  S('joggers', pants, { color: '#2B2B2B' }),
  S('women-long-tee', longtee, { color: '#4B4E57' }),
  S('women-leggings', leggings, { color: '#1F2A44' }),
  S('shaker-700', shaker, { color: BLUE }),
  S('bottle-1l', bottle, { color: '#1E1E1E' }),
  S('towel', towel, { color: BLUE }),
  S('gloves', gloves, { color: '#232323' }),
  S('lifting-belt', belt, { color: '#2B2B2B' }),
  S('gym-bag', bag, { color: '#1E1E1E' }),
]
const canteen = [
  S('espresso', cup, { color: '#4A2C1A', small: true }),
  S('americano', cup, { color: '#3B2416' }),
  S('latte', glass, { color: '#C8A27C', straw: false, top: '#F3E5D3' }),
  S('cappuccino', cup, { color: '#D9B48F' }),
  S('shake-chocolate', glass, { color: '#6E4B3A' }),
  S('shake-banana', glass, { color: '#F2D27A' }),
  S('smoothie-berry', glass, { color: '#9B3D6E' }),
  S('orange-juice', glass, { color: '#F39C12', straw: true, top: '#F8C471' }),
  S('water', water, { color: BLUE }),
  S('isotonic', water, { color: '#16A085' }),
  S('chicken-sandwich', sandwich, {}),
  S('egg-white-sandwich', sandwich, {}),
  S('oats-bowl', bowl, { fill: '#E9D5B1' }),
  S('chicken-salad', bowl, { fill: '#7FB069' }),
  S('protein-bar', bar, { color: '#6E4B3A' }),
]
for (const [slug, svg] of shop) fs.writeFileSync(path.join(shopDir, `${slug}.svg`), svg)
for (const [slug, svg] of canteen) fs.writeFileSync(path.join(canteenDir, `${slug}.svg`), svg)
console.log(`shop ${shop.length}, canteen ${canteen.length}`)
