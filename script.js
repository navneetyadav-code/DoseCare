const STORAGE_KEY = "meditrack-medicines-v1";

const defaultMedicines = [
  {id:1,name:"Paracetamol",dosage:"500mg",time:"08:00",period:"Morning",meal:"After Food",tablets:18,stripSize:30,taken:false},
  {id:2,name:"Vitamin D",dosage:"1000 IU",time:"14:00",period:"Afternoon",meal:"After Food",tablets:10,stripSize:20,taken:false},
  {id:3,name:"Cetirizine",dosage:"10mg",time:"21:00",period:"Night",meal:"Before Food",tablets:24,stripSize:30,taken:false}
];

let medicines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultMedicines;

const $ = (id) => document.getElementById(id);
const periodOrder = {Morning:1, Afternoon:2, Night:3};
const periodIcon = {Morning:"☀️", Afternoon:"☀️", Night:"🌙"};

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines)); }

function formatTime(value){
  if(!value) return "";
  const [h,m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2,"0")}:${String(m).padStart(2,"0")} ${suffix}`;
}

function sortedMedicines(){
  return [...medicines].sort((a,b)=>a.time.localeCompare(b.time));
}

function adherence(){
  const total = medicines.length;
  const done = medicines.filter(m=>m.taken).length;
  return {total,done,pct: total ? Math.round(done/total*100) : 0};
}

function renderDashboard(){
  const {total,done,pct} = adherence();
  $("progressPercent").textContent = `${pct}%`;
  $("progressText").textContent = `${done} of ${total} doses completed`;
  $("progressBar").style.width = `${pct}%`;
  $("progressRing").style.setProperty("--progress", `${pct}%`);
  $("progressTitle").textContent = pct === 100 && total ? "All doses complete!" : done ? "You're doing great" : "Let's get started";

  const totalTablets = medicines.reduce((sum,m)=>sum + Number(m.tablets || 0),0);
  const low = medicines.filter(m => Number(m.tablets) <= Math.max(3, Math.ceil(Number(m.stripSize)*.2)));
  $("totalTablets").textContent = totalTablets;
  $("lowStockSummary").textContent = low.length
    ? `${low.length} medication${low.length>1?"s":""} need a refill soon.`
    : "All medication supplies look good.";
  $("lowStockSummary").classList.toggle("low-text", low.length > 0);

  const next = sortedMedicines().find(m=>!m.taken);
  if(next){
    $("nextMedication").innerHTML = `
      <div class="next-med">
        <div class="med-avatar">💊</div>
        <div><h3>${escapeHTML(next.name)}</h3><p>${escapeHTML(next.dosage)} · ${escapeHTML(next.meal)}</p></div>
        <div class="next-time"><strong>${formatTime(next.time)}</strong><span>${next.period}</span></div>
      </div>
      <button class="take-btn" onclick="takeMedicine(${next.id})">✓ Mark as taken</button>`;
  } else if(total){
    $("nextMedication").innerHTML = `<div class="next-med"><div class="med-avatar">🎉</div><div><h3>All done for today</h3><p>You've completed every scheduled dose.</p></div></div>`;
  } else {
    $("nextMedication").innerHTML = `<div class="next-med"><div class="med-avatar">💊</div><div><h3>No medications</h3><p>Add a medicine to get started.</p></div></div>`;
  }

  const timeline = $("timeline");
  if(!medicines.length){
    timeline.classList.add("hidden"); $("emptyDashboard").classList.remove("hidden"); return;
  }
  timeline.classList.remove("hidden"); $("emptyDashboard").classList.add("hidden");

  const groups = ["Morning","Afternoon","Night"].map(period=>({
    period, items: sortedMedicines().filter(m=>m.period===period)
  })).filter(g=>g.items.length);

  timeline.innerHTML = groups.map(g=>`
    <div class="time-group">
      <div class="group-title"><span class="sun">${periodIcon[g.period]}</span>${g.period.toUpperCase()}</div>
      ${g.items.map(m=>`
        <article class="med-row ${m.taken?"done":""}">
          <span class="timeline-dot"></span>
          <div class="med-info">
            <h3>${m.taken?"✓ ":""}${escapeHTML(m.name)}</h3>
            <p>${escapeHTML(m.dosage)} · ${escapeHTML(m.meal)}</p>
          </div>
          <div class="med-meta">
            <span class="time">${formatTime(m.time)}</span>
            <span class="meal">${m.taken ? "Completed" : m.meal}</span>
          </div>
          ${m.taken
            ? `<span class="done-label">Taken ✓</span>`
            : `<button class="take-btn" style="width:auto;margin:0;padding:8px 11px" onclick="takeMedicine(${m.id})">Take</button>`}
        </article>`).join("")}
    </div>`).join("");
}

function renderMedicines(){
  const list = $("medicineList");
  if(!medicines.length){
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">💊</div><h3>Your medicine list is empty</h3><p>Add a prescription to start tracking it.</p><button class="primary-btn" onclick="openModal()">Add medicine</button></div>`;
    return;
  }
  list.innerHTML = sortedMedicines().map(m=>{
    const percent = Math.min(100, Math.max(0, Number(m.tablets)/Math.max(1,Number(m.stripSize))*100));
    const isLow = Number(m.tablets) <= Math.max(3, Math.ceil(Number(m.stripSize)*.2));
    return `<article class="medicine-card">
      <div class="medicine-head">
        <div class="med-avatar">💊</div>
        <div><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.dosage)}</p></div>
        <div class="medicine-actions">
          <button class="small-icon" onclick="editMedicine(${m.id})" title="Edit">✎</button>
          <button class="small-icon" onclick="deleteMedicine(${m.id})" title="Delete">×</button>
        </div>
      </div>
      <div class="medicine-details">
        <div class="detail-box"><span>Time</span><strong>${formatTime(m.time)}</strong></div>
        <div class="detail-box"><span>Period</span><strong>${m.period}</strong></div>
        <div class="detail-box"><span>Meal</span><strong>${m.meal}</strong></div>
      </div>
      <div class="stock-line">
        <div class="stock-label"><span>Inventory</span><strong>${m.tablets} / ${m.stripSize} tablets</strong></div>
        <div class="stock-bar"><span class="${isLow?"low":""}" style="width:${percent}%"></span></div>
      </div>
      ${isLow ? `<span class="warning">⚠ Low stock — refill soon</span>` : ""}
    </article>`;
  }).join("");
}

function render(){ renderDashboard(); renderMedicines(); }

function takeMedicine(id){
  const med = medicines.find(m=>m.id===id);
  if(!med || med.taken) return;
  if(Number(med.tablets) <= 0){ showToast("No tablets left", `${med.name} needs a refill.`); return; }
  med.taken = true;
  med.tablets = Math.max(0, Number(med.tablets)-1);
  save(); render();
  const {pct} = adherence();
  showToast(pct===100 ? "Perfect! 🎉" : "Dose recorded", pct===100 ? "You've completed all doses today." : `${med.name} marked as taken.`);
}

function resetToday(){
  medicines.forEach(m=>m.taken=false);
  save(); render(); showToast("Day reset","Today's dose status has been reset.");
}

function openModal(id=null){
  $("medicineModal").classList.add("show");
  $("medicineForm").reset();
  $("medicineId").value = "";
  $("modalTitle").textContent = id ? "Edit medicine" : "Add medicine";
  if(id){
    const m=medicines.find(x=>x.id===id); if(!m)return;
    $("medicineId").value=m.id;$("medicineName").value=m.name;$("dosage").value=m.dosage;
    $("time").value=m.time;$("period").value=m.period;$("meal").value=m.meal;
    $("tablets").value=m.tablets;$("stripSize").value=m.stripSize;
  } else {
    $("time").value="08:00"; $("tablets").value=10; $("stripSize").value=30;
  }
}
function closeModal(){ $("medicineModal").classList.remove("show"); }
function editMedicine(id){ openModal(id); }

function deleteMedicine(id){
  const m=medicines.find(x=>x.id===id);
  if(!m)return;
  if(!confirm(`Delete ${m.name}?`)) return;
  medicines=medicines.filter(x=>x.id!==id); save(); render();
  showToast("Medicine removed", `${m.name} was deleted.`);
}

$("medicineForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("medicineId").value;
  const data={
    name:$("medicineName").value.trim(), dosage:$("dosage").value.trim(), time:$("time").value,
    period:$("period").value, meal:$("meal").value, tablets:Number($("tablets").value),
    stripSize:Number($("stripSize").value), taken:false
  };
  if(id){
    const old=medicines.find(m=>m.id===Number(id));
    if(old) Object.assign(old,data,{id:Number(id),taken:old.taken});
    showToast("Medicine updated","Your medication details were saved.");
  } else {
    medicines.push({id:Date.now(),...data});
    showToast("Medicine added","Your new medication is now on the schedule.");
  }
  save();render();closeModal();
});

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  $(`${page}Page`).classList.add("active-page");
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$("openAddFromDashboard").onclick=()=>openModal();
$("openAddFromMedicines").onclick=()=>openModal();
$("emptyAddBtn").onclick=()=>openModal();
$("closeModal").onclick=closeModal;$("cancelModal").onclick=closeModal;
$("resetToday").onclick=resetToday;
$("medicineModal").addEventListener("click",e=>{if(e.target===$("medicineModal"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

function showToast(title,text){
  $("toastTitle").textContent=title;$("toastText").textContent=text;$("toast").classList.add("show");
  clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$("toast").classList.remove("show"),3000);
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

const now = new Date();
$("dateChip").textContent = now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
render();
