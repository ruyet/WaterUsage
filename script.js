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

const showerUI = {
  step: 1,
  transitioning: false,
  timeValues: [2, 5, 10, 20],
  flowValues: [3, 5, 7, 10]
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
  const lanes = [9,16,23,30,37,44,51,58,65,72,79,86,93];
  for(let i=0;i<28;i++){
    const line = document.createElement("i");
    line.className = "water-line";
    const lane = lanes[i % lanes.length];
    const centerOffset = (lane - 50) / 50;
    line.style.left = `${lane + (Math.random()*2.4-1.2)}%`;
    line.style.setProperty("--length", `${62 + Math.random()*74}px`);
    line.style.setProperty("--speed", `${.88 + Math.random()*.72}s`);
    line.style.setProperty("--delay", `${-Math.random()*1.4}s`);
    line.style.setProperty("--alpha", `${.36 + Math.random()*.48}`);
    line.style.setProperty("--tilt", `${centerOffset*8}deg`);
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
    flowAction.textContent = "Q2";
    flowValue.textContent = "FLOW";
  } else {
    setDialEnabled(timeDial, false);
    setDialEnabled(flowDial, true);
    top.textContent = "QUESTION 2 / 2";
    count.textContent = "Q2";
    label.textContent = "USE LEFT DIAL";
    question.textContent = "How many times a week do you shower?";
    helper.textContent = "Same shower. New question. Turn the left dial.";
    next.textContent = "CONTINUE";
    timeCaption.textContent = "TEMP";
    flowCaption.textContent = "FREQUENCY";
    timeAction.textContent = "Q1";
    flowAction.textContent = "TURN";
    flowValue.innerHTML = `${state.showersPerWeek}<span>× / week</span>`;
  }
}

function runShowerQuestionTransition(){
  if(showerUI.transitioning || showerUI.step !== 1) return;
  showerUI.transitioning = true;
  const transition = document.getElementById("showerTransition");
  const questionBlock = document.getElementById("showerQuestionBlock");
  transition.classList.remove("is-running");
  void transition.offsetWidth;
  transition.classList.add("is-running");

  setTimeout(()=>questionBlock.classList.add("is-switching"), 280);
  setTimeout(()=>{
    setShowerStep(2);
    questionBlock.classList.remove("is-switching");
  }, 525);
  setTimeout(()=>{
    transition.classList.remove("is-running");
    showerUI.transitioning = false;
    document.getElementById("flowDial").focus({preventScroll:true});
  }, 1160);
}

function bindShowerNext(){
  document.getElementById("showerNext").addEventListener("click", ()=>{
    if(showerUI.step === 1){
      runShowerQuestionTransition();
      return;
    }
    document.getElementById("sinkChapter").scrollIntoView({behavior:"smooth", block:"start"});
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
  const fixture=document.querySelector(".shower-fixture");
  const console=document.querySelector(".shower-console");
  fixture.style.transform=`translateY(${lerp(0,-8,p1)}px)`;
  console.style.transform=`translateY(${lerp(0,-5,p1)}px)`;

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
buildNewShowerRain();
setShowerStep(1);
bindShowerNext();
bindPlates();
bindLaundry();
buildFlyingGlasses();
buildMoneyRain();
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
