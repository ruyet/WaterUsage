const DATA = {
  dailyLitres: 118,
  targetLitres: 100,
  exampleShowerFlow: 8,
  exampleShowerMinutes: 10,
  showerFrequencyPerWeek: 6,
  shorterByMinutes: 2
};

const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max, n));
const lerp = (a,b,t) => a + (b-a)*t;

document.querySelector("#dailyLitres").textContent = DATA.dailyLitres;
document.querySelector("#showerMinutes").textContent = DATA.exampleShowerMinutes;
document.querySelector("#oneShowerLitres").textContent = DATA.exampleShowerMinutes * DATA.exampleShowerFlow;

const savedPerShower = DATA.shorterByMinutes * DATA.exampleShowerFlow;
const savedPerYear = Math.round(savedPerShower * DATA.showerFrequencyPerWeek * 52);
document.querySelector("#savedPerShower").textContent = savedPerShower;
document.querySelector("#savedPerYear").textContent = savedPerYear.toLocaleString("en-US");

// Build a field of glasses. 118 L represented as 236 half-litre glasses in this visual.
const glassesGrid = document.querySelector("#glassesGrid");
const glassCount = 120; // visual density rather than literal count
for(let i=0;i<glassCount;i++){
  const g = document.createElement("div");
  g.className = "mini-glass";
  glassesGrid.appendChild(g);
}

// Decorative year dots
const yearGrid = document.querySelector("#yearGrid");
for(let i=0;i<80;i++){
  const d = document.createElement("div");
  d.className = "year-dot";
  yearGrid.appendChild(d);
}

function sectionProgress(section){
  const rect = section.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  if(scrollable <= 0) return clamp(-rect.top / window.innerHeight + 1);
  return clamp(-rect.top / scrollable);
}

function updateTap(){
  const section = document.querySelector('[data-scene="tap"]');
  const p = sectionProgress(section);
  const stream = section.querySelector(".water-stream");
  const water = section.querySelector(".glass-water");
  const glass = section.querySelector(".glass");

  const flowP = clamp((p-.08)/.42);
  stream.style.opacity = flowP > 0 ? 1 : 0;
  stream.style.height = `${lerp(0, 33, flowP)}vh`;

  const fillP = clamp((p-.28)/.42);
  water.style.height = `${lerp(0, 78, fillP)}%`;

  const zoomP = clamp((p-.64)/.30);
  glass.style.transform = `translateX(-50%) scale(${lerp(1,1.9,zoomP)})`;
  glass.style.opacity = `${lerp(1,.12,zoomP)}`;
}

function updateGlasses(){
  const section = document.querySelector('[data-scene="glasses"]');
  const p = sectionProgress(section);
  const items = [...section.querySelectorAll(".mini-glass")];
  const grid = section.querySelector(".glasses-grid");
  const card = section.querySelector(".floating");

  const reveal = clamp((p-.05)/.58);
  items.forEach((item,i)=>{
    const local = clamp((reveal*items.length-i)/18);
    item.style.opacity = local;
    item.style.transform = `scale(${lerp(.6,1,local)})`;
  });

  const zoom = clamp((p-.48)/.32);
  grid.style.transform = `scale(${lerp(2.25,.82,zoom)})`;
  const showCard = clamp((p-.72)/.2);
  card.style.opacity = showCard;
  card.style.transform = `translateY(${lerp(30,0,showCard)}px)`;
}

function updateBreakdown(){
  const section = document.querySelector('[data-scene="breakdown"]');
  const p = sectionProgress(section);
  const blocks = [...section.querySelectorAll(".usage-block")];
  blocks.forEach((block,i)=>{
    const local = clamp((p - (0.08 + i*.12))/.18);
    block.style.transform = `translateX(${lerp(110,0,local)}%)`;
  });
}

function updateShower(){
  const section = document.querySelector('[data-scene="shower"]');
  const p = sectionProgress(section);
  const counter = section.querySelector(".shower-counter");
  const scale = lerp(.82,1,clamp((p-.08)/.35));
  counter.style.transform = `scale(${scale})`;
  counter.style.transformOrigin = "left bottom";
}

function updateReduce(){
  const section = document.querySelector('[data-scene="reduce"]');
  const p = sectionProgress(section);
  const cards = section.querySelector(".habit-cards");
  const panel = section.querySelector(".savings-panel");

  const move = clamp((p-.1)/.55);
  cards.scrollLeft = move * (cards.scrollWidth - cards.clientWidth);
  panel.style.transform = `translateY(${lerp(30,0,clamp((p-.62)/.2))}px)`;
  panel.style.opacity = clamp((p-.58)/.18);
}

function updateYear(){
  const section = document.querySelector('[data-scene="year"]');
  const p = sectionProgress(section);
  const num = section.querySelector(".year-number strong");
  const grid = section.querySelector(".year-grid");
  const z = clamp((p-.18)/.52);
  num.style.transform = `scale(${lerp(.72,1.04,z)})`;
  grid.style.opacity = lerp(.05,.28,z);
  grid.style.transform = `scale(${lerp(1.8,.95,z)})`;
}

function updateTarget(){
  const section = document.querySelector('[data-scene="target"]');
  const p = sectionProgress(section);
  const current = section.querySelector(".bar.current");
  const goal = section.querySelector(".bar.goal");
  current.style.width = `${lerp(0,100,clamp((p-.08)/.28))}%`;
  goal.style.width = `${lerp(0,(DATA.targetLitres/DATA.dailyLitres)*100,clamp((p-.33)/.28))}%`;
}

function update(){
  updateTap();
  updateGlasses();
  updateBreakdown();
  updateShower();
  updateReduce();
  updateYear();
  updateTarget();
}

let ticking = false;
window.addEventListener("scroll",()=>{
  if(!ticking){
    requestAnimationFrame(()=>{
      update();
      ticking=false;
    });
    ticking=true;
  }
},{passive:true});

window.addEventListener("resize",update);
update();

document.querySelector("#restartBtn").addEventListener("click",()=>{
  window.scrollTo({top:0,behavior:"smooth"});
});
