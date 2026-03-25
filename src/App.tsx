import { useState, useCallback } from "react";

const PALET_VOL = 0.8 * 1.2 * 1.8;

function parseNumber(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/\./g, "").replace(",", ".")) || 0;
}

function parseData(raw) {
  const lines = raw.trim().split("\n").filter(l => l.trim());
  let hi = lines.findIndex(l => /n.*pedido/i.test(l) || /peso/i.test(l));
  if (hi === -1) hi = 0;
  const headers = lines[hi].split("\t").map(h => h.trim().toLowerCase());
  const pi = headers.findIndex(h => /peso/i.test(h));
  const vi = headers.findIndex(h => /volumen/i.test(h));
  let totalKg = 0, totalVol = 0, count = 0;
  for (let i = hi + 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.filter(c => c.trim()).length <= 2) continue;
    const kg = pi >= 0 ? parseNumber(cols[pi]) : 0;
    const vol = vi >= 0 ? parseNumber(cols[vi]) : 0;
    if (kg === 0 && vol === 0) continue;
    totalKg += kg; totalVol += vol; count++;
  }
  return { count, totalKg, totalVol };
}

const today = new Date();
const todayLong = today.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const todayShort = today.toLocaleDateString("es-ES");
const todayTime = today.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// SVG truck icons
const TruckSmall = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="20" height="13" rx="2" fill="#1e3a5f"/>
    <rect x="21" y="7" width="9" height="10" rx="1.5" fill="#2563eb"/>
    <rect x="22" y="8.5" width="7" height="5" rx="1" fill="#bfdbfe"/>
    <circle cx="6" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="6" cy="18" r="1" fill="#f59e0b"/>
    <circle cx="24" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="24" cy="18" r="1" fill="#f59e0b"/>
    <rect x="1" y="15" width="29" height="2" rx="0" fill="#1e3a5f"/>
  </svg>
);

const TruckTrailer = ({ size = 38 }) => (
  <svg width={size} height={size * 22/48} viewBox="0 0 48 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="13" height="12" rx="2" fill="#1e3a5f"/>
    <rect x="14" y="6.5" width="6" height="8" rx="1" fill="#2563eb"/>
    <rect x="15" y="7.5" width="4" height="4" rx="0.5" fill="#bfdbfe"/>
    <rect x="20" y="3" width="26" height="13" rx="2" fill="#1e3a5f"/>
    <rect x="21" y="4" width="24" height="11" rx="1" fill="#1e4080"/>
    <line x1="28" y1="4" x2="28" y2="15" stroke="#2563eb" strokeWidth="0.8"/>
    <line x1="35" y1="4" x2="35" y2="15" stroke="#2563eb" strokeWidth="0.8"/>
    <line x1="42" y1="4" x2="42" y2="15" stroke="#2563eb" strokeWidth="0.8"/>
    <circle cx="5" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="5" cy="18" r="1" fill="#f59e0b"/>
    <circle cx="26" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="26" cy="18" r="1" fill="#f59e0b"/>
    <circle cx="34" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="34" cy="18" r="1" fill="#f59e0b"/>
    <circle cx="42" cy="18" r="2.5" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1"/>
    <circle cx="42" cy="18" r="1" fill="#f59e0b"/>
    <rect x="1" y="15.5" width="46" height="1.5" rx="0" fill="#374151"/>
  </svg>
);

function TruckIcons({ palets }) {
  if (palets <= 0) return null;
  const trailers = Math.floor(palets / 16);
  const remaining = palets % 16;
  const smalls = Math.ceil(remaining / 8);
  const items = [];
  for (let i = 0; i < trailers; i++) items.push({ type: "trailer", key: `t${i}` });
  for (let i = 0; i < smalls; i++) items.push({ type: "small", key: `s${i}` });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
      {items.map(item => (
        <div key={item.key} title={item.type === "trailer" ? "Trailer (16 palés)" : "Furgón (8 palés)"}>
          {item.type === "trailer" ? <TruckTrailer size={42} /> : <TruckSmall size={28} />}
        </div>
      ))}
      <div style={{ fontSize: 10, color: "#1e3a5f", fontWeight: 600, marginLeft: 2, lineHeight: 1.3 }}>
        {trailers > 0 && <div>{trailers} trailer{trailers > 1 ? "s" : ""}</div>}
        {smalls > 0 && <div>{smalls} furgón{smalls > 1 ? "es" : ""}</div>}
      </div>
    </div>
  );
}

function buildCanvas(result) {
  const W = 800, H = 500;
  const c = document.createElement("canvas");
  c.width = W * 2; c.height = H * 2;
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // header
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#1e3a5f"); grad.addColorStop(1, "#2563eb");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, 60, 0);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px system-ui,sans-serif";
  ctx.fillText("Previsión Diaria SEUR", 20, 26);
  ctx.font = "12px system-ui,sans-serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText(`${todayShort}  ·  ${todayTime}h`, 20, 48);
  ctx.globalAlpha = 1;

  // KPI cards
  const cards = [
    { label: "Envíos", value: String(result.adjCount), color: "#6366f1" },
    { label: "Kg estimados", value: `${result.adjKg.toFixed(0)} kg`, color: "#f59e0b" },
    { label: "Volumen", value: `${result.adjVol.toFixed(2)} m³`, color: "#10b981" },
  ];
  const cw = (W - 40 - 8 * 2) / 4;
  cards.forEach((card, i) => {
    const x = 20 + i * (cw + 8), y = 72;
    ctx.fillStyle = "#f8fafc"; roundRect(ctx, x, y, cw, 86, 8);
    ctx.fillStyle = card.color; ctx.fillRect(x, y, cw, 3);
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px system-ui"; ctx.fillText(card.label, x + 10, y + 20);
    ctx.fillStyle = card.color; ctx.font = "bold 26px system-ui"; ctx.fillText(card.value, x + 10, y + 60);
  });
  // palés card
  const px = 20 + 3 * (cw + 8), py = 72;
  const pg = ctx.createLinearGradient(px, py, px + cw, py + 86);
  pg.addColorStop(0, "#fbbf24"); pg.addColorStop(1, "#f59e0b");
  ctx.fillStyle = pg;
  ctx.shadowColor = "rgba(251,191,36,0.5)"; ctx.shadowBlur = 10;
  roundRect(ctx, px, py, cw, 86, 8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1e3a5f"; ctx.font = "bold 10px system-ui"; ctx.fillText("PALÉS NECESARIOS", px + 10, py + 18);
  ctx.font = "bold 38px system-ui"; ctx.fillText(String(result.palets), px + 10, py + 62);

  // truck label
  const trailers = Math.floor(result.palets / 16);
  const smalls = Math.ceil((result.palets % 16) / 8);
  let truckTxt = "";
  if (trailers > 0) truckTxt += `${trailers} trailer${trailers > 1 ? "s" : ""}  `;
  if (smalls > 0) truckTxt += `${smalls} furgón${smalls > 1 ? "es" : ""}`;
  ctx.fillStyle = "#1e3a5f"; ctx.font = "bold 10px system-ui"; ctx.fillText(truckTxt.trim(), px + 10, py + 80);

  // chart
  const chartX = 60, chartY = 186, chartH = 240, chartW = W - 80;
  ctx.fillStyle = "#f8fafc"; roundRect(ctx, 20, 176, W - 40, chartH + 50, 8);

  const bars = [
    { label: "Envíos", val: result.adjCount, color: "#6366f1" },
    { label: "Kg", val: Math.round(result.adjKg), color: "#f59e0b" },
    { label: "Vol.×100", val: Math.round(result.adjVol * 100), color: "#10b981" },
    { label: "Palés", val: result.palets, color: "#fbbf24" },
  ];
  const maxVal = Math.max(...bars.map(b => b.val));
  const bw = 60, gap = (chartW - bars.length * bw) / (bars.length + 1);

  for (let g = 0; g <= 4; g++) {
    const gy = chartY + chartH - (g / 4) * chartH;
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(chartX, gy); ctx.lineTo(chartX + chartW, gy); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px system-ui"; ctx.textAlign = "right";
    ctx.fillText(Math.round((g / 4) * maxVal), chartX - 4, gy + 4);
  }
  ctx.textAlign = "left";

  bars.forEach((b, i) => {
    const bx = chartX + gap + i * (bw + gap);
    const bh = (b.val / maxVal) * chartH;
    const by = chartY + chartH - bh;
    ctx.fillStyle = b.color; roundRectTop(ctx, bx, by, bw, bh, 5);
    ctx.fillStyle = "#1e3a5f"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center";
    ctx.fillText(b.val, bx + bw / 2, by - 6);
    ctx.fillStyle = "#64748b"; ctx.font = "11px system-ui";
    ctx.fillText(b.label, bx + bw / 2, chartY + chartH + 18);
    ctx.textAlign = "left";
  });

  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath(); ctx.fill();
}
function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill();
}

export default function App() {
  const [raw, setRaw] = useState("");
  const [factor, setFactor] = useState(0.9);
  const [margin, setMargin] = useState(1.2);
  const [result, setResult] = useState(null);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const calculate = useCallback(() => {
    if (!raw.trim()) return;
    const { count, totalKg, totalVol } = parseData(raw);
    const adjCount = Math.ceil(count * margin);
    const adjKg = totalKg * margin;
    const adjVol = (totalVol / factor) * margin;   // volumen final estimado
    const palets = Math.ceil(adjVol * 1.1);
    setResult({ adjCount, adjKg, adjVol, palets });
  }, [raw, factor, margin]);

  const copyImage = useCallback(async () => {
    if (!result) return;
    const canvas = buildCanvas(result);
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedImg(true);
      } catch {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `prevision_seur_${todayShort.replace(/\//g, "-")}.png`;
        a.click();
        setCopiedImg(true);
      }
      setTimeout(() => setCopiedImg(false), 3000);
    });
  }, [result]);

  const emailText = result ? `Previsión de recogida — ${todayShort}

Estimado equipo de SEUR,

Les enviamos la previsión de recogida para el día de hoy.

📦 Envíos estimados:   ${result.adjCount} pedidos
⚖️  Peso estimado:      ${result.adjKg.toFixed(0)} kg
📐 Volumen estimado:   ${result.adjVol.toFixed(2)} m³

🟨 PALÉS NECESARIOS:  ${result.palets} PALÉS

Quedamos a su disposición para cualquier consulta.

Un saludo,` : "";

  const copyText = async () => {
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:2;">
      <p>Previsión de recogida — ${todayShort}</p>
      <p>Estimado equipo de SEUR,</p>
      <p>Les enviamos la previsión de recogida para el día de hoy.</p>
      <p>📦 Envíos estimados: &nbsp; ${result.adjCount} pedidos<br/>
      ⚖️ Peso estimado: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${result.adjKg.toFixed(0)} kg<br/>
      📐 Volumen estimado: &nbsp;${result.adjVol.toFixed(2)} m³</p>
      <p><span style="background-color:#fef08a;padding:4px 10px;border-radius:4px;font-weight:700;font-size:15px;">🟨 PALÉS NECESARIOS: &nbsp; ${result.palets} PALÉS</span></p>
      <p>Quedamos a su disposición para cualquier consulta.</p>
      <p>Un saludo,</p>
    </div>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([emailText], { type: "text/plain" }),
        })
      ]);
    } catch {
      navigator.clipboard.writeText(emailText);
    }
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const bars = result ? [
    { label: "Envíos", val: result.adjCount, color: "#6366f1" },
    { label: "Kg", val: Math.round(result.adjKg), color: "#f59e0b" },
    { label: "Vol.×100", val: Math.round(result.adjVol * 100), color: "#10b981" },
    { label: "Palés", val: result.palets, color: "#fbbf24" },
  ] : [];
  const maxVal = bars.length ? Math.max(...bars.map(b => b.val)) : 1;

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 860, margin: "0 auto", padding: "24px 16px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#fff" }}>
        <div style={{ fontSize: 11, opacity: .7, textTransform: "uppercase", letterSpacing: 1 }}>Herramienta de previsión</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>📦 Previsión Diaria SEUR</div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>{todayLong}</div>
      </div>

      {/* Input */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={{ fontWeight: 600, marginBottom: 10, color: "#1e3a5f" }}>1. Pega los datos del Excel</div>
        <textarea value={raw} onChange={e => setRaw(e.target.value)}
          placeholder="Copia y pega aquí todas las filas del Excel (incluyendo la cabecera)..."
          style={{ width: "100%", height: 120, padding: 12, borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
      </div>

      {/* Config */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={{ fontWeight: 600, marginBottom: 14, color: "#1e3a5f" }}>2. Ajusta los parámetros</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Factor de cubicaje <span style={{ fontSize: 11 }}>(eficiencia real del palé)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min="0.6" max="1" step="0.05" value={factor} onChange={e => setFactor(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "#10b981" }} />
              <span style={{ fontWeight: 700, color: "#10b981", width: 40, textAlign: "right" }}>{Math.round(factor * 100)}%</span>
            </div>
          </label>
          <label style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Margen global <span style={{ fontSize: 11 }}>(envíos, kg y volumen)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min="1" max="2" step="0.05" value={margin} onChange={e => setMargin(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "#2563eb" }} />
              <span style={{ fontWeight: 700, color: "#2563eb", width: 40, textAlign: "right" }}>+{Math.round((margin - 1) * 100)}%</span>
            </div>
          </label>
        </div>
      </div>

      {/* Calc button */}
      <button onClick={calculate} disabled={!raw.trim()}
        style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: raw.trim() ? "linear-gradient(135deg,#2563eb,#1e3a5f)" : "#cbd5e1", color: "#fff", fontWeight: 700, fontSize: 16, border: "none", cursor: raw.trim() ? "pointer" : "not-allowed", marginBottom: 24 }}>
        Calcular previsión →
      </button>

      {result && (<>
        {/* EMAIL TEXT — arriba */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 600, color: "#1e3a5f", marginBottom: 12 }}>✉️ Texto del correo</div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 2, whiteSpace: "pre-wrap", color: "#374151", border: "1px solid #e2e8f0", fontFamily: "inherit" }}>
                          {emailText.split("\n").map((line, i) =>
                line.includes("PALÉS NECESARIOS") ? (
                  <span key={i} style={{ background: "#fef08a", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{line}</span>
                ) : (
                  <span key={i}>{line}{"\n"}</span>
                )
              )}
          </div>
        </div>

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button onClick={copyText}
            style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: copiedTxt ? "#10b981" : "linear-gradient(135deg,#2563eb,#1e3a5f)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
            {copiedTxt ? "✓ Texto copiado" : "📋 Copiar texto del correo"}
          </button>
          <button onClick={copyImage}
            style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: copiedImg ? "#10b981" : "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1e3a5f", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
            {copiedImg ? "✓ Imagen copiada / descargada" : "📸 Copiar gráfico como imagen"}
          </button>
        </div>

        {/* KPI CARDS — debajo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Envíos", value: result.adjCount, color: "#6366f1", icon: "📦" },
            { label: "Kg estimados", value: `${result.adjKg.toFixed(0)} kg`, color: "#f59e0b", icon: "⚖️" },
            { label: "Volumen", value: `${result.adjVol.toFixed(2)} m³`, color: "#10b981", icon: "📐" },
          ].map((k, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "14px 12px", borderTop: `3px solid ${k.color}`, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
              <div style={{ fontSize: 18 }}>{k.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
          {/* Palés card sin camiones */}
          <div style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 10, padding: "12px", boxShadow: "0 4px 16px rgba(251,191,36,0.55)", border: "2px solid #f59e0b" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#1e3a5f", lineHeight: 1 }}>{result.palets}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Palés</div>
          </div>
        </div>

        {/* BAR CHART */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 600, color: "#1e3a5f", marginBottom: 16 }}>📊 Gráfico</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, padding: "0 10px" }}>
            {bars.map((b, i) => {
              const h = Math.round((b.val / maxVal) * 140);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: b.color }}>{b.val}</div>
                  <div style={{ width: "100%", height: h, background: b.color, borderRadius: "6px 6px 0 0", transition: "height .4s" }} />
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </>)}
    </div>
  );
}