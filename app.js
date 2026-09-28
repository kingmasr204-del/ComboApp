const SUPABASE_URL="https://isceguwzogvbwqxmomnx.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_6K8b1SYA5zEubol9wqPZrw_XwKu5ccN";
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let session=null,me=null,activeChat=null,pinMode=null,messageChannel=null,pendingLockedConversation=null;
let peer=null,localStream=null,activeCall=null,callChannels=new Map(),callStartedAt=null,callTimer=null,storyFile=null,storyObjectUrl=null;
const $=id=>document.getElementById(id); const APP_BASE_URL="https://kingmasr204-del.github.io/ComboApp/";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),3000)}
function initials(n="C"){return n.trim().slice(0,1).toUpperCase()||"C"} function fmt(t){return new Date(t).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}
function fmtDuration(sec){sec=Math.max(0,Math.floor(sec||0));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))} async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function init(){try{bind();const {data}=await sb.auth.getSession();session=data.session;if(session)await enterApp();else showAuth();sb.auth.onAuthStateChange(async(e,s)=>{session=s;if(e==="PASSWORD_RECOVERY"){showRecovery();return}if(s&&!me)await enterApp();if(!s){me=null;showAuth()}})}catch(e){console.error(e);showAuth();toast(e.message||"حصل خطأ")}}
function showAuth(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("recoveryPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");$("signupPanel").classList.add("hidden")}
function showRecovery(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("loginPanel").classList.add("hidden");$("signupPanel").classList.add("hidden");$("recoveryPanel").classList.remove("hidden")}
function bind(){
 $("showSignupBtn").onclick=()=>{$("loginPanel").classList.add("hidden");$("signupPanel").classList.remove("hidden")};$("showLoginBtn").onclick=()=>{$("signupPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden")};$("loginBtn").onclick=login;$("signupBtn").onclick=signup;$("forgotBtn").onclick=resetPassword;$("saveNewPasswordBtn").onclick=saveNewPassword;
 $("logoutBtn").onclick=logout;$("logoutProfileBtn").onclick=logout;$("profileBtn").onclick=()=>go("profilePage");$("notifyBtn").onclick=requestNotifications;
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));$("userSearch").oninput=searchUsers;$("newChatBtn").onclick=openContacts;$("refreshBtn").onclick=loadChats;$("archivedBtn").onclick=()=>{go("archivedPage");loadArchived()};$("backHomeBtn").onclick=()=>go("homePage");
 $("sendMessageBtn").onclick=sendMessage;$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});$("emojiBtn").onclick=toggleEmoji;$("attachContactBtn").onclick=openContacts;
 $("closeChatBtn").onclick=closeChat;$("chatMenuBtn").onclick=()=>$("chatMenuModal").classList.remove("hidden");$("menuCancelBtn").onclick=closeChatMenu;$("menuArchiveBtn").onclick=archiveChat;$("menuLockBtn").onclick=lockChat;$("menuDeleteBtn").onclick=deleteChat;$("menuReportBtn").onclick=reportChat;$("menuAddContactBtn").onclick=addActiveContact;
 $("voiceCallBtn").onclick=()=>startCall(false);$("videoCallBtn").onclick=()=>startCall(true);$("endCallBtn").onclick=()=>stopCall(true);$("muteBtn").onclick=toggleMute;$("cameraBtn").onclick=toggleCamera;
 $("closeContactsBtn").onclick=closeContacts;$("pickContactsBtn").onclick=pickContacts;$("manualContactBtn").onclick=()=>$("manualContactForm").classList.toggle("hidden");$("saveManualContactBtn").onclick=saveManualContact;$("contactSearch").oninput=renderContacts;
 $("addStoryBtn").onclick=openStoryComposer;$("closeStoryComposer").onclick=closeStoryComposer;$("storyPostTop").onclick=publishStory;$("storyTextModeBtn").onclick=storyTextMode;$("storyMediaInput").onchange=handleStoryFile;$("storyCameraInput").onchange=handleStoryFile;$("storyAudioBtn").onclick=pickAudio;document.querySelectorAll(".color-dot").forEach(b=>b.onclick=()=>{$("storyCanvas").style.background=b.dataset.color});
 $("avatarActionBtn").onclick=avatarActions;$("avatarFileInput").onchange=uploadAvatar;$("saveProfileBtn").onclick=saveProfile;$("changePasswordBtn").onclick=changePassword;$("appLockBtn").onclick=setupAppLock;$("privacyBtn").onclick=showPrivacy;$("settingsBtn").onclick=showSettings;$("wallpaperBtn").onclick=showWallpaper;$("chatStyleBtn").onclick=showChatStyle;$("deleteAccountBtn").onclick=deleteAccount;
 $("pinConfirmBtn").onclick=confirmPin;$("pinCancelBtn").onclick=closePin;$("unlockBtn").onclick=unlockApp;
}
async function login(){const email=$("loginEmail").value.trim(),password=$("loginPassword").value;if(!email||!password)return toast("اكتب البريد وكلمة السر");const {error}=await sb.auth.signInWithPassword({email,password});if(error)return toast("البريد أو كلمة السر غير صحيحة");toast("تم تسجيل الدخول")}
async function signup(){const name=$("signupName").value.trim(),username=$("signupUsername").value.trim().toLowerCase(),email=$("signupEmail").value.trim(),phone=normalizePhone($("signupPhone").value),p=$("signupPassword").value,p2=$("signupPassword2").value;if(!name||!username||!email||!p)return toast("كمّل البيانات");if(!/^[a-z0-9_.]{3,24}$/.test(username))return toast("اسم المستخدم إنجليزي وأرقام و _ فقط");if(p.length<6)return toast("كلمة السر 6 أحرف على الأقل");if(p!==p2)return toast("تأكيد كلمة السر غير مطابق");const {data,error}=await sb.auth.signUp({email,password:p,options:{emailRedirectTo:APP_BASE_URL,data:{display_name:name,username,phone}}});if(error)return toast(error.message);$("signupPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");toast(data.session?"تم إنشاء الحساب":"تم إنشاء الحساب. افتح رسالة التأكيد ثم سجّل الدخول.")}
async function resetPassword(){const email=$("loginEmail").value.trim();if(!email)return toast("اكتب بريدك أولًا");const redirectTo=window.location.origin+window.location.pathname;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)return toast(error.message);toast("تم إرسال رابط تغيير كلمة السر")}
async function saveNewPassword(){const p=$("newPassword").value,p2=$("newPassword2").value;if(p.length<6)return toast("كلمة السر 6 أحرف على الأقل");if(p!==p2)return toast("كلمتا السر غير متطابقتين");const {error}=await sb.auth.updateUser({password:p});if(error)return toast(error.message);toast("تم تغيير كلمة السر");await sb.auth.signOut();showAuth()}
async function logout(){await stopCall(false);await sb.auth.signOut();location.reload()}
async function enterApp(){if(!session)return;const {data,error}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();if(error)return toast("تعذر تحميل الحساب");if(!data){const m=session.user.user_metadata||{};const fallback={id:session.user.id,display_name:m.display_name||"مستخدم",username:m.username||session.user.email.split("@")[0].replace(/[^a-z0-9_]/gi,"").slice(0,24)||"user",phone:m.phone||null,avatar_url:null};const r=await sb.from("profiles").upsert(fallback,{onConflict:"id"});if(r.error)return toast("تعذر تجهيز الحساب");me=fallback}else me=data;$("authScreen").classList.add("hidden");$("appScreen").classList.remove("hidden");await loadProfile();await loadChats();await loadStories();await loadSarhnyInbox();await requestNotifications();await loadCallHistory();await checkAppLock();subscribeMessages();await subscribeCallRooms()}
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="homePage")loadChats();if(page==="storiesPage")loadStories();if(page==="sarhnyPage")loadSarhnyInbox();if(page==="callsPage")loadCallHistory()}
async function searchUsers(){const q=$("userSearch").value.trim();if(!q){$("searchResults").classList.add("hidden");return}const safe=q.replace(/[%_,]/g," ");const {data}=await sb.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).neq("id",me.id).limit(10);$("searchResults").classList.remove("hidden");$("searchResults").innerHTML=(data||[]).map(u=>`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name)}</strong><small>@${esc(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`).join("")||"<div class='muted' style='padding:12px'>مفيش نتائج</div>";$("searchResults").querySelectorAll(".result-item").forEach(e=>e.onclick=()=>openUser(e.dataset.id))}
async function openUser(userId){const {data,error}=await sb.from("conversations").select("*").or(`and(user1_id.eq.${me.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${me.id})`).limit(1).maybeSingle();if(error&&error.code!=="PGRST116")return toast("تعذر فتح المحادثة");let c=data;if(!c){const r=await sb.from("conversations").insert({user1_id:me.id,user2_id:userId}).select().single();if(r.error)return toast("تعذر إنشاء المحادثة");c=r.data}$("searchResults").classList.add("hidden");$("userSearch").value="";await subscribeCallRoom(c.id);await openChat(c)}
async function getSettings(){const {data}=await sb.from("conversation_settings").select("conversation_id,archived,locked,deleted").eq("user_id",me.id);return Object.fromEntries((data||[]).map(x=>[x.conversation_id,x]))}
async function renderChats(archived){const target=archived?$("archivedList"):$(("chatList"));const {data,error}=await sb.from("conversations").select("*").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).order("updated_at",{ascending:false});if(error){target.innerHTML="<div class='empty-card'>تعذر تحميل المحادثات</div>";return}const settings=await getSettings();const rowsBase=(data||[]).filter(c=>!settings[c.id]?.deleted);if(!rowsBase.length){target.innerHTML="<div class='empty-card'><h3>💬 مفيش محادثات</h3><p class='muted'>اضغط ＋ وابدأ محادثة جديدة.</p></div>";return}const ids=[...new Set(rowsBase.map(c=>c.user1_id===me.id?c.user2_id:c.user1_id))];const {data:pr}=await sb.from("profiles").select("id,username,display_name,phone,avatar_url").in("id",ids);const map=Object.fromEntries((pr||[]).map(x=>[x.id,x]));const {data:msgs}=await sb.from("messages").select("conversation_id,content,created_at,sender_id,receiver_id,read_at,delivered_at").in("conversation_id",rowsBase.map(c=>c.id)).order("created_at",{ascending:false}).limit(2000);const latest={},unread={};for(const m of msgs||[]){if(!latest[m.conversation_id])latest[m.conversation_id]=m;if(m.receiver_id===me.id&&!m.read_at)unread[m.conversation_id]=(unread[m.conversation_id]||0)+1}const rows=rowsBase.filter(c=>Boolean(settings[c.id]?.archived)===archived);target.innerHTML=rows.map(c=>{const u=map[c.user1_id===me.id?c.user2_id:c.user1_id]||{},last=latest[c.id],n=unread[c.id]||0;const preview=last?`${last.sender_id===me.id?"أنت: ":""}${esc(last.content||"رسالة")}`:"ابدأ المحادثة";return `<div class="chat-item selectable" data-cid="${c.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name||"مستخدم")}</strong><small>${preview}</small></div><div class="chat-meta">${settings[c.id]?.locked?"🔒":""}<span class="time">${last?fmt(last.created_at):fmt(c.updated_at||c.created_at)}</span>${n?`<span class="badge">${n>99?"99+":n}</span>`:""}</div></div>`}).join("")||"<div class='empty-card'>مفيش محادثات هنا.</div>";target.querySelectorAll(".chat-item").forEach(el=>{let timer;el.onclick=()=>openChatById(el.dataset.cid);el.oncontextmenu=e=>{e.preventDefault();openChatById(el.dataset.cid).then(()=>archiveChat())};el.ontouchstart=()=>{timer=setTimeout(()=>{openChatById(el.dataset.cid).then(()=>$("chatMenuModal").classList.remove("hidden"))},650)};el.ontouchend=()=>clearTimeout(timer)});updateChatBadge(Object.values(unread).reduce((a,b)=>a+b,0))}
function updateChatBadge(n){const nav=document.querySelector('.bottom-nav .nav[data-page="homePage"]');if(!nav)return;let b=nav.querySelector('.nav-badge');if(!b){b=document.createElement('span');b.className='nav-badge';nav.appendChild(b)}b.textContent=n>99?'99+':String(n);b.classList.toggle('hidden',!n)}
async function loadChats(){return renderChats(false)} async function loadArchived(){return renderChats(true)}
async function openChatById(id){const {data}=await sb.from("conversations").select("*").eq("id",id).single();if(data)openChat(data)}
async function openChat(c){const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();const {data:s}=await sb.from("conversation_settings").select("*").eq("conversation_id",c.id).eq("user_id",me.id).maybeSingle();if(s?.locked){pinMode="unlockChat";pendingLockedConversation=c;window._lockedSetting=s;$("pinTitle").textContent="فتح المحادثة";$("pinConfirmBtn").textContent="فتح";$("pinModal").classList.remove("hidden");return}activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";$("chatStatus").textContent="متصل عبر ComboApp";setChatAvatar(u);$("chatModal").classList.remove("hidden");await subscribeCallRoom(c.id);await markDelivered();await loadMessages();await markRead();applyChatWallpaper()}
function setChatAvatar(u){$("chatAvatar").innerHTML=u?.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u?.display_name))}
async function markDelivered(){if(!activeChat)return;await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("delivered_at",null)}
async function loadMessages(){if(!activeChat)return;const {data,error}=await sb.from("messages").select("*").eq("conversation_id",activeChat.conversation.id).order("created_at");if(error){$("messagesBox").innerHTML="<div class='muted'>تعذر تحميل الرسائل</div>";return}$("messagesBox").innerHTML=(data||[]).map(m=>{let ticks="";if(m.sender_id===me.id){ticks=m.read_at?"<span class='ticks read'>✓✓</span>":m.delivered_at?"<span class='ticks'>✓✓</span>":"<span class='ticks'>✓</span>"}return `<div class="bubble ${m.sender_id===me.id?"mine":"theirs"}">${esc(m.content)}<small>${fmt(m.created_at)} ${ticks}</small></div>`}).join("");$("messagesBox").scrollTop=$("messagesBox").scrollHeight}
async function sendMessage(){const content=$("messageInput").value.trim();if(!content||!activeChat)return;const r=await sb.from("messages").insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:"text"});if(r.error)return toast("تعذر إرسال الرسالة");$("messageInput").value="";await loadMessages();await loadChats()}
async function markRead(){if(!activeChat)return;const now=new Date().toISOString();await sb.from("messages").update({delivered_at:now,read_at:now}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("read_at",null);await loadMessages()}
async function requestNotifications(){if(!("Notification"in window))return;if(Notification.permission==="default")try{await Notification.requestPermission()}catch(e){}}
async function notifyIncomingMessage(m){if(m.receiver_id!==me.id||m.sender_id===me.id)return;await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("id",m.id).eq("receiver_id",me.id);if(activeChat?.conversation?.id===m.conversation_id)return;const {data:u}=await sb.from("profiles").select("display_name").eq("id",m.sender_id).maybeSingle();toast(`💬 ${u?.display_name||"رسالة جديدة"}: ${m.content||"رسالة"}`);if("Notification"in window&&Notification.permission==="granted")try{new Notification(u?.display_name||"رسالة جديدة",{body:m.content||"رسالة جديدة",icon:"logo.png"})}catch(e){}}
function subscribeMessages(){if(messageChannel)sb.removeChannel(messageChannel);messageChannel=sb.channel("messages-"+me.id).on("postgres_changes",{event:"*",schema:"public",table:"messages"},p=>{if(p.eventType==="INSERT"&&p.new?.receiver_id===me.id)notifyIncomingMessage(p.new);if(activeChat&&p.new?.conversation_id===activeChat.conversation.id){loadMessages();if(p.new.receiver_id===me.id)markRead()}loadChats()}).subscribe()}
function closeChat(){$("chatModal").classList.add("hidden");activeChat=null;$("emojiPanel").classList.add("hidden")}
function closeChatMenu(){$("chatMenuModal").classList.add("hidden")}
async function archiveChat(){closeChatMenu();if(!activeChat)return;await setChatSetting({archived:true});const id=activeChat.conversation.id;closeChat();await loadChats();toast("تم نقل المحادثة للأرشيف")}
async function lockChat(){closeChatMenu();if(!activeChat)return;pinMode="chat";$("pinTitle").textContent="قفل المحادثة";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}
async function deleteChat(){closeChatMenu();if(!activeChat)return;const ok=confirm("حذف المحادثة من قائمتك؟");if(!ok)return;await setChatSetting({deleted:true,archived:false});const id=activeChat.conversation.id;closeChat();await loadChats();toast("تم حذف المحادثة من قائمتك")}
async function reportChat(){closeChatMenu();if(!activeChat)return;const reason=prompt("اكتب سبب الإبلاغ (اختياري)")||"بلاغ من المستخدم";const r=await sb.from("reports").insert({reporter_id:me.id,reported_user_id:activeChat.user.id,reason});if(r.error)toast("تعذر إرسال البلاغ");else toast("تم إرسال البلاغ")}
async function addActiveContact(){closeChatMenu();if(!activeChat)return;const list=readSavedContacts();const phone=activeChat.user.phone;if(!phone)return toast("الجهة دي مش مسجل لها رقم");if(!list.some(x=>x.phone===phone))list.push({name:activeChat.user.display_name,phone});saveContacts(list);toast("تمت إضافة جهة الاتصال")}
async function setChatSetting(extra){if(!activeChat)return;const {data:old}=await sb.from("conversation_settings").select("archived,locked,pin_hash,deleted").eq("conversation_id",activeChat.conversation.id).eq("user_id",me.id).maybeSingle();const base={user_id:me.id,conversation_id:activeChat.conversation.id,archived:old?.archived||false,locked:old?.locked||false,pin_hash:old?.pin_hash||null,deleted:old?.deleted||false,...extra};const r=await sb.from("conversation_settings").upsert(base,{onConflict:"user_id,conversation_id"});if(r.error)toast("شغّل SQL الخاص بالتحديث الأخير")}
async function confirmPin(){const pin=$("pinInput").value.trim();if(!/^\d{4,8}$/.test(pin))return toast("الرمز من 4 إلى 8 أرقام");const h=await sha(pin);if(pinMode==="chat"){await setChatSetting({locked:true,pin_hash:h});toast("تم قفل المحادثة");closePin()}else if(pinMode==="unlockChat"){if(h!==window._lockedSetting.pin_hash)return toast("رمز القفل غير صحيح");const c=pendingLockedConversation;closePin();pendingLockedConversation=null;if(c){const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";setChatAvatar(u);$("chatModal").classList.remove("hidden");await loadMessages();await markRead()}}else if(pinMode==="app"){localStorage.setItem("combo_app_lock",h);toast("تم تفعيل قفل التطبيق");closePin();$("appLockState").textContent="مفعل"}}
function closePin(){$("pinModal").classList.add("hidden");$("pinInput").value="";pinMode=null;window._lockedSetting=null}function setupAppLock(){pinMode="app";$("pinTitle").textContent="قفل التطبيق";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}async function checkAppLock(){if(localStorage.getItem("combo_app_lock"))$("lockScreen").classList.remove("hidden")}async function unlockApp(){const h=await sha($("unlockInput").value);if(h===localStorage.getItem("combo_app_lock")){$("lockScreen").classList.add("hidden");$("unlockInput").value=""}else toast("رمز القفل غير صحيح")}
function normalizePhone(v=""){let n=String(v).replace(/[^0-9+]/g,"");if(n.startsWith("00"))n="+"+n.slice(2);if(n.startsWith("+20"))return"20"+n.slice(3);if(n.startsWith("20")&&n.length>=12)return n;if(n.startsWith("0"))return"20"+n.slice(1);return n.replace(/\D/g,"")}
function readSavedContacts(){try{return JSON.parse(localStorage.getItem("combo_contacts")||"[]")}catch{return[]}}function saveContacts(l){localStorage.setItem("combo_contacts",JSON.stringify(l))}function openContacts(){$("contactsModal").classList.remove("hidden");renderContacts()};function closeContacts(){$("contactsModal").classList.add("hidden")}
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
function showChatStyle(){openSimple("نمط الدردشة",`<button class="choice-btn" onclick="localStorage.setItem('combo_bubbles','classic');closeSimple();toast('تم اختيار النمط الكلاسيكي')">فقاعات ComboApp</button><button class="choice-btn" onclick="localStorage.setItem('combo_bubbles','soft');closeSimple();toast('تم اختيار النمط الناعم')">فقاعات ناعمة</button>`,"إغلاق")}
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
  await subscribeCallRoom(c.id);await markDelivered();await loadMessages();await markRead();applyChatWallpaper();
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
async function loadMessages(){
  if(!activeChat)return;
  const {data,error}=await sb.from('messages').select('*').eq('conversation_id',activeChat.conversation.id).order('created_at');
  if(error){$('messagesBox').innerHTML='<div class="muted">تعذر تحميل الرسائل</div>';return}
  $('messagesBox').innerHTML=(data||[]).map(m=>{
    let ticks='';
    if(m.sender_id===me.id) ticks=m.read_at?'<span class="ticks read">✓✓</span>':m.delivered_at?'<span class="ticks">✓✓</span>':'<span class="ticks">✓</span>';
    const body=m.media_path?messageMediaMarkup(m):(m.content?`<div class="message-text">${esc(m.content)}</div>`:'');
    return `<div class="bubble ${m.sender_id===me.id?'mine':'theirs'}">${body}<small>${fmt(m.created_at)} ${ticks}</small></div>`;
  }).join('')||'<div class="empty-card">ابدأ المحادثة 👋</div>';
  $('messagesBox').scrollTop=$('messagesBox').scrollHeight;
  await hydrateMessageMedia();
}

async function sendMessage(){
  const content=$('messageInput').value.trim();
  if(!content||!activeChat)return;
  const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:'text'});
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
function showEmojiTab(tab){
  document.querySelectorAll('.emoji-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const box=$('emojiContent');
  if(tab==='emoji'){
    box.innerHTML=`<div class="native-emoji-grid">${COMBO_EMOJIS.map(x=>`<button type="button">${x}</button>`).join('')}</div>`;
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>insertAtCursor($('messageInput'),b.textContent));
  }else if(tab==='sticker'){
    box.innerHTML='<div class="sticker-grid">'+['😍','😂','🥰','😭','😎','🔥','❤️','👍','🎉','🤍','👑','💚','🤣','🥺','😱','🥳'].map(x=>`<button type="button">${x}</button>`).join('')+'</div>';
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>sendMessageContent(b.textContent));
  }else{
    box.innerHTML='<div class="gif-grid"><button type="button">😂 GIF</button><button type="button">❤️ GIF</button><button type="button">🔥 GIF</button><button type="button">🎉 GIF</button><p class="muted">GIF الحقيقي يحتاج ربط Tenor أو GIPHY API.</p></div>';
  }
}
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
