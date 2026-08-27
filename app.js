
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://eodngcsolkixjkgjipzp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_cJ01J0FhhLL0Lzgrz-64qw_Bdeoro_z'
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

const authView = document.getElementById('auth-view')
const mainView = document.getElementById('main-view')
const pageContent = document.getElementById('page-content')
const rolePill = document.getElementById('role-pill')
const pageTitle = document.getElementById('page-title')

let currentProfile = null

async function getProfile(userId){
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single()
  if(error) throw error
  return data
}

async function loadSession(){
  const { data: { session } } = await supabase.auth.getSession()
  if(!session){
    authView.classList.remove('hidden')
    mainView.classList.add('hidden')
    return
  }
  currentProfile = await getProfile(session.user.id)
  authView.classList.add('hidden')
  mainView.classList.remove('hidden')
  rolePill.textContent = currentProfile.role === 'admin' ? 'ADMINISTRADORA' : 'EMPLEADO'
  document.querySelectorAll('.admin-only').forEach(el=>{
    el.classList.toggle('hidden', currentProfile.role !== 'admin')
  })
  renderDashboard()
}

document.getElementById('login-btn').addEventListener('click', async ()=>{
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const box = document.getElementById('login-error')
  box.textContent = ''
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if(error){ box.textContent = 'No se pudo iniciar sesión.'; return }
  await loadSession()
})

document.getElementById('logout-btn').addEventListener('click', async ()=>{
  await supabase.auth.signOut()
  currentProfile = null
  await loadSession()
})

document.querySelectorAll('nav button[data-page]').forEach(btn=>{
  btn.addEventListener('click', ()=>navigate(btn.dataset.page))
})

async function navigate(page){
  if(['finanzas','reportes'].includes(page) && currentProfile?.role !== 'admin'){
    alert('Acceso no autorizado')
    return
  }
  pageTitle.textContent = ({
    dashboard:'Inicio',planner:'Planner',clases:'Clases',abiertas:'Canchas abiertas',
    torneos:'Torneos propios',terceros:'Torneos de terceros',corporativos:'Eventos corporativos',
    personas:'Alumnos y profesores',finanzas:'Finanzas',reportes:'Reportes'
  })[page]
  if(page==='dashboard') return renderDashboard()
  if(page==='planner') return renderPlanner()
  if(page==='finanzas') return renderFinance()
  return renderSimpleTable(page)
}

async function renderDashboard(){
  pageTitle.textContent = 'Inicio'
  const [{ count: clases },{ count: abiertas },{ count: corporativos }] = await Promise.all([
    supabase.from('classes').select('*',{count:'exact',head:true}),
    supabase.from('open_courts').select('*',{count:'exact',head:true}),
    supabase.from('corporate_events').select('*',{count:'exact',head:true})
  ])
  if(currentProfile.role === 'admin'){
    const { data: movs=[] } = await supabase.from('financial_movements').select('type, amount')
    const ingresos = movs.filter(x=>x.type==='income').reduce((a,b)=>a+Number(b.amount),0)
    const gastos = movs.filter(x=>x.type==='expense').reduce((a,b)=>a+Number(b.amount),0)
    pageContent.innerHTML = `
      <div class="grid">
        <div class="card"><div class="small">Clases</div><div class="metric">${clases||0}</div></div>
        <div class="card"><div class="small">Canchas abiertas</div><div class="metric">${abiertas||0}</div></div>
        <div class="card"><div class="small">Corporativos</div><div class="metric">${corporativos||0}</div></div>
        <div class="card"><div class="small">Resultado</div><div class="metric">$${(ingresos-gastos).toLocaleString('es-AR')}</div></div>
      </div>`
  }else{
    pageContent.innerHTML = `
      <div class="grid">
        <div class="card"><div class="small">Clases</div><div class="metric">${clases||0}</div></div>
        <div class="card"><div class="small">Canchas abiertas</div><div class="metric">${abiertas||0}</div></div>
        <div class="card"><div class="small">Corporativos</div><div class="metric">${corporativos||0}</div></div>
        <div class="card"><div class="small">Perfil</div><div class="metric">Operativo</div></div>
      </div>`
  }
}

async function renderPlanner(){
  const [c,a,t,x,e] = await Promise.all([
    supabase.from('classes').select('date,time,student_name,status'),
    supabase.from('open_courts').select('date,time,category,status'),
    supabase.from('own_tournaments').select('date,name,status'),
    supabase.from('third_party_tournaments').select('date,organizer,status'),
    supabase.from('corporate_events').select('date,company,status')
  ])
  const rows=[]
  ;(c.data||[]).forEach(v=>rows.push([v.date,v.time,'Clase',v.student_name,'clase']))
  ;(a.data||[]).forEach(v=>rows.push([v.date,v.time,'Cancha abierta',v.category,'abierta']))
  ;(t.data||[]).forEach(v=>rows.push([v.date,'','Torneo propio',v.name,'torneo']))
  ;(x.data||[]).forEach(v=>rows.push([v.date,'','Torneo tercero',v.organizer,'tercero']))
  ;(e.data||[]).forEach(v=>rows.push([v.date,'','Corporativo',v.company,'corporativo']))
  rows.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]))
  pageContent.innerHTML = `<table class="table"><thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>${
    rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ${r[4]}">${r[2]}</span></td><td>${r[3]}</td></tr>`).join('')
  }</tbody></table>`
}

async function renderSimpleTable(page){
  const cfg = {
    clases:['classes','date,time,student_name,teacher_name,status'],
    abiertas:['open_courts','date,time,category,slots,registered,status'],
    torneos:['own_tournaments','date,name,category,pairs,status'],
    terceros:['third_party_tournaments','date,organizer,courts,value,balance,status'],
    corporativos:['corporate_events','date,company,people,budget,balance,status'],
    personas:['people','name,type,phone,status']
  }[page]
  const { data=[], error } = await supabase.from(cfg[0]).select(cfg[1])
  if(error){ pageContent.innerHTML='<div class="card">Error al cargar datos.</div>'; return }
  if(!data.length){ pageContent.innerHTML='<div class="card">Todavía no hay registros.</div>'; return }
  const headers=Object.keys(data[0])
  pageContent.innerHTML=`<table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${
    data.map(row=>`<tr>${headers.map(h=>`<td>${row[h]??''}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`
}

async function renderFinance(){
  const { data=[], error } = await supabase.from('financial_movements').select('date,type,category,description,amount').order('date',{ascending:false})
  if(error){ pageContent.innerHTML='<div class="card">No se pudo cargar Finanzas.</div>'; return }
  const ingresos=data.filter(x=>x.type==='income').reduce((a,b)=>a+Number(b.amount),0)
  const gastos=data.filter(x=>x.type==='expense').reduce((a,b)=>a+Number(b.amount),0)
  pageContent.innerHTML=`
    <div class="grid">
      <div class="card"><div class="small">Ingresos</div><div class="metric">$${ingresos.toLocaleString('es-AR')}</div></div>
      <div class="card"><div class="small">Gastos</div><div class="metric">$${gastos.toLocaleString('es-AR')}</div></div>
      <div class="card"><div class="small">Resultado</div><div class="metric">$${(ingresos-gastos).toLocaleString('es-AR')}</div></div>
      <div class="card"><div class="small">Lorena / Marita</div><div class="metric">$${((ingresos-gastos)/2).toLocaleString('es-AR')}</div></div>
    </div>
    <br>
    <table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Importe</th></tr></thead><tbody>
    ${data.map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${x.category}</td><td>${x.description}</td><td>$${Number(x.amount).toLocaleString('es-AR')}</td></tr>`).join('')}
    </tbody></table>`
}

supabase.auth.onAuthStateChange(()=>loadSession())
loadSession()
