const state = {
  showerMinutes: 10,
  showersPerWeek: 5,
  dishesPerWeek: 5,
  dishMethod: "basin",
  laundryPerWeek: null
};

const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp = (a,b,t)=>a+(b-a)*t;

// Interaction gates for the question screens. While locked, touch/wheel scrolling
// cannot skip a question. Programmatic navigation briefly unlocks, moves to the
// next chapter, then locks again when that chapter still needs an answer.
const scrollGate = {
  locked: false,
  y: 0
};

function lockPageScroll(){
  if(scrollGate.locked) return;
  scrollGate.y = window.scrollY;
  scrollGate.locked = true;
  document.documentElement.classList.add("interaction-locked");
  document.body.classList.add("interaction-locked");
  document.body.style.top = `-${scrollGate.y}px`;
}

function jumpToY(y){
  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, y);
  html.style.scrollBehavior = previousBehavior;
}

function unlockPageScroll(){
  if(!scrollGate.locked) return;
  const y = scrollGate.y;
  scrollGate.locked = false;
  document.documentElement.classList.remove("interaction-locked");
  document.body.classList.remove("interaction-locked");
  document.body.style.top = "";
  jumpToY(y);
}

function moveToLockedChapter(id){
  unlockPageScroll();
  const target = document.getElementById(id);
  if(!target) return;
  jumpToY(target.offsetTop);
  scrollGate.y = window.scrollY;
  lockPageScroll();
  updateScrollAnimations();
}

function setGlobalScrollCueVisible(visible){
  const cue = document.getElementById("globalScrollHint");
  if(!cue) return;
  cue.classList.toggle("is-visible", visible);
  cue.setAttribute("aria-hidden", String(!visible));
}

function progress(id){
  const el=document.getElementById(id);
  const r=el.getBoundingClientRect();
  const total=r.height-innerHeight;
  return total<=0?clamp(-r.top/innerHeight+1):clamp(-r.top/total);
}

function selectInGroup(container, button){
  [...container.querySelectorAll("button")].forEach(b=>b.classList.remove("active"));
  button.classList.add("active");

  if(container.id === "dishFrequency"){
    [...container.querySelectorAll(".plate")].forEach(plate=>{
      plate.querySelector(".plate-fill")?.setAttribute(
        "fill",
        plate.classList.contains("active") ? "#c9ff38" : "#f8f4ed"
      );
    });
  }
}

const showerUI = {
  step: 1,
  transitioning: false,
  timeValues: [2, 5, 10, 20],
  flowValues: [3, 5, 7, 10]
};

const sinkUI = {
  plateChosen: false,
  methodStepVisible: false,
  methodChosen: false
};

function dialAngleForIndex(index, count){
  if(count <= 1) return 0;
  return -118 + (236 * index) / (count - 1);
}

function bindAnswerDial({id, values, stateKey, valueId, formatter}){
  const dial = document.getElementById(id);
  const valueEl = document.getElementById(valueId);
  let startPointerAngle = null;
  let startIndex = 0;
  let moved = false;

  const currentIndex = () => {
    const exact = values.indexOf(Number(state[stateKey]));
    return exact >= 0 ? exact : 0;
  };

  const render = () => {
    const index = currentIndex();
    const value = values[index];
    dial.style.setProperty("--dial-angle", `${dialAngleForIndex(index, values.length)}deg`);
    dial.setAttribute("aria-valuenow", String(value));
    dial.setAttribute("aria-valuetext", formatter(value, true));
    valueEl.innerHTML = formatter(value, false);
  };

  const choose = index => {
    if(dial.getAttribute("aria-disabled") === "true") return;
    index = clamp(index, 0, values.length - 1);
    state[stateKey] = values[index];
    render();
    updateEstimate();
  };

  const angleAt = event => {
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + 43;
    return Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
  };

  dial.addEventListener("pointerdown", event => {
    if(dial.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    startPointerAngle = angleAt(event);
    startIndex = currentIndex();
    moved = false;
    dial.setPointerCapture?.(event.pointerId);
    dial.classList.add("is-turning");
  });

  dial.addEventListener("pointermove", event => {
    if(startPointerAngle === null) return;
    let delta = angleAt(event) - startPointerAngle;
    if(delta > 180) delta -= 360;
    if(delta < -180) delta += 360;
    const step = Math.round(delta / 34);
    if(step !== 0) moved = true;
    choose(startIndex + step);
  });

  const finish = event => {
    if(startPointerAngle === null) return;
    if(!moved) choose(currentIndex() + (currentIndex() < values.length - 1 ? 1 : -1));
    startPointerAngle = null;
    dial.classList.remove("is-turning");
    if(event?.pointerId != null) dial.releasePointerCapture?.(event.pointerId);
  };
  dial.addEventListener("pointerup", finish);
  dial.addEventListener("pointercancel", finish);

  dial.addEventListener("wheel", event => {
    if(dial.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    choose(currentIndex() + (event.deltaY > 0 ? 1 : -1));
  }, {passive:false});

  dial.addEventListener("keydown", event => {
    if(dial.getAttribute("aria-disabled") === "true") return;
    if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const forward = event.key === "ArrowRight" || event.key === "ArrowUp";
    choose(currentIndex() + (forward ? 1 : -1));
  });

  render();
  return {render, choose};
}

function buildNewShowerRain(){
  const container = document.getElementById("newShowerRain");
  container.innerHTML = "";

  // Keep every stream vertical. The shower head itself already communicates
  // the width of the spray, so the falling water should feel calm and natural.
  const lanes = [8,14,20,26,32,38,44,50,56,62,68,74,80,86,92];
  for(let i=0;i<30;i++){
    const line = document.createElement("i");
    line.className = "water-line";
    const lane = lanes[i % lanes.length];

    line.style.left = `${lane + (Math.random()*1.4 - .7)}%`;
    line.style.setProperty("--drop-width", `${1.5 + Math.random()*.8}px`);
    line.style.setProperty("--length", `${52 + Math.random()*62}px`);
    line.style.setProperty("--speed", `${.9 + Math.random()*.45}s`);
    line.style.setProperty("--delay", `${-Math.random()*1.3}s`);
    line.style.setProperty("--alpha", `${.34 + Math.random()*.42}`);
    line.style.setProperty("--tilt", "0deg");
    line.style.setProperty("--fan-x", "0px");
    container.appendChild(line);
  }
}

function setDialEnabled(dial, enabled){
  dial.classList.toggle("is-active", enabled);
  dial.classList.toggle("is-inactive", !enabled);
  dial.setAttribute("aria-disabled", String(!enabled));
  dial.tabIndex = enabled ? 0 : -1;
}

function setShowerStep(step){
  showerUI.step = step;
  const timeDial = document.getElementById("timeDial");
  const flowDial = document.getElementById("flowDial");
  const top = document.getElementById("showerStepTop");
  const count = document.getElementById("showerQuestionCount");
  const label = document.getElementById("activeControlLabel");
  const question = document.getElementById("showerQuestion");
  const helper = document.getElementById("showerHelper");
  const next = document.getElementById("showerNextText");
  const timeCaption = document.getElementById("timeCaption");
  const flowCaption = document.getElementById("flowCaption");
  const timeAction = document.getElementById("timeAction");
  const flowAction = document.getElementById("flowAction");
  const flowValue = document.getElementById("flowValue");

  if(step === 1){
    setDialEnabled(timeDial, true);
    setDialEnabled(flowDial, false);
    top.textContent = "QUESTION 1 / 2";
    count.textContent = "Q1";
    label.textContent = "USE RIGHT DIAL";
    question.textContent = "How long is your usual shower?";
    helper.textContent = "Turn the highlighted dial to choose your answer.";
    next.textContent = "NEXT QUESTION";
    timeCaption.textContent = "DURATION";
    flowCaption.textContent = "FLOW";
    timeAction.textContent = "TURN";
    flowAction.textContent = "";
    flowValue.textContent = "FLOW";
  } else {
    setDialEnabled(timeDial, false);
    setDialEnabled(flowDial, true);
    top.textContent = "QUESTION 2 / 2";
    count.textContent = "Q2";
    label.textContent = "USE LEFT DIAL";
    question.textContent = "How many times a week do you shower?";
    helper.textContent = "You are now on question 2. Turn the left dial.";
    next.textContent = "NEXT: THE SINK";
    timeCaption.textContent = "TEMP";
    flowCaption.textContent = "FREQUENCY";
    timeAction.textContent = "";
    flowAction.textContent = "TURN";
    flowValue.innerHTML = `${state.showersPerWeek}<span>× / week</span>`;
  }
}

function advanceShowerToQuestionTwo(){
  if(showerUI.transitioning || showerUI.step !== 1) return;
  showerUI.transitioning = true;
  const questionBlock = document.getElementById("showerQuestionBlock");
  questionBlock.classList.add("is-switching");

  setTimeout(()=>{
    setShowerStep(2);
    questionBlock.classList.remove("is-switching");
    showerUI.transitioning = false;
    document.getElementById("flowDial").focus({preventScroll:true});
  }, 190);
}

function runShowerExitTransition(){
  if(showerUI.transitioning || showerUI.step !== 2) return;
  showerUI.transitioning = true;
  const transition = document.getElementById("showerTransition");
  transition.classList.remove("is-running");
  void transition.offsetWidth;
  transition.classList.add("is-running");

  setTimeout(()=>{
    transition.classList.remove("is-running");
    showerUI.transitioning = false;
    moveToLockedChapter("sinkChapter");
  }, 2160);
}

function bindShowerNext(){
  document.getElementById("showerNext").addEventListener("click", ()=>{
    if(showerUI.step === 1){
      advanceShowerToQuestionTwo();
      return;
    }
    runShowerExitTransition();
  });
}

function setSinkNextVisible(visible){
  const next = document.getElementById("sinkNext");
  next.classList.toggle("is-visible", visible);
  next.setAttribute("aria-hidden", String(!visible));
  next.tabIndex = visible ? 0 : -1;
}

function showDishMethodStep(){
  if(!sinkUI.plateChosen || sinkUI.methodStepVisible) return;
  sinkUI.methodStepVisible = true;
  sinkUI.methodChosen = false;
  setSinkNextVisible(false);
  setGlobalScrollCueVisible(false);

  const panel = document.getElementById("dishMethodPanel");
  panel.classList.add("is-visible");
  panel.setAttribute("aria-hidden", "false");
  document.querySelector(".kitchen-room").classList.add("is-method-step");

  const firstMethod = panel.querySelector(".method-plate");
  setTimeout(()=>firstMethod?.focus({preventScroll:true}), 260);
}

function bindPlates(){
  const group=document.getElementById("dishFrequency");
  [...group.querySelectorAll(".plate")].forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(group,btn);
      state.dishesPerWeek=Number(btn.dataset.value);
      sinkUI.plateChosen=true;
      if(!sinkUI.methodStepVisible) setSinkNextVisible(true);
      updateSink();
      updateEstimate();
    });
  });

  document.getElementById("sinkNext").addEventListener("click",()=>{
    if(!sinkUI.methodStepVisible){
      showDishMethodStep();
      return;
    }
    if(!sinkUI.methodChosen) return;

    setSinkNextVisible(false);
    setGlobalScrollCueVisible(false);
    moveToLockedChapter("laundryChapter");
  });

  const method=document.getElementById("dishMethod");
  [...method.querySelectorAll(".method-plate")].forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectInGroup(method,btn);
      state.dishMethod=btn.dataset.value;
      sinkUI.methodChosen=true;
      // Keep this screen locked. Continue with the same button pattern as Q1.
      setSinkNextVisible(true);
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

      // Laundry is the hand-off from click-through questions to the scrolling story.
      setGlobalScrollCueVisible(true);
      unlockPageScroll();
    });
  });
}

function updateSink(){
  const water = document.getElementById("basinWater");

  // Before Q3 is answered, keep a calm neutral water level.
  if(!sinkUI.plateChosen){
    water.style.height = "18%";
    return;
  }

  // Frequency determines the base amount. Q4 then scales that same amount
  // according to the washing method. The faucet stream itself stays fixed.
  const frequencyFactor = clamp(state.dishesPerWeek / 7, .14, 1);
  const methodFactor = sinkUI.methodStepVisible
    ? {dishwasher:.34, basin:.64, running:1}[state.dishMethod]
    : .64;

  const h = 12 + 58 * frequencyFactor * methodFactor;
  water.style.height = `${h}%`;
}

function updateLaundry(){
  const chosen = state.laundryPerWeek !== null;
  const h = chosen ? 18+clamp(state.laundryPerWeek/4,0,1)*54 : 18;
  document.getElementById("washerWater").style.height=`${h}%`;
}

function estimateDailyLitres(){
  // Prototype model. Shower is the most responsive element because that is the key story.
  const shower=(state.showerMinutes*8*state.showersPerWeek)/7;
  const dishPerSession={dishwasher:10,basin:18,running:34}[state.dishMethod];
  const dishes=(dishPerSession*state.dishesPerWeek)/7;
  const laundryPerWeek = state.laundryPerWeek ?? 2.5;
  const laundry=(50*laundryPerWeek)/7;
  const baseline=28; // toilet, drinking, cooking and other household use placeholder
  return Math.round(shower+dishes+laundry+baseline);
}

function updateEstimate(){
  const litres=estimateDailyLitres();
  document.getElementById("personalLitres").textContent=litres;
  document.getElementById("glassCount").textContent=Math.round(litres/0.5);
  const cost=Math.max(18,Math.round(litres*.46));
  document.getElementById("monthlyCostLine").innerHTML=`€${cost}<br />A MONTH`;

  const comparison=document.getElementById("resultComparison");
  const youLabel=document.getElementById("resultYouLabel");
  if(comparison && youLabel){
    const scaleMax=220;
    const userPos=clamp(litres/scaleMax,0,1)*100;
    const avgPos=clamp(118/scaleMax,0,1)*100;
    comparison.style.setProperty("--user-position",`${userPos}%`);
    comparison.style.setProperty("--avg-position",`${avgPos}%`);
    youLabel.textContent=`${litres} L / DAY`;
  }
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
  updateBrowserThemeColor();
  const p1=progress("showerStart");
  const fixture=document.querySelector(".shower-fixture");
  const console=document.querySelector(".shower-console");
  if(fixture) fixture.style.transform=`translateY(${lerp(0,-8,p1)}px)`;
  if(console) console.style.transform=`translateY(${lerp(0,-5,p1)}px)`;

  const p5=progress("laundryChapter");
  const washer=document.querySelector(".washer");
  const washerLoad=document.querySelector(".washer-load");
  if(washer) washer.style.transform=`translate(-50%,-50%) scale(${lerp(.84,1.05,clamp((p5-.05)/.62))})`;
  if(washerLoad) washerLoad.style.transform=`rotate(${lerp(0,540,clamp((p5-.2)/.65))}deg)`;

  const p6=progress("resultChapter");
  const resultNumber=document.querySelector(".result-number");
  const markerStrip=document.querySelector(".marker-strip");
  if(resultNumber) resultNumber.style.transform=`scale(${lerp(.82,1.03,clamp((p6-.12)/.45))})`;
  if(markerStrip) markerStrip.style.opacity=String(clamp((p6-.42)/.2));

  const p7=progress("glassesChapter");
  [...document.querySelectorAll(".fly-glass")].forEach((g,i)=>{
    const local=clamp((p7-(i%12)*.015)/.55);
    const x=Number(g.dataset.x),y=Number(g.dataset.y),r=Number(g.dataset.r);
    g.style.left=`${lerp(50,x,local)}%`;
    g.style.top=`${lerp(50,y,local)}%`;
    g.style.opacity=String(local*.88);
    g.style.transform=`translate(-50%,-50%) rotate(${lerp(0,r,local)}deg) scale(${lerp(.25,1,local)})`;
  });
  const figmaGlasses=document.querySelector(".figma-glasses");
  if(figmaGlasses) figmaGlasses.style.transform=`scale(${lerp(.75,1.05,p7)})`;

  const p8=progress("moneyChapter");
  const moneyTitle=document.querySelector(".money-title");
  const moneyRain=document.getElementById("moneyRain");
  const moneyGif=document.querySelector(".money-gif-card");
  if(moneyTitle) moneyTitle.style.transform=`translateY(${lerp(28,-4,clamp((p8-.02)/.32))}px) scale(${lerp(.9,1.04,clamp((p8-.02)/.4))})`;
  if(moneyRain) moneyRain.style.opacity=String(clamp((p8-.08)/.18));
  if(moneyGif) {
    const local=clamp((p8-.28)/.3);
    moneyGif.style.opacity=String(local);
    moneyGif.style.transform=`translateY(${lerp(24,0,local)}px) scale(${lerp(.94,1,local)})`;
  }

  const p10=progress("actionsChapter");
  [...document.querySelectorAll(".action-card")].forEach((card,i)=>{
    const local=clamp((p10-(.08+i*.16))/.22);
    const rot=[-3,3,-2][i];
    card.style.opacity=String(local);
    card.style.transform=`rotate(${rot}deg) translateY(${lerp(70,0,local)}px) scale(${lerp(.94,1,local)})`;
  });

  const morphProgress=progress("morphChapter");
  const morphFrame=document.getElementById("morphFrame");
  if(morphFrame){
    // Scrub the extracted GIF frames through a long sticky section.
    // The wide progress range intentionally makes the morph feel slow and controlled.
    const scrub=clamp((morphProgress-.04)/.92);
    const frameIndex=Math.round(scrub*28);
    const frameSrc=`assets/morph_frames_webp/frame_${String(frameIndex).padStart(2,"0")}.webp`;
    if(morphFrame.dataset.frame !== String(frameIndex)){
      morphFrame.src=frameSrc;
      morphFrame.dataset.frame=String(frameIndex);
    }
  }

  const p12=progress("endChapter");
  const endRoom=document.querySelector('.end-room');
  const beforePanel=document.querySelector('.end-before-panel');
  const afterPanel=document.querySelector('.end-after-panel');
  const restartBtn=document.getElementById('restartBtn');
  const globalScrollHint=document.getElementById('globalScrollHint');
  if(globalScrollHint){
    globalScrollHint.classList.toggle('is-ending', p12 > .035);
  }

  // Final before/after transition is opacity-only: nothing moves or rescales.
  const fade=clamp((p12-.34)/.34);
  if(beforePanel) beforePanel.style.opacity=String(1-fade);
  if(afterPanel) afterPanel.style.opacity=String(fade);
  if(endRoom){
    const c=Math.round(7 + (244-7)*fade);
    const g=Math.round(7 + (236-7)*fade);
    const b=Math.round(7 + (248-7)*fade);
    endRoom.style.backgroundColor=`rgb(${c},${g},${b})`;
  }
  if(restartBtn){
    const showButton=p12>.72;
    restartBtn.classList.toggle('is-visible', showButton);
  }

}


let lastThemeColor = "";
function updateBrowserThemeColor(){
  const meta=document.getElementById("themeColorMeta");
  if(!meta) return;

  const end=document.getElementById("endChapter");
  const glasses=document.getElementById("glassesChapter");
  const viewportMid=window.innerHeight*.5;

  const containsMid=(el)=>{
    if(!el) return false;
    const r=el.getBoundingClientRect();
    return r.top <= viewportMid && r.bottom >= viewportMid;
  };

  let color="#f4efe7";
  if(containsMid(glasses)) color="#061935";
  if(containsMid(end)) color="#070707";

  if(color!==lastThemeColor){
    meta.setAttribute("content", color);
    document.documentElement.style.backgroundColor=color;
    document.body.style.backgroundColor=color;
    lastThemeColor=color;
  }
}

const timeDialController = bindAnswerDial({
  id:"timeDial",
  values:showerUI.timeValues,
  stateKey:"showerMinutes",
  valueId:"timeValue",
  formatter:(value, aria)=>aria ? `${value} minutes` : `${value}<span>min</span>`
});
const flowDialController = bindAnswerDial({
  id:"flowDial",
  values:showerUI.flowValues,
  stateKey:"showersPerWeek",
  valueId:"flowValue",
  formatter:(value, aria)=>aria ? `${value} showers per week` : `${value}<span>× / week</span>`
});
if("scrollRestoration" in history) history.scrollRestoration = "manual";
jumpToY(0);
buildNewShowerRain();
setShowerStep(1);
bindShowerNext();
bindPlates();
bindLaundry();
buildFlyingGlasses();
buildMoneyRain();
// Preload the 29 extracted morph frames so scroll scrubbing does not flicker.
for(let i=0;i<29;i++){
  const img=new Image();
  img.src=`assets/morph_frames_webp/frame_${String(i).padStart(2,"0")}.webp`;
}
updateSink();
updateLaundry();
updateEstimate();
updateScrollAnimations();
lockPageScroll();

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

document.getElementById("restartBtn").addEventListener("click",()=>{
  unlockPageScroll();
  jumpToY(0);
  window.location.reload();
});
