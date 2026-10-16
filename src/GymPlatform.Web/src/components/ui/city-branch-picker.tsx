"use client";

import * as React from "react";

/* ----------------------------------------------------------------------------
 * Shiraz Branch Picker
 * بازسازی ساختار «Nepal Address Picker» (21st.dev) برای شعبه‌های یک شهر:
 * روی منطقه کلیک کن تا زوم شود، روی حوزهٔ شعبه کلیک کن تا انتخاب شود،
 * یا نام محله را بنویس تا نقشه روی شعبه‌های مطابق کوچک شود.
 *
 * هندسه: طرح کلی شهر شماتیک است (نه مرز رسمی شهرداری). هر «حوزه» بخشی از
 * شهر است که به آن شعبه از همه نزدیک‌تر است (دیاگرام ورونوی روی مختصات شعبه‌ها).
 * فقط React لازم است؛ استایل‌ها زیر کلاس .sbp محدود شده‌اند و رنگ‌ها از
 * توکن‌های تم سایت (CSS variables) می‌آیند.
 * -------------------------------------------------------------------------- */

type Point = [number, number];
type BBox = [number, number, number, number];

export interface PickerBranch {
  slug: string;
  name: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  hasMen: boolean;
  hasWomen: boolean;
}

export interface PickerArea {
  id: string;
  name: string;
  sub: string;
  color: string;
}

export interface CityBranchPickerProps<B extends PickerBranch> {
  branches: B[];
  areas: PickerArea[];
  areaOf: (b: B) => string;
  /** طرح کلی شهر به صورت [lat, lng] */
  outline: [number, number][];
  cityName: string;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  /** شعبه‌هایی که با فیلتر فعلی (مثلاً بانوان) جور نیستند */
  dimmed?: Set<string>;
  user?: { lat: number; lng: number } | null;
  distanceOf?: (b: B) => number | null;
  nearestSlug?: string | null;
  formatDistance?: (km: number) => string;
  /** محتوای پایین کارت برای شعبهٔ انتخاب‌شده */
  renderDetails?: (b: B | null) => React.ReactNode;
  className?: string;
}

/* -- geometry -------------------------------------------------------------- */

const VIEW_W = 1000;
const VIEW_H = 640;
const PAD = 26;

type Labeled = { p: Point; l: string }; // l = label of the edge arriving at p

/** Sutherland–Hodgman against the half-plane closer to a than to b; edges keep their source label */
function clipHalf(poly: Labeled[], a: Point, b: Point, label: string): Labeled[] {
  const nx = b[0] - a[0], ny = b[1] - a[1];
  const c = (b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1]) / 2;
  const f = (p: Point) => c - (nx * p[0] + ny * p[1]); // >= 0 inside
  const out: Labeled[] = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[(i - 1 + poly.length) % poly.length].p;
    const Q = poly[i];
    const fp = f(P), fq = f(Q.p);
    const cross = (): Point => {
      const t = fp / (fp - fq);
      return [P[0] + t * (Q.p[0] - P[0]), P[1] + t * (Q.p[1] - P[1])];
    };
    if (fq >= 0) {
      if (fp < 0) out.push({ p: cross(), l: label });
      out.push(Q);
    } else if (fp >= 0) {
      out.push({ p: cross(), l: Q.l });
    }
  }
  return out;
}

function bboxOf(pts: Point[]): BBox {
  let b: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
}
const unionBBox = (bs: BBox[]): BBox =>
  bs.reduce<BBox>((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [Infinity, Infinity, -Infinity, -Infinity]);

function centroid(pts: Point[]): Point {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const k = x0 * y1 - x1 * y0;
    a += k; x += (x0 + x1) * k; y += (y0 + y1) * k;
  }
  if (Math.abs(a) < 1e-6) return pts[0];
  return [x / (3 * a), y / (3 * a)];
}
const areaOfPoly = (pts: Point[]) =>
  Math.abs(pts.reduce((s, [x0, y0], i) => { const [x1, y1] = pts[(i + 1) % pts.length]; return s + x0 * y1 - x1 * y0; }, 0) / 2);
const pathOf = (pts: Point[]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";

type View = { s: number; tx: number; ty: number };
const FULL_VIEW: View = { s: 1, tx: 0, ty: 0 };
function fitView(b: BBox, padding = 1.3, maxScale = 6): View {
  const w = Math.max(40, (b[2] - b[0]) * padding);
  const h = Math.max(40, (b[3] - b[1]) * padding);
  const s = Math.min(VIEW_W / w, VIEW_H / h, maxScale);
  const cx0 = (b[0] + b[2]) / 2, cy0 = (b[1] + b[3]) / 2;
  return { s, tx: VIEW_W / 2 - cx0 * s, ty: VIEW_H / 2 - cy0 * s };
}

function useElementWidth<T extends Element>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const norm = (s: string) => s.replace(/[‌\s]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");

/* -- scoped styles (رنگ‌ها از توکن‌های سایت) -------------------------------- */

const CSS = `
.sbp{--sbp-bg:#fff;--sbp-fg:var(--color-chalk,#2c2c2c);--sbp-muted:var(--color-steel,#f7f7f7);--sbp-muted-fg:var(--color-rubber,#6b6b6b);
  --sbp-border:var(--color-steel-2,#e5e5e5);--sbp-ring:var(--color-plate,#0b5fb0);--sbp-accent:var(--color-plate,#0b5fb0);
  width:100%;overflow:hidden;border:1px solid var(--sbp-border);border-radius:4px;background:var(--sbp-bg);color:var(--sbp-fg);
  font-size:14px;line-height:1.5;box-shadow:0 20px 50px -30px rgb(0 0 0/.25)}
.sbp *,.sbp *::before,.sbp *::after{box-sizing:border-box}
.sbp button,.sbp input{font:inherit;color:inherit;margin:0}
.sbp button{background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.sbp h3,.sbp p{margin:0}
.sbp :focus-visible{outline:2px solid var(--sbp-ring);outline-offset:1px}
.sbp-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid var(--sbp-border)}
.sbp-crumbs{display:flex;align-items:center;gap:6px;min-width:0}
.sbp .sbp-crumb{border-radius:3px;padding:2px 4px;color:var(--sbp-muted-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s}
.sbp .sbp-crumb:hover{color:var(--sbp-fg)}
.sbp .sbp-crumb[aria-current]{color:var(--sbp-fg);font-weight:700}
.sbp-chev{width:14px;height:14px;flex-shrink:0;color:var(--sbp-muted-fg);opacity:.6;transform:scaleX(-1)}
.sbp-inline{display:flex;align-items:center;gap:8px}
.sbp-label{color:var(--sbp-muted-fg)}
.sbp .sbp-input{height:40px;border:1px solid var(--sbp-border);border-radius:3px;background:var(--sbp-bg);padding:0 12px;outline:none;min-width:0;width:190px}
.sbp .sbp-input::placeholder{color:var(--sbp-muted-fg);opacity:.7}
.sbp .sbp-input:focus-visible{outline:2px solid var(--sbp-ring);outline-offset:0}
.sbp-body{display:grid}
.sbp-map{position:relative;display:flex;align-items:center;border-bottom:1px solid var(--sbp-border);
  background:radial-gradient(circle at 1px 1px,rgb(0 0 0/.07) 1px,transparent 0) 0 0/18px 18px, var(--sbp-muted)}
.sbp-svg{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none}
.sbp-zoom{transition:transform 700ms cubic-bezier(.22,.8,.24,1)}
.sbp-region{cursor:pointer;transition:fill-opacity .3s}
.sbp-pin{cursor:pointer;transition:opacity .3s}
.sbp-readout{pointer-events:none;position:absolute;right:12px;top:12px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.sbp-chip{display:flex;align-items:baseline;gap:8px;border:1px solid var(--sbp-border);border-radius:3px;padding:4px 10px;
  background:color-mix(in srgb,var(--sbp-bg) 92%,transparent);backdrop-filter:blur(6px);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.sbp-chip-status{font-size:12px;color:var(--sbp-muted-fg)}
.sbp .sbp-inset{position:absolute;right:12px;bottom:12px;width:96px;padding:6px;border:1px solid var(--sbp-border);border-radius:3px;
  background:color-mix(in srgb,var(--sbp-bg) 92%,transparent);backdrop-filter:blur(6px);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.sbp .sbp-inset:hover{background:var(--sbp-bg)}
.sbp-inset svg{display:block;width:100%;height:auto}
.sbp-list{display:flex;flex-direction:column;min-height:0;max-height:22rem}
.sbp-list-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:14px 18px 8px}
.sbp-list-head h3{font-size:15px;font-weight:700}
.sbp-ul{list-style:none;margin:0;padding:0 8px 8px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.sbp .sbp-item{position:relative;display:flex;width:100%;align-items:center;gap:12px;border-radius:3px;padding:8px 12px;transition:background .15s}
.sbp .sbp-item.sbp-item-lg{padding:10px 8px;margin-top:4px}
.sbp .sbp-item:hover,.sbp .sbp-item[aria-pressed=true]{background:var(--sbp-muted)}
.sbp .sbp-item[aria-pressed=true]{font-weight:700}
.sbp-swatch{width:12px;height:12px;border-radius:999px;flex-shrink:0}
.sbp-bar{position:absolute;right:0;top:6px;bottom:6px;width:4px;border-radius:999px}
.sbp-grow{flex:1;min-width:0}
.sbp-trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbp-block{display:block}
.sbp-strong{font-weight:700}
.sbp-sub{font-size:12px;font-weight:400;color:var(--sbp-muted-fg)}
.sbp-num{flex-shrink:0;font-size:12px;color:var(--sbp-muted-fg);font-variant-numeric:tabular-nums}
.sbp-near{flex-shrink:0;font-size:12px;font-weight:700;color:#fff;background:var(--sbp-accent);border-radius:3px;padding:2px 8px}
.sbp-footer{padding:14px 18px;border-top:1px solid var(--sbp-border)}
.sbp-empty{color:var(--sbp-muted-fg)}
.sbp-stroke-bg{stroke:var(--sbp-bg)}
.sbp-stroke-fg{stroke:var(--sbp-fg)}
.sbp-fill-muted{fill:var(--sbp-muted-fg)}
.sbp-fill-muted-soft{fill:var(--sbp-muted-fg);fill-opacity:.3}
.sbp-text{fill:var(--sbp-fg);stroke:var(--sbp-bg)}
.sbp-text-sub{fill:var(--sbp-muted-fg)}
@media (min-width:640px){.sbp .sbp-inset{width:132px}}
@media (min-width:768px){
  .sbp-body{grid-template-columns:minmax(0,1fr) 18rem}
  .sbp-map{border-bottom:0;border-left:1px solid var(--sbp-border)}
  .sbp-list{max-height:none;height:0;min-height:100%}
}
@media (prefers-reduced-motion:reduce){.sbp-zoom,.sbp-region,.sbp-pin{transition:none}}
`;

/* -- component ------------------------------------------------------------- */

export function CityBranchPicker<B extends PickerBranch>({
  branches, areas, areaOf, outline, cityName, selected, onSelect, dimmed, user,
  distanceOf, nearestSlug, formatDistance, renderDetails, className,
}: CityBranchPickerProps<B>) {
  const [areaId, setAreaId] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [hoveredArea, setHoveredArea] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [svgRef, svgWidth] = useElementWidth<SVGSVGElement>();
  const uid = React.useId();

  /* projection: lat/lng -> view units, fitted to the outline */
  const geo = React.useMemo(() => {
    const lat0 = outline.reduce((s, p) => s + p[0], 0) / outline.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const raw = (lat: number, lng: number): Point => [lng * k, -lat];
    const rb = bboxOf(outline.map(([la, ln]) => raw(la, ln)));
    const s = Math.min((VIEW_W - 2 * PAD) / (rb[2] - rb[0]), (VIEW_H - 2 * PAD) / (rb[3] - rb[1]));
    const ox = (VIEW_W - (rb[2] - rb[0]) * s) / 2, oy = (VIEW_H - (rb[3] - rb[1]) * s) / 2;
    const proj = (lat: number, lng: number): Point => {
      const [x, y] = raw(lat, lng);
      return [ox + (x - rb[0]) * s, oy + (y - rb[1]) * s];
    };
    const unitsPerKm = s / 111.32; // degrees of latitude -> km
    const city: Labeled[] = outline.map(([la, ln]) => ({ p: proj(la, ln), l: "city" }));
    const sites = branches.map((b) => ({ b, p: proj(b.latitude, b.longitude), area: areaOf(b) }));
    const cells = sites.map((si, i) => {
      let poly = city;
      sites.forEach((sj, j) => {
        if (i === j || poly.length < 3) return;
        if (Math.hypot(si.p[0] - sj.p[0], si.p[1] - sj.p[1]) < 1e-6) return;
        poly = clipHalf(poly, si.p, sj.p, sj.b.slug);
      });
      const pts = poly.map((v) => v.p);
      // area border = edges against the city outline or against a branch of another area
      const borders: string[] = [];
      poly.forEach((v, idx) => {
        const prev = poly[(idx - 1 + poly.length) % poly.length].p;
        const other = sites.find((s2) => s2.b.slug === v.l);
        if (v.l === "city" || (other && other.area !== si.area))
          borders.push(`M${prev[0].toFixed(1)},${prev[1].toFixed(1)}L${v.p[0].toFixed(1)},${v.p[1].toFixed(1)}`);
      });
      return { ...si, pts, d: pts.length > 2 ? pathOf(pts) : "", border: borders.join(""), bbox: bboxOf(pts.length ? pts : [si.p]), label: pts.length > 2 ? centroid(pts) : si.p, size: pts.length > 2 ? areaOfPoly(pts) : 0 };
    });
    const areaGeo = new Map(areas.map((a) => {
      const own = cells.filter((c) => c.area === a.id);
      const tot = own.reduce((s2, c) => s2 + c.size, 0) || 1;
      const label: Point = own.length
        ? [own.reduce((s2, c) => s2 + c.label[0] * c.size, 0) / tot, own.reduce((s2, c) => s2 + c.label[1] * c.size, 0) / tot]
        : [VIEW_W / 2, VIEW_H / 2];
      return [a.id, { area: a, cells: own, bbox: unionBBox(own.map((c) => c.bbox)), label }];
    }));
    return { proj, unitsPerKm, cityPath: pathOf(city.map((v) => v.p)), cells, areaGeo };
  }, [branches, areas, areaOf, outline]);

  const cellBySlug = React.useMemo(() => new Map(geo.cells.map((c) => [c.b.slug, c])), [geo]);
  const area = areaId ? geo.areaGeo.get(areaId) ?? null : null;
  const sel = selected ? cellBySlug.get(selected) ?? null : null;
  const hov = hovered ? cellBySlug.get(hovered) ?? null : null;

  // انتخاب از بیرون (مثلاً «نزدیک‌ترین شعبه») منطقه‌اش را باز می‌کند
  React.useEffect(() => { if (sel) setAreaId(sel.area); }, [sel]);

  const q = norm(query);
  const searching = q.length > 0;
  const matches = React.useMemo(
    () => (searching ? geo.cells.filter((c) => norm(c.b.name + c.b.district + c.b.address).includes(q)) : []),
    [searching, q, geo],
  );
  const matchSet = React.useMemo(() => new Set(matches.map((c) => c.b.slug)), [matches]);

  const view = React.useMemo<View>(() => {
    if (matches.length) return fitView(unionBBox(matches.map((c) => c.bbox)));
    if (area && area.cells.length) return fitView(area.bbox);
    return FULL_VIEW;
  }, [matches, area]);
  React.useEffect(() => setHovered(null), [view]);

  const pxPerUnit = svgWidth ? svgWidth / VIEW_W : 0.8;
  const unit = 1 / (view.s * pxPerUnit);
  const zoomed = view.s > 1.01;

  const pickArea = (id: string) => { setAreaId(id); setHoveredArea(null); setQuery(""); };
  const showAll = () => { setAreaId(null); setQuery(""); };
  const clickCell = (c: (typeof geo.cells)[number]) => {
    if (matches.length || (area && area.area.id === c.area)) { onSelect(c.b.slug); setQuery(""); }
    else pickArea(c.area);
  };

  const fillFor = (c: (typeof geo.cells)[number]): { color: string | null; opacity: number } => {
    const color = geo.areaGeo.get(c.area)?.area.color ?? "#999";
    const off = dimmed?.has(c.b.slug);
    if (matches.length) return matchSet.has(c.b.slug) ? { color, opacity: c.b.slug === hovered ? 1 : 0.85 } : { color: null, opacity: 0.14 };
    if (!area) {
      const ha = hov?.area ?? hoveredArea;
      if (c.b.slug === selected) return { color, opacity: 1 };
      return { color, opacity: (ha ? (c.area === ha ? 0.95 : 0.4) : 0.8) * (off ? 0.45 : 1) };
    }
    if (c.area !== area.area.id) return { color: null, opacity: hov?.area === c.area ? 0.3 : 0.16 };
    if (c.b.slug === selected) return { color, opacity: 1 };
    if (c.b.slug === hovered) return { color, opacity: 0.78 };
    return { color, opacity: off ? 0.2 : 0.45 };
  };

  const labelled = matches.length ? matches : area ? area.cells : [];
  const labelLayout = React.useMemo(() => {
    const placed = new Set<string>();
    if (!zoomed) return placed;
    const kk = view.s * pxPerUnit;
    const boxes: BBox[] = [];
    const free = (b: BBox) => !boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const order = [...labelled].sort((a, b) => Number(b.b.slug === selected) - Number(a.b.slug === selected) || b.size - a.size);
    for (const c of order) {
      const x = c.p[0] * kk, y = c.p[1] * kk;
      const w = c.b.name.length * 7 + 14;
      const box: BBox = [x - w / 2, y - 34, x + w / 2, y - 12];
      if (free(box)) { boxes.push(box); placed.add(c.b.slug); }
    }
    return placed;
  }, [zoomed, view.s, pxPerUnit, labelled, selected]);

  const listMode: "matches" | "area" | "overview" = matches.length ? "matches" : area ? "area" : "overview";
  const status = searching ? (matches.length ? `${matches.length.toLocaleString("fa-IR")} شعبه با «${query.trim()}»` : `شعبه‌ای با «${query.trim()}» پیدا نشد`) : null;
  const crumbBranch = area && sel?.area === area.area.id ? sel : null;
  const userPt = user ? geo.proj(user.lat, user.lng) : null;

  const item = (c: (typeof geo.cells)[number]) => {
    const isSel = c.b.slug === selected;
    const d = distanceOf?.(c.b) ?? null;
    return (
      <li key={c.b.slug} id={`branch-${c.b.slug}`}>
        <button type="button" className="sbp-item" aria-pressed={isSel}
          onClick={() => { onSelect(c.b.slug); setAreaId(c.area); }}
          onMouseEnter={() => setHovered(c.b.slug)} onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(c.b.slug)} onBlur={() => setHovered(null)}>
          {isSel && <span aria-hidden className="sbp-bar" style={{ background: geo.areaGeo.get(c.area)?.area.color }} />}
          <span className="sbp-grow">
            <span className="sbp-block sbp-trunc">{c.b.name}</span>
            <span className="sbp-block sbp-sub sbp-trunc">
              {[c.b.hasMen && "آقایان", c.b.hasWomen && "بانوان"].filter(Boolean).join(" – ")}
            </span>
          </span>
          {d !== null && formatDistance && (
            c.b.slug === nearestSlug
              ? <span className="sbp-near">نزدیک‌ترین، {formatDistance(d)}</span>
              : <span className="sbp-num">{formatDistance(d)}</span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className={cx("sbp", className)} dir="rtl"
      onKeyDown={(e) => { if (e.key !== "Escape") return; if (searching) setQuery(""); else if (area) showAll(); }}>
      <style>{CSS}</style>

      <div className="sbp-header">
        <nav aria-label="مکان روی نقشه" className="sbp-crumbs">
          <button type="button" className="sbp-crumb" aria-current={!area ? "location" : undefined} onClick={showAll}>{cityName}</button>
          {area && (<><Chevron /><button type="button" className="sbp-crumb" aria-current={!crumbBranch ? "location" : undefined} onClick={() => pickArea(area.area.id)}>{area.area.name}</button></>)}
          {crumbBranch && (<><Chevron /><span className="sbp-crumb" aria-current="location">{crumbBranch.b.name}</span></>)}
        </nav>
        <label htmlFor={`${uid}-q`} className="sbp-inline">
          <span className="sbp-label">محله</span>
          <input id={`${uid}-q`} className="sbp-input" type="search" placeholder="مثلاً فرهنگ‌شهر" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="sbp-body">
        <div className="sbp-map">
          <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" className="sbp-svg"
            aria-label={area ? `نقشهٔ منطقهٔ ${area.area.name}` : `نقشهٔ شعبه‌ها در ${cityName}`}
            onMouseLeave={() => setHovered(null)}>
            <g className="sbp-zoom" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`, transformOrigin: "0 0" }}>
              <path d={geo.cityPath} fill="var(--sbp-bg)" stroke="none" />
              {geo.cells.map((c) => {
                const { color, opacity } = fillFor(c);
                return c.d ? (
                  <path key={c.b.slug} d={c.d} aria-hidden vectorEffect="non-scaling-stroke" strokeWidth={0.75} strokeLinejoin="round"
                    className={cx("sbp-region sbp-stroke-bg", !color && "sbp-fill-muted")}
                    style={color ? { fill: color, fillOpacity: opacity } : { fillOpacity: opacity }}
                    onMouseEnter={() => setHovered(c.b.slug)} onClick={() => clickCell(c)} />
                ) : null;
              })}
              {/* مرز مناطق */}
              {geo.cells.map((c) => (
                <path key={c.b.slug + "-b"} d={c.border} aria-hidden fill="none" pointerEvents="none" vectorEffect="non-scaling-stroke"
                  strokeLinecap="round" strokeWidth={area?.area.id === c.area && !matches.length ? 1.5 : 2.5}
                  className={area?.area.id === c.area && !matches.length ? "sbp-stroke-fg" : "sbp-stroke-bg"}
                  style={area?.area.id === c.area && !matches.length ? { strokeOpacity: 0.7 } : undefined} />
              ))}
              {sel && sel.d && (
                <path d={sel.d} aria-hidden fill="none" pointerEvents="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" className="sbp-stroke-fg" />
              )}

              {/* نام مناطق در نمای کلی */}
              {!zoomed && pxPerUnit >= 0.45 && [...geo.areaGeo.values()].filter((a) => a.cells.length).map((a) => (
                <text key={a.area.id} x={a.label[0]} y={a.label[1]} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                  fill="#fff" fontWeight={800} fontSize={15 * unit} style={{ textShadow: "0 1px 3px rgba(0,0,0,.45)" }}>
                  {a.area.name}
                </text>
              ))}

              {/* پین شعبه‌ها */}
              {geo.cells.map((c) => {
                const isSel = c.b.slug === selected;
                const off = dimmed?.has(c.b.slug) || (matches.length > 0 && !matchSet.has(c.b.slug)) || (area && area.area.id !== c.area);
                const r = (isSel ? 9 : 6) * unit;
                return (
                  <g key={c.b.slug + "-pin"} className="sbp-pin" opacity={off ? 0.35 : 1}
                    onClick={() => { onSelect(c.b.slug); setAreaId(c.area); setQuery(""); }}
                    onMouseEnter={() => setHovered(c.b.slug)}>
                    <circle cx={c.p[0]} cy={c.p[1]} r={r + 2.5 * unit} fill="var(--sbp-bg)" />
                    <circle cx={c.p[0]} cy={c.p[1]} r={r} fill={isSel ? "var(--sbp-accent)" : "var(--sbp-fg)"} />
                    <circle cx={c.p[0]} cy={c.p[1]} r={r * 0.38} fill="var(--sbp-bg)" />
                  </g>
                );
              })}

              {userPt && (
                <g pointerEvents="none">
                  <circle cx={userPt[0]} cy={userPt[1]} r={16 * unit} fill="#2563eb" fillOpacity={0.15} />
                  <circle cx={userPt[0]} cy={userPt[1]} r={6 * unit} fill="#2563eb" stroke="#fff" strokeWidth={2.5 * unit} />
                </g>
              )}

              {/* نام شعبه‌ها در نمای زوم‌شده */}
              {zoomed && labelled.filter((c) => labelLayout.has(c.b.slug) || c.b.slug === hovered)
                .sort((a, b) => Number(a.b.slug === hovered) - Number(b.b.slug === hovered))
                .map((c) => (
                  <text key={c.b.slug + "-t"} x={c.p[0]} y={c.p[1] - 16 * unit} textAnchor="middle" pointerEvents="none"
                    fontSize={13 * unit} fontWeight={c.b.slug === selected ? 800 : 600} strokeWidth={4 * unit} strokeLinejoin="round" paintOrder="stroke" className="sbp-text">
                    {c.b.name}
                  </text>
                ))}
            </g>
          </svg>

          <div aria-live="polite" className="sbp-readout">
            {status && <span className="sbp-chip sbp-chip-status">{status}</span>}
            {hov && (
              <span className="sbp-chip">
                <span className="sbp-strong">{zoomed ? hov.b.name : geo.areaGeo.get(hov.area)?.area.name}</span>
                <span className="sbp-sub">{zoomed ? hov.b.district : hov.b.name}</span>
              </span>
            )}
          </div>

          {zoomed && (
            <button type="button" className="sbp-inset" onClick={showAll} aria-label={`نمایش کل ${cityName}`} title={`نمایش کل ${cityName}`}>
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden>
                {geo.cells.map((c) => {
                  const on = matches.length ? matchSet.has(c.b.slug) : area?.area.id === c.area;
                  return c.d ? <path key={c.b.slug} d={c.d} strokeWidth={10} className={cx("sbp-stroke-bg", !on && "sbp-fill-muted-soft")} style={on ? { fill: geo.areaGeo.get(c.area)?.area.color } : undefined} /> : null;
                })}
                <rect x={-view.tx / view.s} y={-view.ty / view.s} width={VIEW_W / view.s} height={VIEW_H / view.s} fill="none" strokeWidth={12} className="sbp-stroke-fg" />
              </svg>
            </button>
          )}
        </div>

        <div className="sbp-list">
          <div className="sbp-list-head">
            <h3>{listMode === "matches" ? `محله‌های «${query.trim()}»` : listMode === "area" ? `منطقهٔ ${area!.area.name}` : "منطقه را انتخاب کن"}</h3>
            {listMode === "area" && <span className="sbp-label">{area!.area.sub}</span>}
          </div>
          <ul className="sbp-ul" role="list">
            {listMode === "overview"
              ? [...geo.areaGeo.values()].filter((a) => a.cells.length).map((a) => (
                <React.Fragment key={a.area.id}>
                  <li>
                    <button type="button" className="sbp-item sbp-item-lg" onClick={() => pickArea(a.area.id)}
                      onMouseEnter={() => setHoveredArea(a.area.id)} onMouseLeave={() => setHoveredArea(null)}
                      onFocus={() => setHoveredArea(a.area.id)} onBlur={() => setHoveredArea(null)}>
                      <span aria-hidden className="sbp-swatch" style={{ background: a.area.color }} />
                      <span className="sbp-grow">
                        <span className="sbp-block sbp-strong">{a.area.name}</span>
                        <span className="sbp-block sbp-sub">{a.area.sub}</span>
                      </span>
                      <span className="sbp-num">{a.cells.filter((c) => !dimmed?.has(c.b.slug)).length.toLocaleString("fa-IR")} شعبه</span>
                    </button>
                  </li>
                  {a.cells.filter((c) => !dimmed?.has(c.b.slug)).map(item)}
                </React.Fragment>
              ))
              : (listMode === "matches" ? matches : area!.cells).filter((c) => !dimmed?.has(c.b.slug)).map(item)}
          </ul>
        </div>
      </div>

      <div className="sbp-footer">
        {renderDetails ? renderDetails(sel?.b ?? null) : <p className="sbp-empty">یک شعبه را روی نقشه یا از فهرست انتخاب کن.</p>}
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="sbp-chev" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

export default CityBranchPicker;
