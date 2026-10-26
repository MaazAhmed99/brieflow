// Generates the small sample files that seeded projects link to
// (public/seed-files). Run once: node scripts/generate-seed-files.mjs
// Everything here is fictional placeholder content.

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const out = "public/seed-files";
mkdirSync(out, { recursive: true });

// ─── PDFs: one page of Helvetica text ────────────────────────────────────────
function pdf(title, lines) {
  const escape = (text) => text.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = [
    `BT /F1 22 Tf 72 770 Td (${escape(title)}) Tj ET`,
    "BT /F1 10 Tf 72 748 Td (Brieflow demo - sample document. All names and content are fictional.) Tj ET",
    ...lines.map((line, i) => `BT /F1 12 Tf 72 ${710 - i * 22} Td (${escape(line)}) Tj ET`),
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

// ─── PNGs: simple shapes drawn into an RGB buffer ────────────────────────────
function png(width, height, draw) {
  const pixels = Buffer.alloc(width * height * 3, 255);
  const rect = (x, y, w, h, [r, g, b]) => {
    for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx++) {
        const i = (yy * width + xx) * 3;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }
  };
  draw(rect);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(typed));
    return Buffer.concat([length, typed, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const gray = [226, 228, 233];
const dark = [120, 124, 135];
const files = {
  "project-brief.pdf": pdf("Project brief", [
    "Goal: a faster, clearer website that turns visitors into enquiries.",
    "Audience: small business owners comparing suppliers on mobile.",
    "Scope: discovery, design, build, QA and launch.",
    "Success metric: +25% enquiry form completions within 3 months.",
  ]),
  "statement-of-work.pdf": pdf("Statement of work", [
    "Phase 1 - Discovery workshop and audit (2 weeks)",
    "Phase 2 - Design: wireframes, visual design, two review rounds",
    "Phase 3 - Build: page templates, CMS, analytics",
    "Phase 4 - QA and launch, then 30 days of support",
    "Payment: 30% deposit, then monthly invoices for work done.",
  ]),
  "sitemap.pdf": pdf("Sitemap", ["Home", "  Services", "  Case studies", "  About", "  Contact", "Blog", "Legal pages"]),
  "moodboard.png": png(960, 600, (rect) => {
    const swatches = [[79, 70, 229], [20, 184, 166], [245, 158, 11], [244, 63, 94], [30, 41, 59], [241, 245, 249]];
    swatches.forEach((color, i) => rect(40 + (i % 3) * 300, 40 + Math.floor(i / 3) * 280, 280, 260, color));
  }),
  "homepage-wireframe.png": png(960, 600, (rect) => {
    rect(0, 0, 960, 64, gray); // header
    rect(40, 20, 120, 24, dark); // logo
    rect(80, 120, 520, 40, dark); // headline
    rect(80, 180, 420, 20, gray);
    rect(80, 230, 160, 44, [79, 70, 229]); // button
    rect(640, 110, 260, 200, gray); // hero image
    [0, 1, 2].forEach((i) => rect(80 + i * 280, 380, 240, 160, gray)); // cards
  }),
};

for (const [name, data] of Object.entries(files)) {
  writeFileSync(`${out}/${name}`, data);
  console.log(name, statSync(`${out}/${name}`).size, "bytes");
}
