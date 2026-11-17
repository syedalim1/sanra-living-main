const makeSvg = (title, sub, icon = "📦") => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
  <rect width="800" height="600" fill="#F8FAFC"/>
  <rect x="24" y="24" width="752" height="552" rx="12" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="8 8" fill="#FFFFFF"/>
  <circle cx="400" cy="230" r="54" fill="#F1F5F9"/>
  <text x="400" y="248" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="40" text-anchor="middle" fill="#475569">${icon}</text>
  <text x="400" y="325" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0F172A">${title}</text>
  <text x="400" y="365" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="15" text-anchor="middle" fill="#64748B">${sub}</text>
  <rect x="280" y="415" width="240" height="32" rx="16" fill="#F1F5F9"/>
  <text x="400" y="436" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" text-anchor="middle" fill="#334155">SANRA LIVING • FACTORY DIRECT</text>
</svg>
`.trim();

const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

const images = [
  { file: 'hero-workstation.svg', title: 'Industrial Steel Workstation & Dining Frame', sub: 'Telescopic Zero-Shake Assembly • SIDCO Coimbatore', icon: '🏭' },
  { file: 'cat-dining-tables.svg', title: 'Cafe & Dining Tables', sub: 'Commercial MIG Welded Heavy Gauge Steel Frames', icon: '🍽️' },
  { file: 'cat-workstations.svg', title: 'Office & Workstation Tables', sub: 'Modular Heavy-Duty Steel Base with Cable Channels', icon: '💻' },
  { file: 'cat-chairs-stools.svg', title: 'SS & MS Chairs / Bar Stools', sub: 'Precision Argon TIG Welded Heavy Load Ergonomics', icon: '🪑' },
  { file: 'cat-utility-stands.svg', title: 'Home Utility Stands', sub: 'High-Load Appliance & Heavy Duty Storage', icon: '🧺' },
  { file: 'cat-boutique-racks.svg', title: 'Boutique & Showroom Racks', sub: 'Minimal Architectural Powder-Coated Display Racks', icon: '👗' },
  { file: 'cat-hospital-lab.svg', title: 'Hospital, Canteen & Lab SS', sub: 'Jindal SS Grade Anti-Corrosion Sanitary Systems', icon: '🧪' },
  { file: 'joint-standard.svg', title: 'Conventional Flat-Plate Joint', sub: 'Wobbles under dynamic loads • Prone to micro-flex & bolt loosening', icon: '⚠️' },
  { file: 'joint-sanra.svg', title: 'SANRA Telescopic Lock™', sub: 'Internal sleeve locking structure • 200 Kg Tested Rock-Steady Stability', icon: '🛡️' },
  { file: 'delivery-tempo.svg', title: 'Fully Welded Factory Delivery', sub: 'Coimbatore Local Direct Tempo Dispatch', icon: '🚚' },
  { file: 'delivery-flatpack.svg', title: '5-Min Knock-Down Flat-Pack', sub: 'Pan-India Reinforced Courier Crate Dispatch', icon: '📦' },
  { file: 'bay-welding.svg', title: 'CO2 MIG & Argon TIG Welding', sub: 'Deep-penetration bead consistency across structural steel', icon: '⚡' },
  { file: 'bay-pipe-stock.svg', title: 'Tata MS & Jindal SS Pipe Stock', sub: 'Prime structural steel tubes directly cut & prepared', icon: '🏗️' },
  { file: 'bay-bumper-frame.svg', title: 'Protective Steel Bumper Frame Fitting', sub: 'Rigid perimeter reinforcements for heavy daily wear', icon: '⚙️' },
  { file: 'bay-qa-plate.svg', title: '200 Kg Surface Plate QA Inspection', sub: 'Laser verified true level and continuous static load tolerance', icon: '🔍' },
];

images.forEach(img => {
  fs.writeFileSync(path.join(imgDir, img.file), makeSvg(img.title, img.sub, img.icon));
});

console.log('Successfully generated placeholder images in /public/images');
