const state = {
  showerMinutes: 10,
  showersPerWeek: 5,
  dishesPerWeek: 5,
  dishMethod: "basin",
  laundryPerWeek: 2.5
};

const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp = (a,b,t)=>a+(b-a)*t;

function progress(id){
  const el=document.getElementById(id);
  const r=el.getBoundingClientRect();
  const total=r.height-innerHeight;
  return total<=0?clamp(-r.top/innerHeight+1):clamp(-r.top/total);
}

function selectInGroup(container, button){
  [...container.querySelectorAll("button")].forEach(b=>b.classList.remove("active"));
  button.classList.add("active");
}

function bindDial(id, key, callback){
  const dial=document.getElementById(id);
  let startY=null;
  const buttons=[...dial.querySelectorAll(".rotary-btn")];
  buttons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(dial,btn);
      state[key]=Number(btn.dataset.value);
      callback?.();
    });
  });
  dial.addEventListener("pointerdown",e=>{
    startY=e.clientY;
    dial.setPointerCapture?.(e.pointerId);
  });
  dial.addEventListener("pointerup",e=>{
    if(startY===null)return;
    const dy=e.clientY-startY;
    if(Math.abs(dy)>18){
      const current=Math.max(0,buttons.findIndex(b=>b.classList.contains("active")));
      const next=clamp(current+(dy>0?1:-1),0,buttons.length-1);
      buttons[next].click();
    }
    startY=null;
  });
}

function showerIntensity(){
  return clamp((state.showerMinutes/20)*0.75+(state.showersPerWeek/10)*0.25,.12,1);
}

function buildRain(containerId, count=42){
  const c=document.getElementById(containerId);
  c.innerHTML="";
  for(let i=0;i<count;i++){
    const d=document.createElement("i");
    d.className="drop";
    d.style.left=`${Math.random()*100}%`;
    d.style.height=`${45+Math.random()*95}px`;
    d.style.animationDuration=`${.7+Math.random()*1.25}s`;
    d.style.animationDelay=`${-Math.random()*2}s`;
    d.style.opacity=(.35+Math.random()*.55).toFixed(2);
    c.appendChild(d);
  }
}

function updateRain(){
  const intensity=showerIntensity();
  ["showerRain","showerRain2"].forEach(id=>{
    const c=document.getElementById(id);
    c.style.opacity=String(.18+intensity*.82);
    [...c.children].forEach((d,i)=>{
      d.style.display=(i<Math.round(c.children.length*(.18+intensity*.82)))?"block":"none";
    });
  });
}

function bindPlates(){
  const group=document.getElementById("dishFrequency");
  [...group.querySelectorAll(".plate")].forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(group,btn);
      state.dishesPerWeek=Number(btn.dataset.value);
      updateSink();
      updateEstimate();
    });
  });

  const method=document.getElementById("dishMethod");
  [...method.querySelectorAll(".method-plate")].forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(method,btn);
      state.dishMethod=btn.dataset.value;
      updateSink();
      updateEstimate();
    });
  });
}

function bindLaundry(){
  const g=document.getElementById("laundryButtons");
  [...g.querySelectorAll("button[data-value]")].forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(g,btn);
      state.laundryPerWeek=Number(btn.dataset.value);
      updateLaundry();
      updateEstimate();
    });
  });
}

function updateSink(){
  const methodFactor={dishwasher:.35,basin:.58,running:1}[state.dishMethod];
  const frequencyFactor=clamp(state.dishesPerWeek/7,.15,1);
  const h=12+58*methodFactor*frequencyFactor;
  document.getElementById("sinkStream").style.height=`${80+130*methodFactor}px`;
  document.getElementById("basinWater").style.height=`${h}%`;
}

function updateLaundry(){
  const h=18+clamp(state.laundryPerWeek/4,0,1)*54;
  document.getElementById("washerWater").style.height=`${h}%`;
}

function estimateDailyLitres(){
  // Prototype model. Shower is the most responsive element because that is the key story.
  const shower=(state.showerMinutes*8*state.showersPerWeek)/7;
  const dishPerSession={dishwasher:10,basin:18,running:34}[state.dishMethod];
  const dishes=(dishPerSession*state.dishesPerWeek)/7;
  const laundry=(50*state.laundryPerWeek)/7;
  const baseline=28; // toilet, drinking, cooking and other household use placeholder
  return Math.round(shower+dishes+laundry+baseline);
}

function updateEstimate(){
  const litres=estimateDailyLitres();
  document.getElementById("personalLitres").textContent=litres;
  document.getElementById("glassCount").textContent=Math.round(litres/0.5);
  const cost=Math.max(18,Math.round(litres*.46));
  document.getElementById("monthlyCost").textContent=cost;
}

function buildFlyingGlasses(){
  const c=document.getElementById("flyingGlasses");
  for(let i=0;i<42;i++){
    const g=document.createElement("i");
    g.className="fly-glass";
    g.dataset.x=(Math.random()*88+4).toFixed(2);
    g.dataset.y=(Math.random()*88+4).toFixed(2);
    g.dataset.r=(Math.random()*80-40).toFixed(2);
    c.appendChild(g);
  }
}

function buildMoneyRain(){
  const c=document.getElementById("moneyRain");
  for(let i=0;i<28;i++){
    const e=document.createElement("i");
    e.className="euro";
    e.textContent="€";
    e.style.left=`${Math.random()*92}%`;
    e.style.fontSize=`${24+Math.random()*34}px`;
    e.style.animationDuration=`${2.5+Math.random()*4}s`;
    e.style.animationDelay=`${-Math.random()*5}s`;
    c.appendChild(e);
  }
}

function updateScrollAnimations(){
  const p1=progress("showerStart");
  const head=document.querySelector("#showerStart .shower-head-wrap");
  head.style.transform=`translateX(-50%) translateY(${lerp(0,-18,p1)}px) scale(${lerp(1,1.08,p1)})`;
  document.querySelector(".first-control").style.transform=`translateY(${lerp(0,-12,clamp((p1-.25)/.35))}px)`;
  document.getElementById("showerScrollHint").style.opacity=String(clamp((p1-.52)/.22));

  const p2=progress("showerFrequency");
  document.querySelector(".water-type-one").style.transform=`translate(-50%,-50%) scale(${lerp(.8,1.35,p2)})`;
  document.querySelector(".water-type-one").style.opacity=String(lerp(.1,.35,clamp((p2-.25)/.45)));

  const p3=progress("sinkChapter");
  document.querySelector(".sink-scene").style.transform=`translateY(${lerp(26,-10,p3)}px) scale(${lerp(.95,1.04,p3)})`;
  document.getElementById("dishMethodPanel").style.opacity=String(clamp((p3-.55)/.2));
  document.getElementById("dishMethodPanel").style.transform=`translateY(${lerp(28,0,clamp((p3-.55)/.2))}px)`;

  const p4=progress("drainChapter");
  const tunnel=document.getElementById("drainTunnel");
  tunnel.style.transform=`translate(-50%,-50%) scale(${lerp(.65,5.5,p4)}) rotate(${lerp(0,75,p4)}deg)`;
  tunnel.style.opacity=String(lerp(1,.18,clamp((p4-.72)/.2)));
  document.querySelector(".drain-copy").style.opacity=String(lerp(1,0,clamp((p4-.35)/.22)));

  const p5=progress("laundryChapter");
  document.querySelector(".washer").style.transform=`translate(-50%,-50%) scale(${lerp(.84,1.08,clamp((p5-.05)/.62))})`;
  document.querySelector(".washer-drum").style.transform=`rotate(${lerp(0,540,clamp((p5-.2)/.65))}deg)`;

  const p6=progress("resultChapter");
  document.querySelector(".result-number").style.transform=`translateY(-50%) scale(${lerp(.72,1.08,clamp((p6-.12)/.45))})`;
  document.querySelector(".marker-strip").style.opacity=String(clamp((p6-.52)/.18));

  const p7=progress("glassesChapter");
  [...document.querySelectorAll(".fly-glass")].forEach((g,i)=>{
    const local=clamp((p7-(i%12)*.015)/.55);
    const x=Number(g.dataset.x),y=Number(g.dataset.y),r=Number(g.dataset.r);
    g.style.left=`${lerp(50,x,local)}%`;
    g.style.top=`${lerp(50,y,local)}%`;
    g.style.opacity=String(local*.88);
    g.style.transform=`translate(-50%,-50%) rotate(${lerp(0,r,local)}deg) scale(${lerp(.25,1,local)})`;
  });
  document.querySelector(".figma-glasses").style.transform=`scale(${lerp(.75,1.05,p7)})`;

  const p8=progress("moneyChapter");
  document.querySelector(".money-title").style.transform=`translateY(-50%) scale(${lerp(.84,1.04,clamp((p8-.06)/.55))})`;
  document.getElementById("moneyRain").style.opacity=String(clamp((p8-.15)/.2));

  const p9=progress("savingChapter");
  document.querySelector(".saving-big").style.transform=`scale(${lerp(.74,1.06,clamp((p9-.08)/.38))})`;
  document.querySelector(".meme-one").style.transform=`rotate(${lerp(-18,-7,p9)}deg) translateY(${lerp(50,0,p9)}px)`;
  document.querySelector(".meme-two").style.transform=`rotate(${lerp(18,8,p9)}deg) translateY(${lerp(70,0,p9)}px)`;

  const p10=progress("valueChapter");
  document.querySelector(".doner-comparison").style.transform=`translateY(${lerp(70,0,clamp((p10-.08)/.3))}px)`;
  document.querySelector(".outfit-comparison").style.transform=`translateX(${lerp(80,0,clamp((p10-.45)/.28))}px)`;

  const p11=progress("actionsChapter");
  [...document.querySelectorAll(".action-card")].forEach((card,i)=>{
    const local=clamp((p11-(.08+i*.16))/.22);
    const rot=[-6,6,-4][i];
    card.style.opacity=String(local);
    card.style.transform=`rotate(${rot}deg) translateY(${lerp(70,0,local)}px) scale(${lerp(.92,1,local)})`;
  });

  const p12=progress("futureChapter");
  document.querySelector(".collage-dry").style.transform=`scale(${lerp(.72,1.04,clamp((p12-.18)/.3))})`;
  document.querySelector(".collage-before-after").style.clipPath=`inset(0 ${lerp(48,0,clamp((p12-.5)/.3))}% 0 0)`;
  document.querySelector(".future-meme").style.transform=`rotate(${lerp(-12,6,p12)}deg) scale(${lerp(.7,1.05,p12)})`;
}

bindDial("showerLengthDial","showerMinutes",()=>{updateRain();updateEstimate();});
bindDial("showerFrequencyDial","showersPerWeek",()=>{updateRain();updateEstimate();});
bindPlates();
bindLaundry();
buildRain("showerRain",52);
buildRain("showerRain2",48);
buildFlyingGlasses();
buildMoneyRain();
updateRain();
updateSink();
updateLaundry();
updateEstimate();
updateScrollAnimations();

let ticking=false;
addEventListener("scroll",()=>{
  if(!ticking){
    requestAnimationFrame(()=>{
      updateScrollAnimations();
      ticking=false;
    });
    ticking=true;
  }
},{passive:true});
addEventListener("resize",updateScrollAnimations);

document.getElementById("restartBtn").addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
