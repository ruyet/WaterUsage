const CONFIG = {
  dailyLitres: 118,
  targetLitres: 100,
  showerMinutes: 10,
  showerFlowPerMinute: 8,
  shorterMinutes: 2,
  showersPerWeek: 6
};

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;

function progressFor(section) {
  const rect = section.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  if (total <= 0) return clamp(-rect.top / window.innerHeight + 1);
  return clamp(-rect.top / total);
}

const glassesCloud = document.getElementById("glassesCloud");
for (let i = 0; i < 64; i++) {
  const glass = document.createElement("div");
  glass.className = "mini-glass";
  glassesCloud.appendChild(glass);
}

const yearDrops = document.getElementById("yearDrops");
for (let i = 0; i < 42; i++) {
  const drop = document.createElement("div");
  drop.className = "drop";
  yearDrops.appendChild(drop);
}

const savePerShower = CONFIG.shorterMinutes * CONFIG.showerFlowPerMinute;
const savePerYear = savePerShower * CONFIG.showersPerWeek * 52;
document.getElementById("minutesStat").textContent = `${CONFIG.showerMinutes} MIN`;
document.querySelector(".save-badge b").textContent = `≈ ${savePerYear.toLocaleString("en-US")} L LESS PER YEAR*`;

function updateFillScene() {
  const section = document.getElementById("fill");
  const p = progressFor(section);
  const fill = clamp((p - 0.08) / 0.58);
  document.getElementById("waterWord").style.setProperty("--fill-level", `${fill * 100}%`);
}

function updateTapScene() {
  const section = document.getElementById("tap");
  const p = progressFor(section);

  const stream = document.getElementById("waterStream");
  const glass = document.getElementById("glassOne");
  const glassWater = document.getElementById("glassWater");
  const cloud = document.getElementById("glassesCloud");
  const label = document.querySelector(".statement-box");

  const streamP = clamp((p - 0.05) / 0.22);
  stream.style.height = `${lerp(0, 31, streamP)}vh`;
  stream.style.opacity = String(streamP);

  const fillP = clamp((p - 0.18) / 0.22);
  glassWater.style.height = `${fillP * 78}%`;

  const zoomP = clamp((p - 0.36) / 0.2);
  glass.style.transform = `translateX(-50%) scale(${lerp(1, 1.65, zoomP)})`;
  glass.style.opacity = String(lerp(1, 0.12, zoomP));

  const cloudP = clamp((p - 0.48) / 0.28);
  cloud.style.opacity = String(cloudP);
  cloud.style.transform = `scale(${lerp(0.4, 1.08, cloudP)}) rotate(${lerp(-8, 0, cloudP)}deg)`;

  const textP = clamp((p - 0.62) / 0.18);
  label.style.transform = `scale(${lerp(0.75, 1, textP)})`;
  label.style.opacity = String(lerp(0.4, 1, textP));
}

function updateBreakdownScene() {
  const section = document.getElementById("breakdown");
  const p = progressFor(section);

  const cards = [
    document.getElementById("catShower"),
    document.getElementById("catToilet"),
    document.getElementById("catLaundry"),
    document.getElementById("catKitchen")
  ];

  cards.forEach((card, i) => {
    const base = 0.08 + i * 0.09;
    const local = clamp((p - base) / 0.18);
    const y = lerp(52, 0, local);
    const r = [ -6, 5, 7, -5 ][i];
    card.style.opacity = String(local);
    card.style.transform = `rotate(${r}deg) translateY(${y}px) scale(${lerp(0.92, 1, local)})`;
  });

  const sideNote = document.querySelector(".big-side-note");
  const noteP = clamp((p - 0.5) / 0.22);
  sideNote.style.opacity = String(noteP);
  sideNote.style.transform = `translateY(${lerp(20, 0, noteP)}px)`;
}

function updateShowerScene() {
  const section = document.getElementById("shower");
  const p = progressFor(section);

  const fillP = clamp((p - 0.1) / 0.6);
  document.getElementById("showerWord").style.setProperty("--fill-level", `${fillP * 100}%`);

  const stat = document.getElementById("minutesStat");
  const scaleP = clamp((p - 0.34) / 0.2);
  stat.style.transform = `scale(${lerp(0.85, 1.08, scaleP)})`;
}

function updateHabitsScene() {
  const section = document.getElementById("habits");
  const p = progressFor(section);

  const notes = [
    document.getElementById("habitOne"),
    document.getElementById("habitTwo"),
    document.getElementById("habitThree")
  ];

  notes.forEach((note, i) => {
    const local = clamp((p - (0.1 + i * 0.12)) / 0.2);
    note.style.opacity = String(local);
    note.style.transform += ` translateY(${lerp(40, 0, local)}px) scale(${lerp(0.95, 1, local)})`;
  });

  const save = document.getElementById("saveBadge");
  const saveP = clamp((p - 0.54) / 0.16);
  save.style.opacity = String(saveP);
  save.style.transform = `translateY(${lerp(34, 0, saveP)}px)`;
}

function updateYearScene() {
  const section = document.getElementById("year");
  const p = progressFor(section);

  const num = document.querySelector(".year-number");
  const numP = clamp((p - 0.08) / 0.28);
  num.style.transform = `scale(${lerp(0.78, 1.06, numP)})`;

  const drops = document.querySelectorAll(".year-drops .drop");
  const reveal = clamp((p - 0.24) / 0.4);
  drops.forEach((drop, i) => {
    const local = clamp((reveal * drops.length - i) / 12);
    drop.style.opacity = String(local * 0.92);
    drop.style.transform = `scale(${lerp(0.4, 1, local)})`;
  });
}

function updateTargetScene() {
  const section = document.getElementById("target");
  const p = progressFor(section);
  const pill = document.getElementById("differencePill");
  const pillP = clamp((p - 0.36) / 0.2);
  pill.style.opacity = String(pillP);
  pill.style.transform = `translateX(-50%) translateY(${lerp(26, 0, pillP)}px)`;
}

function tick() {
  updateFillScene();
  updateTapScene();
  updateBreakdownScene();
  updateShowerScene();
  updateHabitsScene();
  updateYearScene();
  updateTargetScene();
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      tick();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

window.addEventListener("resize", tick);
tick();

document.getElementById("restartBtn").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
