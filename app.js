const SUPABASE_URL="https://isceguwzogvbwqxmomnx.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_6K8b1SYA5zEubol9wqPZrw_XwKu5ccN";
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let session=null,me=null,activeChat=null,pinMode=null,messageChannel=null,pendingLockedConversation=null;
let peer=null,localStream=null,activeCall=null,callChannels=new Map(),callStartedAt=null,callTimer=null,storyFile=null,storyObjectUrl=null;
const $=id=>document.getElementById(id); const APP_BASE_URL="https://kingmasr204-del.github.io/ComboApp/";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),3000)}
function initials(n="C"){return n.trim().slice(0,1).toUpperCase()||"C"} function fmt(t){return new Date(t).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}
function fmtDuration(sec){sec=Math.max(0,Math.floor(sec||0));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}

// Cloud-persisted per-user settings. localStorage remains only a fast cache.
let cloudSettings={};
async function loadCloudSettings(){if(!me?.id)return;const r=await sb.from("user_settings").select("settings").eq("user_id",me.id).maybeSingle();if(!r.error){cloudSettings=r.data?.settings||{};Object.entries(cloudSettings).forEach(([k,v])=>{try{localStorage.setItem("combo_"+k,String(v))}catch(_){}})}}
let cloudSaveTimer=null;
function saveCloudSetting(key,value){cloudSettings[key]=value;clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(async()=>{if(!me?.id)return;const r=await sb.from("user_settings").upsert({user_id:me.id,settings:cloudSettings,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(r.error)console.warn("Cloud setting save failed",r.error)},120)}
function setComboSetting(key,value){localStorage.setItem("combo_"+key,String(value));saveCloudSetting(key,value)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))} async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
let _comboEntering=null;
async function init(){try{bind();const {data}=await sb.auth.getSession();session=data.session;if(session)await enterApp();else showAuth();sb.auth.onAuthStateChange((e,s)=>{session=s;if(e==="PASSWORD_RECOVERY"){showRecovery();return}if(s&&!me)enterApp().catch(err=>{console.error(err);toast("تعذر فتح التطبيق، حاول مرة أخرى")});if(!s){me=null;showAuth()}})}catch(e){console.error(e);showAuth();toast(e.message||"حصل خطأ")}}
function showAuth(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("recoveryPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");$("signupPanel").classList.add("hidden")}
function showRecovery(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("loginPanel").classList.add("hidden");$("signupPanel").classList.add("hidden");$("recoveryPanel").classList.remove("hidden")}
function bind(){
  const on=(id,event,fn)=>{const el=$(id);if(el)el.addEventListener(event,fn)};
  const click=(id,fn)=>on(id,'click',fn);
  click('showSignupBtn',()=>{$('loginPanel')?.classList.add('hidden');$('signupPanel')?.classList.remove('hidden')});
  click('showLoginBtn',()=>{$('signupPanel')?.classList.add('hidden');$('loginPanel')?.classList.remove('hidden')});
  click('loginBtn',login); click('signupBtn',signup); click('forgotBtn',resetPassword); click('saveNewPasswordBtn',saveNewPassword);
  click('logoutProfileBtn',logout); click('notifyBtn',toggleGlobalNotifications); click('settingsTopBtn',openGlobalSettings); click('closeGlobalSettingsBtn',closeGlobalSettings);
  click('openProfileSetting',()=>{closeGlobalSettings();go('profilePage')});
  click('openPrivacySetting',()=>{closeGlobalSettings();showPrivacy()});
  click('openAppSettings',()=>{closeGlobalSettings();showSettings()});
  click('openChatSettings',()=>{closeGlobalSettings();showChatStyle()});
  click('openWallpaperSetting',()=>{closeGlobalSettings();showWallpaper()});
  click('openAccountSetting',()=>{closeGlobalSettings();go('profilePage')});
  click('globalLogoutBtn',logout); updateNotificationBell();
  document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  on('userSearch','input',searchUsers); click('newChatBtn',openContacts); click('refreshBtn',loadChats); click('archivedBtn',()=>{go('archivedPage');loadArchived()}); click('backHomeBtn',()=>go('homePage'));
  click('sendMessageBtn',sendMessage); on('messageInput','keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
  click('emojiBtn',toggleEmoji); click('attachContactBtn',openAttachmentSheet);
  click('closeChatBtn',closeChat); click('chatMenuBtn',()=>$('chatMenuModal')?.classList.remove('hidden')); click('menuCancelBtn',closeChatMenu); click('menuArchiveBtn',archiveChat); click('menuLockBtn',lockChat); click('menuDeleteBtn',deleteChat); click('menuReportBtn',reportChat); click('menuAddContactBtn',addActiveContact);
  click('closeContactsBtn',closeContacts); click('pickContactsBtn',pickContacts); click('manualContactBtn',()=>$('manualContactForm')?.classList.toggle('hidden')); click('saveManualContactBtn',saveManualContact); on('contactSearch','input',renderContacts);
  click('addStoryBtn',openStoryComposer); click('closeStoryComposer',closeStoryComposer); click('storyPostTop',publishStory); click('storyTextModeBtn',storyTextMode); on('storyMediaInput','change',handleStoryFile); on('storyCameraInput','change',handleStoryFile); click('storyAudioBtn',pickAudio); document.querySelectorAll('.color-dot').forEach(b=>b.addEventListener('click',()=>{$('storyCanvas').style.background=b.dataset.color}));
  click('avatarActionBtn',avatarActions); on('avatarFileInput','change',uploadAvatar); click('saveProfileBtn',saveProfile); click('changePasswordBtn',changePassword); click('appLockBtn',setupAppLock); click('privacyBtn',showPrivacy); click('settingsBtn',showSettings); click('wallpaperBtn',showWallpaper); click('chatStyleBtn',showChatStyle); click('deleteAccountBtn',deleteAccount);
  click('pinConfirmBtn',confirmPin); click('pinCancelBtn',closePin); click('unlockBtn',unlockApp);
}

async function login(){
  const email=$('loginEmail')?.value.trim(),password=$('loginPassword')?.value;
  if(!email||!password)return toast('اكتب البريد وكلمة السر');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)return toast(error.message||'البريد أو كلمة السر غير صحيحة');
  session=data.session||session;
  try{await enterApp()}catch(e){console.error(e);toast('تعذر فتح التطبيق. حاول تحديث الصفحة مرة أخرى.')}
}
async function signup(){const name=$('signupName').value.trim(),username=$('signupUsername').value.trim().toLowerCase(),email=$('signupEmail').value.trim(),phone=normalizePhone($('signupPhone').value),p=$('signupPassword').value,p2=$('signupPassword2').value;if(!name||!username||!email||!p)return toast('كمّل البيانات');if(!/^[a-z0-9_.]{3,24}$/.test(username))return toast('اسم المستخدم إنجليزي وأرقام و _ فقط');if(p.length<6)return toast('كلمة السر 6 أحرف على الأقل');if(p!==p2)return toast('تأكيد كلمة السر غير مطابق');const {data,error}=await sb.auth.signUp({email,password:p,options:{emailRedirectTo:APP_BASE_URL,data:{display_name:name,username,phone}}});if(error)return toast(error.message);$('signupPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');toast(data.session?'تم إنشاء الحساب':'تم إنشاء الحساب. افتح رسالة التأكيد ثم سجّل الدخول.')}
async function resetPassword(){const email=$('loginEmail').value.trim();if(!email)return toast('اكتب بريدك أولًا');const redirectTo=window.location.origin+window.location.pathname;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)return toast(error.message);toast('تم إرسال رابط تغيير كلمة السر')}
async function saveNewPassword(){const p=$('newPassword').value,p2=$('newPassword2').value;if(p.length<6)return toast('كلمة السر 6 أحرف على الأقل');if(p!==p2)return toast('كلمتا السر غير متطابقتين');const {error}=await sb.auth.updateUser({password:p});if(error)return toast(error.message);toast('تم تغيير كلمة السر');await sb.auth.signOut();showAuth()}
async function logout(){try{await sb.auth.signOut()}finally{location.reload()}}
async function enterApp(){
  if(!session)return;
  if(_comboEntering)return _comboEntering;
  _comboEntering=(async()=>{
    const {data,error}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
    if(error)throw new Error('تعذر تحميل الحساب: '+(error.message||''));
    if(!data){
      const m=session.user.user_metadata||{};
      const base=(session.user.email||'user').split('@')[0].replace(/[^a-z0-9_]/gi,'').slice(0,24)||'user';
      const fallback={id:session.user.id,display_name:m.display_name||'مستخدم',username:m.username||base,phone:m.phone||null,avatar_url:null};
      const r=await sb.from('profiles').upsert(fallback,{onConflict:'id'});
      if(r.error)throw new Error('تعذر تجهيز الحساب: '+r.error.message);
      me=fallback;
    }else me=data;
    // Open the app as soon as the authenticated profile is ready. Secondary data must not block login.
    $('authScreen')?.classList.add('hidden'); $('appScreen')?.classList.remove('hidden');
    await safeAppTask('الإعدادات',loadCloudSettings);
    await safeAppTask('جهات الاتصال',loadCloudContacts);
    await safeAppTask('الملف الشخصي',loadProfile);
    await safeAppTask('المحادثات',loadChats);
    await safeAppTask('الحالات',loadStories);
    await safeAppTask('صارحني',loadSarhnyInbox);
    updateNotificationBell();
    await safeAppTask('قفل التطبيق',checkAppLock);
    try{subscribeMessages()}catch(e){console.warn(e)}
  })();
  try{return await _comboEntering}finally{_comboEntering=null}
}
async function safeAppTask(label,fn){try{return await fn()}catch(e){console.warn('ComboApp '+label+' failed',e);return null}}

function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="homePage")loadChats();if(page==="storiesPage")loadStories();if(page==="sarhnyPage")loadSarhnyInbox();if(page==="callsPage")loadCallHistory()}
async function searchUsers(){const q=$("userSearch").value.trim();if(!q){$("searchResults").classList.add("hidden");return}const safe=q.replace(/[%_,]/g," ");const {data}=await sb.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).neq("id",me.id).limit(10);$("searchResults").classList.remove("hidden");$("searchResults").innerHTML=(data||[]).map(u=>`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name)}</strong><small>@${esc(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`).join("")||"<div class='muted' style='padding:12px'>مفيش نتائج</div>";$("searchResults").querySelectorAll(".result-item").forEach(e=>e.onclick=()=>openUser(e.dataset.id))}
async function openUser(userId){const {data,error}=await sb.from("conversations").select("*").or(`and(user1_id.eq.${me.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${me.id})`).limit(1).maybeSingle();if(error&&error.code!=="PGRST116")return toast("تعذر فتح المحادثة");let c=data;if(!c){const r=await sb.from("conversations").insert({user1_id:me.id,user2_id:userId}).select().single();if(r.error)return toast("تعذر إنشاء المحادثة");c=r.data}$("searchResults").classList.add("hidden");$("userSearch").value="";await openChat(c)}
async function getSettings(){const {data}=await sb.from("conversation_settings").select("conversation_id,archived,locked,deleted").eq("user_id",me.id);return Object.fromEntries((data||[]).map(x=>[x.conversation_id,x]))}
async function renderChats(archived){const target=archived?$("archivedList"):$(("chatList"));const {data,error}=await sb.from("conversations").select("*").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).order("updated_at",{ascending:false});if(error){target.innerHTML="<div class='empty-card'>تعذر تحميل المحادثات</div>";return}const settings=await getSettings();const rowsBase=(data||[]).filter(c=>!settings[c.id]?.deleted);if(!rowsBase.length){target.innerHTML="<div class='empty-card'><h3>💬 مفيش محادثات</h3><p class='muted'>اضغط ＋ وابدأ محادثة جديدة.</p></div>";return}const ids=[...new Set(rowsBase.map(c=>c.user1_id===me.id?c.user2_id:c.user1_id))];const {data:pr}=await sb.from("profiles").select("id,username,display_name,phone,avatar_url").in("id",ids);const map=Object.fromEntries((pr||[]).map(x=>[x.id,x]));const {data:msgs}=await sb.from("messages").select("conversation_id,content,created_at,sender_id,receiver_id,read_at,delivered_at").in("conversation_id",rowsBase.map(c=>c.id)).order("created_at",{ascending:false}).limit(2000);const latest={},unread={};for(const m of msgs||[]){if(!latest[m.conversation_id])latest[m.conversation_id]=m;if(m.receiver_id===me.id&&!m.read_at)unread[m.conversation_id]=(unread[m.conversation_id]||0)+1}const rows=rowsBase.filter(c=>Boolean(settings[c.id]?.archived)===archived);target.innerHTML=rows.map(c=>{const u=map[c.user1_id===me.id?c.user2_id:c.user1_id]||{},last=latest[c.id],n=unread[c.id]||0;const preview=last?`${last.sender_id===me.id?"أنت: ":""}${esc(last.content||"رسالة")}`:"ابدأ المحادثة";return `<div class="chat-item selectable" data-cid="${c.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name||"مستخدم")}</strong><small>${preview}</small></div><div class="chat-meta">${settings[c.id]?.locked?"🔒":""}<span class="time">${last?fmt(last.created_at):fmt(c.updated_at||c.created_at)}</span>${n?`<span class="badge">${n>99?"99+":n}</span>`:""}</div></div>`}).join("")||"<div class='empty-card'>مفيش محادثات هنا.</div>";target.querySelectorAll(".chat-item").forEach(el=>{let timer;el.onclick=()=>openChatById(el.dataset.cid);el.oncontextmenu=e=>{e.preventDefault();openChatById(el.dataset.cid).then(()=>archiveChat())};el.ontouchstart=()=>{timer=setTimeout(()=>{openChatById(el.dataset.cid).then(()=>$("chatMenuModal").classList.remove("hidden"))},650)};el.ontouchend=()=>clearTimeout(timer)});updateChatBadge(Object.values(unread).reduce((a,b)=>a+b,0))}
function updateChatBadge(n){const nav=document.querySelector('.bottom-nav .nav[data-page="homePage"]');if(!nav)return;let b=nav.querySelector('.nav-badge');if(!b){b=document.createElement('span');b.className='nav-badge';nav.appendChild(b)}b.textContent=n>99?'99+':String(n);b.classList.toggle('hidden',!n)}
async function loadChats(){return renderChats(false)} async function loadArchived(){return renderChats(true)}
async function openChatById(id){const {data}=await sb.from("conversations").select("*").eq("id",id).single();if(data)openChat(data)}
async function openChat(c){const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();const {data:s}=await sb.from("conversation_settings").select("*").eq("conversation_id",c.id).eq("user_id",me.id).maybeSingle();if(s?.locked){pinMode="unlockChat";pendingLockedConversation=c;window._lockedSetting=s;$("pinTitle").textContent="فتح المحادثة";$("pinConfirmBtn").textContent="فتح";$("pinModal").classList.remove("hidden");return}activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";$("chatStatus").textContent="متصل عبر ComboApp";setChatAvatar(u);$("chatModal").classList.remove("hidden");await markDelivered();await loadMessages();await markRead();applyChatWallpaper()}
function setChatAvatar(u){$("chatAvatar").innerHTML=u?.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u?.display_name))}
async function markDelivered(){if(!activeChat)return;await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("delivered_at",null)}
async function loadMessages(){if(!activeChat)return;const {data,error}=await sb.from("messages").select("*").eq("conversation_id",activeChat.conversation.id).order("created_at");if(error){$("messagesBox").innerHTML="<div class='muted'>تعذر تحميل الرسائل</div>";return}$("messagesBox").innerHTML=(data||[]).map(m=>{let ticks="";if(m.sender_id===me.id){ticks=m.read_at?"<span class='ticks read'>✓✓</span>":m.delivered_at?"<span class='ticks'>✓✓</span>":"<span class='ticks'>✓</span>"}return `<div class="bubble ${m.sender_id===me.id?"mine":"theirs"}">${esc(m.content)}<small>${fmt(m.created_at)} ${ticks}</small></div>`}).join("");$("messagesBox").scrollTop=$("messagesBox").scrollHeight}
async function sendMessage(){const content=$("messageInput").value.trim();if(!content||!activeChat)return;const r=await sb.from("messages").insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:"text"});if(r.error)return toast("تعذر إرسال الرسالة");$("messageInput").value="";await loadMessages();await loadChats()}
async function markRead(){if(!activeChat)return;const now=new Date().toISOString();await sb.from("messages").update({delivered_at:now,read_at:now}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("read_at",null);await loadMessages()}
function setting(key,def){return localStorage.getItem('combo_'+key) ?? def}
function setSetting(key,val){setComboSetting(key,val)}
function notificationsEnabled(){return setting("notifications","on")!=="off"}
function updateNotificationBell(){const b=$("notifyBtn");if(!b)return;b.textContent=notificationsEnabled()?"🔔":"🔕";b.classList.toggle("bell-off",!notificationsEnabled());b.title=notificationsEnabled()?"إيقاف إشعارات البرنامج":"تشغيل إشعارات البرنامج"}
async function toggleGlobalNotifications(){const next=!notificationsEnabled();setComboSetting("notifications",next?"on":"off");updateNotificationBell();if(next){await requestNotifications();toast("تم تشغيل إشعارات البرنامج")}else toast("تم إيقاف إشعارات البرنامج")}
function openGlobalSettings(){$("globalSettingsModal").classList.remove("hidden")}
function closeGlobalSettings(){$("globalSettingsModal").classList.add("hidden")}
async function requestNotifications(){setComboSetting("notifications","on");if(!("Notification"in window))return;if(Notification.permission==="default")try{await Notification.requestPermission()}catch(e){}updateNotificationBell()}
async function notifyIncomingMessage(m){if(m.receiver_id!==me.id||m.sender_id===me.id)return;if(!notificationsEnabled())return;const bell=$("notifyBtn");if(bell){bell.classList.remove("bell-shake");void bell.offsetWidth;bell.classList.add("bell-shake");setTimeout(()=>bell.classList.remove("bell-shake"),700)}await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("id",m.id).eq("receiver_id",me.id);if(activeChat?.conversation?.id===m.conversation_id)return;const {data:u}=await sb.from("profiles").select("display_name").eq("id",m.sender_id).maybeSingle();toast(`💬 ${u?.display_name||"رسالة جديدة"}: ${m.content||"رسالة"}`);if("Notification"in window&&Notification.permission==="granted")try{new Notification(u?.display_name||"رسالة جديدة",{body:m.content||"رسالة جديدة",icon:"logo.png"})}catch(e){}}
function subscribeMessages(){if(messageChannel)sb.removeChannel(messageChannel);messageChannel=sb.channel("messages-"+me.id).on("postgres_changes",{event:"*",schema:"public",table:"messages"},p=>{if(p.eventType==="INSERT"&&p.new?.receiver_id===me.id)notifyIncomingMessage(p.new);if(activeChat&&p.new?.conversation_id===activeChat.conversation.id){loadMessages();if(p.new.receiver_id===me.id)markRead()}loadChats()}).subscribe()}
function closeChat(){$("chatModal").classList.add("hidden");activeChat=null;$("emojiPanel").classList.add("hidden")}
function closeChatMenu(){$("chatMenuModal").classList.add("hidden")}
async function archiveChat(){closeChatMenu();if(!activeChat)return;await setChatSetting({archived:true});const id=activeChat.conversation.id;closeChat();await loadChats();toast("تم نقل المحادثة للأرشيف")}
async function lockChat(){closeChatMenu();if(!activeChat)return;pinMode="chat";$("pinTitle").textContent="قفل المحادثة";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}
async function deleteChat(){closeChatMenu();if(!activeChat)return;const ok=confirm("حذف المحادثة من قائمتك؟");if(!ok)return;await setChatSetting({deleted:true,archived:false});const id=activeChat.conversation.id;closeChat();await loadChats();toast("تم حذف المحادثة من قائمتك")}
async function reportChat(){closeChatMenu();if(!activeChat)return;const reason=prompt("اكتب سبب الإبلاغ (اختياري)")||"بلاغ من المستخدم";const r=await sb.from("reports").insert({reporter_id:me.id,reported_user_id:activeChat.user.id,reason});if(r.error)toast("تعذر إرسال البلاغ");else toast("تم إرسال البلاغ")}
async function addActiveContact(){closeChatMenu();if(!activeChat)return;const list=readSavedContacts();const phone=activeChat.user.phone;if(!phone)return toast("الجهة دي مش مسجل لها رقم");if(!list.some(x=>x.phone===phone))list.push({name:activeChat.user.display_name,phone});saveContacts(list);toast("تمت إضافة جهة الاتصال")}
async function setChatSetting(extra){if(!activeChat)return;const {data:old}=await sb.from("conversation_settings").select("archived,locked,pin_hash,deleted").eq("conversation_id",activeChat.conversation.id).eq("user_id",me.id).maybeSingle();const base={user_id:me.id,conversation_id:activeChat.conversation.id,archived:old?.archived||false,locked:old?.locked||false,pin_hash:old?.pin_hash||null,deleted:old?.deleted||false,...extra};const r=await sb.from("conversation_settings").upsert(base,{onConflict:"user_id,conversation_id"});if(r.error)toast("شغّل SQL الخاص بالتحديث الأخير")}
async function confirmPin(){const pin=$("pinInput").value.trim();if(!/^\d{4,8}$/.test(pin))return toast("الرمز من 4 إلى 8 أرقام");const h=await sha(pin);if(pinMode==="chat"){await setChatSetting({locked:true,pin_hash:h});toast("تم قفل المحادثة");closePin()}else if(pinMode==="unlockChat"){if(h!==window._lockedSetting.pin_hash)return toast("رمز القفل غير صحيح");const c=pendingLockedConversation;closePin();pendingLockedConversation=null;if(c){const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";setChatAvatar(u);$("chatModal").classList.remove("hidden");await loadMessages();await markRead()}}else if(pinMode==="app"){setComboSetting("app_lock",h);toast("تم تفعيل قفل التطبيق");closePin();$("appLockState").textContent="مفعل"}}
function closePin(){$("pinModal").classList.add("hidden");$("pinInput").value="";pinMode=null;window._lockedSetting=null}function setupAppLock(){pinMode="app";$("pinTitle").textContent="قفل التطبيق";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}async function checkAppLock(){if(localStorage.getItem("combo_app_lock"))$("lockScreen").classList.remove("hidden")}async function unlockApp(){const h=await sha($("unlockInput").value);if(h===localStorage.getItem("combo_app_lock")){$("lockScreen").classList.add("hidden");$("unlockInput").value=""}else toast("رمز القفل غير صحيح")}
function normalizePhone(v=""){let n=String(v).replace(/[^0-9+]/g,"");if(n.startsWith("00"))n="+"+n.slice(2);if(n.startsWith("+20"))return"20"+n.slice(3);if(n.startsWith("20")&&n.length>=12)return n;if(n.startsWith("0"))return"20"+n.slice(1);return n.replace(/\D/g,"")}
function readSavedContacts(){try{return JSON.parse(localStorage.getItem("combo_contacts")||"[]")}catch{return[]}}
async function loadCloudContacts(){if(!me?.id)return;const r=await sb.from("user_contacts").select("name,phone,created_at").eq("user_id",me.id).order("created_at",{ascending:false});if(!r.error){localStorage.setItem("combo_contacts",JSON.stringify(r.data||[]))}}
async function saveContacts(l){localStorage.setItem("combo_contacts",JSON.stringify(l));if(!me?.id)return;const d=await sb.from("user_contacts").delete().eq("user_id",me.id);if(d.error)console.warn(d.error);if(l.length){const r=await sb.from("user_contacts").insert(l.map(x=>({user_id:me.id,name:x.name,phone:x.phone})));if(r.error)console.warn(r.error)}}function openContacts(){$("contactsModal").classList.remove("hidden");renderContacts()};function closeContacts(){$("contactsModal").classList.add("hidden")}
async function pickContacts(){if(!navigator.contacts?.select){$("manualContactForm").classList.remove("hidden");toast("المتصفح ده مش بيدعم اختيار جهات الاتصال مباشرة — أضف الرقم يدويًا") ;return}try{const raw=await navigator.contacts.select(["name","tel"],{multiple:true});const list=readSavedContacts();for(const c of raw){const phone=normalizePhone(c.tel?.[0]||"");if(phone&&!list.some(x=>x.phone===phone))list.push({name:c.name?.[0]||"جهة اتصال",phone})}saveContacts(list);renderContacts();toast("تم استيراد جهات الاتصال")}catch(e){if(e.name!=="AbortError")toast("لم نقدر نقرأ جهات الاتصال")}}
function saveManualContact(){const name=$("manualContactName").value.trim()||"جهة اتصال",phone=normalizePhone($("manualContactPhone").value);if(phone.length<10)return toast("اكتب رقم موبايل صحيح");const list=readSavedContacts();if(!list.some(x=>x.phone===phone))list.push({name,phone});saveContacts(list);$("manualContactName").value="";$("manualContactPhone").value="";renderContacts();toast("تمت إضافة جهة الاتصال")}
async function renderContacts(){const q=$("contactSearch").value.trim().toLowerCase();let list=readSavedContacts().filter(x=>!q||x.name.toLowerCase().includes(q)||x.phone.includes(q));const nums=list.map(x=>x.phone).filter(Boolean);let profiles=[];if(nums.length){const {data}=await sb.from("profiles").select("id,display_name,username,phone,avatar_url").in("phone",nums);profiles=data||[]}const byPhone=Object.fromEntries(profiles.map(p=>[p.phone,p]));$("contactsList").innerHTML=list.map(c=>{const p=byPhone[c.phone];return `<div class="contact-row"><div class="avatar">${p?.avatar_url?`<img src="${esc(p.avatar_url)}">`:initials(c.name)}</div><div class="chat-info"><strong>${esc(c.name)}</strong><small>${p?`@${esc(p.username)}`:esc(c.phone)}</small></div>${p?`<button class="contact-action primary-inline" data-chat="${p.id}">دردشة</button>`:`<button class="contact-action invite-btn" data-invite="${esc(c.phone)}">ادعُ للبرنامج</button>`}</div>`}).join("")||"<div class='empty-card'>أضف جهة اتصال من الزر فوق.</div>";$("contactsList").querySelectorAll("[data-chat]").forEach(b=>b.onclick=()=>{closeContacts();openUser(b.dataset.chat)});$("contactsList").querySelectorAll("[data-invite]").forEach(b=>b.onclick=()=>inviteContact(b.dataset.invite))}
function inviteContact(phone){const text=encodeURIComponent("تعالى على ComboApp وتواصل معايا بحرية 👑💚 "+APP_BASE_URL);location.href=`sms:${phone}?body=${text}`}
function openStoryComposer(){$("storyComposer").classList.remove("hidden");$("storyCanvas").classList.add("text-mode");$("storyText").value="";$("storyCanvasMedia").innerHTML="";$("storyCaptionWrap").classList.add("hidden");storyFile=null;if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=null}
function closeStoryComposer(){$("storyComposer").classList.add("hidden");if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=null;storyFile=null}
function storyTextMode(){$("storyCanvas").classList.add("text-mode");$("storyCanvas").classList.remove("media-mode");$("storyText").focus()}
function storyType(f){if(!f)return"text";if(f.type.startsWith("image/"))return"image";if(f.type.startsWith("video/"))return"video";if(f.type.startsWith("audio/"))return"audio";return null}
function handleStoryFile(e){const f=e.target.files?.[0];if(!f)return;const type=storyType(f);if(!type)return toast("اختار صورة أو فيديو أو صوت");storyFile=f;if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=URL.createObjectURL(f);$("storyCanvas").classList.remove("text-mode");$("storyCanvas").classList.add("media-mode");$("storyText").value="";$("storyCaptionWrap").classList.remove("hidden");$("storyCanvasMedia").innerHTML=type==="image"?`<img src="${storyObjectUrl}">`:type==="video"?`<video src="${storyObjectUrl}" controls autoplay muted playsinline></video>`:`<div class="audio-preview"><div class="music-disc">♫</div><strong>${esc(f.name)}</strong><audio src="${storyObjectUrl}" controls></audio></div>`}
function pickAudio(){const i=document.createElement("input");i.type="file";i.accept="audio/*";i.onchange=handleStoryFile;i.click()}
async function publishStory(){const text=$("storyText").value.trim(),caption=$("storyCaption").value.trim(),file=storyFile;if(!text&&!file)return toast("اكتب حاجة أو اختار صورة/فيديو/صوت");let media_path=null,media_type="text";if(file){media_type=storyType(file);const path=`${me.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const up=await sb.storage.from("stories").upload(path,file,{upsert:false});if(up.error)return toast("تعذر رفع ملف الستوري: "+up.error.message);media_path=path}const content=file?caption:text;const {error}=await sb.from("stories").insert({user_id:me.id,content,media_path,media_type,expires_at:new Date(Date.now()+86400000).toISOString()});if(error){if(media_path)await sb.storage.from("stories").remove([media_path]);return toast("تعذر نشر الستوري: "+error.message)}closeStoryComposer();toast("تم نشر الستوري");await loadStories()}
function getFriendIds(){return sb.from("conversations").select("user1_id,user2_id").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).then(async({data:c})=>{const ids=new Set([me.id]);for(const x of c||[])ids.add(x.user1_id===me.id?x.user2_id:x.user1_id);for(const x of readSavedContacts()){const {data:p}=await sb.from("profiles").select("id").eq("phone",x.phone).maybeSingle();if(p)ids.add(p.id)}return[...ids]})}
async function loadStories(){const ids=await getFriendIds();const {data,error}=await sb.from("stories").select("*,profiles(display_name,username,avatar_url)").in("user_id",ids).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});if(error){$("storiesList").innerHTML="<div class='empty-card'>تعذر تحميل الحالات</div>";return}const rows=data||[],urls={};for(const s of rows)if(s.media_path){const r=await sb.storage.from("stories").createSignedUrl(s.media_path,3600);if(!r.error)urls[s.id]=r.data.signedUrl}$("storiesList").innerHTML=rows.map(s=>{const u=urls[s.id];let media="";if(u&&s.media_type==="image")media=`<div class="story-media"><img src="${esc(u)}"></div>`;if(u&&s.media_type==="video")media=`<div class="story-media"><video src="${esc(u)}" controls playsinline></video></div>`;if(u&&s.media_type==="audio")media=`<div class="story-media"><div class="story-audio-name">🎵 ${esc(s.content||"ملف صوتي")}</div><audio src="${esc(u)}" controls></audio></div>`;return `<article class="story-item"><div class="story-author"><div class="avatar">${s.profiles?.avatar_url?`<img src="${esc(s.profiles.avatar_url)}">`:initials(s.profiles?.display_name)}</div><div><strong>${esc(s.profiles?.display_name||"مستخدم")}</strong><small>${s.user_id===me.id?"حالتي":"من جهات اتصالك"} · ${fmt(s.created_at)}</small></div></div>${media}${s.content&&s.media_type!=="audio"?`<p class="story-caption">${esc(s.content)}</p>`:""}</article>`}).join("")||"<div class='empty-card'>مفيش حالات من أصحابك حاليًا.</div>"}
async function sendSarhny(){const username=$("sarhnyUsername").value.trim(),content=$("sarhnyContent").value.trim();if(!username||!content)return toast("اكتب اسم المستخدم والرسالة");const {error}=await sb.rpc("send_sarhny_message",{p_username:username,p_content:content});if(error)return toast(error.message);$("sarhnyContent").value="";$("sarhnyCount").textContent="0";toast("تم إرسال رسالتك بشكل سري")}
async function loadSarhnyInbox(){const {data,error}=await sb.from("sarhny_messages").select("id,content,created_at").eq("recipient_id",me.id).order("created_at",{ascending:false});if(error){$("sarhnyInbox").innerHTML="<div class='muted'>تعذر تحميل الرسائل السرية.</div>";return}$("sarhnyInbox").innerHTML=(data||[]).map(x=>`<div class="sarhny-item"><div class="avatar">♡</div><div class="chat-info"><strong>رسالة سرية</strong><small>${esc(x.content)}</small></div><span class="time">${fmt(x.created_at)}</span></div>`).join("")||"<div class='empty-card'>لسه موصلكش رسائل سرية.</div>"}
async function loadProfile(){$("profileName").value=me.display_name||"";$("profileUsername").value=me.username||"";$("profilePhone").value=me.phone||"";$("profileBio").value=me.bio||"";renderAvatar(me.avatar_url,me.display_name)}
function renderAvatar(url,name){$("avatarActionBtn").innerHTML=url?`<img src="${esc(url)}">`:esc(initials(name))}
async function saveProfile(){const display_name=$("profileName").value.trim(),username=$("profileUsername").value.trim().toLowerCase(),phone=normalizePhone($("profilePhone").value),bio=$("profileBio").value.trim();if(!display_name||!username)return toast("الاسم واسم المستخدم مطلوبين");const {error}=await sb.from("profiles").update({display_name,username,phone:phone||null,bio,last_seen:new Date().toISOString()}).eq("id",me.id);if(error)return toast(error.code==="23505"?"اسم المستخدم أو الرقم مستخدم بالفعل":"تعذر حفظ البيانات");me={...me,display_name,username,phone:phone||null,bio};renderAvatar(me.avatar_url,display_name);toast("تم حفظ البروفايل")}
function avatarActions(){const has=!!me.avatar_url;const a=prompt(has?"اكتب 1 لإضافة/تغيير الصورة أو 2 لحذفها":"اكتب 1 لإضافة صورة");if(a==="1")$("avatarFileInput").click();if(a==="2"&&has)removeAvatar()}
async function uploadAvatar(e){const f=e.target.files?.[0];if(!f)return;const path=`${me.id}/avatar-${Date.now()}.${(f.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"")}`;const up=await sb.storage.from("avatars").upload(path,f,{upsert:true});if(up.error)return toast("تعذر رفع الصورة. شغّل SQL الخاص بالصور");const pub=sb.storage.from("avatars").getPublicUrl(path);const {error}=await sb.from("profiles").update({avatar_url:pub.data.publicUrl}).eq("id",me.id);if(error)return toast("تعذر حفظ الصورة");me.avatar_url=pub.data.publicUrl;renderAvatar(me.avatar_url,me.display_name);toast("تم تحديث صورة البروفايل")}
async function removeAvatar(){const {error}=await sb.from("profiles").update({avatar_url:null}).eq("id",me.id);if(error)return toast("تعذر حذف الصورة");me.avatar_url=null;renderAvatar(null,me.display_name);toast("تم حذف الصورة")}
async function changePassword(){const p=prompt("اكتب كلمة السر الجديدة (6 أحرف على الأقل):");if(!p||p.length<6)return;const {error}=await sb.auth.updateUser({password:p});toast(error?error.message:"تم تغيير كلمة السر")}
function showPrivacy(){openSimple("الخصوصية والأمان",`<div class="settings-info"><p>• الستوري تظهر لصاحبها ولجهات الاتصال المرتبطة بمحادثة داخل ComboApp.</p><p>• رسائل صارحني لا تعرض هوية المرسل للمستلم.</p><p>• لا تشارك كلمة السر أو رمز قفل التطبيق مع أي شخص.</p></div>`,"تمام")}
function showSettings(){openSimple("الإعدادات",`<div class="settings-info"><p>🔔 الإشعارات: يتم طلب الإذن من المتصفح.</p><p>🌙 الواجهة: داكنة بهوية ComboApp.</p><p>📳 الاهتزاز والصوت يعتمدان على إعدادات الهاتف والمتصفح.</p></div>`,"تم")}
function showWallpaper(){const opts=["افتراضي","نقاط نيون","تدرج أخضر","أزرق ليلي","أسود سادة"];openSimple("خلفية الدردشة",opts.map((x,i)=>`<button class="choice-btn" data-wall="${i}">${x}</button>`).join(""),"إغلاق");setTimeout(()=>document.querySelectorAll("[data-wall]").forEach(b=>b.onclick=()=>{localStorage.setItem("combo_wallpaper",b.dataset.wall);applyChatWallpaper();closeSimple();toast("تم تغيير الخلفية")}),50)}
function applyChatWallpaper(){const v=localStorage.getItem("combo_wallpaper")||"0",p=["","wall-dots","wall-green","wall-blue","wall-black"][v];$("chatPanel").className="modal-panel chat-panel "+p}
function showChatStyle(){openSimple("نمط الدردشة",`<button class="choice-btn" onclick="setComboSetting('bubbles','classic');closeSimple();toast('تم اختيار النمط الكلاسيكي')">فقاعات ComboApp</button><button class="choice-btn" onclick="setComboSetting('bubbles','soft');closeSimple();toast('تم اختيار النمط الناعم')">فقاعات ناعمة</button>`,"إغلاق")}
function openSimple(title,body,ok="حفظ"){$("simpleTitle").textContent=title;$("simpleBody").innerHTML=body;$("simpleOk").textContent=ok;$("simpleCancel").classList.toggle("hidden",ok!=="حفظ");$("simpleOk").onclick=closeSimple;$("simpleCancel").onclick=closeSimple;$("simpleModal").classList.remove("hidden")}function closeSimple(){$("simpleModal").classList.add("hidden")}
async function deleteAccount(){if(!confirm("حذف الحساب نهائيًا؟ لا يمكن التراجع عن ذلك."))return;const {error}=await sb.rpc("delete_my_account");if(error)return toast("الحذف يحتاج تشغيل SQL الأخير في Supabase");await sb.auth.signOut();location.reload()}
function toggleEmoji(){$("emojiPanel").classList.toggle("hidden");if(!$('emojiPanel').classList.contains('hidden'))showEmojiTab('emoji')}
function showEmojiTab(tab){document.querySelectorAll('.emoji-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const box=$("emojiContent");if(tab==="emoji"){box.innerHTML="<emoji-picker></emoji-picker>";const p=box.querySelector("emoji-picker");p.addEventListener("emoji-click",e=>{insertAtCursor($("messageInput"),e.detail.unicode)})}else if(tab==="sticker"){box.innerHTML='<div class="sticker-grid">'+["😍","😂","🥰","😭","😎","🔥","❤️","👍","🎉","🤍","👑","💚"].map(x=>`<button>${x}</button>`).join("")+"</div>";box.querySelectorAll('button').forEach(b=>b.onclick=()=>sendMessageContent(b.textContent))}else{box.innerHTML='<div class="gif-grid"><button>😂 GIF</button><button>❤️ GIF</button><button>🔥 GIF</button><button>🎉 GIF</button><p class="muted">لإضافة GIF متحرك فعليًا، استخدم رابط GIF أو اربط Tenor/GIPHY API في نسخة المتجر.</p></div>'}}
function insertAtCursor(input,text){const s=input.selectionStart??input.value.length,e=input.selectionEnd??input.value.length;input.value=input.value.slice(0,s)+text+input.value.slice(e);input.focus();input.selectionStart=input.selectionEnd=s+text.length}
function sendMessageContent(text){$("messageInput").value=text;$("emojiPanel").classList.add("hidden");sendMessage()}
function createPeer(){const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));pc.ontrack=e=>{$("remoteVideo").srcObject=e.streams[0];$("callState").textContent="متصل";startCallTimerIfNeeded()};pc.onicecandidate=e=>{if(e.candidate&&activeCall)sendCallSignal(activeCall.conversationId,{type:"ice",callId:activeCall.id,from:me.id,to:activeCall.peerId,candidate:e.candidate})};pc.onconnectionstatechange=()=>{if(pc.connectionState==="connected"){$("callState").textContent="متصل";startCallTimerIfNeeded()}if(["failed","disconnected"].includes(pc.connectionState))$("callState").textContent="انقطع الاتصال"};return pc}
async function subscribeCallRooms(){for(const c of callChannels.values())await sb.removeChannel(c);callChannels.clear();const {data}=await sb.from("conversations").select("id").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);for(const c of data||[])subscribeCallRoom(c.id)}async function subscribeCallRoom(id){if(callChannels.has(id))return;const ch=sb.channel("call-"+id,{config:{private:true,broadcast:{ack:true}}});ch.on("broadcast",{event:"signal"},async({payload})=>{if(payload?.to===me.id)try{await handleSignal(payload)}catch(e){console.error(e)}});await ch.subscribe();callChannels.set(id,ch)}async function sendCallSignal(id,payload){const ch=callChannels.get(id);if(ch)await ch.send({type:"broadcast",event:"signal",payload})}
async function startCall(video){if(!activeChat)return toast("افتح محادثة أولًا");if(location.protocol!=="https:"&&location.hostname!=="localhost")return toast("المكالمة تحتاج HTTPS");try{await subscribeCallRoom(activeChat.conversation.id);activeCall={id:crypto.randomUUID(),video,initiator:true,peerId:activeChat.user.id,conversationId:activeChat.conversation.id};localStream=await navigator.mediaDevices.getUserMedia({audio:true,video});$("localVideo").srcObject=localStream;$("remoteVideo").srcObject=null;$("callAvatar").textContent=initials(activeChat.user.display_name);$("callTitle").textContent=video?"مكالمة فيديو":"مكالمة صوتية";$("callState").textContent="جارٍ الاتصال...";$("callTimer").textContent="00:00";$("callModal").classList.remove("hidden");peer=createPeer();const offer=await peer.createOffer();await peer.setLocalDescription(offer);await sendCallSignal(activeCall.conversationId,{type:"offer",callId:activeCall.id,from:me.id,to:activeCall.peerId,video,offer})}catch(e){console.error(e);await stopCall(false);toast(e.name==="NotAllowedError"?"اسمح للكاميرا والميكروفون من إعدادات المتصفح":"تعذر بدء المكالمة")}}
function startCallTimerIfNeeded(){if(callTimer||!activeCall)return;if(!callStartedAt)callStartedAt=Date.now();callTimer=setInterval(()=>$("callTimer").textContent=fmtDuration((Date.now()-callStartedAt)/1000),1000)}
async function handleSignal(p){if(p.type==="offer"){if(activeCall)return;const {data:u}=await sb.from("profiles").select("id,display_name").eq("id",p.from).single();const accept=confirm("مكالمة واردة من "+(u?.display_name||"مستخدم")+". موافق؟");if(!accept){await sendCallSignal(p.conversationId,{type:"reject",callId:p.callId,from:me.id,to:p.from});return}activeCall={id:p.callId,video:!!p.video,initiator:false,peerId:p.from,conversationId:p.conversationId};localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:!!p.video});$("localVideo").srcObject=localStream;$("callTitle").textContent=p.video?"مكالمة فيديو":"مكالمة صوتية";$("callState").textContent="جارٍ الاتصال...";$("callTimer").textContent="00:00";$("callAvatar").textContent=initials(u?.display_name);$("callModal").classList.remove("hidden");peer=createPeer();await peer.setRemoteDescription(p.offer);const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await sendCallSignal(p.conversationId,{type:"answer",callId:p.callId,from:me.id,to:p.from,answer});return}if(!activeCall||p.callId!==activeCall.id)return;if(p.type==="answer"&&peer){await peer.setRemoteDescription(p.answer);$("callState").textContent="متصل";startCallTimerIfNeeded()}if(p.type==="ice"&&peer)try{await peer.addIceCandidate(p.candidate)}catch(e){}if(p.type==="reject"){toast("تم رفض المكالمة");await stopCall(false)}if(p.type==="hangup"){toast("انتهت المكالمة");await stopCall(false)}}
async function stopCall(sendHangup=true){const old=activeCall;const duration=callStartedAt?Math.floor((Date.now()-callStartedAt)/1000):0;if(sendHangup&&old)try{await sendCallSignal(old.conversationId,{type:"hangup",callId:old.id,from:me?.id,to:old.peerId})}catch(e){}if(old&&me)await sb.from("call_history").insert({user_id:me.id,conversation_id:old.conversationId,peer_id:old.peerId,call_type:old.video?"video":"audio",status:duration?"ended":"missed",duration_seconds:duration});if(callTimer)clearInterval(callTimer);callTimer=null;callStartedAt=null;if(peer){peer.close();peer=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}activeCall=null;$("callModal").classList.add("hidden");$("localVideo").srcObject=null;$("remoteVideo").srcObject=null;await loadCallHistory()}
function toggleMute(){if(!localStream)return;const t=localStream.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$("muteBtn").textContent=t.enabled?"🎙️":"🔇"}}function toggleCamera(){if(!localStream)return;const t=localStream.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$("cameraBtn").textContent=t.enabled?"📷":"🚫"}}
async function loadCallHistory(){const {data,error}=await sb.from("call_history").select("*,profiles:peer_id(display_name,avatar_url)").eq("user_id",me.id).order("created_at",{ascending:false}).limit(50);if(error){$("callHistory").innerHTML="<div class='empty-card'>شغّل SQL الخاص بسجل المكالمات أولًا.</div>";return}$("callHistory").innerHTML=(data||[]).map(c=>`<div class="chat-item"><div class="avatar">${c.profiles?.avatar_url?`<img src="${esc(c.profiles.avatar_url)}">`:initials(c.profiles?.display_name)}</div><div class="chat-info"><strong>${esc(c.profiles?.display_name||"مستخدم")}</strong><small>${c.call_type==="video"?"فيديو":"صوت"} · ${c.status==="missed"?"مكالمه فائتة":"انتهت"} · ${fmtDuration(c.duration_seconds||0)}</small></div><span class="time">${fmt(c.created_at)}</span></div>`).join("")||"<div class='empty-card'>مفيش مكالمات لسه.</div>"}
init();
/* ===== ComboApp V2 functional fixes ===== */
let storyPrivacyMode='contacts',storyExcludedIds=[],storySelectedIds=[];
let pendingIceCandidates=[];

function userOnlineText(lastSeen){
  if(!lastSeen) return 'آخر ظهور غير متاح';
  const ms=Date.now()-new Date(lastSeen).getTime();
  if(ms<120000) return 'متصل';
  const d=new Date(lastSeen);
  return 'آخر ظهور منذ '+d.toLocaleString('ar-EG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
async function touchLastSeen(){
  if(!me) return;
  const now=new Date().toISOString();
  me.last_seen=now;
  await sb.from('profiles').update({last_seen:now}).eq('id',me.id);
}

function enhanceUI(){
  const a=$('attachContactBtn'); if(a) a.onclick=openAttachmentSheet;
  const title=$('chatTitle'); if(title) title.onclick=()=>{if(activeChat)openOtherProfile(activeChat.user)};
  const avatar=$('chatAvatar'); if(avatar) avatar.onclick=()=>{if(activeChat)openOtherProfile(activeChat.user)};
  if($('closeOtherProfileBtn')) $('closeOtherProfileBtn').onclick=()=>closeOtherProfile();
  if($('otherVoiceBtn')) $('otherVoiceBtn').onclick=()=>{closeOtherProfile();startCall(false)};
  if($('otherVideoBtn')) $('otherVideoBtn').onclick=()=>{closeOtherProfile();startCall(true)};
  if($('otherSarhnyBtn')) $('otherSarhnyBtn').onclick=()=>{if(activeChat){$('sarhnyUsername').value=activeChat.user.username||'';closeOtherProfile();closeChat();go('sarhnyPage')}};
  if($('otherAddBtn')) $('otherAddBtn').onclick=()=>addActiveContact();
  if($('otherDeleteChatBtn')) $('otherDeleteChatBtn').onclick=()=>{closeOtherProfile();deleteChat()};
  if($('attachCancelBtn')) $('attachCancelBtn').onclick=closeAttachmentSheet;
  if($('attachPhotoVideoBtn')) $('attachPhotoVideoBtn').onclick=()=>pickChatFile('media');
  if($('attachAudioBtn')) $('attachAudioBtn').onclick=()=>pickChatFile('audio');
  if($('attachCameraBtn')) $('attachCameraBtn').onclick=()=>pickChatFile('camera');
  if($('chatMediaInput')) $('chatMediaInput').onchange=e=>handleChatFile(e);
  if($('chatAudioInput')) $('chatAudioInput').onchange=e=>handleChatFile(e);
  if($('chatCameraInput')) $('chatCameraInput').onchange=e=>handleChatFile(e);
  if($('storyPrivacyBtn')) $('storyPrivacyBtn').onclick=openStoryPrivacy;
  if($('callAudioUnlockBtn')) $('callAudioUnlockBtn').onclick=async()=>{try{await $('remoteVideo').play();$('callAudioUnlockBtn').classList.add('hidden')}catch(e){}};
  setInterval(()=>{if(me)touchLastSeen();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)touchLastSeen()});
}

async function openOtherProfile(u){
  if(!u)return;
  $('otherProfileName').textContent=u.display_name||'مستخدم';
  $('otherProfileUsername').textContent=u.username?'@'+u.username:'';
  $('otherProfileStatus').textContent=userOnlineText(u.last_seen);
  $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
  $('otherProfileModal').classList.remove('hidden');
}
function closeOtherProfile(){if($('otherProfileModal'))$('otherProfileModal').classList.add('hidden')}

async function openChat(c){
  const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;
  const {data:u}=await sb.from('profiles').select('*').eq('id',otherId).single();
  const {data:s}=await sb.from('conversation_settings').select('*').eq('conversation_id',c.id).eq('user_id',me.id).maybeSingle();
  if(s?.locked){pinMode='unlockChat';pendingLockedConversation=c;window._lockedSetting=s;$('pinTitle').textContent='فتح المحادثة';$('pinConfirmBtn').textContent='فتح';$('pinModal').classList.remove('hidden');return}
  activeChat={conversation:c,user:u};
  $('chatTitle').textContent=u?.display_name||'محادثة';
  $('chatStatus').textContent=userOnlineText(u?.last_seen);
  setChatAvatar(u);$('chatModal').classList.remove('hidden');
  await markDelivered();await loadMessages();await markRead();applyChatWallpaper();
}

function messageMediaMarkup(m){
  if(!m.media_path)return '';
  const safeMime=esc(m.media_mime||'');
  return `<div class="message-media" data-path="${esc(m.media_path)}" data-mime="${safeMime}"><div class="media-loading">تحميل الوسائط…</div></div>`;
}
async function hydrateMessageMedia(){
  document.querySelectorAll('.message-media[data-path]').forEach(async el=>{
    const path=el.dataset.path,mime=el.dataset.mime||'';
    const r=await sb.storage.from('chat-media').createSignedUrl(path,3600);
    if(r.error){el.innerHTML='<div class="muted">تعذر فتح الملف</div>';return}
    const url=esc(r.data.signedUrl);
    if(mime.startsWith('image/'))el.innerHTML=`<img src="${url}" alt="صورة" loading="lazy">`;
    else if(mime.startsWith('video/'))el.innerHTML=`<video src="${url}" controls playsinline></video>`;
    else if(mime.startsWith('audio/'))el.innerHTML=`<audio src="${url}" controls></audio>`;
    else el.innerHTML=`<a href="${url}" target="_blank" rel="noopener">فتح الملف</a>`;
  });
}
async function loadMessages(){if(!activeChat)return;const {data,error}=await sb.from('messages').select('*').eq('conversation_id',activeChat.conversation.id).order('created_at');if(error){$('messagesBox').innerHTML='<div class="muted">تعذر تحميل الرسائل</div>';return}$('messagesBox').innerHTML=(data||[]).map(m=>{let ticks='';if(m.sender_id===me.id)ticks=m.read_at?'<span class="ticks read">✓✓</span>':m.delivered_at?'<span class="ticks">✓✓</span>':'<span class="ticks">✓</span>';let body='';const c=m.content||'',sm=c.match(/^__combo_sticker__:(\d+):(\d+)$/),gm=c.match(/^__combo_gif__:(\d+)$/);if(m.media_path)body=messageMediaMarkup(m);else if(sm){const p=Number(sm[1]),j=Number(sm[2]),packs=Object.values(STICKER_PACKS),val=packs[p]?.[j]||'✨';body=`<div class="sent-sticker">${val}</div>`}else if(gm){const i=Number(gm[1]),src=GIFS[i]||GIFS[0];body=`<div class="sent-gif"><img src="${src}" alt="GIF متحرك" loading="lazy"></div>`}else if(c)body=`<div class="message-text">${esc(c)}</div>`;return `<div class="bubble ${m.sender_id===me.id?'mine':'theirs'}">${body}<small>${fmt(m.created_at)} ${ticks}</small></div>`}).join('')||'<div class="empty-card">ابدأ المحادثة 👋</div>';$('messagesBox').scrollTop=$('messagesBox').scrollHeight;await hydrateMessageMedia()}

async function sendMessage(){
  const content=$('messageInput').value.trim();
  if(!content||!activeChat)return;
  const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id});
  if(r.error)return toast('تعذر إرسال الرسالة: '+r.error.message);
  $('messageInput').value='';await loadMessages();await loadChats();
}

function openAttachmentSheet(){if(!activeChat)return toast('افتح محادثة أولًا');$('attachmentModal').classList.remove('hidden')}
function closeAttachmentSheet(){$('attachmentModal').classList.add('hidden')}
function pickChatFile(kind){
  closeAttachmentSheet();
  const id=kind==='audio'?'chatAudioInput':kind==='camera'?'chatCameraInput':'chatMediaInput';
  $(id).click();
}
async function handleChatFile(e){
  const file=e.target.files?.[0];e.target.value='';
  if(!file||!activeChat)return;
  const type=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':null;
  if(!type)return toast('نوع الملف غير مدعوم');
  if(file.size>35*1024*1024)return toast('الملف كبير جدًا — الحد 35 ميجا');
  const path=`${activeChat.conversation.id}/${me.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const up=await sb.storage.from('chat-media').upload(path,file,{upsert:false,contentType:file.type});
  if(up.error)return toast('تعذر رفع الملف. شغّل SQL الخاص بوسائط الشات');
  const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:activeChat.user.id,content:'',conversation_id:activeChat.conversation.id,message_type:type,media_path:path,media_mime:file.type});
  if(r.error){await sb.storage.from('chat-media').remove([path]);return toast('تعذر إرسال الملف');}
  await loadMessages();await loadChats();
}

const COMBO_EMOJIS='😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤏 💪 🙏 👏 🙌 🫶 👀 👄 💋 🔥 ⭐ 🌟 ✨ 💫 💥 🎉 🎊 🎈 🎁 👑 💎 🚀 ⚡ 💯 😂 😍 🤍 💚'.split(' ');
function toggleEmoji(){$('emojiPanel').classList.toggle('hidden');if(!$('emojiPanel').classList.contains('hidden'))showEmojiTab('emoji')}
const COMBO_EMOJI_CATS={smileys:'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃',people:'👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 👃 🧠 🫀 🫁 👀 👁️ 👅 👄 💋 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 💟',animals:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪲 🐛 🦋 🐌 🐞 🐜 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦀 🐠 🐟 🐡 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦏 🦒 🦘 🦬 🐪 🐫 🦙 🐐 🐑 🐏 🐕 🐈 🐓 🦃 🕊️ 🐇 🐿️ 🦔',food:'🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍞 🥐 🥖 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍤 🍚 🍙 🍘 🍥 🥠 🥮 🍰 🎂 🧁 🍩 🍪 🍫 🍬 🍭 ☕ 🧃 🥤 🧋 🍺 🍻 🍷 🍸 🍹 🥂',activities:'⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🪁 🏓 🏸 🏒 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎗️ 🎫 🎟️ 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻',travel:'🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🚢 ⚓ 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ 🏖️ 🏝️ 🏜️ 🌋 🗻 🏕️ ⛺ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫',objects:'⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📺 📻 🎙️ 🔍 🔎 💡 🔦 🕯️ 🧯 🛒 💰 💳 💎 ⚖️ 🔑 🔒 🔓 🔨 🪛 🔧 🪚 🧰 🧲 🔬 🔭 📡 💉 💊 🚪 🛏️ 🛋️ 🚿 🧴 🧹 🧺 🧻 🧼 🪥 🧽 🪣 🧸 🪆 🎁 🎈 🎉 🎊 ✉️ 📩 📦 📝 📚 📖 🔖 🗂️ 📅 📌 📍 ✂️ 🖊️ ✏️ 📎',symbols:'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🌟 💫 ⚡ 🔥 💥 💯 ❗ ❓ ⁉️ ‼️ ❌ ⭕ ✅ ☑️ ✔️ ➕ ➖ ✖️ ➗ ♻️ ⚠️ 🚫 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🟩 🟦 🟥 🟨 🟪 ⬆️ ⬇️ ⬅️ ➡️ ↗️ ↘️ ↙️ ↖️ 🔝 🔚 🔜 🔙 ♾️ ©️ ®️ ™️ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣'};
const STICKER_PACKS={'😂 ضحك':['😂','🤣','😹','😆','😅','🤭','😜','🤪','😎','🤓','🥳','😱'],'❤️ حب':['❤️','😍','🥰','😘','💋','💕','💞','💓','💗','💖','💘','💝'],'🔥 حماس':['🔥','⚡','💥','💯','🚀','👑','🏆','🎉','🎊','💪','👏','🙌'],'🐾 حيوانات':['🐶','🐱','🐼','🦊','🐻','🐨','🐯','🦁','🐰','🐸','🐵','🦄'],'👍 ردود':['👍','👎','👌','🙏','👏','🙌','🤝','✌️','🤞','👋','💚','✅']};
const GIFS=Array.from({length:12},(_,i)=>`assets/gifs/gif_${i+1}.gif`);
function sendRichReaction(kind,value){if(!activeChat)return toast('افتح محادثة أولًا');const content=kind==='sticker'?`__combo_sticker__:${value}`:`__combo_gif__:${value}`;sb.from('messages').insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:kind}).then(r=>{if(r.error)return toast('تعذر إرسال العنصر');loadMessages();loadChats()});$('emojiPanel').classList.add('hidden')}
function renderEmojiCategory(cat){const box=$('emojiContent'),list=(COMBO_EMOJI_CATS[cat]||'').split(' ');const icons={smileys:'😀',people:'👋',animals:'🐾',food:'🍕',activities:'⚽',travel:'🚗',objects:'💡',symbols:'❤️'};box.innerHTML=`<div class="emoji-category-bar">${Object.keys(COMBO_EMOJI_CATS).map(k=>`<button type="button" class="emoji-cat ${k===cat?'active':''}" data-cat="${k}">${icons[k]}</button>`).join('')}</div><div class="native-emoji-grid">${list.map(x=>`<button type="button">${x}</button>`).join('')}</div>`;box.querySelectorAll('.emoji-cat').forEach(b=>b.onclick=()=>renderEmojiCategory(b.dataset.cat));box.querySelectorAll('.native-emoji-grid button').forEach(b=>b.onclick=()=>insertAtCursor($('messageInput'),b.textContent))}
function showEmojiTab(tab){document.querySelectorAll('.emoji-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const box=$('emojiContent');if(tab==='emoji'){renderEmojiCategory('smileys');return}if(tab==='sticker'){const packs=Object.entries(STICKER_PACKS);box.innerHTML=`<div class="sticker-pack-tabs">${packs.map(([n],i)=>`<button type="button" class="sticker-pack-tab ${i===0?'active':''}" data-pack="${i}">${n}</button>`).join('')}</div><div id="stickerPackGrid" class="sticker-grid"></div>`;const renderPack=i=>{document.querySelectorAll('.sticker-pack-tab').forEach((b,j)=>b.classList.toggle('active',j===i));const vals=packs[i][1];$('stickerPackGrid').innerHTML=vals.map((x,j)=>`<button type="button" class="sticker-item"><span>${x}</span><small>${packs[i][0].split(' ')[1]||'ملصق'}</small></button>`).join('');$('stickerPackGrid').querySelectorAll('button').forEach((b,j)=>b.onclick=()=>sendRichReaction('sticker',`${i}:${j}`))};box.querySelectorAll('.sticker-pack-tab').forEach((b,i)=>b.onclick=()=>renderPack(i));renderPack(0);return}box.innerHTML=`<div class="gif-title">GIF متحرك</div><div class="gif-grid real-gifs">${GIFS.map((src,i)=>`<button type="button" class="gif-item"><img src="${src}" alt="GIF ${i+1}"><span>إرسال</span></button>`).join('')}</div>`;box.querySelectorAll('.gif-item').forEach((b,i)=>b.onclick=()=>sendRichReaction('gif',String(i)))}
function insertAtCursor(input,text){const s=input.selectionStart??input.value.length,e=input.selectionEnd??input.value.length;input.value=input.value.slice(0,s)+text+input.value.slice(e);input.focus();input.selectionStart=input.selectionEnd=s+text.length}
function sendMessageContent(text){$('messageInput').value=text;$('emojiPanel').classList.add('hidden');sendMessage()}

async function syncLocalContactsToDb(){
  const list=readSavedContacts();
  if(!list.length)return;
  const nums=list.map(x=>x.phone).filter(Boolean);if(!nums.length)return;
  const {data}=await sb.from('profiles').select('id,phone,display_name').in('phone',nums);const rows=(data||[]).filter(p=>p.id!==me.id).map(p=>({owner_id:me.id,contact_id:p.id,phone:p.phone,display_name:p.display_name}));
  if(rows.length)await sb.from('user_contacts').upsert(rows,{onConflict:'owner_id,contact_id'});
}
async function getAudienceCandidates(){
  await syncLocalContactsToDb();
  const ids=new Set();
  const {data:contacts}=await sb.from('user_contacts').select('contact_id,display_name').eq('owner_id',me.id);
  (contacts||[]).forEach(x=>x.contact_id&&ids.add(x.contact_id));
  const {data:cs}=await sb.from('conversations').select('user1_id,user2_id,updated_at').or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).order('updated_at',{ascending:false}).limit(50);
  (cs||[]).forEach(c=>ids.add(c.user1_id===me.id?c.user2_id:c.user1_id));
  ids.delete(me.id);
  if(!ids.size)return [];
  const {data:profiles}=await sb.from('profiles').select('id,display_name,username,phone,avatar_url').in('id',[...ids]);
  return profiles||[];
}
async function openStoryPrivacy(){
  const candidates=await getAudienceCandidates();
  const list=candidates.map(u=>`<label class="audience-row"><input type="checkbox" data-audience-id="${u.id}" ${storySelectedIds.includes(u.id)?'checked':''}><span class="avatar tiny">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</span><span>${esc(u.display_name)} <small>@${esc(u.username||'')}</small></span></label>`).join('')||'<p class="muted">أضف جهات اتصال أو ابدأ دردشة أولًا.</p>';
  openSimple('خصوصية الحالة',`<div class="privacy-options"><button class="choice-btn" data-story-mode="everyone">🌍 الجميع</button><button class="choice-btn" data-story-mode="contacts">👥 جهات اتصالي</button><button class="choice-btn" data-story-mode="contacts_except">👥 جهات اتصالي ما عدا...</button><button class="choice-btn" data-story-mode="recent">💬 آخر الدردشات</button><button class="choice-btn" data-story-mode="selected">⭐ المشاركة مع...</button></div><div id="storyAudienceList" class="audience-list ${['contacts_except','selected'].includes(storyPrivacyMode)?'':'hidden'}">${list}</div><button id="saveStoryPrivacyBtn" class="primary" style="margin-top:10px">حفظ الخصوصية</button>`,'إغلاق');
  document.querySelectorAll('[data-story-mode]').forEach(b=>b.onclick=()=>{storyPrivacyMode=b.dataset.storyMode;document.querySelectorAll('[data-story-mode]').forEach(x=>x.classList.toggle('selected',x===b));$('storyAudienceList').classList.toggle('hidden',!['contacts_except','selected'].includes(storyPrivacyMode))});
  if($('saveStoryPrivacyBtn'))$('saveStoryPrivacyBtn').onclick=()=>{storyExcludedIds=[...document.querySelectorAll('[data-audience-id]:checked')].map(x=>x.dataset.audienceId).filter(Boolean);storySelectedIds=[...storyExcludedIds];updateStoryPrivacyLabel();closeSimple()};
}
function updateStoryPrivacyLabel(){const labels={everyone:'الجميع',contacts:'جهات اتصالي',contacts_except:'جهات اتصالي ما عدا...',recent:'آخر الدردشات',selected:'المشاركة مع...'};$('storyPrivacyBtn').textContent='👥 خصوصية الحالة: '+labels[storyPrivacyMode]}
function openStoryComposer(){
  $('storyComposer').classList.remove('hidden');$('storyCanvas').classList.add('text-mode');$('storyCanvas').classList.remove('media-mode');$('storyText').value='';$('storyCaption').value='';$('storyCanvasMedia').innerHTML='';$('storyCaptionWrap').classList.add('hidden');storyFile=null;storyPrivacyMode='contacts';storyExcludedIds=[];storySelectedIds=[];updateStoryPrivacyLabel();
  if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=null;
}
function handleStoryFile(e){const f=e.target.files?.[0];if(!f)return;const type=storyType(f);if(!type)return toast('اختار صورة أو فيديو أو صوت');storyFile=f;if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=URL.createObjectURL(f);$('storyCanvas').classList.remove('text-mode');$('storyCanvas').classList.add('media-mode');$('storyText').value='';$('storyCaptionWrap').classList.remove('hidden');$('storyCanvasMedia').innerHTML=type==='image'?`<img src="${storyObjectUrl}">`:type==='video'?`<video src="${storyObjectUrl}" controls autoplay muted playsinline></video>`:`<div class="audio-preview"><div class="music-disc">♫</div><strong>${esc(f.name)}</strong><audio src="${storyObjectUrl}" controls></audio></div>`}
async function publishStory(){
  const text=$('storyText').value.trim(),caption=$('storyCaption').value.trim(),file=storyFile;if(!text&&!file)return toast('اكتب حاجة أو اختار صورة/فيديو/صوت');
  await syncLocalContactsToDb();let media_path=null,media_type='text';
  if(file){media_type=storyType(file);const path=`${me.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('stories').upload(path,file,{upsert:false});if(up.error)return toast('تعذر رفع ملف الستوري: '+up.error.message);media_path=path}
  const payload={user_id:me.id,content:file?caption:text,media_path,media_type,expires_at:new Date(Date.now()+86400000).toISOString(),visibility:storyPrivacyMode==='contacts_except'?'contacts':storyPrivacyMode,excluded_user_ids:storyPrivacyMode==='contacts_except'?storyExcludedIds:[],selected_user_ids:storyPrivacyMode==='selected'?storySelectedIds:[]};
  const {error}=await sb.from('stories').insert(payload);if(error){if(media_path)await sb.storage.from('stories').remove([media_path]);return toast('تعذر نشر الستوري: '+error.message)}
  closeStoryComposer();toast('تم نشر الستوري');await loadStories();
}
async function loadStories(){
  const {data,error}=await sb.from('stories').select('*,profiles(display_name,username,avatar_url)').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});
  if(error){$('storiesList').innerHTML='<div class="empty-card">تعذر تحميل الحالات — شغّل SQL الخاص بخصوصية الحالات.</div>';return}
  const rows=data||[],urls={};for(const s of rows)if(s.media_path){const r=await sb.storage.from('stories').createSignedUrl(s.media_path,3600);if(!r.error)urls[s.id]=r.data.signedUrl}
  $('storiesList').innerHTML=rows.map(s=>{const u=urls[s.id];let media='';if(u&&s.media_type==='image')media=`<div class="story-media"><img src="${esc(u)}"></div>`;if(u&&s.media_type==='video')media=`<div class="story-media"><video src="${esc(u)}" controls playsinline></video></div>`;if(u&&s.media_type==='audio')media=`<div class="story-media"><div class="story-audio-name">🎵 ${esc(s.content||'ملف صوتي')}</div><audio src="${esc(u)}" controls></audio></div>`;return `<article class="story-item"><div class="story-author"><div class="avatar">${s.profiles?.avatar_url?`<img src="${esc(s.profiles.avatar_url)}">`:initials(s.profiles?.display_name)}</div><div><strong>${esc(s.profiles?.display_name||'مستخدم')}</strong><small>${s.user_id===me.id?'حالتي':s.visibility==='everyone'?'الجميع':'مشاركة خاصة'} · ${fmt(s.created_at)}</small></div></div>${media}${s.content&&s.media_type!=='audio'?`<p class="story-caption">${esc(s.content)}</p>`:''}</article>`}).join('')||'<div class="empty-card">مفيش حالات متاحة ليك حاليًا.</div>';
}

function createPeer(){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun2.l.google.com:19302'}]});
  if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.ontrack=async e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);$('remoteVideo').srcObject=stream;$('callState').textContent='متصل';$('callAvatar').classList.add('hidden');try{await $('remoteVideo').play();$('callAudioUnlockBtn').classList.add('hidden')}catch(err){$('callAudioUnlockBtn').classList.remove('hidden')}startCallTimerIfNeeded()};
  pc.onicecandidate=e=>{if(e.candidate&&activeCall)sendCallSignal(activeCall.conversationId,{type:'ice',callId:activeCall.id,from:me.id,to:activeCall.peerId,candidate:e.candidate})};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){$('callState').textContent='متصل';startCallTimerIfNeeded()}if(['failed','disconnected'].includes(pc.connectionState))$('callState').textContent='انقطع الاتصال'};
  return pc;
}
async function subscribeCallRooms(){for(const c of callChannels.values())await sb.removeChannel(c);callChannels.clear();const {data}=await sb.from('conversations').select('id').or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);for(const c of data||[])subscribeCallRoom(c.id)}
async function subscribeCallRoom(id){if(callChannels.has(id))return;const ch=sb.channel('call-'+id,{config:{broadcast:{ack:true}}});ch.on('broadcast',{event:'signal'},async({payload})=>{if(payload?.to===me.id)try{await handleSignal(payload)}catch(e){console.error(e)}});await ch.subscribe();callChannels.set(id,ch)}
async function sendCallSignal(id,payload){const ch=callChannels.get(id);if(!ch){await subscribeCallRoom(id)}const c=callChannels.get(id);if(c)await c.send({type:'broadcast',event:'signal',payload})}
function resetCallUI(){if($('remoteVideo'))$('remoteVideo').srcObject=null;if($('localVideo'))$('localVideo').srcObject=null;$('callAvatar').classList.remove('hidden');$('callAudioUnlockBtn')?.classList.add('hidden');$('muteBtn').textContent='🎙️';$('cameraBtn').textContent='📷'}
function startCallTimerIfNeeded(startAt){if(callTimer||!activeCall)return;if(!callStartedAt)callStartedAt=startAt||Date.now();$('callTimer').textContent=fmtDuration((Date.now()-callStartedAt)/1000);callTimer=setInterval(()=>{$('callTimer').textContent=fmtDuration((Date.now()-callStartedAt)/1000)},1000)}
async function startCall(video){
  if(!activeChat)return toast('افتح محادثة أولًا');
  if(!navigator.mediaDevices?.getUserMedia)return toast('المتصفح لا يدعم الكاميرا والميكروفون');
  try{
    await subscribeCallRoom(activeChat.conversation.id);activeCall={id:crypto.randomUUID(),video,initiator:true,peerId:activeChat.user.id,conversationId:activeChat.conversation.id};pendingIceCandidates=[];callStartedAt=null;
    localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:video?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});
    $('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',!video);$('remoteVideo').classList.toggle('hidden',!video);$('remoteVideo').muted=false;$('remoteVideo').volume=1;$('callAvatar').textContent=initials(activeChat.user.display_name);$('callTitle').textContent=video?'مكالمة فيديو':'مكالمة صوتية';$('callState').textContent='جارٍ الاتصال...';$('callTimer').textContent='00:00';$('callModal').classList.remove('hidden');
    peer=createPeer();const offer=await peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:video});await peer.setLocalDescription(offer);await sendCallSignal(activeCall.conversationId,{type:'offer',callId:activeCall.id,from:me.id,to:activeCall.peerId,video,offer});
  }catch(e){console.error(e);await stopCall(false);toast(e.name==='NotAllowedError'?'اسمح للكاميرا والميكروفون من إعدادات المتصفح':'تعذر بدء المكالمة: '+(e.message||''))}
}
async function handleSignal(p){
  if(p.type==='offer'){
    if(activeCall)return;
    const {data:u}=await sb.from('profiles').select('id,display_name,avatar_url').eq('id',p.from).single();
    const accept=confirm('مكالمة واردة من '+(u?.display_name||'مستخدم')+'. موافق؟');
    if(!accept){await sendCallSignal(p.conversationId,{type:'reject',callId:p.callId,from:me.id,to:p.from});return}
    activeCall={id:p.callId,video:!!p.video,initiator:false,peerId:p.from,conversationId:p.conversationId};pendingIceCandidates=[];callStartedAt=null;
    try{
      localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:p.video?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});
      $('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',!p.video);$('remoteVideo').classList.toggle('hidden',!p.video);$('remoteVideo').muted=false;$('remoteVideo').volume=1;$('callTitle').textContent=p.video?'مكالمة فيديو':'مكالمة صوتية';$('callState').textContent='جارٍ الاتصال...';$('callTimer').textContent='00:00';$('callAvatar').textContent=initials(u?.display_name);$('callModal').classList.remove('hidden');
      peer=createPeer();await peer.setRemoteDescription(new RTCSessionDescription(p.offer));
      for(const c of pendingIceCandidates)try{await peer.addIceCandidate(c)}catch(e){}pendingIceCandidates=[];
      const answer=await peer.createAnswer({offerToReceiveAudio:true,offerToReceiveVideo:!!p.video});await peer.setLocalDescription(answer);const startedAt=Date.now();
      await sendCallSignal(p.conversationId,{type:'answer',callId:p.callId,from:me.id,to:p.from,answer,startedAt});startCallTimerIfNeeded(startedAt);
    }catch(e){console.error(e);await stopCall(false);toast('تعذر تشغيل المكالمة الواردة')}
    return;
  }
  if(!activeCall||p.callId!==activeCall.id)return;
  if(p.type==='answer'&&peer){await peer.setRemoteDescription(new RTCSessionDescription(p.answer));for(const c of pendingIceCandidates)try{await peer.addIceCandidate(c)}catch(e){}pendingIceCandidates=[];$('callState').textContent='متصل';startCallTimerIfNeeded(p.startedAt||Date.now());return}
  if(p.type==='ice'&&p.candidate){if(peer?.remoteDescription?.type){try{await peer.addIceCandidate(new RTCIceCandidate(p.candidate))}catch(e){}}else pendingIceCandidates.push(new RTCIceCandidate(p.candidate));return}
  if(p.type==='reject'){toast('تم رفض المكالمة');await stopCall(false);return}
  if(p.type==='hangup'){toast('انتهت المكالمة');await stopCall(false);return}
}
async function stopCall(sendHangup=true){
  const old=activeCall;const duration=callStartedAt?Math.max(0,Math.floor((Date.now()-callStartedAt)/1000)):0;
  if(sendHangup&&old)try{await sendCallSignal(old.conversationId,{type:'hangup',callId:old.id,from:me?.id,to:old.peerId})}catch(e){}
  if(old&&me)await sb.from('call_history').insert({user_id:me.id,conversation_id:old.conversationId,peer_id:old.peerId,call_type:old.video?'video':'audio',status:duration?'ended':'missed',duration_seconds:duration});
  if(callTimer)clearInterval(callTimer);callTimer=null;callStartedAt=null;if(peer){peer.ontrack=null;peer.close();peer=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}activeCall=null;pendingIceCandidates=[];$('callModal').classList.add('hidden');resetCallUI();await loadCallHistory();
}
async function loadCallHistory(){
  const {data,error}=await sb.from('call_history').select('*,profiles:peer_id(display_name,avatar_url)').eq('user_id',me.id).order('created_at',{ascending:false}).limit(50);
  if(error){$('callHistory').innerHTML=`<div class="empty-card"><h3>سجل المكالمات محتاج SQL</h3><p class="muted">شغّل ملف COMBOAPP_V2_FIXES.sql مرة واحدة في Supabase.</p></div>`;return}
  $('callHistory').innerHTML=(data||[]).map(c=>`<div class="chat-item"><div class="avatar">${c.profiles?.avatar_url?`<img src="${esc(c.profiles.avatar_url)}">`:initials(c.profiles?.display_name)}</div><div class="chat-info"><strong>${esc(c.profiles?.display_name||'مستخدم')}</strong><small>${c.call_type==='video'?'فيديو':'صوت'} · ${c.status==='missed'?'مكالمة فائتة':'انتهت'} · ${fmtDuration(c.duration_seconds||0)}</small></div><span class="time">${fmt(c.created_at)}</span></div>`).join('')||'<div class="empty-card">مفيش مكالمات لسه.</div>';
}

// Run the small UI wiring after the original app initialization has bound its controls.
enhanceUI();

/* ===== ComboApp V3 functional fixes ===== */
function comboPrivacyValue(key, fallback='everyone'){return me?.[key] || localStorage.getItem('combo_'+key) || fallback}
function privacySelect(id,label,value){return `<label class="privacy-row"><span>${label}</span><select id="${id}"><option value="everyone" ${value==='everyone'?'selected':''}>الجميع</option><option value="contacts" ${value==='contacts'?'selected':''}>جهات اتصالي</option><option value="nobody" ${value==='nobody'?'selected':''}>لا أحد</option></select></label>`}
async function showPrivacy(){
  const body=`<div class="settings-info privacy-live"><h4>من يمكنه رؤية بياناتك؟</h4>${privacySelect('privacyLastSeen','آخر ظهور',comboPrivacyValue('privacy_last_seen'))}${privacySelect('privacyAvatar','صورة الملف الشخصي',comboPrivacyValue('privacy_avatar'))}${privacySelect('privacyProfile','معلومات الملف الشخصي',comboPrivacyValue('privacy_profile'))}${privacySelect('privacyStatus','الحالة',comboPrivacyValue('privacy_status'))}<label class="privacy-row"><span>إيصالات القراءة</span><input id="privacyRead" type="checkbox" ${comboPrivacyValue('read_receipts','on')!=='off'?'checked':''}></label><button id="savePrivacyLive" class="primary">حفظ الخصوصية</button></div>`;
  openSimple('الخصوصية والأمان',body,'إغلاق');
  setTimeout(()=>{const b=$('savePrivacyLive');if(!b)return;b.onclick=async()=>{const vals={privacy_last_seen:$('privacyLastSeen').value,privacy_avatar:$('privacyAvatar').value,privacy_profile:$('privacyProfile').value,privacy_status:$('privacyStatus').value,read_receipts:$('privacyRead').checked?'on':'off'};const r=await sb.from('profiles').update(vals).eq('id',me.id);if(r.error){Object.entries(vals).forEach(([k,v])=>setComboSetting(k,v));toast('تم حفظ الخصوصية على حسابك');}else{me={...me,...vals};toast('تم حفظ إعدادات الخصوصية');}closeSimple()};},50);
}
async function showSettings(){
  const sound=localStorage.getItem('combo_sound')!=='off';
  const body=`<div class="settings-info live-settings"><button class="setting-live" id="notifySetting">🔔 الإشعارات <b>${Notification.permission==='granted'?'مفعلة':'تفعيل'}</b></button><button class="setting-live" id="soundSetting">🔊 صوت الرسائل <b>${sound?'مفعل':'متوقف'}</b></button><button class="setting-live" id="themeSetting">🎨 ألوان التطبيق <b>اختيار</b></button><button class="setting-live" id="resetSettings">↺ استعادة الإعدادات الافتراضية</button></div>`;
  openSimple('الإعدادات',body,'إغلاق');
  setTimeout(()=>{if($('notifySetting'))$('notifySetting').onclick=async()=>{await requestNotifications();$('notifySetting').querySelector('b').textContent='مفعلة'};if($('soundSetting'))$('soundSetting').onclick=()=>{const on=localStorage.getItem('combo_sound')==='off';setComboSetting('sound',on?'on':'off');$('soundSetting').querySelector('b').textContent=on?'مفعل':'متوقف'};if($('themeSetting'))$('themeSetting').onclick=()=>showThemePicker();if($('resetSettings'))$('resetSettings').onclick=()=>{localStorage.removeItem('combo_sound');localStorage.removeItem('combo_wallpaper');localStorage.removeItem('combo_bubbles');localStorage.removeItem('combo_ticks');applyChatWallpaper();applyChatStyle();toast('تمت الاستعادة')};},50);
}
function showThemePicker(){openSimple('ألوان ComboApp',`<div class="theme-grid">${[['teal','تركوازي'],['pink','وردي'],['magenta','فوشيا'],['red','أحمر'],['hotred','أحمر فاقع'],['purple','بنفسجي'],['blue','أزرق'],['orange','برتقالي'],['gold','ذهبي'],['lime','ليموني'],['white','فاتح']].map(x=>`<button class="theme-choice theme-${x[0]}" data-theme="${x[0]}">${x[1]}</button>`).join('')}</div>`,'إغلاق');setTimeout(()=>document.querySelectorAll('.theme-choice').forEach(b=>b.onclick=()=>{setComboSetting('theme',b.dataset.theme);applyTheme();closeSimple();toast('تم تغيير اللون')}),40)}
function applyTheme(){document.documentElement.dataset.theme=localStorage.getItem('combo_theme')||'teal'}
function showWallpaper(){const opts=[['0','افتراضي'],['1','نقاط نيون'],['2','أخضر زجاجي'],['3','أزرق ليلي'],['4','أسود سادة'],['5','وردي ناعم'],['6','فوشيا'],['7','أحمر غامق'],['8','بنفسجي'],['9','ذهبي'],['10','سماوي'],['11','قلب ونقاط']];openSimple('خلفيات الدردشة',`<div class="wall-grid">${opts.map(x=>`<button class="wall-choice wall-choice-${x[0]}" data-wall="${x[0]}"><span></span>${x[1]}</button>`).join('')}</div>`,'إغلاق');setTimeout(()=>document.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{setComboSetting('wallpaper',b.dataset.wall);applyChatWallpaper();closeSimple();toast('تم تغيير خلفية الدردشة')}),40)}
function applyChatWallpaper(){const v=localStorage.getItem('combo_wallpaper')||'0';const p=['','wall-dots','wall-green','wall-blue','wall-black','wall-pink','wall-magenta','wall-red','wall-purple','wall-gold','wall-cyan','wall-hearts'][v]||'';if($('chatPanel'))$('chatPanel').className='modal-panel chat-panel '+p;applyChatStyle()}
function showChatStyle(){const bubble=localStorage.getItem('combo_bubbles')||'classic',ticks=localStorage.getItem('combo_ticks')||'blue';openSimple('نمط الدردشة',`<h4>شكل الفقاعات</h4><div class="style-grid">${[['classic','ComboApp'],['soft','ناعمة'],['round','دائرية'],['glass','زجاجية'],['pill','واتساب بلس']].map(x=>`<button class="style-choice ${bubble===x[0]?'selected':''}" data-bubble="${x[0]}">${x[1]}</button>`).join('')}</div><h4>علامة الصح</h4><div class="style-grid">${[['blue','أزرق'],['white','أبيض'],['green','أخضر'],['black','أسود']].map(x=>`<button class="style-choice ${ticks===x[0]?'selected':''}" data-ticks="${x[0]}">${x[1]} ✓✓</button>`).join('')}</div>`,'إغلاق');setTimeout(()=>{document.querySelectorAll('[data-bubble]').forEach(b=>b.onclick=()=>{setComboSetting('bubbles',b.dataset.bubble);applyChatStyle();toast('تم تغيير شكل الفقاعات')});document.querySelectorAll('[data-ticks]').forEach(b=>b.onclick=()=>{setComboSetting('ticks',b.dataset.ticks);applyChatStyle();toast('تم تغيير علامة الصح')})},40)}
function applyChatStyle(){const p=$('chatPanel');if(!p)return;p.dataset.bubbles=localStorage.getItem('combo_bubbles')||'classic';p.dataset.ticks=localStorage.getItem('combo_ticks')||'blue'}
function bindV3(){
  const cp=$('chatPerson');if(cp)cp.onclick=()=>{if(activeChat)openOtherProfile(activeChat.user)};
  ['voiceCallBtn','videoCallBtn','chatMenuBtn'].forEach(id=>$(id)?.addEventListener('click',e=>e.stopPropagation()));
  $('otherDeleteChatBtn')?.addEventListener('click',async e=>{e.stopPropagation();await deleteChat()});
  applyTheme();applyChatWallpaper();applyChatStyle();
}
const _enhanceUI_V2=enhanceUI;
function enhanceUI(){_enhanceUI_V2();bindV3()}

function waitIceGathering(pc){return new Promise(resolve=>{if(pc.iceGatheringState==='complete')return resolve();const fn=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',fn);resolve()}};pc.addEventListener('icegatheringstatechange',fn);setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',fn);resolve()},5000)})}
function ensureRemoteAudio(){let a=$('comboRemoteAudio');if(!a){a=document.createElement('audio');a.id='comboRemoteAudio';a.autoplay=true;a.playsInline=true;a.style.display='none';document.body.appendChild(a)}return a}
function createPeer(){const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun2.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]});if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));pc.ontrack=async e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);if(activeCall?.video){$('remoteVideo').srcObject=stream; $('remoteVideo').muted=false; $('remoteVideo').volume=1; $('callAvatar').classList.add('hidden');try{await $('remoteVideo').play()}catch(_){$('callAudioUnlockBtn').classList.remove('hidden')}}else{const a=ensureRemoteAudio();a.srcObject=stream;try{await a.play();$('callAudioUnlockBtn').classList.add('hidden')}catch(_){$('callAudioUnlockBtn').classList.remove('hidden')}}$('callState').textContent='متصل';startCallTimerIfNeeded()};pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){ $('callState').textContent='متصل';startCallTimerIfNeeded()}if(pc.connectionState==='failed')$('callState').textContent='تعذر الاتصال — جرّب شبكة أخرى';if(pc.connectionState==='disconnected')$('callState').textContent='الاتصال غير مستقر'};return pc}
async function subscribeCallRoom(id){if(callChannels.has(id))return;const ch=sb.channel('call-'+id+'-'+me.id,{config:{broadcast:{ack:true}}});ch.on('broadcast',{event:'signal'},async({payload})=>{if(payload?.to===me.id){try{await handleSignal(payload)}catch(e){console.error(e);toast('إشارة المكالمة فشلت')}}});const status=await ch.subscribe();if(status!=='SUBSCRIBED')console.warn('call channel',status);callChannels.set(id,ch)}
async function sendCallSignal(id,payload){let ch=callChannels.get(id);if(!ch){await subscribeCallRoom(id);ch=callChannels.get(id)}if(ch)await ch.send({type:'broadcast',event:'signal',payload})}
async function startCall(video){if(!activeChat)return toast('افتح محادثة أولًا');if(!navigator.mediaDevices?.getUserMedia)return toast('المتصفح لا يدعم الكاميرا والميكروفون');try{await subscribeCallRoom(activeChat.conversation.id);activeCall={id:crypto.randomUUID(),video,initiator:true,peerId:activeChat.user.id,conversationId:activeChat.conversation.id};callStartedAt=null;localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:video?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});$('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',!video);$('remoteVideo').classList.toggle('hidden',!video);$('remoteVideo').muted=false;$('remoteVideo').volume=1;$('callAvatar').classList.remove('hidden');$('callAvatar').textContent=initials(activeChat.user.display_name);$('callTitle').textContent=video?'مكالمة فيديو':'مكالمة صوتية';$('callState').textContent='جاري الاتصال...';$('callTimer').textContent='00:00';$('callModal').classList.remove('hidden');peer=createPeer();const offer=await peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:video});await peer.setLocalDescription(offer);await waitIceGathering(peer);await sendCallSignal(activeCall.conversationId,{type:'offer',callId:activeCall.id,from:me.id,to:activeCall.peerId,video,offer:peer.localDescription,startedAt:Date.now()});}catch(e){console.error(e);await stopCall(false);toast('تعذر بدء المكالمة: '+(e.message||e.name))}}
async function handleSignal(p){if(p.type==='offer'){if(activeCall)return;const {data:u}=await sb.from('profiles').select('id,display_name,avatar_url').eq('id',p.from).single();const accept=confirm('مكالمة واردة من '+(u?.display_name||'مستخدم')+'. موافق؟');if(!accept){await sendCallSignal(p.conversationId,{type:'reject',callId:p.callId,from:me.id,to:p.from});return}activeCall={id:p.callId,video:!!p.video,initiator:false,peerId:p.from,conversationId:p.conversationId};callStartedAt=p.startedAt||null;try{localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:p.video?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});$('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',!p.video);$('remoteVideo').classList.toggle('hidden',!p.video);$('remoteVideo').muted=false;$('remoteVideo').volume=1;$('callAvatar').classList.remove('hidden');$('callAvatar').textContent=initials(u?.display_name);$('callTitle').textContent=p.video?'مكالمة فيديو':'مكالمة صوتية';$('callState').textContent='جاري الاتصال...';$('callTimer').textContent='00:00';$('callModal').classList.remove('hidden');peer=createPeer();await peer.setRemoteDescription(new RTCSessionDescription(p.offer));const answer=await peer.createAnswer({offerToReceiveAudio:true,offerToReceiveVideo:!!p.video});await peer.setLocalDescription(answer);await waitIceGathering(peer);await sendCallSignal(p.conversationId,{type:'answer',callId:p.callId,from:me.id,to:p.from,answer:peer.localDescription,startedAt:p.startedAt||Date.now()});startCallTimerIfNeeded(p.startedAt||Date.now());}catch(e){console.error(e);await stopCall(false);toast('تعذر تشغيل المكالمة: '+(e.message||e.name))}return}if(!activeCall||p.callId!==activeCall.id)return;if(p.type==='answer'&&peer){await peer.setRemoteDescription(new RTCSessionDescription(p.answer));$('callState').textContent='متصل';startCallTimerIfNeeded(p.startedAt||Date.now());return}if(p.type==='reject'){toast('تم رفض المكالمة');await stopCall(false);return}if(p.type==='hangup'){toast('انتهت المكالمة');await stopCall(false);return}}
async function stopCall(sendHangup=true){const old=activeCall;const duration=callStartedAt?Math.max(0,Math.floor((Date.now()-callStartedAt)/1000)):0;if(sendHangup&&old)try{await sendCallSignal(old.conversationId,{type:'hangup',callId:old.id,from:me?.id,to:old.peerId})}catch(_){}if(old&&me){const r=await sb.from('call_history').insert({user_id:me.id,conversation_id:old.conversationId,peer_id:old.peerId,call_type:old.video?'video':'audio',status:duration?'ended':'missed',duration_seconds:duration});if(r.error)console.warn(r.error)}if(callTimer)clearInterval(callTimer);callTimer=null;callStartedAt=null;if(peer){peer.close();peer=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}const a=$('comboRemoteAudio');if(a){a.pause();a.srcObject=null}activeCall=null;pendingIceCandidates=[];$('callModal').classList.add('hidden');resetCallUI();await loadCallHistory()}
async function loadCallHistory(){const {data,error}=await sb.from('call_history').select('*,profiles:peer_id(display_name,avatar_url)').eq('user_id',me.id).order('created_at',{ascending:false}).limit(100);if(error){$('callHistory').innerHTML='<div class="empty-card"><h3>سجل المكالمات غير جاهز</h3><p class="muted">شغّل COMBOAPP_V3_FINAL.sql مرة واحدة في Supabase.</p></div>';return}$('callHistory').innerHTML=(data||[]).map(c=>`<div class="chat-item"><div class="avatar">${c.profiles?.avatar_url?`<img src="${esc(c.profiles.avatar_url)}">`:initials(c.profiles?.display_name)}</div><div class="chat-info"><strong>${esc(c.profiles?.display_name||'مستخدم')}</strong><small>${c.call_type==='video'?'فيديو':'صوت'} · ${c.status==='missed'?'مكالمة فائتة':'انتهت'} · ${fmtDuration(c.duration_seconds||0)}</small></div><span class="time">${fmt(c.created_at)}</span></div>`).join('')||'<div class="empty-card">مفيش مكالمات لسه.</div>'}
async function deleteChat(){closeChatMenu();if(!activeChat)return;const ok=confirm('حذف المحادثة من قائمتك؟');if(!ok)return;const r=await setChatSetting({deleted:true,archived:false});if(r===false){localStorage.setItem('combo_deleted_'+activeChat.conversation.id,'1')}const id=activeChat.conversation.id;closeChat();await loadChats();toast('تم حذف المحادثة من قائمتك')}
async function setChatSetting(extra){if(!activeChat)return false;const {data:old}=await sb.from('conversation_settings').select('archived,locked,pin_hash,deleted').eq('conversation_id',activeChat.conversation.id).eq('user_id',me.id).maybeSingle();const base={user_id:me.id,conversation_id:activeChat.conversation.id,archived:old?.archived||false,locked:old?.locked||false,pin_hash:old?.pin_hash||null,deleted:old?.deleted||false,...extra};const r=await sb.from('conversation_settings').upsert(base,{onConflict:'user_id,conversation_id'});if(r.error){console.warn(r.error);return false}return true}

// Final V3 wiring pass (runs after the original initialization too).
setTimeout(()=>{try{enhanceUI();applyTheme();applyChatWallpaper();applyChatStyle()}catch(e){console.error(e)}},0);

async function openOtherProfile(u){
  if(!u)return;
  $('otherProfileName').textContent=u.display_name||'مستخدم';
  $('otherProfileUsername').textContent=u.username?'@'+u.username:'';
  let status='آخر ظهور منذ فترة';
  if(u.privacy_last_seen!=='nobody'){
    if(u.privacy_last_seen==='contacts'){
      const {data}=await sb.from('user_contacts').select('id').eq('owner_id',u.id).eq('contact_id',me.id).maybeSingle();
      if(data)status=userOnlineText(u.last_seen); else status='آخر ظهور غير متاح';
    }else status=userOnlineText(u.last_seen);
  }else status='آخر ظهور غير متاح';
  $('otherProfileStatus').textContent=status;
  $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
  $('otherProfileModal').classList.remove('hidden');
}

setTimeout(()=>{
  if($('otherDeleteChatBtn')) $('otherDeleteChatBtn').onclick=async e=>{e.stopPropagation();closeOtherProfile();await deleteChat()};
  if($('callAudioUnlockBtn')) $('callAudioUnlockBtn').onclick=async()=>{try{const a=$('comboRemoteAudio');if(a)await a.play();if($('remoteVideo')?.srcObject)await $('remoteVideo').play();$('callAudioUnlockBtn').classList.add('hidden')}catch(e){toast('اضغط مرة أخرى لتشغيل الصوت')}};
},10);

/* ===== ComboApp V4: no-SQL fallback + real controls + expanded personalization ===== */
(function(){
  const LS='combo_call_history_local';
  function localCalls(){try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(_){return[]}}
  function saveLocalCalls(a){localStorage.setItem(LS,JSON.stringify(a.slice(0,100)))}
  function setting(key,def){return localStorage.getItem('combo_'+key) ?? def}
  function setSetting(key,val){localStorage.setItem('combo_'+key,val)}

  window.openOtherProfile = async function(u){
    if(!u)return;
    $('otherProfileName').textContent=u.display_name||'مستخدم';
    $('otherProfileUsername').textContent=u.username?'@'+u.username:'';
    let status='آخر ظهور غير متاح';
    if(u.privacy_last_seen!=='nobody'){
      if(u.privacy_last_seen==='contacts'){
        const {data}=await sb.from('user_contacts').select('id').eq('owner_id',u.id).eq('contact_id',me.id).maybeSingle();
        status=data?userOnlineText(u.last_seen):'آخر ظهور غير متاح';
      }else status=userOnlineText(u.last_seen);
    }
    $('otherProfileStatus').textContent=status;
    $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
    $('otherProfileModal').classList.remove('hidden');
  };

  window.showPrivacy = function(){
    const row=(id,label,val,opts=['everyone','contacts','nobody'])=>`<label class="privacy-row"><span>${label}</span><select id="${id}">${opts.map(v=>`<option value="${v}" ${val===v?'selected':''}>${v==='everyone'?'الجميع':v==='contacts'?'جهات اتصالي':'لا أحد'}</option>`).join('')}</select></label>`;
    const body=`<div class="settings-info privacy-live">
      <h4>الخصوصية — تحكم كامل</h4>
      ${row('pLast','آخر ظهور',setting('privacy_last_seen',me?.privacy_last_seen||'everyone'))}
      ${row('pOnline','من يرى أنني متصل الآن',setting('privacy_online','everyone'))}
      ${row('pAvatar','صورة الملف الشخصي',setting('privacy_avatar',me?.privacy_avatar||'everyone'))}
      ${row('pAbout','النبذة والمعلومات',setting('privacy_about',me?.privacy_profile||'everyone'))}
      ${row('pStatus','الحالة',setting('privacy_status',me?.privacy_status||'everyone'))}
      ${row('pGroups','إضافتي للمجموعات',setting('privacy_groups','everyone'))}
      <label class="privacy-row"><span>إيصالات القراءة</span><input id="pRead" type="checkbox" ${setting('read_receipts',me?.read_receipts||'on')!=='off'?'checked':''}></label>
      <label class="privacy-row"><span>مؤشر الكتابة</span><input id="pTyping" type="checkbox" ${setting('typing','on')!=='off'?'checked':''}></label>
      <label class="privacy-row"><span>إظهار حالتي للجهات الجديدة</span><input id="pNewStatus" type="checkbox" ${setting('new_status','on')!=='off'?'checked':''}></label>
      <button id="savePrivacyV4" class="primary">حفظ كل إعدادات الخصوصية</button>
    </div>`;
    openSimple('الخصوصية والأمان',body,'إغلاق');
    setTimeout(()=>{
      $('savePrivacyV4')?.addEventListener('click',async()=>{
        const vals={privacy_last_seen:$('pLast').value,privacy_online:$('pOnline').value,privacy_avatar:$('pAvatar').value,privacy_about:$('pAbout').value,privacy_status:$('pStatus').value,privacy_groups:$('pGroups').value,read_receipts:$('pRead').checked?'on':'off',typing:$('pTyping').checked?'on':'off',new_status:$('pNewStatus').checked?'on':'off'};
        Object.entries(vals).forEach(([k,v])=>setSetting(k,v));
        const db={privacy_last_seen:vals.privacy_last_seen,privacy_avatar:vals.privacy_avatar,privacy_profile:vals.privacy_about,privacy_status:vals.privacy_status,read_receipts:vals.read_receipts};
        const r=await sb.from('profiles').update(db).eq('id',me.id);
        if(!r.error)me={...me,...db};
        closeSimple();toast('تم حفظ إعدادات الخصوصية');
      });
    },30);
  };

  window.showSettings = function(){
    const on=(k,def='on')=>setting(k,def)==='on';
    const body=`<div class="settings-info live-settings v4-settings">
      <button class="setting-live" data-v4="notifications">🔔 الإشعارات <b>${Notification.permission==='granted'?'مفعلة':'تفعيل'}</b></button>
      <button class="setting-live" data-v4="sound">🔊 صوت الرسائل <b>${on('sound')?'مفعل':'متوقف'}</b></button>
      <button class="setting-live" data-v4="theme">🎨 ألوان التطبيق <b>اختيار</b></button>
      <button class="setting-live" data-v4="wallpaper">🖼️ خلفية المحادثات <b>اختيار</b></button>
      <button class="setting-live" data-v4="chatstyle">💬 شكل المحادثة والفقاعات <b>اختيار</b></button>
      <button class="setting-live" data-v4="font">🔤 حجم الخط <b>${setting('font','medium')}</b></button>
      <button class="setting-live" data-v4="enter">↵ الإرسال بزر Enter <b>${on('enter','off')?'مفعل':'متوقف'}</b></button>
      <button class="setting-live" data-v4="media">📥 التنزيل التلقائي للوسائط <b>${on('media','off')?'مفعل':'متوقف'}</b></button>
      <button class="setting-live" data-v4="animations">✨ الحركة داخل التطبيق <b>${on('animations')?'مفعلة':'متوقفة'}</b></button>
      <button class="setting-live" data-v4="vibration">📳 الاهتزاز <b>${on('vibration')?'مفعل':'متوقف'}</b></button>
      <button class="setting-live" data-v4="privacy">🛡️ إعدادات الخصوصية <b>فتح</b></button>
      <button class="setting-live" data-v4="reset">↺ استعادة الإعدادات الافتراضية</button>
      <div class="settings-about"><strong>ComboApp</strong><small>تواصل بحرية • الإصدار V4</small></div>
    </div>`;
    openSimple('الإعدادات',body,'إغلاق');
    setTimeout(()=>document.querySelectorAll('[data-v4]').forEach(b=>b.onclick=async()=>{
      const a=b.dataset.v4;
      if(a==='notifications'){await requestNotifications();b.querySelector('b').textContent='مفعلة';return}
      if(a==='theme'){showThemePicker();return}
      if(a==='wallpaper'){showWallpaper();return}
      if(a==='chatstyle'){showChatStyle();return}
      if(a==='privacy'){showPrivacy();return}
      if(a==='reset'){if(confirm('استعادة إعدادات ComboApp الافتراضية؟')){Object.keys(localStorage).filter(k=>k.startsWith('combo_')).forEach(k=>localStorage.removeItem(k));applyTheme();applyChatWallpaper();applyChatStyle();closeSimple();toast('تمت استعادة الإعدادات الافتراضية')}return}
      if(a==='sound'){setSetting('sound',on('sound')?'off':'on');showSettings();return}
      if(a==='enter'){setSetting('enter',on('enter','off')?'off':'on');showSettings();return}
      if(a==='media'){setSetting('media',on('media','off')?'off':'on');showSettings();return}
      if(a==='animations'){setSetting('animations',on('animations')?'off':'on');document.documentElement.classList.toggle('no-animations',!on('animations'));showSettings();return}
      if(a==='vibration'){setSetting('vibration',on('vibration')?'off':'on');showSettings();return}
      if(a==='font'){const cur=setting('font','medium');const next=cur==='small'?'medium':cur==='medium'?'large':'small';setSetting('font',next);applyV4Font();showSettings();return}
    }),30);
  };

  window.showThemePicker = function(){
    const themes=[['teal','تركوازي'],['mint','نعناعي'],['pink','وردي'],['rose','روز'],['magenta','فوشيا'],['red','أحمر'],['hotred','أحمر فاقع'],['coral','مرجاني'],['purple','بنفسجي'],['blue','أزرق'],['sky','سماوي'],['orange','برتقالي'],['gold','ذهبي'],['lime','ليموني'],['white','فاتح'],['dark','أسود']];
    openSimple('ألوان ComboApp',`<div class="theme-grid">${themes.map(x=>`<button class="theme-choice theme-${x[0]}" data-theme-v4="${x[0]}">${x[1]}</button>`).join('')}</div>`,'إغلاق');
    setTimeout(()=>document.querySelectorAll('[data-theme-v4]').forEach(b=>b.onclick=()=>{setSetting('theme',b.dataset.themeV4);applyTheme();closeSimple();toast('تم تغيير لون ComboApp')}),30);
  };

  window.applyTheme = function(){document.documentElement.dataset.theme=setting('theme','teal')};
  window.applyV4Font = function(){document.documentElement.dataset.font=setting('font','medium')};

  const v4Walls=[
    ['0','افتراضي',''],['1','نقاط نيون','wall-dots'],['2','أخضر زجاجي','wall-green'],['3','أزرق ليلي','wall-blue'],['4','أسود','wall-black'],['5','وردي','wall-pink'],['6','فوشيا','wall-magenta'],['7','أحمر','wall-red'],['8','بنفسجي','wall-purple'],['9','ذهبي','wall-gold'],['10','سماوي','wall-cyan'],['11','قلوب','wall-hearts'],
    ['sunset','غروب الشمس','img'],['mountains','الجبال','img'],['ocean','البحر','img'],['forest','الغابة','img'],['leaves','أوراق طبيعية','img'],['cats','القطط','img'],['dogs','الكلاب','img'],['space','الفضاء','img'],['flowers','الزهور','img'],['clouds','السحاب','img'],['geometric','هندسي','img']
  ];
  window.showWallpaper=function(){
    openSimple('خلفيات المحادثات',`<div class="wall-grid v4-wall-grid">${v4Walls.map(x=>`<button class="wall-choice ${x[2]==='img'?'wall-image-choice':''}" data-wall-v4="${x[0]}" ${x[2]==='img'?`style="background-image:url('wallpapers/${x[0]}.svg')"`:''}>${x[1]}</button>`).join('')}</div>`,'إغلاق');
    setTimeout(()=>document.querySelectorAll('[data-wall-v4]').forEach(b=>b.onclick=()=>{setSetting('wallpaper',b.dataset.wallV4);applyChatWallpaper();closeSimple();toast('تم تغيير خلفية المحادثة')}),30);
  };
  window.applyChatWallpaper=function(){
    const v=setting('wallpaper','0');const panel=$('chatPanel');if(!panel)return;
    panel.className='modal-panel chat-panel';panel.dataset.bubbles=setting('bubbles','classic');panel.dataset.ticks=setting('ticks','blue');
    const map={'1':'wall-dots','2':'wall-green','3':'wall-blue','4':'wall-black','5':'wall-pink','6':'wall-magenta','7':'wall-red','8':'wall-purple','9':'wall-gold','10':'wall-cyan','11':'wall-hearts'};
    if(map[v])panel.classList.add(map[v]);
    if(v4Walls.some(x=>x[0]===v&&x[2]==='img')){panel.querySelector('.messages')?.style.setProperty('background-image',`url('wallpapers/${v}.svg')`);panel.querySelector('.messages')?.style.setProperty('background-size','cover');panel.querySelector('.messages')?.style.setProperty('background-attachment','fixed');}
    else if(panel.querySelector('.messages'))panel.querySelector('.messages').style.removeProperty('background-image');
  };
  window.showChatStyle=function(){
    const bubbles=[['classic','ComboApp'],['soft','ناعمة'],['round','دائرية'],['glass','زجاجية'],['pill','مستديرة'],['square','مربعة'],['neon','نيون']];
    const ticks=[['blue','أزرق'],['white','أبيض'],['green','أخضر'],['black','أسود'],['teal','تركوازي'],['pink','وردي']];
    openSimple('نمط الدردشة',`<h4>شكل الفقاعات</h4><div class="style-grid">${bubbles.map(x=>`<button class="style-choice" data-bubble-v4="${x[0]}">${x[1]}</button>`).join('')}</div><h4>شكل علامة الصح</h4><div class="style-grid">${ticks.map(x=>`<button class="style-choice" data-ticks-v4="${x[0]}">${x[1]} ✓✓</button>`).join('')}</div>`,'إغلاق');
    setTimeout(()=>{document.querySelectorAll('[data-bubble-v4]').forEach(b=>b.onclick=()=>{setSetting('bubbles',b.dataset.bubbleV4);applyChatWallpaper();toast('تم تغيير شكل الفقاعات')});document.querySelectorAll('[data-ticks-v4]').forEach(b=>b.onclick=()=>{setSetting('ticks',b.dataset.ticksV4);applyChatWallpaper();toast('تم تغيير علامة الصح')})},30);
  };

  window.loadCallHistory=async function(){
    const r=await sb.from('call_history').select('*,profiles:peer_id(display_name,avatar_url)').eq('user_id',me.id).order('created_at',{ascending:false}).limit(100);
    let data=r.error?[]:(r.data||[]);
    if(r.error){data=localCalls().map(c=>({...c,profiles:{display_name:c.peer_name,avatar_url:c.peer_avatar||null}}));}
    $('callHistory').innerHTML=data.map(c=>`<div class="chat-item"><div class="avatar">${c.profiles?.avatar_url?`<img src="${esc(c.profiles.avatar_url)}">`:initials(c.profiles?.display_name)}</div><div class="chat-info"><strong>${esc(c.profiles?.display_name||'مستخدم')}</strong><small>${c.call_type==='video'?'فيديو':'صوت'} · ${c.status==='missed'?'مكالمة فائتة':'انتهت'} · ${fmtDuration(c.duration_seconds||0)}</small></div><span class="time">${fmt(c.created_at)}</span></div>`).join('')||'<div class="empty-card"><h3>سجل المكالمات</h3><p class="muted">لسه مفيش مكالمات مسجلة.</p></div>';
  };

  window.stopCall=async function(sendHangup=true){
    const old=activeCall;const duration=callStartedAt?Math.max(0,Math.floor((Date.now()-callStartedAt)/1000)):0;
    if(sendHangup&&old)try{await sendCallSignal(old.conversationId,{type:'hangup',callId:old.id,from:me?.id,to:old.peerId})}catch(_){}
    if(old&&me){
      const row={user_id:me.id,conversation_id:old.conversationId,peer_id:old.peerId,peer_name:activeChat?.user?.display_name||'مستخدم',peer_avatar:activeChat?.user?.avatar_url||null,call_type:old.video?'video':'audio',status:duration?'ended':'missed',duration_seconds:duration,created_at:new Date().toISOString()};
      const r=await sb.from('call_history').insert({user_id:row.user_id,conversation_id:row.conversation_id,peer_id:row.peer_id,call_type:row.call_type,status:row.status,duration_seconds:row.duration_seconds});
      if(r.error){const a=localCalls();a.unshift(row);saveLocalCalls(a)}
    }
    if(callTimer)clearInterval(callTimer);callTimer=null;callStartedAt=null;if(peer){peer.close();peer=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}const a=$('comboRemoteAudio');if(a){a.pause();a.srcObject=null}activeCall=null;pendingIceCandidates=[];$('callModal').classList.add('hidden');resetCallUI();await loadCallHistory();
  };

  const oldEnhance=window.enhanceUI;
  window.enhanceUI=function(){
    try{oldEnhance?.()}catch(_){}
    const cp=$('chatPerson'),ct=$('chatTitle'),ca=$('chatAvatar');
    if(cp)cp.onclick=(e)=>{if(e.target.closest('.chat-head-actions'))return;if(activeChat)openOtherProfile(activeChat.user)};
    [ct,ca].forEach(el=>{if(el)el.onclick=(e)=>{e.stopPropagation();if(activeChat)openOtherProfile(activeChat.user)}});
    if(cp)cp.style.cursor='pointer';
    if($('otherProfileModal'))$('otherProfileModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeOtherProfile()});
    applyTheme();applyV4Font();applyChatWallpaper();applyChatStyle();
  };
})();

setTimeout(()=>{try{enhanceUI();applyTheme();applyV4Font();applyChatWallpaper();}catch(e){console.error(e)}},80);

/* ===== ComboApp V5 FINAL UX PATCH ===== */
(function V5(){
  const mediaKey=()=>`combo_profile_media_${me?.id||'guest'}`;
  const localMedia=()=>{try{return JSON.parse(localStorage.getItem(mediaKey())||'[]')}catch(_){return[]}};
  const saveLocalMedia=a=>localStorage.setItem(mediaKey(),JSON.stringify(a));
  function sheet(title,body){
    let m=$('v5ActionModal');
    if(!m){m=document.createElement('div');m.id='v5ActionModal';m.className='modal hidden';m.innerHTML='<div class="action-sheet-v5"><h3 id="v5ActionTitle"></h3><div id="v5ActionBody"></div><button id="v5ActionClose" class="link-btn" style="width:100%;padding:14px">إلغاء</button></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')});$('v5ActionClose').onclick=()=>m.classList.add('hidden')}
    $('v5ActionTitle').textContent=title;$('v5ActionBody').innerHTML=body;m.classList.remove('hidden');return m;
  }
  function closeSheet(){$('v5ActionModal')?.classList.add('hidden')}
  function profileMediaAction(){
    const has=!!me?.avatar_url;
    sheet('صورة الملف الشخصي',`
      <button class="v5-action" id="v5AddMedia"><span class="v5-ico">＋</span><span><b>إضافة صورة أو فيديو</b><small style="display:block;color:#789592;margin-top:3px">أضف عدد غير محدود من الصور والفيديوهات</small></span></button>
      <button class="v5-action" id="v5ChangeMain"><span class="v5-ico">🖼️</span><span><b>تغيير الصورة الرئيسية</b><small style="display:block;color:#789592;margin-top:3px">اختار صورة جديدة للبروفايل</small></span></button>
      ${has?'<button class="v5-action danger" id="v5DeleteMain"><span class="v5-ico">🗑️</span><span><b>حذف الصورة الرئيسية</b></span></button>':''}
      <button class="v5-action" id="v5Gallery"><span class="v5-ico">▦</span><span><b>إدارة الصور والفيديوهات</b></span></button>`);
    $('v5AddMedia').onclick=()=>{closeSheet();$('profileMediaInput').click()};
    $('v5ChangeMain').onclick=()=>{closeSheet();$('avatarFileInput').click()};
    $('v5DeleteMain')?.addEventListener('click',async()=>{closeSheet();await removeAvatar()});
    $('v5Gallery').onclick=()=>showGallery();
  }
  async function addProfileMediaFiles(files){
    const arr=localMedia();
    for(const f of [...files]){
      if(!/^image\/(png|jpe?g|webp|gif)|video\//i.test(f.type))continue;
      const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${me.id}/profile-media/${crypto.randomUUID()}-${safe}`;
      const up=await sb.storage.from('avatars').upload(path,f,{upsert:false});
      if(up.error){toast('تعذر رفع '+f.name+' إلى صور الملف');continue}
      const pub=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      const row={user_id:me.id,media_type:f.type.startsWith('video/')?'video':'image',media_path:path,url:pub,created_at:new Date().toISOString()};
      const db=await sb.from('profile_media').insert({user_id:me.id,media_type:row.media_type,media_path:path}).select().maybeSingle();
      if(db.error){arr.push(row);saveLocalMedia(arr)}
    }
    toast('تمت إضافة الوسائط للملف الشخصي');
    await showGallery();
  }
  async function getGallery(){
    const q=await sb.from('profile_media').select('*').eq('user_id',me.id).order('created_at',{ascending:false});
    if(!q.error && q.data?.length){
      return q.data.map(x=>({...x,url:sb.storage.from('avatars').getPublicUrl(x.media_path).data.publicUrl}));
    }
    return localMedia();
  }
  async function showGallery(){
    const data=await getGallery();
    sheet('صور وفيديوهات الملف الشخصي',`<div class="profile-gallery-grid">${data.map(x=>`<div class="profile-gallery-item">${x.media_type==='video'?`<video src="${esc(x.url)}" muted playsinline></video>`:`<img src="${esc(x.url)}">`}<span class="v5-media-badge">${x.media_type==='video'?'فيديو':'صورة'}</span><button class="v5-delete" data-media-del="${esc(x.id||x.media_path)}">×</button></div>`).join('')||'<div class="muted" style="grid-column:1/-1;padding:25px;text-align:center">لسه مفيش صور أو فيديوهات إضافية.</div>'}</div><button class="primary" id="v5GalleryAdd" style="width:100%;margin-top:8px">＋ إضافة صور وفيديوهات</button>`);
    $('v5GalleryAdd').onclick=()=>{closeSheet();$('profileMediaInput').click()};
    document.querySelectorAll('[data-media-del]').forEach(b=>b.onclick=async()=>{const id=b.dataset.mediaDel;const x=data.find(y=String(y.id||y.media_path)===String(id));});
    document.querySelectorAll('[data-media-del]').forEach(b=>b.onclick=async()=>{const id=b.dataset.mediaDel;const x=data.find(y=>String(y.id||y.media_path)===String(id));if(!x)return;if(x.id){const d=await sb.from('profile_media').delete().eq('id',x.id).eq('user_id',me.id);if(d.error)return toast('تعذر حذف الوسائط')}if(x.media_path)await sb.storage.from('avatars').remove([x.media_path]);saveLocalMedia(localMedia().filter(y=>y.media_path!==x.media_path));toast('تم حذف الوسائط');showGallery()});
  }
  async function changeMainAvatar(e){const f=e.target.files?.[0];if(!f)return;const path=`${me.id}/avatar-${Date.now()}.${(f.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'')}`;const up=await sb.storage.from('avatars').upload(path,f,{upsert:false});if(up.error)return toast('تعذر رفع الصورة الرئيسية');const pub=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;const r=await sb.from('profiles').update({avatar_url:pub}).eq('id',me.id);if(r.error)return toast('تعذر حفظ الصورة الرئيسية');me.avatar_url=pub;renderAvatar(pub,me.display_name);toast('تم تغيير صورة البروفايل')}
  // No numeric prompts: every profile-photo action is a real button.
  $('avatarActionBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();profileMediaAction()});
  $('avatarFileInput')?.addEventListener('change',changeMainAvatar);
  $('profileMediaInput')?.addEventListener('change',e=>{if(e.target.files?.length)addProfileMediaFiles(e.target.files);e.target.value=''})

  // Make the entire chat header (except the call/menu controls) open the contact profile.
  const openPeer=()=>{if(activeChat?.user)openOtherProfileV5(activeChat.user)};
  function openOtherProfileV5(u){
    if(!u)return;
    $('otherProfileName').textContent=u.display_name||'مستخدم';
    $('otherProfileUsername').textContent=u.username?'@'+u.username:'';
    let status='آخر ظهور غير متاح';
    if(u.last_seen && u.privacy_last_seen!=='nobody')status=userOnlineText(u.last_seen);
    $('otherProfileStatus').textContent=status;
    $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
    $('otherProfileModal').classList.remove('hidden');
    wireOtherProfileButtons(u);
  }
  function wireOtherProfileButtons(u){
    $('otherAddBtn').onclick=()=>{closeOtherProfile();addActiveContact()};
    $('otherSarhnyBtn').onclick=()=>{closeOtherProfile();go('sarhnyPage');$('sarhnyUsername').value=u.username||'';$('sarhnyContent').focus()};
    $('otherDeleteChatBtn').onclick=async()=>{closeOtherProfile();await deleteChat()};
  }
  $('chatPerson')?.addEventListener('click',e=>{if(e.target.closest('.chat-head-actions'))return;openPeer()});
  $('chatAvatar')?.addEventListener('click',e=>{e.stopPropagation();openPeer()});
  $('chatTitle')?.addEventListener('click',e=>{e.stopPropagation();openPeer()});
  $('chatStatus')?.addEventListener('click',e=>{e.stopPropagation();openPeer()});
  $('otherProfileAvatar')?.addEventListener('click',()=>activeChat?.user&&openOtherProfileV5(activeChat.user));

  // Replace remaining prompt-based actions with button/input UI.
  window.avatarActions=profileMediaAction;
  window.changePassword=()=>{
    sheet('تغيير كلمة السر',`<input id="v5NewPass" type="password" placeholder="كلمة السر الجديدة (6 أحرف على الأقل)"><input id="v5NewPass2" type="password" placeholder="تأكيد كلمة السر"><button class="primary" id="v5SavePass" style="width:100%;margin-top:8px">حفظ كلمة السر</button>`);
    $('v5SavePass').onclick=async()=>{const p=$('v5NewPass').value,p2=$('v5NewPass2').value;if(p.length<6)return toast('كلمة السر لازم تكون 6 أحرف على الأقل');if(p!==p2)return toast('كلمتا السر غير متطابقتين');const r=await sb.auth.updateUser({password:p});if(r.error)return toast(r.error.message);closeSheet();toast('تم تغيير كلمة السر')};
  };
  window.reportChat=async()=>{closeChatMenu();if(!activeChat)return;sheet('إبلاغ عن المحادثة',`<textarea id="v5ReportReason" maxlength="500" placeholder="اكتب سبب الإبلاغ (اختياري)"></textarea><button class="primary" id="v5SendReport" style="width:100%;margin-top:8px">إرسال البلاغ</button>`);$('v5SendReport').onclick=async()=>{const reason=$('v5ReportReason').value.trim()||'بلاغ من المستخدم';const r=await sb.from('reports').insert({reporter_id:me.id,reported_user_id:activeChat.user.id,reason});if(r.error)return toast('تعذر إرسال البلاغ');closeSheet();toast('تم إرسال البلاغ')};};

  // Make the supplied icon pack the visible call/profile icon pack.
  document.querySelectorAll('.modern-call-btn img').forEach(img=>{img.onerror=()=>{img.style.display='none';img.parentElement.textContent=img.alt==='صوت'?'☎':'▣'}});
  // Make sure profile page action text never mentions numeric instructions.
  const hint=document.querySelector('.profile-hint');if(hint)hint.textContent='اضغط على الصورة لاختيار: تغيير، حذف، أو إضافة صور وفيديوهات';
})();


/* ===== V9 Contact profile / privacy controls ===== */
async function getContactPrefs(peerId){
  if(!me?.id||!peerId)return {muted:false,calls_blocked:false,blocked:false};
  const r=await sb.from('contact_preferences').select('muted,blocked').eq('user_id',me.id).eq('peer_id',peerId).maybeSingle();
  return r.error?{muted:false,blocked:false}:(r.data||{muted:false,blocked:false});
}
async function saveContactPrefs(peerId,patch){
  if(!me?.id||!peerId)return {error:new Error('missing user')};
  const current=await getContactPrefs(peerId);
  return await sb.from('contact_preferences').upsert({user_id:me.id,peer_id:peerId,...current,...patch,updated_at:new Date().toISOString()},{onConflict:'user_id,peer_id'});
}
async function ensureContactPrefsReady(){
  const r=await sb.from('contact_preferences').select('user_id').eq('user_id',me?.id).limit(1);
  if(r.error){toast('شغّل COMBOAPP_CONTACT_PROFILE_SETUP.sql مرة واحدة في Supabase');return false}return true;
}
function openContactTools(title,html){
  $('contactToolsTitle').textContent=title;$('contactToolsBody').innerHTML=html;$('contactToolsModal').classList.remove('hidden');
  $('contactToolsClose').onclick=()=>{$('contactToolsModal').classList.add('hidden')};
}
async function showContactPrivacy(){
  if(!activeChat?.user)return;
  if(!(await ensureContactPrefsReady()))return;
  const u=activeChat.user,p=await getContactPrefs(u.id);
  const btn=(id,icon,label,on)=>`<button class="contact-setting-btn" id="${id}"><span class="contact-setting-icon">${icon}</span><span class="contact-setting-copy"><strong>${label}</strong><small>${on?'مفعّل':'متوقف'}</small></span><span class="contact-toggle ${on?'on':''}">${on?'✓':'○'}</span></button>`;
  openContactTools('الخصوصية والأمان',`
    <div class="contact-settings-list">
      ${btn('cpMute','🔕','كتم إشعارات هذا الشخص',p.muted)}
      ${btn('cpBlock','🚫','حظر هذا الشخص',p.blocked)}
      <button class="contact-setting-btn danger" id="cpReport"><span class="contact-setting-icon">⚠️</span><span class="contact-setting-copy"><strong>إبلاغ عن الشخص</strong><small>إرسال بلاغ إلى ComboApp</small></span><span>›</span></button>
    </div>`);
  $('cpMute').onclick=async()=>{const r=await saveContactPrefs(u.id,{muted:!p.muted});if(r.error)return toast('تعذر حفظ الإعداد');toast(!p.muted?'تم كتم الإشعارات':'تم تشغيل الإشعارات');showContactPrivacy()};
  $('cpBlock').onclick=async()=>{const r=await saveContactPrefs(u.id,{blocked:!p.blocked});if(r.error)return toast('تعذر حفظ الحظر');toast(!p.blocked?'تم حظر الشخص':'تم إلغاء الحظر');showContactPrivacy()};
  $('cpReport').onclick=()=>showContactReport();
}
function showContactReport(){
  const u=activeChat?.user;if(!u)return;
  openContactTools('إبلاغ عن '+(u.display_name||'الشخص'),`<textarea id="contactReportReason" maxlength="500" placeholder="اكتب سبب البلاغ (اختياري)"></textarea><button id="sendContactReport" class="primary" style="width:100%;margin-top:10px">إرسال البلاغ</button>`);
  $('sendContactReport').onclick=async()=>{const reason=$('contactReportReason').value.trim()||'بلاغ من المستخدم';const r=await sb.from('reports').insert({reporter_id:me.id,reported_user_id:u.id,reason});if(r.error)return toast('تعذر إرسال البلاغ');$('contactToolsModal').classList.add('hidden');toast('تم إرسال البلاغ')};
}
async function showContactMedia(){
  const c=activeChat?.conversation,u=activeChat?.user;if(!c)return;
  const r=await sb.from('messages').select('id,content,created_at,message_type,media_path,media_mime,sender_id').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(300);
  if(r.error)return toast('تعذر تحميل الوسائط');
  const msgs=r.data||[],media=msgs.filter(m=>m.media_path),links=msgs.filter(m=>/(https?:\/\/[^\s]+)/i.test(m.content||''));
  const mediaHtml=media.length?`<div class="contact-media-grid">${media.map(m=>`<button class="contact-media-card" data-media-path="${esc(m.media_path)}" data-media-mime="${esc(m.media_mime||'')}" type="button"><span>${m.media_mime?.startsWith('video/')?'🎬':m.media_mime?.startsWith('audio/')?'🎵':m.media_mime?.startsWith('image/')?'🖼️':'📎'}</span><small>${fmt(m.created_at)}</small></button>`).join('')}</div>`:'<div class="empty-card">مفيش وسائط أو ملفات لسه.</div>';
  const linksHtml=links.length?`<div class="contact-links-list">${links.map(m=>{const x=(m.content||'').match(/https?:\/\/[^\s]+/i)?.[0]||'';return `<a href="${esc(x)}" target="_blank" rel="noopener" class="contact-link-row">🔗 <span>${esc(x)}</span><small>${fmt(m.created_at)}</small></a>`}).join('')}</div>`:'<div class="empty-card">مفيش لينكات في المحادثة.</div>';
  openContactTools('الوسائط والروابط والملفات',`<div class="media-tabs"><button class="media-tab active" data-media-tab="media">الوسائط والملفات (${media.length})</button><button class="media-tab" data-media-tab="links">الروابط (${links.length})</button></div><div id="contactMediaBody">${mediaHtml}</div>`);
  document.querySelectorAll('[data-media-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-media-tab]').forEach(x=>x.classList.toggle('active',x===b));$('contactMediaBody').innerHTML=b.dataset.mediaTab==='links'?linksHtml:mediaHtml;bindContactMediaCards()});
  bindContactMediaCards();
}
function bindContactMediaCards(){document.querySelectorAll('.contact-media-card').forEach(b=>b.onclick=async()=>{const path=b.dataset.mediaPath,mime=b.dataset.mediaMime||'';const r=await sb.storage.from('chat-media').createSignedUrl(path,3600);if(r.error)return toast('تعذر فتح الملف');openContactTools('معاينة الملف',mime.startsWith('image/')?`<img class="contact-media-preview" src="${esc(r.data.signedUrl)}" alt="صورة">`:mime.startsWith('video/')?`<video class="contact-media-preview" src="${esc(r.data.signedUrl)}" controls autoplay playsinline></video>`:mime.startsWith('audio/')?`<audio class="contact-audio-preview" src="${esc(r.data.signedUrl)}" controls autoplay></audio>`:`<a class="primary" style="display:block;text-align:center" href="${esc(r.data.signedUrl)}" target="_blank" rel="noopener">فتح الملف</a>`)})}
async function showContactSearch(){
  const c=activeChat?.conversation;if(!c)return;const r=await sb.from('messages').select('content,created_at,sender_id').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(500);if(r.error)return toast('تعذر تحميل الرسائل');
  openContactTools('البحث في المحادثة',`<input id="contactSearchInput" class="modal-search" placeholder="اكتب كلمة للبحث..."><div id="contactSearchResults" class="contact-search-results"><div class="muted">اكتب كلمة للبحث داخل المحادثة.</div></div>`);
  $('contactSearchInput').oninput=()=>{const q=$('contactSearchInput').value.trim().toLowerCase();const rows=q?(r.data||[]).filter(m=>(m.content||'').toLowerCase().includes(q)):[];$('contactSearchResults').innerHTML=rows.length?rows.map(m=>`<div class="contact-search-row"><span>${esc(m.content||'رسالة')}</span><small>${fmt(m.created_at)}</small></div>`).join(''):'<div class="muted">مفيش نتائج.</div>'};
}
async function openEnhancedOtherProfile(u){
  if(!u)return;
  $('otherProfileName').textContent=u.display_name||'مستخدم';
  $('otherProfileUsername').textContent=u.username?'@'+u.username:'';
  $('otherProfilePhone').textContent=u.phone?'📱 '+u.phone:'';
  $('otherProfileBio').textContent=u.bio||'';
  $('otherProfileStatus').textContent=userOnlineText(u.last_seen);
  $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
  $('otherProfileModal').classList.remove('hidden');
  const p=await getContactPrefs(u.id);
  $('otherNotifyBtn').querySelector('strong').textContent=p.muted?'الإشعارات (مكتومة)':'الإشعارات';
  $('otherBlockBtn').querySelector('strong').textContent=p.blocked?'إلغاء حظر الشخص':'حظر الشخص';
  $('otherNotifyBtn').onclick=async()=>{const r=await saveContactPrefs(u.id,{muted:!p.muted});if(r.error)return toast('تعذر حفظ الإعداد');toast(!p.muted?'تم كتم الإشعارات':'تم تشغيل الإشعارات');openEnhancedOtherProfile(u)};
  $('otherMediaBtn').onclick=showContactMedia;
  $('otherSearchBtn').onclick=showContactSearch;
  $('otherPrivacyBtn').onclick=showContactPrivacy;
  $('otherReportBtn').onclick=showContactReport;
  $('otherBlockBtn').onclick=async()=>{const r=await saveContactPrefs(u.id,{blocked:!p.blocked});if(r.error)return toast('تعذر حفظ الحظر');toast(!p.blocked?'تم حظر الشخص':'تم إلغاء الحظر');openEnhancedOtherProfile(u)};
}
function bindEnhancedProfile(){
  const open=()=>{if(activeChat?.user)openEnhancedOtherProfile(activeChat.user)};
  $('chatPerson')?.addEventListener('click',e=>{if(e.target.closest('.chat-head-actions'))return;open()});
  $('chatAvatar')?.addEventListener('click',e=>{e.stopPropagation();open()});
  $('chatTitle')?.addEventListener('click',e=>{e.stopPropagation();open()});
  $('chatStatus')?.addEventListener('click',e=>{e.stopPropagation();open()});
  $('otherProfileAvatar')?.addEventListener('click',e=>{e.stopPropagation()});
  $('closeOtherProfileBtn')?.addEventListener('click',()=>closeOtherProfile());
}
bindEnhancedProfile();

// Respect contact-level mute/block settings in messages and calls.
const _comboOriginalSendMessage=sendMessage;
sendMessage=async function(){
  if(activeChat?.user){const p=await getContactPrefs(activeChat.user.id);if(p.blocked)return toast('هذا الشخص محظور. ألغِ الحظر أولًا.');}
  return _comboOriginalSendMessage();
};
const _comboOriginalNotifyIncomingMessage=notifyIncomingMessage;
notifyIncomingMessage=async function(m){
  if(m?.sender_id){const p=await getContactPrefs(m.sender_id);if(p.blocked)return;if(p.muted)return sb.from('messages').update({delivered_at:new Date().toISOString()}).eq('id',m.id).eq('receiver_id',me.id);}
  return _comboOriginalNotifyIncomingMessage(m);
};
const _comboOriginalHandleSignal=handleSignal;
handleSignal=async function(p){
  if(p?.type==='offer'&&p.from){const pref=await getContactPrefs(p.from);if(pref.blocked||pref.calls_blocked){await sendCallSignal(p.conversationId,{type:'reject',callId:p.callId,from:me.id,to:p.from});toast(pref.blocked?'تم رفض المكالمة لأن الشخص محظور':'تم منع المكالمة لهذا الشخص');return}}
  return _comboOriginalHandleSignal(p);
};

/* ===== V11: Username visibility privacy ===== */
(function(){
  async function viewerCanSeeUsername(u){
    if(!u || !u.username) return false;
    if(me?.id===u.id) return true;
    const mode=u.username_visibility||'everyone';
    if(mode==='everyone') return true;
    if(mode==='nobody') return false;
    // "contacts" means the viewer has this person saved as a ComboApp contact.
    try{
      const r=await sb.from('user_contacts').select('id').eq('owner_id',u.id).eq('contact_id',me.id).maybeSingle();
      if(!r.error && r.data) return true;
      // Older contact schema fallback: viewer saved the target.
      const r2=await sb.from('user_contacts').select('id').eq('owner_id',me.id).eq('contact_id',u.id).maybeSingle();
      return !r2.error && !!r2.data;
    }catch(_){ return false; }
  }
  window.comboUsernameVisibilityLabel=function(v){return v==='contacts'?'جهات اتصاله':v==='nobody'?'لا أحد':'الجميع'};
  window.comboUsernameVisibility=viewerCanSeeUsername;

  const oldShowPrivacy=window.showPrivacy;
  window.showPrivacy=async function(){
    const val=(k,def)=>localStorage.getItem('combo_'+k) ?? (me?.[k]||def);
    const row=(id,label,value)=>`<label class="privacy-row"><span>${label}</span><select id="${id}"><option value="everyone" ${value==='everyone'?'selected':''}>الجميع</option><option value="contacts" ${value==='contacts'?'selected':''}>جهات اتصاله</option><option value="nobody" ${value==='nobody'?'selected':''}>لا أحد</option></select></label>`;
    const body=`<div class="settings-info privacy-live">
      <h4>الخصوصية والأمان</h4>
      ${row('pLast','آخر ظهور',val('privacy_last_seen','everyone'))}
      ${row('pOnline','من يرى أنني متصل الآن',val('privacy_online','everyone'))}
      ${row('pAvatar','صورة الملف الشخصي',val('privacy_avatar','everyone'))}
      ${row('pAbout','النبذة والمعلومات',val('privacy_profile','everyone'))}
      ${row('pStatus','الحالة',val('privacy_status','everyone'))}
      ${row('pUsername','من يمكنه رؤية اسم المستخدم',val('username_visibility','everyone'))}
      <div class="muted" style="margin:8px 0 12px;line-height:1.7">لو اخترت «جهات اتصاله»، اسم المستخدم يظهر فقط للأشخاص الذين أضفتهم أنت كجهة اتصال. أنت تقدر تشوف أسماء المستخدمين للآخرين بشكل طبيعي.</div>
      ${row('pGroups','إضافتي للمجموعات',val('privacy_groups','everyone'))}
      ${row('pCalls','من يمكنه الاتصال بي',val('privacy_calls','everyone'))}
      <label class="privacy-row"><span>إيصالات القراءة</span><input id="pRead" type="checkbox" ${val('read_receipts','on')!=='off'?'checked':''}></label>
      <label class="privacy-row"><span>مؤشر الكتابة</span><input id="pTyping" type="checkbox" ${val('typing','on')!=='off'?'checked':''}></label>
      <button id="savePrivacyV11" class="primary">حفظ إعدادات الخصوصية</button>
    </div>`;
    openSimple('الخصوصية والأمان',body,'إغلاق');
    setTimeout(()=>{
      $('savePrivacyV11')?.addEventListener('click',async()=>{
        const vals={privacy_last_seen:$('pLast').value,privacy_online:$('pOnline').value,privacy_avatar:$('pAvatar').value,privacy_profile:$('pAbout').value,privacy_status:$('pStatus').value,username_visibility:$('pUsername').value,privacy_groups:$('pGroups').value,read_receipts:$('pRead').checked?'on':'off',typing:$('pTyping').checked?'on':'off'};
        Object.entries(vals).forEach(([k,v])=>localStorage.setItem('combo_'+k,v));
        const db={privacy_last_seen:vals.privacy_last_seen,privacy_avatar:vals.privacy_avatar,privacy_profile:vals.privacy_profile,privacy_status:vals.privacy_status,username_visibility:vals.username_visibility,read_receipts:vals.read_receipts};
        const r=await sb.from('profiles').update(db).eq('id',me.id);
        if(!r.error) me={...me,...db};
        toast(r.error?'تم حفظ الإعدادات على هذا الجهاز':'تم حفظ إعدادات الخصوصية على حسابك');
        closeSimple();
      });
    },40);
  };

  // Always use the V11 profile renderer so the username visibility rule is respected.
  window.openOtherProfile=async function(u){
    if(!u)return;
    $('otherProfileName').textContent=u.display_name||'مستخدم';
    const showUser=await viewerCanSeeUsername(u);
    $('otherProfileUsername').textContent=showUser?'@'+u.username:'اسم المستخدم مخفي';
    let status='آخر ظهور غير متاح';
    if(u.privacy_last_seen!=='nobody'){
      if(u.privacy_last_seen==='contacts'){
        const r=await sb.from('user_contacts').select('id').eq('owner_id',u.id).eq('contact_id',me.id).maybeSingle();
        status=r.data?userOnlineText(u.last_seen):'آخر ظهور غير متاح';
      }else status=userOnlineText(u.last_seen);
    }
    $('otherProfileStatus').textContent=status;
    $('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u.display_name));
    $('otherProfileModal').classList.remove('hidden');
  };

  // Hide usernames in contact/search cards when the owner's privacy says so.
  const originalSearchUsers=window.searchUsers;
  if(typeof originalSearchUsers==='function'){
    window.searchUsers=async function(){
      const q=$('userSearch')?.value.trim();
      if(!q)return originalSearchUsers();
      const safe=q.replace(/[%_,]/g,' ');
      const {data}=await sb.from('profiles').select('id,username,display_name,avatar_url,username_visibility').or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).neq('id',me.id).limit(10);
      $('searchResults').classList.remove('hidden');
      const rows=[];
      for(const u of (data||[])){
        const show=await viewerCanSeeUsername(u);
        rows.push(`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name)}</strong><small>${show?'@'+esc(u.username):'اسم المستخدم مخفي'}</small></div><button class="contact-action primary-inline">دردشة</button></div>`);
      }
      $('searchResults').innerHTML=rows.join('')||"<div class='muted' style='padding:12px'>مفيش نتائج</div>";
      $('searchResults').querySelectorAll('.result-item').forEach(e=>e.onclick=()=>openUser(e.dataset.id));
    };
  }

  // ComboApp V13: calls are intentionally disabled. Keep legacy call code dormant so it cannot affect chat.
  try{
    document.querySelectorAll('#audioCallBtn,#videoCallBtn,#otherVoiceBtn,#otherVideoBtn,.modern-call-btn,[data-call],#callsNav,#callsPage').forEach(el=>el.remove());
  }catch(_){ }
})();
