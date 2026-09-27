const SUPABASE_URL = "https://isceguwzogvbwqxmomnx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6K8b1SYA5zEubol9wqPZrw_XwKu5ccN";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let session=null, me=null, activeChat=null, pinMode=null, messageChannel=null, pendingLockedConversation=null;
let peer=null, localStream=null, activeCall=null, callChannels=new Map(), pendingIce=[];
const $=id=>document.getElementById(id);
const APP_ORIGIN = window.location.origin;
const APP_BASE_URL = new URL('./', window.location.href).href;

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),2800)}
function initials(name="C"){return name.trim().slice(0,1).toUpperCase()||"C"}
function fmt(t){return new Date(t).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}

async function init(){
  try {
    if (typeof supabase === "undefined") {
      throw new Error("تعذر تحميل مكتبة الاتصال. تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة.");
    }
    bind();
  const {data}=await sb.auth.getSession(); session=data.session;
  if(session) await enterApp(); else showAuth();
  sb.auth.onAuthStateChange(async(event,s)=>{
    session=s;
    if(event==="PASSWORD_RECOVERY"){showRecovery();return}
    if(s && !me) await enterApp();
    if(!s){me=null;showAuth()}
  });
  } catch (err) {
    console.error(err);
    showAuth();
    toast(err?.message || "حصل خطأ في تشغيل ComboApp");
  }
}
function showAuth(){["authScreen"].forEach(id=>$(id).classList.remove("hidden"));$("appScreen").classList.add("hidden");$("recoveryPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");$("signupPanel").classList.add("hidden")}
function showRecovery(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("loginPanel").classList.add("hidden");$("signupPanel").classList.add("hidden");$("recoveryPanel").classList.remove("hidden")}

function bind(){
  $("showSignupBtn").onclick=()=>{$("loginPanel").classList.add("hidden");$("signupPanel").classList.remove("hidden")};
  $("showLoginBtn").onclick=()=>{$("signupPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden")};
  $("loginBtn").onclick=login; $("signupBtn").onclick=signup; $("forgotBtn").onclick=resetPassword;
  $("saveNewPasswordBtn").onclick=saveNewPassword;
  $("logoutBtn").onclick=async()=>{await stopCall();await sb.auth.signOut();location.reload()};
  $("profileBtn").onclick=()=>go("profilePage");
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
  $("userSearch").oninput=searchUsers; $("newChatBtn").onclick=()=>$("userSearch").focus(); $("refreshBtn").onclick=loadChats;
  $("archivedBtn").onclick=()=>{go("archivedPage");loadArchived()}; $("backHomeBtn").onclick=()=>go("homePage");
  $("sendMessageBtn").onclick=sendMessage; $("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendMessage()});
  $("closeChatBtn").onclick=closeChat; $("chatMenuBtn").onclick=chatMenu;
  $("voiceCallBtn").onclick=()=>startCall(false); $("videoCallBtn").onclick=()=>startCall(true); $("endCallBtn").onclick=stopCall;
  $("muteBtn").onclick=toggleMute; $("cameraBtn").onclick=toggleCamera;
  $("publishStoryBtn").onclick=publishStory; $("sendSarhnyBtn").onclick=sendSarhny; $("sarhnyContent").oninput=()=>$("sarhnyCount").textContent=$("sarhnyContent").value.length;
  $("saveProfileBtn").onclick=saveProfile; $("changePasswordBtn").onclick=changePassword; $("appLockBtn").onclick=setupAppLock;
  $("pinConfirmBtn").onclick=confirmPin; $("pinCancelBtn").onclick=closePin; $("unlockBtn").onclick=unlockApp;
  $("addStoryBtn").onclick=()=>$("storyText").focus();
}

async function login(){
  const email=$("loginEmail").value.trim(),password=$("loginPassword").value;
  if(!email||!password)return toast("اكتب البريد وكلمة السر");
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error)return toast("البريد أو كلمة السر غير صحيحة");
  toast("تم تسجيل الدخول");
}
async function signup(){
  const name=$("signupName").value.trim(),username=$("signupUsername").value.trim().toLowerCase(),email=$("signupEmail").value.trim(),p=$("signupPassword").value,p2=$("signupPassword2").value;
  if(!name||!username||!email||!p)return toast("كمّل البيانات");
  if(!/^[a-z0-9_\.]{3,24}$/.test(username))return toast("اسم المستخدم: حروف إنجليزية وأرقام و _ فقط");
  if(p.length<6)return toast("كلمة السر لازم تكون 6 أحرف على الأقل");
  if(p!==p2)return toast("تأكيد كلمة السر غير مطابق");
  const {data,error}=await sb.auth.signUp({email,password:p,options:{emailRedirectTo:APP_BASE_URL,data:{display_name:name,username}}});
  if(error)return toast(error.message.includes("already")?"البريد مستخدم بالفعل":error.message);
  $("signupPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");
  toast(data.session?"تم إنشاء الحساب":"تم إنشاء الحساب. افتح رسالة تأكيد البريد ثم سجّل الدخول.");
}
async function resetPassword(){
  const email=$("loginEmail").value.trim(); if(!email)return toast("اكتب بريدك أولًا");
  // In production this must be the HTTPS URL of the published app. Using the current origin prevents stale localhost URLs.
  const redirectTo = (window.location.origin + window.location.pathname).replace(/\/$/, "") || window.location.origin;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  if(error)return toast(error.message||"تعذر إرسال رسالة الاستعادة");
  toast("تم إرسال رابط تغيير كلمة السر إلى بريدك");
}
async function saveNewPassword(){
  const p=$("newPassword").value,p2=$("newPassword2").value;
  if(p.length<6)return toast("كلمة السر لازم تكون 6 أحرف على الأقل"); if(p!==p2)return toast("كلمتا السر غير متطابقتين");
  const {error}=await sb.auth.updateUser({password:p}); if(error)return toast(error.message||"تعذر تغيير كلمة السر");
  toast("تم تغيير كلمة السر"); await sb.auth.signOut(); showAuth();
}

async function enterApp(){
  if(!session)return;
  const {data,error}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  if(error)return toast("تعذر تحميل الحساب");
  if(!data){
    // Normally created automatically by the database trigger. This fallback is only for old accounts.
    const meta=session.user.user_metadata||{};
    const fallback={id:session.user.id,display_name:meta.display_name||"مستخدم",username:meta.username||session.user.email.split("@")[0].replace(/[^a-z0-9_]/gi,"").slice(0,24)||"user",avatar_url:null};
    const r=await sb.from("profiles").upsert(fallback,{onConflict:"id"}); if(r.error)return toast("تعذر تجهيز ملف الحساب");
    me=fallback;
  }else me=data;
  $("authScreen").classList.add("hidden");$("appScreen").classList.remove("hidden");
  await loadProfile(); await loadChats(); await loadStories(); await loadSarhnyInbox(); await loadCallHistory(); await checkAppLock(); subscribeMessages(); await subscribeCallRooms();
}
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="homePage")loadChats();if(page==="storiesPage")loadStories();if(page==="sarhnyPage")loadSarhnyInbox();if(page==="callsPage")loadCallHistory();}

async function searchUsers(){
  const q=$("userSearch").value.trim(); if(!q){$("searchResults").classList.add("hidden");return}
  const safe=q.replace(/[%_,]/g," ");
  const {data,error}=await sb.from("profiles").select("id,username,display_name").or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).neq("id",me.id).limit(10); if(error)return;
  $("searchResults").classList.remove("hidden");$("searchResults").innerHTML=(data||[]).map(u=>`<div class="result-item" data-id="${u.id}"><div class="avatar">${initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name)}</strong><small>@${esc(u.username)}</small></div><button class="round-btn">＋</button></div>`).join("")||"<div class='muted' style='padding:12px'>مفيش نتائج</div>";
  $("searchResults").querySelectorAll(".result-item").forEach(el=>el.onclick=()=>openUser(el.dataset.id));
}
async function openUser(userId){
  const {data,error}=await sb.from("conversations").select("*").or(`and(user1_id.eq.${me.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${me.id})`).limit(1).maybeSingle();
  if(error&&error.code!=="PGRST116")return toast("تعذر فتح المحادثة"); let c=data;
  if(!c){const r=await sb.from("conversations").insert({user1_id:me.id,user2_id:userId}).select().single();if(r.error)return toast("تعذر إنشاء المحادثة");c=r.data}
  $("searchResults").classList.add("hidden");$("userSearch").value="";await subscribeCallRoom(c.id);await openChat(c);
}
async function getSettings(){const {data}=await sb.from("conversation_settings").select("conversation_id,archived,locked").eq("user_id",me.id);return Object.fromEntries((data||[]).map(x=>[x.conversation_id,x]))}
async function loadChats(){return renderChats(false)}
async function loadArchived(){return renderChats(true)}
async function renderChats(archived){
  const target=archived?$("archivedList"):$("chatList"); const {data,error}=await sb.from("conversations").select("*").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).order("updated_at",{ascending:false});
  if(error){target.innerHTML="<div class='empty-card'>تعذر تحميل المحادثات</div>";return}
  const ids=[...new Set((data||[]).map(c=>c.user1_id===me.id?c.user2_id:c.user1_id))]; if(!ids.length){target.innerHTML="<div class='empty-card'>💬<h3>مفيش محادثات</h3></div>";return}
  const pr=await sb.from("profiles").select("id,username,display_name").in("id",ids),map=Object.fromEntries((pr.data||[]).map(x=>[x.id,x])); const sm=await getSettings();
  const rows=(data||[]).filter(c=>Boolean(sm[c.id]?.archived)===archived);
  target.innerHTML=rows.map(c=>{const u=map[c.user1_id===me.id?c.user2_id:c.user1_id]||{};return `<div class="chat-item" data-cid="${c.id}"><div class="avatar">${initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name||"مستخدم")}</strong><small>@${esc(u.username||"")}</small></div>${sm[c.id]?.locked?"🔒":""}<span class="time">${fmt(c.updated_at||c.created_at)}</span></div>`}).join("")||"<div class='empty-card'>مفيش محادثات هنا.</div>";
  target.querySelectorAll(".chat-item").forEach(el=>el.onclick=()=>openChatById(el.dataset.cid));
}
async function openChatById(id){const {data,error}=await sb.from("conversations").select("*").eq("id",id).single();if(error)return;openChat(data)}
async function openChat(c){
  const otherId=c.user1_id===me.id?c.user2_id:c.user1_id; const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single(); const {data:s}=await sb.from("conversation_settings").select("*").eq("conversation_id",c.id).eq("user_id",me.id).maybeSingle();
  if(s?.locked){pinMode="unlockChat";pendingLockedConversation=c;window._lockedSetting=s;$("pinTitle").textContent="فتح المحادثة";$("pinConfirmBtn").textContent="فتح";$("pinModal").classList.remove("hidden");return}
  activeChat={conversation:c,user:u}; $("chatTitle").textContent=u?.display_name||"محادثة";$("chatStatus").textContent="محادثة آمنة";$("chatModal").classList.remove("hidden");await loadMessages();await markRead();
}
async function loadMessages(){
  if(!activeChat)return; const {data,error}=await sb.from("messages").select("*").eq("conversation_id",activeChat.conversation.id).order("created_at");
  if(error){$("messagesBox").innerHTML="<div class='muted'>تعذر تحميل الرسائل</div>";return}
  $("messagesBox").innerHTML=(data||[]).map(m=>`<div class="bubble ${m.sender_id===me.id?"mine":"theirs"}">${esc(m.content)}<small>${fmt(m.created_at)} ${m.sender_id===me.id?(m.read_at?"✓✓":"✓"):""}</small></div>`).join("");$("messagesBox").scrollTop=$("messagesBox").scrollHeight;
}
async function sendMessage(){const content=$("messageInput").value.trim();if(!content||!activeChat)return;const r=await sb.from("messages").insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:"text"});if(r.error)return toast("تعذر إرسال الرسالة");$("messageInput").value="";await loadMessages();await loadChats()}
async function markRead(){if(!activeChat)return;await sb.from("messages").update({read_at:new Date().toISOString()}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("read_at",null);}
function subscribeMessages(){if(messageChannel)sb.removeChannel(messageChannel);messageChannel=sb.channel("messages-"+me.id).on("postgres_changes",{event:"*",schema:"public",table:"messages"},payload=>{if(activeChat&&payload.new?.conversation_id===activeChat.conversation.id){loadMessages();if(payload.new.receiver_id===me.id)markRead()}loadChats()}).subscribe()}
function closeChat(){$("chatModal").classList.add("hidden");activeChat=null}
async function chatMenu(){if(!activeChat)return;const a=prompt("اكتب: 1 أرشفة | 2 قفل | 3 إلغاء القفل");if(a==="1"){await setChatSetting({archived:true});closeChat();await loadChats();toast("تمت أرشفة المحادثة")}if(a==="2"){pinMode="chat";$("pinTitle").textContent="قفل المحادثة";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}if(a==="3"){await sb.from("conversation_settings").delete().eq("conversation_id",activeChat.conversation.id).eq("user_id",me.id);toast("تم إلغاء القفل")}}
async function setChatSetting(extra){if(!activeChat)return;const {data:old}=await sb.from("conversation_settings").select("archived,locked,pin_hash").eq("conversation_id",activeChat.conversation.id).eq("user_id",me.id).maybeSingle();const base={user_id:me.id,conversation_id:activeChat.conversation.id,archived:old?.archived||false,locked:old?.locked||false,pin_hash:old?.pin_hash||null,...extra};const r=await sb.from("conversation_settings").upsert(base,{onConflict:"user_id,conversation_id"});if(r.error)toast("تأكد من تشغيل SQL الخاص بالنسخة")}
async function confirmPin(){const pin=$("pinInput").value.trim();if(!/^\d{4,8}$/.test(pin))return toast("الرمز لازم يكون من 4 إلى 8 أرقام");const h=await sha(pin);if(pinMode==="chat"){await setChatSetting({locked:true,pin_hash:h});toast("تم قفل المحادثة");closePin()}else if(pinMode==="unlockChat"){if(h!==window._lockedSetting.pin_hash)return toast("رمز القفل غير صحيح");const c=pendingLockedConversation;closePin();pendingLockedConversation=null;if(c){const s2={...window._lockedSetting,locked:false};window._lockedSetting=null;activeChat=null;const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";$("chatStatus").textContent="محادثة آمنة";$("chatModal").classList.remove("hidden");await loadMessages();await markRead();}}else if(pinMode==="app"){localStorage.setItem("combo_app_lock",h);toast("تم تفعيل قفل التطبيق");closePin();$("appLockState").textContent="مفعل"}}
function closePin(){$("pinModal").classList.add("hidden");$("pinInput").value="";pinMode=null;window._lockedSetting=null}
async function setupAppLock(){pinMode="app";$("pinTitle").textContent="قفل التطبيق";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}
async function checkAppLock(){const h=localStorage.getItem("combo_app_lock");if(h){$("lockScreen").classList.remove("hidden");$("appLockState").textContent="مفعل"}}
async function unlockApp(){const h=await sha($("unlockInput").value);if(h===localStorage.getItem("combo_app_lock")){$("lockScreen").classList.add("hidden");$("unlockInput").value=""}else toast("رمز القفل غير صحيح")}

async function publishStory(){const content=$("storyText").value.trim();if(!content)return toast("اكتب الحالة");const r=await sb.from("stories").insert({user_id:me.id,content,media_type:"text",expires_at:new Date(Date.now()+86400000).toISOString()});if(r.error)return toast("تعذر نشر الحالة");$("storyText").value="";toast("تم نشر الحالة");loadStories()}
async function loadStories(){const {data,error}=await sb.from("stories").select("*,profiles(display_name,username)").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});if(error){$("storiesList").innerHTML="<div class='empty-card'>تعذر تحميل الحالات</div>";return}$("storiesList").innerHTML=(data||[]).map(s=>`<article class="story-item"><div class="chat-item" style="padding:0;border:0"><div class="avatar">${initials(s.profiles?.display_name)}</div><div class="chat-info"><strong>${esc(s.profiles?.display_name||"مستخدم")}</strong><small>${fmt(s.created_at)}</small></div></div><p>${esc(s.content||"")}</p></article>`).join("")||"<div class='empty-card'>مفيش حالات حاليًا</div>"}
async function sendSarhny(){const username=$("sarhnyUsername").value.trim(),content=$("sarhnyContent").value.trim();if(!username||!content)return toast("اكتب اسم المستخدم والرسالة");const {error}=await sb.rpc("send_sarhny_message",{p_username:username,p_content:content});if(error)return toast(error.message||"تعذر إرسال الرسالة");$("sarhnyContent").value="";$("sarhnyCount").textContent="0";toast("تم إرسال رسالتك بشكل سري")}
async function loadSarhnyInbox(){const {data,error}=await sb.from("sarhny_messages").select("id,content,created_at").eq("recipient_id",me.id).order("created_at",{ascending:false});if(error){$("sarhnyInbox").innerHTML="<div class='muted'>تعذر تحميل الرسائل السرية.</div>";return}$("sarhnyInbox").innerHTML=(data||[]).map(x=>`<div class="sarhny-item"><div class="avatar">♡</div><div class="chat-info"><strong>رسالة سرية</strong><small>${esc(x.content)}</small></div><span class="time">${fmt(x.created_at)}</span></div>`).join("")||"<div class='empty-card'>لسه موصلكش رسائل سرية.</div>"}
async function loadProfile(){$("profileName").value=me.display_name||"";$("profileUsername").value=me.username||"";$("profileBio").value=me.bio||"";$("profileAvatar").textContent=initials(me.display_name)}
async function saveProfile(){const display_name=$("profileName").value.trim(),username=$("profileUsername").value.trim().toLowerCase(),bio=$("profileBio").value.trim();if(!display_name||!username)return toast("الاسم واسم المستخدم مطلوبين");const {error}=await sb.from("profiles").update({display_name,username,bio,last_seen:new Date().toISOString()}).eq("id",me.id);if(error)return toast(error.code==="23505"?"اسم المستخدم مستخدم بالفعل":"تعذر حفظ البيانات");me={...me,display_name,username,bio};$("profileAvatar").textContent=initials(display_name);toast("تم حفظ البروفايل")}
async function changePassword(){const p=prompt("اكتب كلمة السر الجديدة (6 أحرف على الأقل):");if(!p||p.length<6)return;const {error}=await sb.auth.updateUser({password:p});toast(error?"تعذر تغيير كلمة السر":"تم تغيير كلمة السر")}

// ---------- WebRTC voice/video calls with Supabase Realtime signaling ----------
async function subscribeCallRooms(){
  for(const ch of callChannels.values()) await sb.removeChannel(ch);
  callChannels.clear();
  const {data}=await sb.from("conversations").select("id,user1_id,user2_id").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);
  for(const c of data||[]) subscribeCallRoom(c.id);
}
async function subscribeCallRoom(conversationId){
  if(callChannels.has(conversationId))return;
  const ch=sb.channel("call-"+conversationId,{config:{private:true,broadcast:{ack:true}}});
  ch.on("broadcast",{event:"signal"},async({payload})=>{if(payload?.to!==me.id)return;try{await handleSignal(payload)}catch(e){console.error(e)}});
  await ch.subscribe(); callChannels.set(conversationId,ch);
}
async function sendCallSignal(conversationId,payload){const ch=callChannels.get(conversationId);if(ch)await ch.send({type:"broadcast",event:"signal",payload})}

async function startCall(video){
  if(!activeChat)return toast("افتح محادثة أولًا");
  if(location.protocol!=="https:" && location.hostname!=="localhost" && location.hostname!=="127.0.0.1")return toast("المكالمة تحتاج HTTPS عند التشغيل المنشور");
  try{
    await subscribeCallRoom(activeChat.conversation.id);
    activeCall={id:crypto.randomUUID(),video,initiator:true,peerId:activeChat.user.id,conversationId:activeChat.conversation.id};
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video});
    $("localVideo").srcObject=localStream;$("remoteVideo").srcObject=null;$("callAvatar").textContent=initials(activeChat.user.display_name);$("callTitle").textContent=video?"مكالمة فيديو":"مكالمة صوتية";$("callState").textContent="جارٍ الاتصال...";$("callModal").classList.remove("hidden");
    peer=createPeer(true);const offer=await peer.createOffer();await peer.setLocalDescription(offer);
    await sendCallSignal(activeCall.conversationId,{type:"offer",callId:activeCall.id,from:me.id,to:activeCall.peerId,video,offer});
  }catch(e){console.error(e);await stopCall();toast(e.name==="NotAllowedError"?"اسمح للكاميرا والميكروفون من المتصفح":"تعذر بدء المكالمة")}
}
function createPeer(){
  const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});
  if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.ontrack=e=>{$("remoteVideo").srcObject=e.streams[0];$("callState").textContent="متصل"};
  pc.onicecandidate=e=>{if(e.candidate&&activeCall)sendCallSignal(activeCall.conversationId,{type:"ice",callId:activeCall.id,from:me.id,to:activeCall.peerId,candidate:e.candidate})};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==="connected")$("callState").textContent="متصل";if(["failed","disconnected"].includes(pc.connectionState))$("callState").textContent="انقطع الاتصال"};
  return pc;
}
async function handleSignal(p){
  if(p.type==="offer"){
    if(activeCall)return;
    const {data:u}=await sb.from("profiles").select("id,display_name").eq("id",p.from).single();
    const accept=confirm("مكالمة واردة من "+(u?.display_name||"مستخدم")+". موافق؟"); if(!accept){await sendCallSignal(p.conversationId,{type:"reject",callId:p.callId,from:me.id,to:p.from});return}
    activeCall={id:p.callId,video:!!p.video,initiator:false,peerId:p.from,conversationId:p.conversationId};
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:!!p.video});
    $("localVideo").srcObject=localStream;$("callTitle").textContent=p.video?"مكالمة فيديو":"مكالمة صوتية";$("callState").textContent="جارٍ الاتصال...";$("callAvatar").textContent=initials(u?.display_name);$("callModal").classList.remove("hidden");
    peer=createPeer(false);await peer.setRemoteDescription(p.offer);const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
    await sendCallSignal(p.conversationId,{type:"answer",callId:p.callId,from:me.id,to:p.from,answer});return;
  }
  if(!activeCall||p.callId!==activeCall.id)return;
  if(p.type==="answer"&&peer){await peer.setRemoteDescription(p.answer);$("callState").textContent="متصل"}
  if(p.type==="ice"&&peer){try{await peer.addIceCandidate(p.candidate)}catch(e){}}
  if(p.type==="reject"){toast("تم رفض المكالمة");await stopCall(false)}
  if(p.type==="hangup"){toast("انتهت المكالمة");await stopCall(false)}
}
async function stopCall(sendHangup=true){
  const old=activeCall;
  if(sendHangup&&old){try{await sendCallSignal(old.conversationId,{type:"hangup",callId:old.id,from:me?.id,to:old.peerId})}catch(e){}}
  if(peer){peer.close();peer=null} if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}
  activeCall=null;$("callModal").classList.add("hidden");$("localVideo").srcObject=null;$("remoteVideo").srcObject=null;
}
function toggleMute(){if(!localStream)return;const t=localStream.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$("muteBtn").textContent=t.enabled?"🎙️":"🔇"}}
function toggleCamera(){if(!localStream)return;const t=localStream.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$("cameraBtn").textContent=t.enabled?"📷":"🚫"}}
async function loadCallHistory(){const {data,error}=await sb.from("call_history").select("*").eq("user_id",me.id).order("created_at",{ascending:false}).limit(30);if(error){$("callHistory").innerHTML="<div class='empty-card'>سجل المكالمات يحتاج إعداد SQL.</div>";return}$("callHistory").innerHTML=(data||[]).map(c=>`<div class="chat-item"><div class="avatar">☎</div><div class="chat-info"><strong>${c.call_type==="video"?"مكالمة فيديو":"مكالمة صوتية"}</strong><small>${esc(c.status||"انتهت")}</small></div><span class="time">${fmt(c.created_at)}</span></div>`).join("")||"<div class='empty-card'>مفيش مكالمات لسه.</div>"}

init();
