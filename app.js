
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {getFirestore,collection,doc,addDoc,setDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp,query,orderBy} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig={
 apiKey:"AIzaSyAfH-93y7s1YK_3je_sZlofd8XJ1z436Yk",
 authDomain:"doces-do-vitu.firebaseapp.com",
 projectId:"doces-do-vitu",
 storageBucket:"doces-do-vitu.firebasestorage.app",
 messagingSenderId:"681586131940",
 appId:"1:681586131940:web:e8c213d9865621467e7df1",
 measurementId:"G-9QDNX23V8Z"
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
let uid=null,unsubs=[],data={products:[],clients:[],sales:[],payments:[]},page="home";

const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const dt=v=>{let d=v?.toDate?v.toDate():new Date(v);return isNaN(d)?null:d};
const dateTime=v=>{let d=dt(v);return d?d.toLocaleDateString("pt-BR")+" • "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"-"};
const dateOnly=v=>{let d=dt(v);return d?d.toLocaleDateString("pt-BR"):"-"};
const now=()=>new Date();
const status=(total,paid)=>paid>=total?"Pago":paid>0?"Parcial":"Pendente";
const statusClass=s=>s==="Pago"?"paid":s==="Parcial"?"partial":"pending";
const toast=m=>{$("toastRoot").innerHTML='<div class="toast">'+esc(m)+'</div>';setTimeout(()=>$("toastRoot").innerHTML="",2400)};
const msg=(m,ok=false)=>{$("loginMsg").textContent=m;$("loginMsg").style.color=ok?"#2d805b":"#b5483f"};

$("loginBtn").onclick=async()=>{try{msg("Entrando...",true);await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){msg(firebaseError(e))}};
$("createBtn").onclick=async()=>{try{msg("Criando conta...",true);await createUserWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);msg("Conta criada!",true)}catch(e){msg(firebaseError(e))}};
$("password").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
function firebaseError(e){return ({ "auth/invalid-credential":"E-mail ou senha incorretos.","auth/invalid-email":"Digite um e-mail válido.","auth/email-already-in-use":"Esse e-mail já possui uma conta.","auth/weak-password":"A senha precisa ter pelo menos 6 caracteres."}[e.code]||"Não foi possível entrar. Verifique sua conexão e os dados.")}

onAuthStateChanged(auth,user=>{
 unsubs.forEach(u=>u());unsubs=[];
 if(!user){uid=null;$("app").classList.add("hidden");$("login").classList.remove("hidden");return}
 uid=user.uid;$("login").classList.add("hidden");$("app").classList.remove("hidden");subscribe();go("home");
});

function col(name){return collection(db,"users",uid,name)}
function subscribe(){
 ["products","clients","sales","payments"].forEach(name=>{
  const u=onSnapshot(col(name),snap=>{data[name]=snap.docs.map(d=>({id:d.id,...d.data()}));render()},()=>toast("Não foi possível sincronizar "+name+"."));
  unsubs.push(u);
 });
}
function go(p){page=p;document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===p));render();$("view").scrollTo(0,0)}
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>go(b.dataset.page));
$("quickSale").onclick=()=>openSale();

function render(){if(!uid)return;const v=$("view");if(page==="home")v.innerHTML=home();if(page==="sales")v.innerHTML=sales();if(page==="clients")v.innerHTML=clients();if(page==="stock")v.innerHTML=stock();if(page==="finance")v.innerHTML=finance();bindPage()}
function totals(){
 const today=now();let sold=0,received=0,pending=0;
 data.sales.forEach(s=>{sold+=Number(s.total||0);pending+=Math.max(0,Number(s.total||0)-Number(s.paid||0))});
 data.payments.forEach(p=>received+=Number(p.amount||0));
 const todaySales=data.sales.filter(s=>{let d=dt(s.createdAt);return d&&d.toDateString()===today.toDateString()}).reduce((a,s)=>a+Number(s.total||0),0);
 return {sold,received,pending,todaySales}
}
function home(){
 const t=totals(),low=data.products.filter(p=>Number(p.stock||0)<=Number(p.minStock||2));
 return `<div class="page">
 <div class="head"><div><h1>Olá! 🍫</h1><p>Seu resumo de hoje</p></div></div>
 <div class="hero"><div><small>VENDAS HOJE</small><h2>${money(t.todaySales)}</h2><p>${data.sales.filter(s=>{let d=dt(s.createdAt);return d&&d.toDateString()===now().toDateString()}).length} vendas registradas hoje</p></div><div class="emoji">🍬</div></div>
 <div class="stats">
  <div class="stat"><small>TOTAL VENDIDO</small><strong>${money(t.sold)}</strong></div>
  <div class="stat"><small>A RECEBER</small><strong class="red">${money(t.pending)}</strong></div>
  <div class="stat"><small>RECEBIDO</small><strong class="green">${money(t.received)}</strong></div>
  <div class="stat"><small>PRODUTOS</small><strong>${data.products.length}</strong></div>
 </div>
 <div class="quick">
  <button id="qSale"><span>🛒</span><b>Nova venda</b></button>
  <button id="qClient"><span>👤</span><b>Novo cliente</b></button>
  <button id="qProduct"><span>📦</span><b>Novo produto</b></button>
  <button id="qAnalysis"><span>📈</span><b>Analisar vendas</b></button>
 </div>
 <div class="section"><div class="section-title"><b>Últimas vendas</b><button class="link" id="seeSales">Ver todas</button></div>
 <div class="list">${data.sales.slice().sort((a,b)=>(dt(b.createdAt)||0)-(dt(a.createdAt)||0)).slice(0,5).map(s=>saleItem(s)).join("")||'<div class="empty">Nenhuma venda registrada ainda.</div>'}</div></div>
 ${low.length?`<div class="section"><div class="section-title"><b>⚠️ Estoque baixo</b></div><div class="list">${low.slice(0,4).map(p=>`<div class="item"><div class="avatar">🍫</div><div class="item-main"><b>${esc(p.name)}</b><small>Estoque mínimo: ${p.minStock||2}</small></div><div class="item-right"><b>${p.stock||0} un.</b></div></div>`).join("")}</div></div>`:""}
 </div>`
}
function saleItem(s){let st=status(s.total,s.paid);return `<div class="item" data-sale="${s.id}"><div class="avatar">🍬</div><div class="item-main"><b>${esc(s.clientName||"Venda balcão")}</b><small>${dateTime(s.createdAt)} • ${esc(s.items?.map(i=>i.name).join(", ")||"Venda")}</small></div><div class="item-right"><b>${money(s.total)}</b><div class="status ${statusClass(st)}">${st}</div></div></div>`}

function sales(){
 const rows=data.sales.slice().sort((a,b)=>(dt(b.createdAt)||0)-(dt(a.createdAt)||0));
 return `<div class="page"><div class="head"><div><h1>Vendas</h1><p>Cada venda com dia e horário</p></div><button class="top-action" id="newSale">＋</button></div>
 <div class="tabs"><button class="active" data-sales-filter="all">Todas</button><button data-sales-filter="paid">Pagas</button><button data-sales-filter="partial">Parciais</button><button data-sales-filter="pending">Pendentes</button></div>
 <div class="table-wrap"><table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Total</th><th>Status</th></tr></thead><tbody id="salesBody">${rows.map(s=>saleRow(s)).join("")||'<tr><td colspan="7">Nenhuma venda.</td></tr>'}</tbody></table></div></div>`
}
function saleRow(s){let st=status(s.total,s.paid),filter=st==="Pago"?"paid":st==="Parcial"?"partial":"pending",d=dt(s.createdAt);return `<tr data-status="${filter}" data-sale="${s.id}"><td>${d?d.toLocaleDateString("pt-BR"):"-"}</td><td>${d?d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"-"}</td><td>${esc(s.clientName||"Balcão")}</td><td>${esc(s.items?.map(i=>i.name).join(", ")||"-")}</td><td>${s.items?.reduce((a,i)=>a+Number(i.qty||0),0)||0}</td><td>${money(s.total)}</td><td class="${statusClass(st)}">${st}</td></tr>`}

function clients(){
 return `<div class="page"><div class="head"><div><h1>Clientes</h1><p>Compras e valores de cada pessoa</p></div><button class="top-action" id="newClient">＋</button></div>
 <input class="search" id="clientSearch" placeholder="🔎 Procurar cliente">
 <div class="list" id="clientList">${clientRows(data.clients)}</div></div>`
}
function clientRows(list){return list.map(c=>{let ss=data.sales.filter(s=>s.clientId===c.id),total=ss.reduce((a,s)=>a+Number(s.total||0),0),pending=ss.reduce((a,s)=>a+Math.max(0,Number(s.total||0)-Number(s.paid||0)),0);return `<div class="item" data-client="${c.id}"><div class="avatar">👤</div><div class="item-main"><b>${esc(c.name)}</b><small>${ss.length} compra(s) • ${c.phone?esc(c.phone):"sem telefone"}</small></div><div class="item-right"><b>${money(pending)}</b><small>a receber</small></div>${pending>0?`<button class="secondary charge-btn" data-charge="${c.id}" style="padding:9px 10px;font-size:10px">Cobrar</button>`:""}</div>`}).join("")||'<div class="empty">Nenhum cliente cadastrado.</div>'}

function stock(){
 return `<div class="page"><div class="head"><div><h1>Estoque</h1><p>Controle dos seus doces</p></div><button class="top-action" id="newProduct">＋</button></div>
 <input class="search" id="stockSearch" placeholder="🔎 Procurar produto">
 <div class="list" id="stockList">${productRows(data.products)}</div></div>`
}
function productRows(list){return list.map(p=>`<div class="item" data-product="${p.id}"><div class="avatar">🍫</div><div class="item-main"><b>${esc(p.name)}</b><small>${money(p.price)} • custo ${money(p.cost||0)}</small></div><div class="item-right"><b>${p.stock||0} un.</b><small>${Number(p.stock||0)<=Number(p.minStock||2)?"⚠️ baixo":"estoque"}</small></div></div>`).join("")||'<div class="empty">Nenhum produto cadastrado.</div>'}

function finance(){
 const sales=data.sales||[], payments=data.payments||[], products=data.products||[], nowD=now();
 const monthStart=new Date(nowD.getFullYear(),nowD.getMonth(),1);monthStart.setHours(0,0,0,0);
 const nextMonth=new Date(nowD.getFullYear(),nowD.getMonth()+1,1);nextMonth.setHours(0,0,0,0);
 const monthSales=sales.filter(s=>{const d=dt(s.createdAt);return d&&d>=monthStart&&d<nextMonth});
 const monthPayments=payments.filter(p=>{const d=dt(p.createdAt);return d&&d>=monthStart&&d<nextMonth});
 const revenue=monthSales.reduce((a,s)=>a+Number(s.total||0),0);
 const received=monthPayments.reduce((a,p)=>a+Number(p.amount||0),0);
 const pending=monthSales.reduce((a,s)=>a+Math.max(0,Number(s.total||0)-Number(s.paid||0)),0);
 const cost=monthSales.reduce((a,s)=>a+(s.items||[]).reduce((x,i)=>x+Number(i.qty||0)*Number(i.cost||0),0),0);
 const profit=revenue-cost;
 const margin=revenue>0?(profit/revenue)*100:0;
 const ticket=monthSales.length?revenue/monthSales.length:0;
 const totalItems=monthSales.reduce((a,s)=>a+(s.items||[]).reduce((x,i)=>x+Number(i.qty||0),0),0);
 const byMethod={};monthPayments.forEach(p=>{const m=p.method||"Outro";byMethod[m]=(byMethod[m]||0)+Number(p.amount||0)});
 const top={};monthSales.forEach(s=>(s.items||[]).forEach(i=>{top[i.name]=(top[i.name]||0)+Number(i.qty||0)}));
 const topRows=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,q])=>`<div class="item"><div class="avatar">🍫</div><div class="item-main"><b>${esc(name)}</b><small>${q} unidade(s) vendida(s)</small></div></div>`).join("")||'<div class="empty">Ainda não há vendas neste mês.</div>';
 const methods=Object.entries(byMethod).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<div class="section-title"><span>${esc(m)}</span><b>${money(v)}</b></div>`).join("")||'<div class="empty">Nenhum recebimento neste mês.</div>';
 return `<div class="page"><div class="head"><div><h1>Financeiro</h1><p>Visão completa do seu negócio • ${nowD.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</p></div></div>
 <div class="finance-grid">
  <div class="finance-card"><small>Faturamento do mês</small><strong>${money(revenue)}</strong><p>${monthSales.length} venda(s)</p></div>
  <div class="finance-card"><small>Lucro estimado</small><strong class="finance-positive">${money(profit)}</strong><p>vendas menos custo dos produtos</p></div>
  <div class="finance-card"><small>Margem de lucro</small><strong>${margin.toFixed(1)}%</strong><p>sobre o faturamento</p></div>
  <div class="finance-card"><small>Ticket médio</small><strong>${money(ticket)}</strong><p>por venda</p></div>
  <div class="finance-card"><small>Recebido no mês</small><strong class="finance-positive">${money(received)}</strong><p>pagamentos registrados</p></div>
  <div class="finance-card"><small>A receber</small><strong class="finance-negative">${money(pending)}</strong><p>das vendas deste mês</p></div>
  <div class="finance-card"><small>Custo dos produtos</small><strong>${money(cost)}</strong><p>custo informado no estoque</p></div>
  <div class="finance-card"><small>Itens vendidos</small><strong>${totalItems}</strong><p>unidades neste mês</p></div>
 </div>
 <div class="analysis-card"><div class="analysis-head"><div><small style="color:var(--muted)">RESUMO</small><div style="margin-top:3px">Resultado financeiro do mês</div></div><strong>${money(profit)}</strong></div><div class="section" style="margin-top:15px"><div class="section-title"><span>Faturamento</span><b>${money(revenue)}</b></div><div class="section-title"><span>Custos</span><b>${money(cost)}</b></div><div class="section-title"><span>Recebido</span><b class="finance-positive">${money(received)}</b></div><div class="section-title"><span>Pendente</span><b class="finance-negative">${money(pending)}</b></div></div></div>
 <div class="row"><div class="analysis-card"><div class="section-title"><b>Recebimentos por forma</b></div>${methods}</div><div class="analysis-card"><div class="section-title"><b>Mais vendidos</b></div><div class="list">${topRows}</div></div></div>
 <div class="finance-actions"><button class="secondary" id="financeAnalysis">📈 Análise de vendas</button><button class="secondary" id="financeReceivables">💰 A receber</button><button class="secondary" id="financePayments">💵 Registrar pagamento</button><button class="secondary" id="financeAccount">⚙️ Conta</button></div>
 <button class="secondary" id="logout" style="width:100%;margin-top:12px">Sair da conta</button></div>`;
}

function more(){
 return `<div class="page"><div class="head"><div><h1>Mais</h1><p>Relatórios e configurações</p></div></div>
 <div class="more">
  <button id="analysis"><span class="mi">📈</span><b>Análise de vendas</b><small>Horário, dia, semana e mês</small></button>
  <button id="receivables"><span class="mi">💰</span><b>A receber</b><small>Quem ainda precisa pagar</small></button>
  <button id="payments"><span class="mi">💵</span><b>Pagamentos</b><small>Registrar recebimentos</small></button>
  <button id="account"><span class="mi">⚙️</span><b>Conta</b><small>${esc(auth.currentUser?.email||"")}</small></button>
 </div>
 <button class="secondary" id="logout" style="width:100%;margin-top:12px">Sair da conta</button></div>`
}

function openSale(){
 const products=data.products.filter(p=>Number(p.stock||0)>0);
 if(!products.length){toast("Cadastre um produto com estoque primeiro.");return}
 const clients=data.clients;
 openModal("Nova venda",`<div class="form">
 <div class="field"><label>Cliente</label><div class="client-picker" style="position:relative"><input id="mClientSearch" autocomplete="off" placeholder="🔎 Digite o nome do cliente..." aria-label="Pesquisar cliente"><input id="mClient" type="hidden" value=""><div id="mClientResults" class="client-results hidden"></div></div></div>
 <div class="field"><label>Produto</label><select id="mProduct">${products.map(p=>`<option value="${p.id}">${esc(p.name)} • ${money(p.price)} • ${p.stock} un.</option>`).join("")}</select></div>
 <div class="row"><div class="field"><label>Quantidade</label><input id="mQty" type="number" min="1" value="1"></div><div class="field"><label>Pago agora</label><input id="mPaid" type="number" min="0" step="0.01" value="0"></div></div>
 <div class="field"><label>Pagamento</label><select id="mMethod"><option>Pagamento no salário</option><option>Dinheiro</option><option>Cartão</option><option>PIX</option></select></div>
 <div id="mTotal" style="font-size:20px;font-weight:900;margin-top:8px"></div>
 <div class="actions"><button type="button" class="secondary" id="cancelModal">Cancelar</button><button type="button" class="primary" id="confirmSale">Confirmar venda</button></div></div>`);
 const update=()=>{let p=data.products.find(x=>x.id===$("mProduct").value),q=Math.max(1,Number($("mQty").value)||1);$("mTotal").textContent="Total: "+money((p?.price||0)*q)};
 const clientSearch=$("mClientSearch"),clientHidden=$("mClient"),clientResults=$("mClientResults");
 let activeIndex=-1;
 const showClientResults=(term="")=>{const q=term.trim().toLowerCase();const matches=clients.filter(c=>!q||c.name.toLowerCase().includes(q)).slice(0,12);clientResults.innerHTML=matches.map((c,i)=>`<button type="button" class="client-result" data-pick-client="${c.id}" data-index="${i}">${esc(c.name)}${c.phone?`<small>${esc(c.phone)}</small>`:""}</button>`).join("")||'<div class="client-no-results">Nenhum cliente encontrado.</div>';activeIndex=-1;clientResults.classList.remove("hidden")};
 const setActive=idx=>{const items=[...clientResults.querySelectorAll("[data-pick-client]")];if(!items.length)return;activeIndex=(idx+items.length)%items.length;items.forEach((b,i)=>b.classList.toggle("active",i===activeIndex));items[activeIndex]?.scrollIntoView({block:"nearest"})};
 const pickClient=id=>{const c=clients.find(x=>x.id===id);if(c){clientHidden.value=c.id;clientSearch.value=c.name;clientResults.classList.add("hidden");clientSearch.blur()}};
 clientSearch.addEventListener("focus",()=>showClientResults(clientSearch.value));
 clientSearch.addEventListener("input",()=>{clientHidden.value="";showClientResults(clientSearch.value)});
 clientSearch.addEventListener("keydown",e=>{
   if(!clientResults.classList.contains("hidden")){
     if(e.key==="ArrowDown"){e.preventDefault();e.stopPropagation();setActive(activeIndex+1);return}
     if(e.key==="ArrowUp"){e.preventDefault();e.stopPropagation();setActive(activeIndex-1);return}
     if(e.key==="Enter"){e.preventDefault();e.stopPropagation();const b=clientResults.querySelector(`[data-index="${activeIndex}"]`);if(b)pickClient(b.dataset.pickClient);return}
     if(e.key==="Escape"){e.preventDefault();e.stopPropagation();clientResults.classList.add("hidden");return}
   }
 });
 clientResults.addEventListener("mousedown",e=>e.preventDefault());
 clientResults.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const b=e.target.closest("[data-pick-client]");if(b)pickClient(b.dataset.pickClient)});
 document.addEventListener("mousedown",function closeClientDropdown(e){if(!clientSearch.contains(e.target)&&!clientResults.contains(e.target)){clientResults.classList.add("hidden")}}, {once:true});
 $("mProduct").onchange=update;$("mQty").oninput=update;update();
 $("cancelModal").onclick=closeModal;$("confirmSale").onclick=async()=>{
  try{
   let p=data.products.find(x=>x.id===$("mProduct").value),q=Math.max(1,Number($("mQty").value)||1),total=p.price*q;
   if(q>Number(p.stock||0))throw Error("Estoque insuficiente.");
   let paid=Math.max(0,Math.min(total,Number($("mPaid").value)||0)),c=data.clients.find(x=>x.id===$("mClient").value);
   const ref=await addDoc(col("sales"),{clientId:c?.id||"",clientName:c?.name||"Venda balcão",items:[{productId:p.id,name:p.name,qty:q,price:p.price,cost:Number(p.cost||0)}],total,paid,paymentMethod:$("mMethod").value,createdAt:serverTimestamp()});
   await updateDoc(doc(col("products"),p.id),{stock:Number(p.stock||0)-q});
   if(paid>0)await addDoc(col("payments"),{saleId:ref.id,clientId:c?.id||"",clientName:c?.name||"Venda balcão",amount:paid,createdAt:serverTimestamp(),method:$("mMethod").value});
   closeModal();toast("Venda registrada!");go("sales");
  }catch(e){toast(e.message||"Não foi possível registrar.")}
 };
}
function openClient(c){
 const ss=data.sales.filter(s=>s.clientId===c.id).sort((a,b)=>(dt(b.createdAt)||0)-(dt(a.createdAt)||0));
 const total=ss.reduce((a,s)=>a+Number(s.total||0),0),pending=ss.reduce((a,s)=>a+Math.max(0,Number(s.total||0)-Number(s.paid||0)),0);
 openModal(esc(c.name),`<div class="hero"><div><small>A RECEBER</small><h2>${money(pending)}</h2><p>${ss.length} compras registradas</p></div><div class="emoji">👤</div></div>${pending>0?`<button class="primary" id="chargeClientModal" style="margin-bottom:12px">💸 Cobrar ${money(pending)}</button>`:""}<div class="section-title"><b>Histórico de compras</b></div><div class="list">${ss.map(s=>saleItem(s)).join("")||'<div class="empty">Nenhuma compra.</div>'}</div><div class="form" style="margin-top:11px"><small style="color:var(--muted)">Total comprado</small><h2 style="margin:4px 0">${money(total)}</h2><button class="primary" id="registerFromClient">💵 Registrar pagamento</button></div>`);
 $("registerFromClient").onclick=()=>openPaymentForClient(c);
 if($("chargeClientModal"))$("chargeClientModal").onclick=()=>chargeClient(c);
}
function pixPayload(amount){
 const value=Number(amount||0).toFixed(2);
 const payload=`00020126480014br.gov.bcb.pix0126vitorbernardo015@gmail.com5204000053039865404${value}5802BR5901N6001C62070503***6304`;
 let crc=0xFFFF;
 for(let i=0;i<payload.length;i++){
   crc^=payload.charCodeAt(i)<<8;
   for(let j=0;j<8;j++) crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF;
 }
 return payload+crc.toString(16).toUpperCase().padStart(4,'0');
}
function chargeClient(c){openCharge(c)}
function openCharge(c){
 const pending=data.sales.filter(s=>s.clientId===c.id).reduce((a,s)=>a+Math.max(0,Number(s.total||0)-Number(s.paid||0)),0);
 if(pending<=0){toast("Esse cliente não possui valor pendente.");return}
 const pix=pixPayload(pending);
 const text=`Opa, ${c.name}, os doces ficaram ${money(pending)}\nPix: vitorbernardo015@gmail.com\n\nOu pode copiar:\n\`${pix}\``;
 openModal("Cobrar",`<div class="form"><div class="item"><div class="avatar">💰</div><div class="item-main"><b>${esc(c.name)}</b><small>Valor pendente</small></div><div class="item-right"><b class="pending">${money(pending)}</b></div></div><div class="field" style="margin-top:12px"><label>Mensagem de cobrança</label><textarea id="chargeText" style="width:100%;min-height:135px;border:1px solid var(--line);border-radius:15px;padding:12px;resize:none;background:#fff;color:var(--text)">${esc(text)}</textarea></div><button class="secondary" id="copyPixQuick" style="width:100%;margin:4px 0 10px">📋 Copiar código PIX</button><div class="field"><label>PIX Copia e Cola</label><textarea id="pixCode" readonly style="width:100%;min-height:105px;border:1px solid var(--line);border-radius:15px;padding:12px;resize:none;background:#fff;color:var(--text);font-size:11px">${pix}</textarea></div><div class="actions"><button class="secondary" id="copyPix">Copiar PIX</button><button class="secondary" id="copyCharge">Copiar mensagem</button></div><button class="primary" id="sendCharge" style="margin-top:8px">Abrir WhatsApp</button></div>`);
 const copyPixCode=async()=>{try{await navigator.clipboard.writeText(pix);toast("PIX copiado!")}catch(e){$("pixCode").select();document.execCommand("copy");toast("PIX copiado!")}};
 $("copyPix").onclick=copyPixCode;
 $("copyPixQuick").onclick=copyPixCode;
 $("copyCharge").onclick=async()=>{try{await navigator.clipboard.writeText($("chargeText").value);toast("Mensagem copiada!")}catch(e){$("chargeText").select();document.execCommand("copy");toast("Mensagem copiada!")}};
 $("sendCharge").onclick=()=>window.open("https://wa.me/?text="+encodeURIComponent($("chargeText").value),"_blank");
}
function openPaymentForClient(c){
 const pendingSales=data.sales.filter(s=>s.clientId===c.id&&Number(s.total||0)>Number(s.paid||0));
 if(!pendingSales.length){toast("Esse cliente não possui valor pendente.");return}
 openModal("Registrar pagamento",`<div class="form"><div class="field"><label>Cliente</label><input value="${esc(c.name)}" disabled></div><div class="field"><label>Valor recebido</label><input id="payValue" type="number" min="0.01" step="0.01" value="${pendingSales.reduce((a,s)=>a+Math.max(0,s.total-s.paid),0).toFixed(2)}"></div><div class="field"><label>Forma</label><select id="payMethod"><option>Dinheiro</option><option>Cartão</option><option>Pagamento no salário</option></select></div><button class="primary" id="savePay">Registrar pagamento</button></div>`);
 $("savePay").onclick=async()=>{
  let amount=Number($("payValue").value)||0;if(amount<=0)return toast("Digite um valor.");
  try{
   let remaining=amount;
   for(const s of pendingSales){
    if(remaining<=0)break;
    const open=Math.max(0,Number(s.total)-Number(s.paid||0)),use=Math.min(open,remaining);
    await updateDoc(doc(col("sales"),s.id),{paid:Number(s.paid||0)+use});
    remaining-=use;
   }
   await addDoc(col("payments"),{clientId:c.id,clientName:c.name,amount,createdAt:serverTimestamp(),method:$("payMethod").value});
   closeModal();toast("Pagamento registrado!");
  }catch(e){toast("Não foi possível registrar o pagamento.")}
 }
}
function openProduct(p=null){
 openModal(p?"Editar produto":"Novo produto",`<div class="form"><div class="field"><label>Nome</label><input id="pName" value="${esc(p?.name||"")}"></div><div class="row"><div class="field"><label>Preço de venda</label><input id="pPrice" type="number" step="0.01" value="${p?.price||""}"></div><div class="field"><label>Custo</label><input id="pCost" type="number" step="0.01" value="${p?.cost||""}"></div></div><div class="row"><div class="field"><label>Estoque</label><input id="pStock" type="number" min="0" value="${p?.stock||0}"></div><div class="field"><label>Estoque mínimo</label><input id="pMin" type="number" min="0" value="${p?.minStock||2}"></div></div><div class="actions"><button class="secondary" id="cancelModal">Cancelar</button><button class="primary" id="saveProduct">Salvar</button></div></div>`);
 $("cancelModal").onclick=closeModal;$("saveProduct").onclick=async()=>{let obj={name:$("pName").value.trim(),price:Number($("pPrice").value)||0,cost:Number($("pCost").value)||0,stock:Number($("pStock").value)||0,minStock:Number($("pMin").value)||0};if(!obj.name||obj.price<=0)return toast("Preencha nome e preço.");try{p?await updateDoc(doc(col("products"),p.id),obj):await addDoc(col("products"),obj);closeModal();toast("Produto salvo!")}catch(e){toast("Erro ao salvar produto.")}}
}
function openClientForm(){
 openModal("Novo cliente",`<div class="form"><div class="field"><label>Nome</label><input id="cName" placeholder="Nome do cliente"></div><div class="field"><label>Telefone (opcional)</label><input id="cPhone" placeholder="(47) 99999-9999"></div><div class="actions"><button class="secondary" id="cancelModal">Cancelar</button><button class="primary" id="saveClient">Salvar</button></div></div>`);
 $("cancelModal").onclick=closeModal;$("saveClient").onclick=async()=>{let name=$("cName").value.trim();if(!name)return toast("Digite o nome.");try{await addDoc(col("clients"),{name,phone:$("cPhone").value.trim(),createdAt:serverTimestamp()});closeModal();toast("Cliente cadastrado!")}catch(e){toast("Erro ao salvar cliente.")}}
}

function openAnalysis(){
 const periods={hour:"Hoje por horário",day:"Últimos 7 dias",week:"Últimas semanas",month:"Este mês"};
 openModal("Análise de vendas",`<div class="tabs" id="analysisTabs"><button class="active" data-a="hour">Horário</button><button data-a="day">Dia</button><button data-a="week">Semana</button><button data-a="month">Mês</button></div><div id="analysisContent"></div>`);
 const renderA=kind=>{document.querySelectorAll("#analysisTabs button").forEach(b=>b.classList.toggle("active",b.dataset.a===kind));$("analysisContent").innerHTML=analysisHtml(kind,periods[kind])};
 document.querySelectorAll("#analysisTabs button").forEach(b=>b.onclick=()=>renderA(b.dataset.a));renderA("hour");
}
function saleValueInRange(start,end){return data.sales.filter(s=>{const d=dt(s.createdAt);return d&&d>=start&&d<end}).reduce((a,s)=>a+Number(s.total||0),0)}
function analysisHtml(kind){
 const periods={hour:"Hoje por horário",day:"Últimos 7 dias",week:"Últimas 8 semanas",month:"Este mês"};
 const sales=data.sales||[], nowD=now(), points=[];
 const sumBetween=(s,e)=>sales.filter(v=>{const x=dt(v.createdAt);return x&&x>=s&&x<=e}).reduce((a,v)=>a+Number(v.total||0),0);
 if(kind==="hour")for(let h=0;h<24;h++){let s=new Date(nowD);s.setHours(h,0,0,0);let e=new Date(s);e.setHours(h,59,59,999);points.push({label:String(h).padStart(2,"0")+"h",value:sumBetween(s,e)})}
 if(kind==="day")for(let i=6;i>=0;i--){let s=new Date(nowD);s.setHours(0,0,0,0);s.setDate(s.getDate()-i);let e=new Date(s);e.setHours(23,59,59,999);points.push({label:s.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".",""),value:sumBetween(s,e)})}
 if(kind==="week"){let base=new Date(nowD);base.setHours(0,0,0,0);base.setDate(base.getDate()-((base.getDay()+6)%7));for(let i=7;i>=0;i--){let s=new Date(base);s.setDate(s.getDate()-i*7);let e=new Date(s);e.setDate(e.getDate()+6);e.setHours(23,59,59,999);points.push({label:s.getDate()+"/"+(s.getMonth()+1),value:sumBetween(s,e)})}}
 if(kind==="month"){let days=new Date(nowD.getFullYear(),nowD.getMonth()+1,0).getDate();for(let d=1;d<=days;d++){let s=new Date(nowD.getFullYear(),nowD.getMonth(),d);s.setHours(0,0,0,0);let e=new Date(s);e.setHours(23,59,59,999);points.push({label:String(d),value:sumBetween(s,e)})}}
 const total=points.reduce((a,p)=>a+p.value,0),max=Math.max(...points.map(p=>p.value),1),w=600,h=190,pad=18,den=Math.max(points.length-1,1);
 const coords=points.map((p,i)=>({x:pad+i*(w-2*pad)/den,y:h-pad-(p.value/max)*(h-2*pad)}));
 const pts=coords.map(p=>`${p.x},${p.y}`).join(" "),step=Math.max(1,Math.ceil(points.length/8));
 const labels=points.map((p,i)=>i%step===0?`<text x="${coords[i].x}" y="${h-2}" text-anchor="middle">${esc(p.label)}</text>`:"").join("");
 const dots=coords.map((p,i)=>`<circle class="dot" cx="${p.x}" cy="${p.y}" r="3"><title>${esc(points[i].label)}: ${money(points[i].value)}</title></circle>`).join("");
 return `<div class="analysis-card"><div class="analysis-head"><div><small style="color:var(--muted)">${periods[kind]}</small><div style="margin-top:3px">Total vendido</div></div><strong>${money(total)}</strong></div><div class="chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline class="line" points="${pts}"/>${dots}${labels}</svg></div></div>`;
}

function openModal(title,content){$("modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><div class="modal-head"><h2>${title}</h2><button type="button" class="close" id="modalClose">×</button></div>${content}</div></div>`;$("modalClose").onclick=closeModal;$("modalRoot").querySelector(".modal-bg").addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal()})}
function closeModal(){$("modalRoot").innerHTML=""}


document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && $("modalRoot").innerHTML) closeModal();
  if((e.key==="n"||e.key==="N") && uid && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) openSale();
});

function bindPage(){
 $("newSale")?.addEventListener("click",openSale);$("qSale")?.addEventListener("click",openSale);
 $("qClient")?.addEventListener("click",openClientForm);$("newClient")?.addEventListener("click",openClientForm);
 $("qProduct")?.addEventListener("click",()=>openProduct());$("newProduct")?.addEventListener("click",()=>openProduct());
 $("qAnalysis")?.addEventListener("click",openAnalysis);$("analysis")?.addEventListener("click",openAnalysis);
 $("seeSales")?.addEventListener("click",()=>go("sales"));
 $("logout")?.addEventListener("click",()=>signOut(auth));
 $("clientSearch")?.addEventListener("input",e=>{$("clientList").innerHTML=clientRows(data.clients.filter(c=>c.name.toLowerCase().includes(e.target.value.toLowerCase())))});
 $("stockSearch")?.addEventListener("input",e=>{$("stockList").innerHTML=productRows(data.products.filter(p=>p.name.toLowerCase().includes(e.target.value.toLowerCase())))});
 document.querySelectorAll("[data-client]").forEach(x=>x.onclick=e=>{if(e.target.closest(".charge-btn"))return;openClient(data.clients.find(c=>c.id===x.dataset.client))});
 document.querySelectorAll("[data-charge]").forEach(x=>x.onclick=e=>{e.stopPropagation();const c=data.clients.find(c=>c.id===x.dataset.charge);if(c)openCharge(c)});
 document.querySelectorAll("[data-charge-client]").forEach(x=>x.onclick=e=>{e.stopPropagation();const c=data.clients.find(c=>c.id===x.dataset.chargeClient);if(c)chargeClient(c)});
 document.querySelectorAll("[data-product]").forEach(x=>x.onclick=()=>openProduct(data.products.find(p=>p.id===x.dataset.product)));
 document.querySelectorAll("[data-sale]").forEach(x=>x.onclick=()=>openSaleDetail(data.sales.find(s=>s.id===x.dataset.sale)));
 document.querySelectorAll("[data-sales-filter]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-sales-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll("#salesBody tr").forEach(r=>{let f=b.dataset.salesFilter; r.style.display=f==="all"||r.dataset.status===f?"":"none"})});
 $("payments")?.addEventListener("click",()=>openReceivables());
 $("receivables")?.addEventListener("click",()=>openReceivables());
 $("account")?.addEventListener("click",()=>toast(auth.currentUser?.email||""));
 $("financeAnalysis")?.addEventListener("click",openAnalysis);$("financeReceivables")?.addEventListener("click",openReceivables);$("financePayments")?.addEventListener("click",()=>{const rows=data.clients.map(c=>{let pending=data.sales.filter(s=>s.clientId===c.id).reduce((a,s)=>a+Math.max(0,s.total-s.paid),0);return {...c,pending}}).filter(c=>c.pending>0).sort((a,b)=>b.pending-a.pending);if(!rows.length)return toast("Ninguém com valor pendente.");openPaymentForClient(rows[0]);});$("financeAccount")?.addEventListener("click",()=>toast(auth.currentUser?.email||""));
}
function openSaleDetail(s){
 if(!s)return;let st=status(s.total,s.paid),pending=Math.max(0,s.total-s.paid);
 openModal("Venda",`<div class="form"><div class="section-title"><b>${esc(s.clientName||"Venda balcão")}</b><span>${dateTime(s.createdAt)}</span></div>${(s.items||[]).map(i=>`<div class="item"><div class="avatar">🍫</div><div class="item-main"><b>${esc(i.name)}</b><small>${i.qty} × ${money(i.price)}</small></div><div class="item-right"><b>${money(i.qty*i.price)}</b></div></div>`).join("")}<div class="section-title" style="margin-top:13px"><b>Total</b><b>${money(s.total)}</b></div><div class="section-title"><span>Pago</span><b class="paid">${money(s.paid)}</b></div><div class="section-title"><span>Pendente</span><b class="${statusClass(st)}">${money(pending)}</b></div>${pending>0&&s.clientId?'<button class="primary" id="detailPay" style="margin-top:10px">💵 Registrar pagamento</button>':""}</div>`);
 if($("detailPay"))$("detailPay").onclick=()=>{let c=data.clients.find(c=>c.id===s.clientId);closeModal();openPaymentForClient(c)}
}
function openReceivables(){
 const rows=data.clients.map(c=>{let pending=data.sales.filter(s=>s.clientId===c.id).reduce((a,s)=>a+Math.max(0,s.total-s.paid),0);return {...c,pending}}).filter(c=>c.pending>0).sort((a,b)=>b.pending-a.pending);
 openModal("A receber",`<div class="list">${rows.map(c=>`<div class="item" data-pay-client="${c.id}"><div class="avatar">💰</div><div class="item-main"><b>${esc(c.name)}</b><small>Valores pendentes</small></div><div class="item-right"><b class="pending">${money(c.pending)}</b></div></div>`).join("")||'<div class="empty">Ninguém com valor pendente. 🎉</div>'}</div>`);
 document.querySelectorAll("[data-pay-client]").forEach(x=>x.onclick=()=>{let c=data.clients.find(c=>c.id===x.dataset.payClient);closeModal();openPaymentForClient(c)})
}


window.addEventListener("load",()=>{
  const s=document.getElementById("brandSplash");
  if(!s)return;
  setTimeout(()=>s.classList.add("hide"),350);
  setTimeout(()=>s.remove(),700);
});
