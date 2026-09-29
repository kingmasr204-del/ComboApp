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

// V23 stability fix: these settings helpers must be global.
// Older V4 code kept them inside a private IIFE, while later controls
// (notifications/chat styling/etc.) call them from global functions.
function setting(key,def){return localStorage.getItem("combo_"+key) ?? def}
function setSetting(key,val){localStorage.setItem("combo_"+key,String(val));saveCloudSetting(key,val)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))} async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
let _comboEntering=null;
async function init(){try{
  if(!window.supabase){showAuth();toast('تعذر تحميل خدمة تسجيل الدخول. حدّث الصفحة أو جرّب شبكة أخرى.');return;}
  bind();const {data}=await sb.auth.getSession();session=data.session;if(session)await enterApp();else showAuth();sb.auth.onAuthStateChange((e,s)=>{session=s;if(e==="PASSWORD_RECOVERY"){showRecovery();return}if(s&&!me)enterApp().catch(err=>{console.error(err);toast("تعذر فتح التطبيق، حاول مرة أخرى")});if(!s){me=null;showAuth()}})}catch(e){console.error(e);showAuth();toast(e.message||"حصل خطأ")}}
function showAuth(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("recoveryPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden");$("signupPanel").classList.add("hidden")}
function showRecovery(){$("authScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("loginPanel").classList.add("hidden");$("signupPanel").classList.add("hidden");$("recoveryPanel").classList.remove("hidden")}
function bind(){
  // Auth controls are also wired inline in index.html as a fallback for mobile/webview click issues.
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
  click('globalLogoutBtn',logout); try{updateNotificationBell()}catch(e){console.warn('notification init',e)}
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

async function withTimeout(promise,ms=15000){
  let timer;
  const timeout=new Promise((_,rej)=>timer=setTimeout(()=>rej(new Error('انتهت مهلة الاتصال بسيرفر ComboApp. جرّب تاني.')),ms));
  try{return await Promise.race([promise,timeout])}finally{clearTimeout(timer)}
}
async function login(){
  const email=($('loginEmail')?.value||'').trim(),password=$('loginPassword')?.value||'';
  if(!email||!password)return toast('اكتب البريد وكلمة السر');
  const btn=$('loginBtn'); if(btn){btn.disabled=true;btn.textContent='جاري الدخول...'}
  try{
    const r=await withTimeout(sb.auth.signInWithPassword({email,password}));
    if(r.error)return toast(r.error.message||'البريد أو كلمة السر غير صحيحة');
    session=r.data?.session||null;
    if(!session)return toast('تعذر إنشاء جلسة الدخول. جرّب مرة أخرى.');
    // Open immediately; profile/secondary data is handled by enterApp safely.
    await enterApp();
    toast('تم تسجيل الدخول');
  }catch(e){console.error(e);toast(e.message||'تعذر تسجيل الدخول')}finally{if(btn){btn.disabled=false;btn.textContent='دخول'}}
}
async function signup(){
  const name=($('signupName')?.value||'').trim(),username=($('signupUsername')?.value||'').trim().toLowerCase(),email=($('signupEmail')?.value||'').trim(),phone=normalizePhone($('signupPhone')?.value||''),p=$('signupPassword')?.value||'',p2=$('signupPassword2')?.value||'';
  if(!name||!username||!email||!p)return toast('كمّل البيانات');
  if(!/^[a-z0-9_.]{3,24}$/.test(username))return toast('اسم المستخدم إنجليزي وأرقام و _ فقط');
  if(p.length<6)return toast('كلمة السر 6 أحرف على الأقل');
  if(p!==p2)return toast('تأكيد كلمة السر غير مطابق');
  const exists=await withTimeout(sb.from('profiles').select('id').eq('username',username).maybeSingle()).catch(()=>({data:null,error:null}));
  if(exists.data)return toast('اسم المستخدم مستخدم بالفعل، اختار اسمًا آخر');
  const btn=$('signupBtn');if(btn){btn.disabled=true;btn.textContent='جاري إنشاء الحساب...'}
  try{
    const r=await withTimeout(sb.auth.signUp({email,password:p,options:{emailRedirectTo:APP_BASE_URL,data:{display_name:name,username,phone}}}));
    if(r.error)return toast(r.error.message||'تعذر إنشاء الحساب');
    if(r.data?.session){session=r.data.session;await enterApp();toast('تم إنشاء الحساب');}
    else{ $('signupPanel')?.classList.add('hidden');$('loginPanel')?.classList.remove('hidden'); $('loginEmail').value=email; toast('تم إنشاء الحساب. لو ظهر تأكيد البريد، افتح رسالة التأكيد ثم سجّل الدخول.'); }
  }catch(e){console.error(e);toast(e.message||'تعذر إنشاء الحساب')}finally{if(btn){btn.disabled=false;btn.textContent='إنشاء الحساب'}}
}
async function resetPassword(){
  const email=($('loginEmail')?.value||'').trim();
  if(!email)return toast('اكتب بريدك في خانة البريد أولًا');
  const btn=$('forgotBtn');if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...'}
  try{
    const redirectTo=APP_BASE_URL;
    const r=await withTimeout(sb.auth.resetPasswordForEmail(email,{redirectTo}));
    if(r.error)return toast(r.error.message||'تعذر إرسال رابط تغيير كلمة السر');
    toast('تم إرسال رابط تغيير كلمة السر إلى البريد');
  }catch(e){console.error(e);toast(e.message||'تعذر إرسال رابط تغيير كلمة السر')}finally{if(btn){btn.disabled=false;btn.textContent='نسيت كلمة السر؟'}}
}
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
      let candidate=(m.username||base).toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,24)||'user';
      let unique=candidate;
      for(let n=1;n<=50;n++){
        const q=await sb.from('profiles').select('id').eq('username',unique).neq('id',session.user.id).maybeSingle();
        if(!q.data) break;
        const suffix=String(n); unique=(candidate.slice(0,24-suffix.length)+suffix).slice(0,24);
      }
      const fallback={id:session.user.id,display_name:m.display_name||'مستخدم',username:unique,phone:m.phone||null,avatar_url:null,last_seen:new Date().toISOString()};
      const r=await sb.from('profiles').upsert(fallback,{onConflict:'id'});
      if(r.error)throw new Error('تعذر تجهيز الحساب: '+r.error.message);
      me=fallback;
    }else me=data;
    // Open the app as soon as the authenticated profile is ready. Secondary data must not block login.
    $('authScreen')?.classList.add('hidden'); $('appScreen')?.classList.remove('hidden');
    await safeAppTask('الإعدادات',loadCloudSettings);
    await safeAppTask('جهات الاتصال',loadCloudContacts);
    await safeAppTask('الملف الشخصي',loadProfile);
    await safeAppTask('آخر ظهور',touchLastSeen);
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
async function searchUsers(){
  const q=($("userSearch")?.value||"").trim().replace(/^@/,"").toLowerCase();
  if(!q){$("searchResults").classList.add("hidden");return;}
  if(!/^[a-z0-9_.]{3,24}$/.test(q)){
    $("searchResults").classList.remove("hidden");
    $("searchResults").innerHTML="<div class='muted' style='padding:12px'>اكتب اسم المستخدم كاملًا (3 أحرف على الأقل).</div>";
    return;
  }
  const {data,error}=await sb.from("profiles").select("id,username,display_name,avatar_url,username_visibility,phone,bio,last_seen,privacy_last_seen").eq("username",q).neq("id",me.id).limit(1);
  $("searchResults").classList.remove("hidden");
  if(error){$("searchResults").innerHTML="<div class='muted' style='padding:12px'>تعذر البحث حاليًا</div>";return;}
  const rows=data||[];
  $("searchResults").innerHTML=rows.length?rows.map(u=>`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name||u.username||"مستخدم")}</strong><small>@${esc(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`).join(""):"<div class='muted' style='padding:12px'>اسم المستخدم ده مش موجود.</div>";
  $("searchResults").querySelectorAll(".result-item").forEach(e=>e.onclick=()=>openUser(e.dataset.id));
}
async function touchLastSeen(){
  if(!me) return;
  const now=new Date().toISOString();
  me.last_seen=now;
  await sb.from('profiles').update({last_seen:now}).eq('id',me.id);
}

function enhanceUIBase(){
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
async function loadMessages(){if(!activeChat)return;const {data,error}=await sb.from('messages').select('*').eq('conversation_id',activeChat.conversation.id).order('created_at');if(error){$('messagesBox').innerHTML='<div class="muted">تعذر تحميل الرسائل</div>';return}$('messagesBox').innerHTML=(data||[]).map(m=>{let ticks='';if(m.sender_id===me.id)ticks=m.read_at?'<span class="ticks read">✓✓</span>':m.delivered_at?'<span class="ticks">✓✓</span>':'<span class="ticks">✓</span>';let body='';const c=m.content||'',sd=c.match(/^__combo_sticker_data__:(data:image\/[^;]+;base64,.+)$/),sm=c.match(/^__combo_sticker__:(\d+):(\d+)$/),gm=c.match(/^__combo_gif__:(\d+)$/);if(m.media_path)body=messageMediaMarkup(m);else if(sd){body=`<div class=\"sent-gif\"><img src=\"${sd[1]}\" alt=\"ملصق\"></div>`}else if(sm){const p=Number(sm[1]),j=Number(sm[2]),packs=Object.values(STICKER_PACKS),val=packs[p]?.[j]||'✨';body=`<div class="sent-sticker">${val}</div>`}else if(gm){const i=Number(gm[1]),src=new URL(GIFS[i]||GIFS[0],document.baseURI).href;body=`<div class="sent-gif"><img src="${src}" alt="GIF متحرك" loading="lazy"></div>`}else if(c)body=`<div class="message-text">${esc(c)}</div>`;return `<div class="bubble ${m.sender_id===me.id?'mine':'theirs'}">${body}<small>${fmt(m.created_at)} ${ticks}</small></div>`}).join('')||'<div class="empty-card">ابدأ المحادثة 👋</div>';$('messagesBox').scrollTop=$('messagesBox').scrollHeight;await hydrateMessageMedia()}

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
const STICKER_PACKS={'😂 ضحك':['😂','🤣','😹','😆','😅','🤭','😜','🤪','😎','🤓','🥳','😱'],'❤️ حب':['❤️','😍','🥰','😘','💋','💕','💞','💓','💗','💖','💘','💝'],'🔥 حماس':['🔥','⚡','💥','💯','🚀','👑','🏆','🎉','🎊','💪','👏','🙌'],'🐾 حيوانات':['🐶','🐱','🐼','🦊','🐻','🐨','🐯','🦁','🐰','🐸','🐵','🦄'],'👍 ردود':['👍','👎','👌','🙏','👏','🙌','🤝','✌️','🤞','👋','💚','✅'],'☕ فناجين':['☕','🍵','🫖','🥤','🧋','🍶','🍺','🍻','🥂','🍹','🍸','🍷'],'🧸 دباديب':['🧸','🐻','🐻‍❄️','🧸💗','🧸❤️','🧸✨','🐻🎀','🧸🎁','🧸🌸','🐻💕','🧸🥰','🧸👋']};
const GIFS=Array.from({length:20},(_,i)=>`assets/gifs/gif_${i+1}.gif`);
function sendRichReaction(kind,value){if(!activeChat)return toast('افتح محادثة أولًا');const content=kind==='sticker'?`__combo_sticker__:${value}`:`__combo_gif__:${value}`;sb.from('messages').insert({sender_id:me.id,receiver_id:activeChat.user.id,content,conversation_id:activeChat.conversation.id,message_type:kind}).then(r=>{if(r.error)return toast('تعذر إرسال العنصر');loadMessages();loadChats()});$('emojiPanel').classList.add('hidden')}
function renderEmojiCategory(cat){const box=$('emojiContent'),list=(COMBO_EMOJI_CATS[cat]||'').split(' ');const icons={smileys:'😀',people:'👋',animals:'🐾',food:'🍕',activities:'⚽',travel:'🚗',objects:'💡',symbols:'❤️'};box.innerHTML=`<div class="emoji-category-bar">${Object.keys(COMBO_EMOJI_CATS).map(k=>`<button type="button" class="emoji-cat ${k===cat?'active':''}" data-cat="${k}">${icons[k]}</button>`).join('')}</div><div class="native-emoji-grid">${list.map(x=>`<button type="button">${x}</button>`).join('')}</div>`;box.querySelectorAll('.emoji-cat').forEach(b=>b.onclick=()=>renderEmojiCategory(b.dataset.cat));box.querySelectorAll('.native-emoji-grid button').forEach(b=>b.onclick=()=>insertAtCursor($('messageInput'),b.textContent))}
function showEmojiTab(tab){document.querySelectorAll('.emoji-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const box=$('emojiContent');if(tab==='emoji'){renderEmojiCategory('smileys');return}if(tab==='sticker'){const packs=Object.entries(STICKER_PACKS);box.innerHTML=`<div class="sticker-pack-tabs">${packs.map(([n],i)=>`<button type="button" class="sticker-pack-tab ${i===0?'active':''}" data-pack="${i}">${n}</button>`).join('')}</div><div id="stickerPackGrid" class="sticker-grid"></div>`;const renderPack=i=>{document.querySelectorAll('.sticker-pack-tab').forEach((b,j)=>b.classList.toggle('active',j===i));const vals=packs[i][1];$('stickerPackGrid').innerHTML=vals.map((x,j)=>`<button type="button" class="sticker-item"><span>${x}</span><small>${packs[i][0].split(' ')[1]||'ملصق'}</small></button>`).join('');$('stickerPackGrid').querySelectorAll('button').forEach((b,j)=>b.onclick=()=>sendRichReaction('sticker',`${i}:${j}`))};box.querySelectorAll('.sticker-pack-tab').forEach((b,i)=>b.onclick=()=>renderPack(i));renderPack(0);return}box.innerHTML=`<div class="gif-title">GIF متحرك</div><div class="gif-grid real-gifs">${GIFS.map((src,i)=>`<button type="button" class="gif-item"><img src="${new URL(src,document.baseURI).href}" alt="GIF ${i+1}"><span>إرسال</span></button>`).join('')}</div>`;box.querySelectorAll('.gif-item').forEach((b,i)=>b.onclick=()=>sendRichReaction('gif',String(i)))}
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
function applyChatWallpaper(){const box=$("messagesBox"),v=localStorage.getItem("combo_wallpaper")||"0",custom=localStorage.getItem("combo_custom_wallpaper")||"";if(box){box.style.backgroundImage="";box.style.backgroundSize="cover";box.style.backgroundPosition="center";box.style.backgroundAttachment="scroll";box.className="messages";if(v==="custom"&&custom)box.style.backgroundImage=`linear-gradient(#03101666,#03101666),url("${custom}")`;else if(v.startsWith("img")){const map={img01:"wall_01.jpg",img02:"wall_02.jpg",img03:"wall_03.jpg",img04:"wall_04.jpg",img05:"wall_05.jpg",img06:"wall_06.jpg",img07:"wall_07.jpg",img08:"wall_08.jpg",img09:"wall_09.jpg",img10:"wall_10.jpg"};if(map[v])box.style.backgroundImage=`linear-gradient(#03101666,#03101666),url("assets/wallpapers_custom/${map[v]}")`}else{const p=["","wall-dots","wall-green","wall-blue","wall-black","wall-pink","wall-magenta","wall-red","wall-purple","wall-gold","wall-cyan","wall-hearts"][v]||"";if(p)box.classList.add(p)}}applyChatStyle()}
function showChatStyle(){const bubble=localStorage.getItem('combo_bubbles')||'classic',ticks=localStorage.getItem('combo_ticks')||'blue';openSimple('نمط الدردشة',`<h4>شكل الفقاعات</h4><div class="style-grid">${[['classic','ComboApp'],['soft','ناعمة'],['round','دائرية'],['glass','زجاجية'],['pill','واتساب بلس']].map(x=>`<button class="style-choice ${bubble===x[0]?'selected':''}" data-bubble="${x[0]}">${x[1]}</button>`).join('')}</div><h4>علامة الصح</h4><div class="style-grid">${[['blue','أزرق'],['white','أبيض'],['green','أخضر'],['black','أسود']].map(x=>`<button class="style-choice ${ticks===x[0]?'selected':''}" data-ticks="${x[0]}">${x[1]} ✓✓</button>`).join('')}</div>`,'إغلاق');setTimeout(()=>{document.querySelectorAll('[data-bubble]').forEach(b=>b.onclick=()=>{setComboSetting('bubbles',b.dataset.bubble);applyChatStyle();toast('تم تغيير شكل الفقاعات')});document.querySelectorAll('[data-ticks]').forEach(b=>b.onclick=()=>{setComboSetting('ticks',b.dataset.ticks);applyChatStyle();toast('تم تغيير علامة الصح')})},40)}
function applyChatStyle(){const p=$('chatPanel');if(!p)return;p.dataset.bubbles=localStorage.getItem('combo_bubbles')||'classic';p.dataset.ticks=localStorage.getItem('combo_ticks')||'blue'}
function bindV3(){
  const cp=$('chatPerson');if(cp)cp.onclick=()=>{if(activeChat)openOtherProfile(activeChat.user)};
  ['voiceCallBtn','videoCallBtn','chatMenuBtn'].forEach(id=>$(id)?.addEventListener('click',e=>e.stopPropagation()));
  $('otherDeleteChatBtn')?.addEventListener('click',async e=>{e.stopPropagation();await deleteChat()});
  applyTheme();applyChatWallpaper();applyChatStyle();
}
function enhanceUI(){enhanceUIBase();bindV3()}

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
    openSimple('الخصوصية والأمان',body,'حفظ');
    setTimeout(()=>{
      const modal=$('simpleModal'), bodyEl=$('simpleBody'), back=$('simpleCancel');
      if(bodyEl){bodyEl.style.maxHeight='calc(100vh - 170px)';bodyEl.style.overflowY='auto';bodyEl.style.paddingInlineEnd='4px';}
      if(back){back.classList.remove('hidden');back.textContent='رجوع';back.onclick=closeSimple;}
      if(modal){modal.scrollTop=0;}
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
  const mediaKey=()=>`combo_profile_media_${me?.id||'user'}`;
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
    openSimple('الخصوصية والأمان',body,'حفظ');
    setTimeout(()=>{
      const bodyEl=$('simpleBody'), back=$('simpleCancel');
      if(bodyEl){bodyEl.style.maxHeight='calc(100vh - 170px)';bodyEl.style.overflowY='auto';bodyEl.style.paddingInlineEnd='4px';}
      if(back){back.classList.remove('hidden');back.textContent='رجوع';back.onclick=closeSimple;}
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
        const r=await sb.from('conversations').select('id').or(`and(user1_id.eq.${me.id},user2_id.eq.${u.id}),and(user1_id.eq.${u.id},user2_id.eq.${me.id})`).limit(1).maybeSingle();
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

/* ComboApp V14 - custom wallpapers, richer GIFs/stickers, reliable profile taps */
(function(){
  const $v14=id=>document.getElementById(id);
  const escV14=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const builtInWalls=[
    ['0','افتراضي',''],
    ['1','نقاط نيون',''],['2','أخضر زجاجي',''],['3','أزرق ليلي',''],['4','أسود سادة',''],['5','وردي ناعم',''],['6','فوشيا',''],['7','أحمر غامق',''],['8','بنفسجي',''],['9','ذهبي',''],['10','سماوي',''],['11','قلب ونقاط',''],
    ['img01','غروب وجسر','assets/wallpapers_custom/wall_01.jpg'],
    ['img02','أسد وغزال','assets/wallpapers_custom/wall_02.jpg'],
    ['img03','ورد وهدية','assets/wallpapers_custom/wall_03.jpg'],
    ['img04','Porsche','assets/wallpapers_custom/wall_04.jpg'],
    ['img05','برج إيفل','assets/wallpapers_custom/wall_05.jpg'],
    ['img06','سماء درامية','assets/wallpapers_custom/wall_06.jpg'],
    ['img07','قمر وشجرة','assets/wallpapers_custom/wall_07.jpg'],
    ['img08','آيات وأذكار','assets/wallpapers_custom/wall_08.jpg'],
    ['img09','قط كيوت','assets/wallpapers_custom/wall_09.jpg'],
    ['img10','One Piece','assets/wallpapers_custom/wall_10.jpg']
  ];
  function getCustomWall(){return localStorage.getItem('combo_custom_wallpaper')||''}
  function resizeImage(file,max=1200){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.78))};im.onerror=reject;im.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
  window.applyChatWallpaper=function(){
    const box=$v14('messagesBox'); if(!box)return;
    const v=localStorage.getItem('combo_wallpaper')||'0';
    box.style.backgroundImage='';box.style.backgroundSize='cover';box.style.backgroundPosition='center';box.style.backgroundAttachment='scroll';box.classList.remove('custom-wallpaper-bg');
    if(v.startsWith('img')){const w=builtInWalls.find(x=>x[0]===v);if(w?.[2])box.style.backgroundImage=`linear-gradient(#03101655,#03101655),url("${w[2]}")`}
    else if(v==='custom'&&getCustomWall())box.style.backgroundImage=`linear-gradient(#03101655,#03101655),url("${getCustomWall()}")`;
    else {const p=['','wall-dots','wall-green','wall-blue','wall-black','wall-pink','wall-magenta','wall-red','wall-purple','wall-gold','wall-cyan','wall-hearts'][v]||''; if(p)box.classList.add(p)}
  };
  window.showWallpaper=function(){
    const body=`<div class="v14-wall-tabs"><button id="v14WallGallery" class="choice-btn">🖼️ اختار صورة من المعرض</button><button id="v14WallRemove" class="choice-btn">🧹 إزالة الخلفية المخصصة</button></div><div class="v14-wall-grid">${builtInWalls.map(w=>`<button type="button" class="v14-wall-card" data-v14-wall="${w[0]}">${w[2]?`<img src="${w[2]}" loading="lazy">`:`<span class="v14-wall-swatch wall-choice-${w[0]}"></span>`}<b>${escV14(w[1])}</b></button>`).join('')}</div><input id="v14WallInput" type="file" accept="image/*" hidden>`;
    openSimple('خلفيات الدردشة',body,'إغلاق');
    setTimeout(()=>{
      document.querySelectorAll('[data-v14-wall]').forEach(b=>b.onclick=()=>{localStorage.setItem('combo_wallpaper',b.dataset.v14Wall);window.applyChatWallpaper();closeSimple();toast('تم تغيير خلفية الدردشة')});
      $v14('v14WallGallery')?.addEventListener('click',()=>$v14('v14WallInput')?.click());
      $v14('v14WallRemove')?.addEventListener('click',()=>{localStorage.removeItem('combo_custom_wallpaper');localStorage.setItem('combo_wallpaper','0');window.applyChatWallpaper();closeSimple();toast('تمت إزالة الخلفية المخصصة')});
      $v14('v14WallInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(!f.type.startsWith('image/'))throw Error();const data=await resizeImage(f,1200);if(data.length>1900000)toast('الصورة كبيرة جدًا، تم ضغطها تلقائيًا');localStorage.setItem('combo_custom_wallpaper',data);localStorage.setItem('combo_wallpaper','custom');window.applyChatWallpaper();closeSimple();toast('تم تعيين صورتك كخلفية')}catch(_){toast('تعذر استخدام الصورة')}});
    },30);
  };
  async function sendStickerFile(file){
    if(!window.activeChat && typeof activeChat==='undefined')return toast('افتح محادثة أولًا');
    const chat=window.activeChat||activeChat; if(!chat)return;
    if(!file||!file.type.startsWith('image/'))return toast('اختار صورة ملصق من الجهاز');
    if(file.size>12*1024*1024)return toast('الملصق كبير جدًا');
    const path=`${chat.conversation.id}/${me.id}/sticker-${crypto.randomUUID()}.${(file.name.split('.').pop()||'png').replace(/[^a-z0-9]/gi,'')||'png'}`;
    const up=await sb.storage.from('chat-media').upload(path,file,{upsert:false,contentType:file.type});
    if(up.error){
      // Fallback: send a compressed data URL so imported stickers still work without a storage bucket.
      try{
        const data=await fileToDataURL(file,420);
        const r2=await sb.from('messages').insert({sender_id:me.id,receiver_id:chat.user.id,content:'__combo_sticker_data__:'+data,conversation_id:chat.conversation.id,message_type:'sticker'});
        if(r2.error)return toast('تعذر إرسال الملصق');
      }catch(_){return toast('تعذر إرسال الملصق')}
    }else{
      const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:chat.user.id,content:'',conversation_id:chat.conversation.id,message_type:'sticker',media_path:path,media_mime:file.type});
      if(r.error){await sb.storage.from('chat-media').remove([path]);return toast('تعذر إرسال الملصق')}
    }
    $('emojiPanel')?.classList.add('hidden');await loadMessages();await loadChats();
  }
  function fileToDataURL(file,max=512){return resizeImage(file,max)}
  async function saveImportedSticker(file){
    try{const data=await fileToDataURL(file,512);let list=JSON.parse(localStorage.getItem('combo_imported_stickers')||'[]');list=[data,...list].slice(0,40);localStorage.setItem('combo_imported_stickers',JSON.stringify(list));showEmojiTab('sticker');toast('تمت إضافة الملصق إلى ملصقاتي')}catch(_){toast('تعذر إضافة الملصق')}}
  function renderStickersV14(){
    const box=$v14('emojiContent');if(!box)return;
    const packs=Object.entries(STICKER_PACKS);const imported=JSON.parse(localStorage.getItem('combo_imported_stickers')||'[]');
    box.innerHTML=`<div class="v14-sticker-tools"><button id="v14ImportSticker" class="choice-btn">➕ إضافة ملصق من المعرض / تطبيق ملصقات</button></div><div class="v14-pack-tabs">${packs.map(([n],i)=>`<button class="v14-pack-tab ${i===0?'active':''}" data-pack="${i}">${escV14(n.split(' ')[0])}</button>`).join('')}<button class="v14-pack-tab" data-pack="imported">📥</button></div><div id="v14StickerGrid" class="v14-sticker-grid"></div><input id="v14StickerInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>`;
    const grid=$v14('v14StickerGrid');
    function drawPack(key){
      if(key==='imported'){grid.innerHTML=imported.length?imported.map((src,i)=>`<button class="v14-img-sticker" data-imported="${i}"><img src="${src}" loading="lazy"></button>`).join(''):`<div class="muted v14-empty">مفيش ملصقات مضافة — اضغط إضافة ملصق.</div>`}
      else {const arr=packs[Number(key)]?.[1]||[];grid.innerHTML=arr.map((x,i)=>`<button class="v14-text-sticker" data-pack-index="${Number(key)}" data-sticker-index="${i}">${escV14(x)}</button>`).join('')}
      grid.querySelectorAll('.v14-text-sticker').forEach(b=>b.onclick=()=>{sendRichReaction('sticker',`${b.dataset.packIndex}:${b.dataset.stickerIndex}`)});
      grid.querySelectorAll('.v14-img-sticker').forEach(b=>b.onclick=async()=>{const idx=Number(b.dataset.imported);const src=imported[idx];try{const blob=await fetch(src).then(r=>r.blob());await sendStickerFile(new File([blob],`sticker-${idx}.png`,{type:blob.type||'image/png'}))}catch(_){toast('تعذر إرسال الملصق')}});
    }
    packs.forEach((_,i)=>{const b=box.querySelector(`[data-pack="${i}"]`);b.onclick=()=>{box.querySelectorAll('.v14-pack-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');drawPack(i)}});
    box.querySelector('[data-pack="imported"]').onclick=()=>{box.querySelectorAll('.v14-pack-tab').forEach(x=>x.classList.remove('active'));box.querySelector('[data-pack="imported"]').classList.add('active');drawPack('imported')};
    $v14('v14ImportSticker').onclick=()=>$v14('v14StickerInput').click();
    $v14('v14StickerInput').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(f)await saveImportedSticker(f)};
    drawPack(0);
  }
  window.showEmojiTab=function(tab){document.querySelectorAll('.emoji-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const box=$v14('emojiContent');if(!box)return;if(tab==='emoji'){if(typeof renderEmojiCategory==='function')renderEmojiCategory('smileys');else box.innerHTML='<div class="muted">الإيموجي غير متاح</div>'}else if(tab==='gif'){box.innerHTML=`<div class="v14-gif-grid">${GIFS.map((src,i)=>`<button class="v14-gif-card" data-gif="${i}"><img src="${new URL(src,document.baseURI).href}" loading="lazy"><small>GIF ${i+1}</small></button>`).join('')}</div>`;box.querySelectorAll('[data-gif]').forEach(b=>b.onclick=()=>sendRichReaction('gif',Number(b.dataset.gif)))}else if(tab==='sticker'){renderStickersV14()}};
  // Make profile taps work on the chat header and on the chat-list avatar/name without opening the chat first.
  function profileForUserId(id){if(!id)return;sb.from('profiles').select('*').eq('id',id).maybeSingle().then(r=>{if(r.data)window.openOtherProfile(r.data);else toast('تعذر فتح الملف الشخصي')})}
  function bindProfileTapsV14(){
    const person=$v14('chatPerson');
    if(person){person.style.cursor='pointer';person.onclick=e=>{if(e.target.closest('#chatMenuBtn'))return;e.preventDefault();e.stopPropagation();if(window.activeChat||typeof activeChat!=='undefined')window.openOtherProfile((window.activeChat||activeChat).user)}}
    [$v14('chatAvatar'),$v14('chatTitle')].forEach(el=>{if(el)el.style.cursor='pointer'});
    document.querySelectorAll('.chat-item').forEach(row=>{
      const id=row.dataset.cid;const av=row.querySelector('.avatar');const nm=row.querySelector('.chat-info strong');
      [av,nm].forEach(el=>{if(!el)return;el.style.cursor='pointer';el.onclick=e=>{e.preventDefault();e.stopPropagation();const cId=row.dataset.cid;sb.from('conversations').select('*').eq('id',cId).maybeSingle().then(r=>{const c=r.data;if(!c)return;const uid=c.user1_id===me.id?c.user2_id:c.user1_id;profileForUserId(uid)})}})
    });
  }
  const _oldOpenOtherProfile=window.openOtherProfile;
  window.openOtherProfile=function(u){if(typeof _oldOpenOtherProfile==='function')_oldOpenOtherProfile(u);else{if(!u)return;$v14('otherProfileModal')?.classList.remove('hidden')}$v14('otherProfilePhone').textContent=u?.phone?('📞 '+u.phone):'';$v14('otherProfileBio').textContent=u?.bio||'';$v14('otherProfileName').textContent=u?.display_name||'مستخدم';$v14('otherProfileAvatar').innerHTML=u?.avatar_url?`<img src="${escV14(u.avatar_url)}">`:initials(u?.display_name);$v14('otherProfileUsername').textContent=u?.username?'@'+u.username:'';$v14('otherProfileModal')?.classList.remove('hidden');};
  document.addEventListener('click',e=>{if(e.target.closest('#chatPerson'))bindProfileTapsV14()});
  const oldEnhance=window.enhanceUI;if(typeof oldEnhance==='function'&&!window.__v14EnhanceWrapped){window.__v14EnhanceWrapped=true;window.enhanceUI=function(){const r=oldEnhance();setTimeout(bindProfileTapsV14,80);return r}}
  setTimeout(()=>{bindProfileTapsV14();window.applyChatWallpaper()},200);
})();


async function saveProfile(){
  const display_name=$("profileName")?.value.trim()||"";
  const username=$("profileUsername")?.value.trim().toLowerCase()||"";
  const phone=typeof normalizePhone==='function'?normalizePhone($("profilePhone")?.value||""):($("profilePhone")?.value||"");
  const bio=$("profileBio")?.value.trim()||"";
  if(!display_name||!username)return toast("الاسم واسم المستخدم مطلوبين");
  if(!/^[a-z0-9_.]{3,24}$/.test(username))return toast("اسم المستخدم 3-24 حرفًا: إنجليزي وأرقام و _ و . فقط");
  const uq=await sb.from("profiles").select("id").eq("username",username).neq("id",me.id).maybeSingle();
  if(uq.error)return toast("تعذر التحقق من اسم المستخدم");
  if(uq.data)return toast("اسم المستخدم مستخدم بالفعل — اختار اسمًا مختلفًا");
  const now=new Date().toISOString();
  const r=await sb.from("profiles").update({display_name,username,phone:phone||null,bio,last_seen:now}).eq("id",me.id);
  if(r.error)return toast(r.error.code==="23505"?"اسم المستخدم أو الرقم مستخدم بالفعل":"تعذر حفظ البيانات");
  me={...me,display_name,username,phone:phone||null,bio,last_seen:now};
  if(typeof renderAvatar==='function')renderAvatar(me.avatar_url,display_name);
  toast("تم حفظ البروفايل");
}

/* ===== ComboApp V15 FINAL STABILITY + UX PATCH ===== */
(function V15(){
  const q=id=>document.getElementById(id);
  const safe=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  // Keep the authenticated session alive and refresh the user's last-seen value.
  async function refreshMe(){
    if(!me?.id)return;
    const r=await sb.from('profiles').select('*').eq('id',me.id).maybeSingle();
    if(r.data) me=r.data;
    const now=new Date().toISOString();
    await sb.from('profiles').update({last_seen:now}).eq('id',me.id);
    me.last_seen=now;
  }

  // V26: robust username search. Partial input shows public usernames; hidden usernames appear only on exact match.
  window.searchUsers=async function(){
    const input=q('userSearch'); const box=q('searchResults');
    const term=(input?.value||'').trim().replace(/^@/,'').toLowerCase();
    if(!term){box?.classList.add('hidden');return;}
    box?.classList.remove('hidden');
    if(!/^[a-z0-9_.]{1,24}$/.test(term)){box.innerHTML="<div class='muted' style='padding:12px'>اكتب اسم المستخدم بحروف إنجليزية وأرقام و _ أو .</div>";return;}
    // Exact match first: even a private username is discoverable when the full username is typed.
    const exact=await sb.from('profiles').select('id,username,display_name,avatar_url,phone,bio,last_seen,privacy_last_seen,username_visibility').eq('username',term).neq('id',me.id).maybeSingle();
    if(!exact.error && exact.data){
      const u=exact.data;
      box.innerHTML=`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${safe(u.avatar_url)}">`:initials(u.display_name||u.username)}</div><div class="chat-info"><strong>${safe(u.display_name||u.username||'مستخدم')}</strong><small>@${safe(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`;
      box.querySelector('.result-item').onclick=()=>openUser(u.id);return;
    }
    // Prefix search while typing: only usernames whose owner allows visibility are shown.
    const r=await sb.from('profiles').select('id,username,display_name,avatar_url,username_visibility').ilike('username',term+'%').neq('id',me.id).limit(20);
    if(r.error){box.innerHTML="<div class='muted' style='padding:12px'>تعذر البحث حاليًا</div>";return;}
    const rows=(r.data||[]).filter(u=>u.username_visibility!=='nobody' && u.username_visibility!=='hidden');
    box.innerHTML=rows.map(u=>`<div class="result-item" data-id="${u.id}"><div class="avatar">${u.avatar_url?`<img src="${safe(u.avatar_url)}">`:initials(u.display_name||u.username)}</div><div class="chat-info"><strong>${safe(u.display_name||u.username||'مستخدم')}</strong><small>@${safe(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`).join('')||"<div class='muted' style='padding:12px'>مفيش نتائج ظاهرة بالجزء المكتوب من اليوزر.</div>";
    box.querySelectorAll('.result-item').forEach(e=>e.onclick=()=>openUser(e.dataset.id));
  };

  // Open the contact profile from a fresh DB row, so last-seen/privacy/block state isn't stale.
  window.openOtherProfile=async function(inputUser){
    if(!inputUser?.id)return;
    let u=inputUser;
    const fresh=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();
    if(fresh.data)u=fresh.data;
    const p=typeof getContactPrefs==='function'?await getContactPrefs(u.id):{};
    q('otherProfileName').textContent=u.display_name||'مستخدم';
    q('otherProfileUsername').textContent=u.username?('@'+u.username):'';
    q('otherProfilePhone').textContent=u.phone?('📱 '+u.phone):'';
    q('otherProfileBio').textContent=u.bio||'';
    q('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${safe(u.avatar_url)}">`:safe(initials(u.display_name));
    let status='آخر ظهور غير متاح';
    if(u.privacy_last_seen!=='nobody'){
      if(u.privacy_last_seen==='contacts'){
        const r=await sb.from('user_contacts').select('id').eq('owner_id',u.id).eq('contact_id',me.id).maybeSingle();
        status=r.data?userOnlineText(u.last_seen):'آخر ظهور غير متاح';
      }else status=userOnlineText(u.last_seen);
    }
    q('otherProfileStatus').textContent=status;
    if(q('otherBlockBtn'))q('otherBlockBtn').querySelector('strong').textContent=p.blocked?'إلغاء حظر الشخص':'حظر الشخص';
    if(q('otherNotifyBtn'))q('otherNotifyBtn').querySelector('strong').textContent=p.muted?'الإشعارات (مكتومة)':'الإشعارات';
    if(q('otherProfileModal'))q('otherProfileModal').classList.remove('hidden');
    if(q('otherBlockBtn'))q('otherBlockBtn').onclick=async()=>{
      const next=!p.blocked; const r=await saveContactPrefs(u.id,{blocked:next});
      if(r.error)return toast('تعذر حفظ الحظر');
      toast(next?'تم حظر الشخص':'تم إلغاء حظر الشخص');
      p.blocked=next; q('otherBlockBtn').querySelector('strong').textContent=next?'إلغاء حظر الشخص':'حظر الشخص';
    };
    if(q('otherNotifyBtn'))q('otherNotifyBtn').onclick=async()=>{
      const next=!p.muted; const r=await saveContactPrefs(u.id,{muted:next});
      if(r.error)return toast('تعذر حفظ الإعداد');
      p.muted=next; q('otherNotifyBtn').querySelector('strong').textContent=next?'الإشعارات (مكتومة)':'الإشعارات'; toast(next?'تم كتم الإشعارات':'تم تشغيل الإشعارات');
    };
    if(q('otherDeleteChatBtn'))q('otherDeleteChatBtn').onclick=async()=>{closeOtherProfile();await deleteChat()};
  };

  function bindProfile(){
    const person=q('chatPerson');
    if(person){person.onclick=e=>{if(e.target.closest('#chatMenuBtn'))return;e.preventDefault();e.stopPropagation();if(activeChat?.user)window.openOtherProfile(activeChat.user)}}
    q('chatAvatar')?.addEventListener('click',e=>{e.stopPropagation();if(activeChat?.user)window.openOtherProfile(activeChat.user)});
    q('chatTitle')?.addEventListener('click',e=>{e.stopPropagation();if(activeChat?.user)window.openOtherProfile(activeChat.user)});
    q('chatStatus')?.addEventListener('click',e=>{e.stopPropagation();if(activeChat?.user)window.openOtherProfile(activeChat.user)});
  }
  bindProfile();

  // Chat menu: add a real block/unblock entry.
  function ensureBlockMenu(){
    const sheet=q('chatMenuModal')?.querySelector('.action-sheet'); if(!sheet)return;
    let b=q('menuBlockBtn');
    if(!b){b=document.createElement('button');b.id='menuBlockBtn';sheet.insertBefore(b,q('menuCancelBtn'));}
    b.textContent='🚫 حظر/إلغاء حظر الشخص';
    b.onclick=async()=>{if(!activeChat?.user)return;const p=await getContactPrefs(activeChat.user.id);const next=!p.blocked;const r=await saveContactPrefs(activeChat.user.id,{blocked:next});if(r.error)return toast('تعذر حفظ الحظر');toast(next?'تم حظر الشخص':'تم إلغاء حظر الشخص');closeChatMenu();};
  }
  ensureBlockMenu();

  // Plus/attachment sheet: make every control work even after re-rendering.
  q('attachContactBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAttachmentSheet()});
  q('attachCancelBtn')?.addEventListener('click',closeAttachmentSheet);
  q('attachPhotoVideoBtn')?.addEventListener('click',()=>pickChatFile('media'));
  q('attachAudioBtn')?.addEventListener('click',()=>pickChatFile('audio'));
  q('attachCameraBtn')?.addEventListener('click',()=>pickChatFile('camera'));
  q('chatMediaInput')?.addEventListener('change',handleChatFile);
  q('chatAudioInput')?.addEventListener('change',handleChatFile);
  q('chatCameraInput')?.addEventListener('change',handleChatFile);

  // Emoji/GIF/sticker tabs were missing click handlers in V14.
  document.querySelectorAll('.emoji-tab').forEach(b=>b.onclick=e=>{e.preventDefault();window.showEmojiTab(b.dataset.tab)});
  q('emojiBtn')?.addEventListener('click',()=>{setTimeout(()=>document.querySelectorAll('.emoji-tab').forEach(b=>b.onclick=()=>window.showEmojiTab(b.dataset.tab)),0)});

  // Story: one caption bar for media, many text colors and font choices.
  function addStoryTools(){
    const composer=q('storyComposer'); if(!composer||composer.querySelector('.v15-story-fonts'))return;
    const colors=['#0a1820','#063f42','#14356d','#4b174d','#6a3210','#8b1637','#8a2be2','#ff2f92','#ff6b00','#00a884','#0b5ed7','#f2c94c','#111827','#ffffff','#000000'];
    const fonts=[['system','عادي'],['serif','كلاسيك'],['cursive','يدوي'],['monospace','آلة كاتبة'],['fantasy','زخرفي']];
    const tools=document.createElement('div');tools.className='v15-story-tools';
    tools.innerHTML=`<div class="v15-story-fonts"><b>الخط</b>${fonts.map(([k,n])=>`<button type="button" data-font="${k}">${n}</button>`).join('')}</div><div class="v15-story-colors"><b>لون الخلفية</b>${colors.map(c=>`<button type="button" class="v15-color" data-story-color="${c}" style="background:${c}"></button>`).join('')}</div>`;
    const bottom=composer.querySelector('.story-bottom-tools');bottom?.before(tools);
    tools.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{q('storyText').style.fontFamily=b.dataset.font==='system'?'Arial':b.dataset.font==='serif'?'Georgia':b.dataset.font==='cursive'?'cursive':b.dataset.font==='monospace'?'monospace':'fantasy';q('storyText').dataset.font=b.dataset.font;q('storyText').focus()});
    tools.querySelectorAll('[data-story-color]').forEach(b=>b.onclick=()=>{q('storyCanvas').style.background=b.dataset.storyColor;q('storyText').style.color=b.dataset.storyColor==='#ffffff'?'#111':'#fff'});
  }
  addStoryTools();
  const oldOpenStory=window.openStoryComposer;
  window.openStoryComposer=function(){
    oldOpenStory?.(); addStoryTools();
    q('storyText').placeholder='اكتب حاجة...'; q('storyCaption').placeholder='اكتب حاجة على الصورة أو الفيديو...';
  };
  const oldHandleStory=window.handleStoryFile;
  window.handleStoryFile=function(e){oldHandleStory?.(e);q('storyText').classList.add('hidden');q('storyCaptionWrap').classList.remove('hidden');q('storyCaption').placeholder='اكتب حاجة على الصورة أو الفيديو...';};
  const oldStoryText=window.storyTextMode;
  window.storyTextMode=function(){oldStoryText?.();q('storyText').classList.remove('hidden');q('storyCaptionWrap').classList.add('hidden');q('storyText').placeholder='اكتب حاجة...';};

  // Story privacy fallback: if the optional audience columns are absent, publish the basic story instead of failing.
  window.publishStory=async function(){
    const text=(q('storyText')?.value||'').trim(); const caption=(q('storyCaption')?.value||'').trim(); const file=storyFile;
    if(!text&&!file)return toast('اكتب حاجة أو اختار صورة/فيديو/صوت');
    let media_path=null,media_type='text';
    if(file){
      media_type=storyType(file);
      const path=`${me.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const up=await sb.storage.from('stories').upload(path,file,{upsert:false});
      if(up.error)return toast('تعذر رفع ملف الستوري: '+up.error.message);
      media_path=path;
    }
    let payload={user_id:me.id,content:file?caption:text,media_path,media_type,expires_at:new Date(Date.now()+86400000).toISOString(),visibility:storyPrivacyMode==='contacts_except'?'contacts':storyPrivacyMode,excluded_user_ids:storyPrivacyMode==='contacts_except'?storyExcludedIds:[],selected_user_ids:storyPrivacyMode==='selected'?storySelectedIds:[]};
    let r=await sb.from('stories').insert(payload);
    if(r.error && /column|schema|does not exist|unknown/i.test(r.error.message||'')){
      payload={user_id:me.id,content:file?caption:text,media_path,media_type,expires_at:new Date(Date.now()+86400000).toISOString()};
      r=await sb.from('stories').insert(payload);
    }
    if(r.error){if(media_path)await sb.storage.from('stories').remove([media_path]);return toast('تعذر نشر الستوري: '+r.error.message);}
    closeStoryComposer();toast('تم نشر الستوري');await loadStories();
  };
  // Better wallpaper URLs so GitHub Pages always resolves the bundled images.
  const oldApply=window.applyChatWallpaper;
  window.applyChatWallpaper=function(){
    oldApply?.();
    const box=q('messagesBox'),v=localStorage.getItem('combo_wallpaper')||'0'; if(!box)return;
    const map={img01:'assets/wallpapers_custom/wall_01.jpg',img02:'assets/wallpapers_custom/wall_02.jpg',img03:'assets/wallpapers_custom/wall_03.jpg',img04:'assets/wallpapers_custom/wall_04.jpg',img05:'assets/wallpapers_custom/wall_05.jpg',img06:'assets/wallpapers_custom/wall_06.jpg',img07:'assets/wallpapers_custom/wall_07.jpg',img08:'assets/wallpapers_custom/wall_08.jpg',img09:'assets/wallpapers_custom/wall_09.jpg',img10:'assets/wallpapers_custom/wall_10.jpg'};
    if(map[v]){box.className=box.className.replace(/\bwall-\S+/g,'');box.style.backgroundImage=`linear-gradient(#03101666,#03101666),url("${new URL(map[v],document.baseURI).href}")`;box.style.backgroundSize='cover';box.style.backgroundPosition='center';box.style.backgroundRepeat='no-repeat';}
  };

  // Ensure imported sticker file picker is available and GIF/sticker panels open.
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.emoji-tab');if(tab){e.preventDefault();window.showEmojiTab(tab.dataset.tab);return;}
    const person=e.target.closest('#chatPerson,#chatTitle,#chatAvatar,#chatStatus');if(person&&activeChat?.user){e.preventDefault();e.stopPropagation();window.openOtherProfile(activeChat.user)}
  },true);

  // Re-bind after navigation and after opening a chat.
  const oldOpenChat=window.openChat;
  if(typeof oldOpenChat==='function')window.openChat=async function(c){const r=await oldOpenChat(c);setTimeout(()=>{bindProfile();ensureBlockMenu();},40);return r};
  setInterval(()=>{if(me&&!document.hidden)refreshMe()},60000);
  refreshMe();
})();


// V16 bottom compose button: kept below the chat content, beside the bottom navigation.
(function addBottomCompose(){
  function ensure(){
    if($('bottomComposeBtn'))return;
    const nav=document.querySelector('.bottom-nav'); if(!nav)return;
    const b=document.createElement('button');b.id='bottomComposeBtn';b.className='bottom-compose-btn';b.type='button';b.setAttribute('aria-label','إنشاء محادثة جديدة');b.innerHTML='<span>💬</span><b>＋</b>';
    b.onclick=()=>openBottomComposeMenu(); document.body.appendChild(b);
    const m=document.createElement('div');m.id='bottomComposeModal';m.className='modal hidden';m.innerHTML=`<div class="modal-panel sheet compose-menu-v16"><header class="sheet-head"><div><h3>إنشاء جديد</h3><small class="muted">اختار اللي عايز تعمله</small></div><button id="closeBottomCompose" class="icon-btn">✕</button></header><div class="compose-grid-v16"><button id="v16AddNumber"><span>👤＋</span><strong>أضف رقم</strong><small>إضافة جهة اتصال</small></button><button id="v16NewGroup"><span>👥＋</span><strong>إنشاء جروب</strong><small>جروب جديد</small></button><button id="v16NewChannel"><span>📢＋</span><strong>إنشاء قناة</strong><small>قناة جديدة</small></button><button id="v16OpenContacts"><span>📱</span><strong>جهات الاتصال</strong><small>عرض جهاتك</small></button></div><div id="v16CommunityForm" class="v16-community-form hidden"><input id="v16CommunityName" placeholder="اسم الجروب أو القناة"><textarea id="v16CommunityBio" placeholder="وصف اختياري"></textarea><button id="v16CommunityCreate" class="primary">إنشاء</button></div></div>`;document.body.appendChild(m);
    $('closeBottomCompose').onclick=()=>m.classList.add('hidden');m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')});
    $('v16AddNumber').onclick=()=>{m.classList.add('hidden');openContacts();setTimeout(()=>{$('manualContactForm')?.classList.remove('hidden'),$('manualContactName')?.focus()},100)};
    $('v16OpenContacts').onclick=()=>{m.classList.add('hidden');openContacts()};
    $('v16NewGroup').onclick=()=>showCommunityForm('جروب');
    $('v16NewChannel').onclick=()=>showCommunityForm('قناة');
    $('v16CommunityCreate').onclick=()=>createCommunityV16();
  }
  window.openBottomComposeMenu=function(){ensure();$('bottomComposeModal')?.classList.remove('hidden')};
  window.showCommunityForm=function(kind){ensure();const m=$('bottomComposeModal');m.classList.remove('hidden');$('v16CommunityForm').classList.remove('hidden');$('v16CommunityName').placeholder=`اسم ${kind}`;$('v16CommunityName').dataset.kind=kind;$('v16CommunityName').focus()};
  window.createCommunityV16=async function(){
    const n=($('v16CommunityName')?.value||'').trim();
    const kindLabel=$('v16CommunityName')?.dataset.kind||'جروب';
    const kind=kindLabel==='قناة'?'channel':'group';
    if(!n)return toast(`اكتب اسم ${kindLabel}`);
    if(!me?.id)return toast('سجّل الدخول الأول');
    const bio=($('v16CommunityBio')?.value||'').trim();
    const btn=$('v16CommunityCreate'); if(btn){btn.disabled=true;btn.textContent='جاري الحفظ...'}
    try{
      const r=await withTimeout(sb.from('communities').insert({kind,name:n,description:bio||null,owner_id:me.id}).select('*').single());
      if(r.error)throw r.error;
      const community=r.data;
      const mr=await withTimeout(sb.from('community_members').insert({community_id:community.id,user_id:me.id,role:'owner'}));
      if(mr.error)throw mr.error;
      // Keep a tiny local cache only for instant display; Supabase is the source of truth.
      let arr=[];try{arr=JSON.parse(localStorage.getItem('combo_communities')||'[]')}catch(_){}
      arr.unshift(community);localStorage.setItem('combo_communities',JSON.stringify(arr.slice(0,50)));
      $('bottomComposeModal').classList.add('hidden');$('v16CommunityForm').classList.add('hidden');$('v16CommunityName').value='';$('v16CommunityBio').value='';
      toast(`تم حفظ ${kindLabel} على السحابة بنجاح`);
    }catch(e){
      console.error(e);
      if(/relation.*communities.*does not exist|schema cache|Could not find the table/i.test(e?.message||'')) toast('لازم تشغّل COMBOAPP_COMMUNITIES_SETUP.sql مرة واحدة في Supabase');
      else toast('تعذر حفظ '+kindLabel+': '+(e?.message||'حصل خطأ'));
    }finally{if(btn){btn.disabled=false;btn.textContent='إنشاء'}}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
})();

// Guarantee auth links/buttons still work if a later UI patch throws during bind().
document.addEventListener('click',e=>{
  const id=e.target?.id;
  if(id==='showSignupBtn'){e.preventDefault();$('loginPanel')?.classList.add('hidden');$('signupPanel')?.classList.remove('hidden')}
  if(id==='showLoginBtn'){e.preventDefault();$('signupPanel')?.classList.add('hidden');$('loginPanel')?.classList.remove('hidden')}
  if(id==='loginBtn'){e.preventDefault();login()}
  if(id==='signupBtn'){e.preventDefault();signup()}
  if(id==='forgotBtn'){e.preventDefault();resetPassword()}
},true);

/* ===== ComboApp V21 CORE RESTORE: restore functions accidentally omitted in V20 ===== */


async function addActiveContact(){closeChatMenu();if(!activeChat)return;const list=readSavedContacts();const phone=activeChat.user.phone;if(!phone)return toast("الجهة دي مش مسجل لها رقم");if(!list.some(x=>x.phone===phone))list.push({name:activeChat.user.display_name,phone});saveContacts(list);toast("تمت إضافة جهة الاتصال")}


async function archiveChat(){closeChatMenu();if(!activeChat)return;await setChatSetting({archived:true});const id=activeChat.conversation.id;closeChat();await loadChats();toast("تم نقل المحادثة للأرشيف")}


function avatarActions(){const has=!!me.avatar_url;const a=prompt(has?"اكتب 1 لإضافة/تغيير الصورة أو 2 لحذفها":"اكتب 1 لإضافة صورة");if(a==="1")$("avatarFileInput").click();if(a==="2"&&has)removeAvatar()}


async function changePassword(){const p=prompt("اكتب كلمة السر الجديدة (6 أحرف على الأقل):");if(!p||p.length<6)return;const {error}=await sb.auth.updateUser({password:p});toast(error?error.message:"تم تغيير كلمة السر")}

async function checkAppLock(){if(localStorage.getItem("combo_app_lock"))$("lockScreen").classList.remove("hidden")}


function closeChat(){$("chatModal").classList.add("hidden");activeChat=null;$("emojiPanel").classList.add("hidden")}


function closeChatMenu(){$("chatMenuModal").classList.add("hidden")}

function closeContacts(){$("contactsModal").classList.add("hidden")}


function closeGlobalSettings(){$("globalSettingsModal").classList.add("hidden")}


function closePin(){$("pinModal").classList.add("hidden");$("pinInput").value="";pinMode=null;window._lockedSetting=null}

function closeSimple(){$("simpleModal").classList.add("hidden")}


function closeStoryComposer(){$("storyComposer").classList.add("hidden");if(storyObjectUrl)URL.revokeObjectURL(storyObjectUrl);storyObjectUrl=null;storyFile=null}


async function confirmPin(){const pin=$("pinInput").value.trim();if(!/^\d{4,8}$/.test(pin))return toast("الرمز من 4 إلى 8 أرقام");const h=await sha(pin);if(pinMode==="chat"){await setChatSetting({locked:true,pin_hash:h});toast("تم قفل المحادثة");closePin()}else if(pinMode==="unlockChat"){if(h!==window._lockedSetting.pin_hash)return toast("رمز القفل غير صحيح");const c=pendingLockedConversation;closePin();pendingLockedConversation=null;if(c){const otherId=c.user1_id===me.id?c.user2_id:c.user1_id;const {data:u}=await sb.from("profiles").select("*").eq("id",otherId).single();activeChat={conversation:c,user:u};$("chatTitle").textContent=u?.display_name||"محادثة";setChatAvatar(u);$("chatModal").classList.remove("hidden");await loadMessages();await markRead()}}else if(pinMode==="app"){setComboSetting("app_lock",h);toast("تم تفعيل قفل التطبيق");closePin();$("appLockState").textContent="مفعل"}}


async function deleteAccount(){if(!confirm("حذف الحساب نهائيًا؟ لا يمكن التراجع عن ذلك."))return;const {error}=await sb.rpc("delete_my_account");if(error)return toast("الحذف يحتاج تشغيل SQL الأخير في Supabase");await sb.auth.signOut();location.reload()}


function getFriendIds(){return sb.from("conversations").select("user1_id,user2_id").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).then(async({data:c})=>{const ids=new Set([me.id]);for(const x of c||[])ids.add(x.user1_id===me.id?x.user2_id:x.user1_id);for(const x of readSavedContacts()){const {data:p}=await sb.from("profiles").select("id").eq("phone",x.phone).maybeSingle();if(p)ids.add(p.id)}return[...ids]})}


async function getSettings(){const {data}=await sb.from("conversation_settings").select("conversation_id,archived,locked,deleted").eq("user_id",me.id);return Object.fromEntries((data||[]).map(x=>[x.conversation_id,x]))}


function inviteContact(phone){const text=encodeURIComponent("تعالى على ComboApp وتواصل معايا بحرية 👑💚 "+APP_BASE_URL);location.href=`sms:${phone}?body=${text}`}

 async function loadArchived(){return renderChats(true)}


async function loadChats(){return renderChats(false)}


async function loadCloudContacts(){if(!me?.id)return;const r=await sb.from("user_contacts").select("name,phone,created_at").eq("user_id",me.id).order("created_at",{ascending:false});if(!r.error){localStorage.setItem("combo_contacts",JSON.stringify(r.data||[]))}}


async function loadProfile(){$("profileName").value=me.display_name||"";$("profileUsername").value=me.username||"";$("profilePhone").value=me.phone||"";$("profileBio").value=me.bio||"";renderAvatar(me.avatar_url,me.display_name)}


async function loadSarhnyInbox(){const {data,error}=await sb.from("sarhny_messages").select("id,content,created_at").eq("recipient_id",me.id).order("created_at",{ascending:false});if(error){$("sarhnyInbox").innerHTML="<div class='muted'>تعذر تحميل الرسائل السرية.</div>";return}$("sarhnyInbox").innerHTML=(data||[]).map(x=>`<div class="sarhny-item"><div class="avatar">♡</div><div class="chat-info"><strong>رسالة سرية</strong><small>${esc(x.content)}</small></div><span class="time">${fmt(x.created_at)}</span></div>`).join("")||"<div class='empty-card'>لسه موصلكش رسائل سرية.</div>"}


async function lockChat(){closeChatMenu();if(!activeChat)return;pinMode="chat";$("pinTitle").textContent="قفل المحادثة";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}


async function markDelivered(){if(!activeChat)return;await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("delivered_at",null)}


async function markRead(){if(!activeChat)return;const now=new Date().toISOString();await sb.from("messages").update({delivered_at:now,read_at:now}).eq("conversation_id",activeChat.conversation.id).eq("receiver_id",me.id).is("read_at",null);await loadMessages()}


function normalizePhone(v=""){let n=String(v).replace(/[^0-9+]/g,"");if(n.startsWith("00"))n="+"+n.slice(2);if(n.startsWith("+20"))return"20"+n.slice(3);if(n.startsWith("20")&&n.length>=12)return n;if(n.startsWith("0"))return"20"+n.slice(1);return n.replace(/\D/g,"")}


function notificationsEnabled(){return setting("notifications","on")!=="off"}


async function notifyIncomingMessage(m){if(m.receiver_id!==me.id||m.sender_id===me.id)return;if(!notificationsEnabled())return;const bell=$("notifyBtn");if(bell){bell.classList.remove("bell-shake");void bell.offsetWidth;bell.classList.add("bell-shake");setTimeout(()=>bell.classList.remove("bell-shake"),700)}await sb.from("messages").update({delivered_at:new Date().toISOString()}).eq("id",m.id).eq("receiver_id",me.id);if(activeChat?.conversation?.id===m.conversation_id)return;const {data:u}=await sb.from("profiles").select("display_name").eq("id",m.sender_id).maybeSingle();toast(`💬 ${u?.display_name||"رسالة جديدة"}: ${m.content||"رسالة"}`);if("Notification"in window&&Notification.permission==="granted")try{new Notification(u?.display_name||"رسالة جديدة",{body:m.content||"رسالة جديدة",icon:"logo.png"})}catch(e){}}


async function openChatById(id){const {data}=await sb.from("conversations").select("*").eq("id",id).single();if(data)openChat(data)}

function openContacts(){$("contactsModal").classList.remove("hidden");renderContacts()}


function openGlobalSettings(){$("globalSettingsModal").classList.remove("hidden")}


function openSimple(title,body,ok="حفظ"){$("simpleTitle").textContent=title;$("simpleBody").innerHTML=body;$("simpleOk").textContent=ok;$("simpleCancel").classList.toggle("hidden",ok!=="حفظ");$("simpleOk").onclick=closeSimple;$("simpleCancel").onclick=closeSimple;$("simpleModal").classList.remove("hidden")}


async function openUser(userId){const {data,error}=await sb.from("conversations").select("*").or(`and(user1_id.eq.${me.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${me.id})`).limit(1).maybeSingle();if(error&&error.code!=="PGRST116")return toast("تعذر فتح المحادثة");let c=data;if(!c){const r=await sb.from("conversations").insert({user1_id:me.id,user2_id:userId}).select().single();if(r.error)return toast("تعذر إنشاء المحادثة");c=r.data}$("searchResults").classList.add("hidden");$("userSearch").value="";await openChat(c)}


function pickAudio(){const i=document.createElement("input");i.type="file";i.accept="audio/*";i.onchange=handleStoryFile;i.click()}


async function pickContacts(){if(!navigator.contacts?.select){$("manualContactForm").classList.remove("hidden");toast("المتصفح ده مش بيدعم اختيار جهات الاتصال مباشرة — أضف الرقم يدويًا") ;return}try{const raw=await navigator.contacts.select(["name","tel"],{multiple:true});const list=readSavedContacts();for(const c of raw){const phone=normalizePhone(c.tel?.[0]||"");if(phone&&!list.some(x=>x.phone===phone))list.push({name:c.name?.[0]||"جهة اتصال",phone})}saveContacts(list);renderContacts();toast("تم استيراد جهات الاتصال")}catch(e){if(e.name!=="AbortError")toast("لم نقدر نقرأ جهات الاتصال")}}


function readSavedContacts(){try{return JSON.parse(localStorage.getItem("combo_contacts")||"[]")}catch{return[]}}


async function removeAvatar(){const {error}=await sb.from("profiles").update({avatar_url:null}).eq("id",me.id);if(error)return toast("تعذر حذف الصورة");me.avatar_url=null;renderAvatar(null,me.display_name);toast("تم حذف الصورة")}


function renderAvatar(url,name){$("avatarActionBtn").innerHTML=url?`<img src="${esc(url)}">`:esc(initials(name))}


async function renderChats(archived){const target=archived?$("archivedList"):$(("chatList"));const {data,error}=await sb.from("conversations").select("*").or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`).order("updated_at",{ascending:false});if(error){target.innerHTML="<div class='empty-card'>تعذر تحميل المحادثات</div>";return}const settings=await getSettings();const rowsBase=(data||[]).filter(c=>!settings[c.id]?.deleted);if(!rowsBase.length){target.innerHTML="<div class='empty-card'><h3>💬 مفيش محادثات</h3><p class='muted'>اضغط ＋ وابدأ محادثة جديدة.</p></div>";return}const ids=[...new Set(rowsBase.map(c=>c.user1_id===me.id?c.user2_id:c.user1_id))];const {data:pr}=await sb.from("profiles").select("id,username,display_name,phone,avatar_url").in("id",ids);const map=Object.fromEntries((pr||[]).map(x=>[x.id,x]));const {data:msgs}=await sb.from("messages").select("conversation_id,content,created_at,sender_id,receiver_id,read_at,delivered_at").in("conversation_id",rowsBase.map(c=>c.id)).order("created_at",{ascending:false}).limit(2000);const latest={},unread={};for(const m of msgs||[]){if(!latest[m.conversation_id])latest[m.conversation_id]=m;if(m.receiver_id===me.id&&!m.read_at)unread[m.conversation_id]=(unread[m.conversation_id]||0)+1}const rows=rowsBase.filter(c=>Boolean(settings[c.id]?.archived)===archived);target.innerHTML=rows.map(c=>{const u=map[c.user1_id===me.id?c.user2_id:c.user1_id]||{},last=latest[c.id],n=unread[c.id]||0;const preview=last?`${last.sender_id===me.id?"أنت: ":""}${esc(last.content||"رسالة")}`:"ابدأ المحادثة";return `<div class="chat-item selectable" data-cid="${c.id}"><div class="avatar">${u.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${esc(u.display_name||u.username||"مستخدم")}</strong><small>${preview}</small></div><div class="chat-meta">${settings[c.id]?.locked?"🔒":""}<span class="time">${last?fmt(last.created_at):fmt(c.updated_at||c.created_at)}</span>${n?`<span class="badge">${n>99?"99+":n}</span>`:""}</div></div>`}).join("")||"<div class='empty-card'>مفيش محادثات هنا.</div>";target.querySelectorAll(".chat-item").forEach(el=>{let timer;el.onclick=()=>openChatById(el.dataset.cid);el.oncontextmenu=e=>{e.preventDefault();openChatById(el.dataset.cid).then(()=>archiveChat())};el.ontouchstart=()=>{timer=setTimeout(()=>{openChatById(el.dataset.cid).then(()=>$("chatMenuModal").classList.remove("hidden"))},650)};el.ontouchend=()=>clearTimeout(timer)});updateChatBadge(Object.values(unread).reduce((a,b)=>a+b,0))}


async function renderContacts(){const q=$("contactSearch").value.trim().toLowerCase();let list=readSavedContacts().filter(x=>!q||x.name.toLowerCase().includes(q)||x.phone.includes(q));const nums=list.map(x=>x.phone).filter(Boolean);let profiles=[];if(nums.length){const {data}=await sb.from("profiles").select("id,display_name,username,phone,avatar_url").in("phone",nums);profiles=data||[]}const byPhone=Object.fromEntries(profiles.map(p=>[p.phone,p]));$("contactsList").innerHTML=list.map(c=>{const p=byPhone[c.phone];return `<div class="contact-row"><div class="avatar">${p?.avatar_url?`<img src="${esc(p.avatar_url)}">`:initials(c.name)}</div><div class="chat-info"><strong>${esc(c.name)}</strong><small>${p?`@${esc(p.username)}`:esc(c.phone)}</small></div>${p?`<button class="contact-action primary-inline" data-chat="${p.id}">دردشة</button>`:`<button class="contact-action invite-btn" data-invite="${esc(c.phone)}">ادعُ للبرنامج</button>`}</div>`}).join("")||"<div class='empty-card'>أضف جهة اتصال من الزر فوق.</div>";$("contactsList").querySelectorAll("[data-chat]").forEach(b=>b.onclick=()=>{closeContacts();openUser(b.dataset.chat)});$("contactsList").querySelectorAll("[data-invite]").forEach(b=>b.onclick=()=>inviteContact(b.dataset.invite))}


async function reportChat(){closeChatMenu();if(!activeChat)return;const reason=prompt("اكتب سبب الإبلاغ (اختياري)")||"بلاغ من المستخدم";const r=await sb.from("reports").insert({reporter_id:me.id,reported_user_id:activeChat.user.id,reason});if(r.error)toast("تعذر إرسال البلاغ");else toast("تم إرسال البلاغ")}


async function requestNotifications(){setComboSetting("notifications","on");if(!("Notification"in window))return;if(Notification.permission==="default")try{await Notification.requestPermission()}catch(e){}updateNotificationBell()}


async function saveContacts(l){localStorage.setItem("combo_contacts",JSON.stringify(l));if(!me?.id)return;const d=await sb.from("user_contacts").delete().eq("user_id",me.id);if(d.error)console.warn(d.error);if(l.length){const r=await sb.from("user_contacts").insert(l.map(x=>({user_id:me.id,name:x.name,phone:x.phone})));if(r.error)console.warn(r.error)}}


function saveManualContact(){const name=$("manualContactName").value.trim()||"جهة اتصال",phone=normalizePhone($("manualContactPhone").value);if(phone.length<10)return toast("اكتب رقم موبايل صحيح");const list=readSavedContacts();if(!list.some(x=>x.phone===phone))list.push({name,phone});saveContacts(list);$("manualContactName").value="";$("manualContactPhone").value="";renderContacts();toast("تمت إضافة جهة الاتصال")}


async function sendSarhny(){const username=$("sarhnyUsername").value.trim(),content=$("sarhnyContent").value.trim();if(!username||!content)return toast("اكتب اسم المستخدم والرسالة");const {error}=await sb.rpc("send_sarhny_message",{p_username:username,p_content:content});if(error)return toast(error.message);$("sarhnyContent").value="";$("sarhnyCount").textContent="0";toast("تم إرسال رسالتك بشكل سري")}


function setChatAvatar(u){$("chatAvatar").innerHTML=u?.avatar_url?`<img src="${esc(u.avatar_url)}">`:esc(initials(u?.display_name))}

function setupAppLock(){pinMode="app";$("pinTitle").textContent="قفل التطبيق";$("pinConfirmBtn").textContent="تأكيد";$("pinModal").classList.remove("hidden")}


function storyTextMode(){$("storyCanvas").classList.add("text-mode");$("storyCanvas").classList.remove("media-mode");$("storyText").focus()}


function storyType(f){if(!f)return"text";if(f.type.startsWith("image/"))return"image";if(f.type.startsWith("video/"))return"video";if(f.type.startsWith("audio/"))return"audio";return null}


function subscribeMessages(){if(messageChannel)sb.removeChannel(messageChannel);messageChannel=sb.channel("messages-"+me.id).on("postgres_changes",{event:"*",schema:"public",table:"messages"},p=>{if(p.eventType==="INSERT"&&p.new?.receiver_id===me.id)notifyIncomingMessage(p.new);if(activeChat&&p.new?.conversation_id===activeChat.conversation.id){loadMessages();if(p.new.receiver_id===me.id)markRead()}loadChats()}).subscribe()}

function toggleCamera(){if(!localStream)return;const t=localStream.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$("cameraBtn").textContent=t.enabled?"📷":"🚫"}}


async function toggleGlobalNotifications(){const next=!notificationsEnabled();setComboSetting("notifications",next?"on":"off");updateNotificationBell();if(next){await requestNotifications();toast("تم تشغيل إشعارات البرنامج")}else toast("تم إيقاف إشعارات البرنامج")}


function toggleMute(){if(!localStream)return;const t=localStream.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$("muteBtn").textContent=t.enabled?"🎙️":"🔇"}}

async function unlockApp(){const h=await sha($("unlockInput").value);if(h===localStorage.getItem("combo_app_lock")){$("lockScreen").classList.add("hidden");$("unlockInput").value=""}else toast("رمز القفل غير صحيح")}


function updateChatBadge(n){const nav=document.querySelector('.bottom-nav .nav[data-page="homePage"]');if(!nav)return;let b=nav.querySelector('.nav-badge');if(!b){b=document.createElement('span');b.className='nav-badge';nav.appendChild(b)}b.textContent=n>99?'99+':String(n);b.classList.toggle('hidden',!n)}


function updateNotificationBell(){const b=$("notifyBtn");if(!b)return;b.textContent=notificationsEnabled()?"🔔":"🔕";b.classList.toggle("bell-off",!notificationsEnabled());b.title=notificationsEnabled()?"إيقاف إشعارات البرنامج":"تشغيل إشعارات البرنامج"}


async function uploadAvatar(e){const f=e.target.files?.[0];if(!f)return;const path=`${me.id}/avatar-${Date.now()}.${(f.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"")}`;const up=await sb.storage.from("avatars").upload(path,f,{upsert:true});if(up.error)return toast("تعذر رفع الصورة. شغّل SQL الخاص بالصور");const pub=sb.storage.from("avatars").getPublicUrl(path);const {error}=await sb.from("profiles").update({avatar_url:pub.data.publicUrl}).eq("id",me.id);if(error)return toast("تعذر حفظ الصورة");me.avatar_url=pub.data.publicUrl;renderAvatar(me.avatar_url,me.display_name);toast("تم تحديث صورة البروفايل")}



function userOnlineText(lastSeen){
  if(!lastSeen) return 'آخر ظهور غير متاح';
  const ms=Date.now()-new Date(lastSeen).getTime();
  if(ms<120000) return 'متصل';
  const d=new Date(lastSeen);
  return 'آخر ظهور منذ '+d.toLocaleString('ar-EG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}

/* ===== ComboApp V22 FINAL UI / PROFILE / WALLPAPER PATCH ===== */
(function ComboV22(){
  function ensureProfileViewer(){
    let m=$('profileViewerV22');
    if(m)return m;
    m=document.createElement('div');
    m.id='profileViewerV22';
    m.className='profile-viewer-v22 hidden';
    m.innerHTML=`
      <div class="profile-viewer-backdrop"></div>
      <div class="profile-viewer-stage">
        <button type="button" id="profileViewerCloseV22" class="profile-viewer-close">✕</button>
        <div id="profileViewerMediaV22" class="profile-viewer-media"></div>
        <div id="profileViewerInfoV22" class="profile-viewer-info"></div>
        <div class="profile-viewer-actions-v22">
          <button type="button" id="profileDeleteV22">🗑️<span>حذف</span></button>
          <button type="button" id="profileAddV22">＋<span>إضافة</span></button>
          <button type="button" id="profileChangeV22">🖼️<span>تغيير الصورة</span></button>
        </div>
        <div id="profileViewerThumbsV22" class="profile-viewer-thumbs"></div>
      </div>`;
    document.body.appendChild(m);
    $('profileViewerCloseV22').onclick=()=>m.classList.add('hidden');
    m.querySelector('.profile-viewer-backdrop').onclick=()=>m.classList.add('hidden');
    return m;
  }

  let viewerItems=[];
  let viewerIndex=0;
  async function profileMediaRows(){
    const rows=[];
    if(me?.avatar_url)rows.push({kind:'image',url:me.avatar_url,main:true,label:'الصورة الرئيسية'});
    try{
      const q=await sb.from('profile_media').select('*').eq('user_id',me.id).order('created_at',{ascending:false});
      if(!q.error){
        for(const x of (q.data||[])){
          const url=sb.storage.from('avatars').getPublicUrl(x.media_path).data.publicUrl;
          rows.push({kind:x.media_type==='video'?'video':'image',url,media_path:x.media_path,id:x.id,label:x.media_type==='video'?'فيديو':'صورة'});
        }
      }
    }catch(_){ }
    // Keep the old local fallback if the cloud table is unavailable.
    if(rows.length<=1){
      try{
        const local=JSON.parse(localStorage.getItem(`combo_profile_media_${me?.id||'user'}`)||'[]');
        for(const x of local){if(x?.url)rows.push({kind:x.media_type==='video'?'video':'image',url:x.url,media_path:x.media_path,label:x.media_type==='video'?'فيديو':'صورة'})}
      }catch(_){ }
    }
    return rows;
  }
  function renderViewerItem(){
    const box=$('profileViewerMediaV22'); if(!box)return;
    const x=viewerItems[viewerIndex];
    if(!x){box.innerHTML='<div class="profile-viewer-empty">مفيش صورة لسه</div>';return}
    box.innerHTML=x.kind==='video'
      ? `<video src="${esc(x.url)}" controls autoplay playsinline></video>`
      : `<img src="${esc(x.url)}" alt="صورة الملف الشخصي">`;
    $('profileViewerInfoV22').textContent=`${viewerIndex+1} / ${viewerItems.length} · ${x.label||'صورة'}`;
    const thumbs=$('profileViewerThumbsV22');
    thumbs.innerHTML=viewerItems.map((it,i)=>`<button type="button" class="profile-thumb-v22 ${i===viewerIndex?'active':''}" data-pv-index="${i}">${it.kind==='video'?`<video src="${esc(it.url)}" muted playsinline></video>`:`<img src="${esc(it.url)}" alt="">`}</button>`).join('');
    thumbs.querySelectorAll('[data-pv-index]').forEach(b=>b.onclick=()=>{viewerIndex=Number(b.dataset.pvIndex);renderViewerItem()});
  }
  async function openProfileViewer(){
    const m=ensureProfileViewer();
    viewerItems=await profileMediaRows();
    viewerIndex=0;
    renderViewerItem();
    m.classList.remove('hidden');
  }
  async function refreshViewer(){
    if($('profileViewerV22')?.classList.contains('hidden'))return;
    viewerItems=await profileMediaRows();
    if(viewerIndex>=viewerItems.length)viewerIndex=Math.max(0,viewerItems.length-1);
    renderViewerItem();
  }
  async function deleteMain(){
    if(!me?.avatar_url)return toast('مفيش صورة رئيسية للحذف');
    const r=await sb.from('profiles').update({avatar_url:null}).eq('id',me.id);
    if(r.error)return toast('تعذر حذف الصورة الرئيسية');
    me.avatar_url=null;renderAvatar(null,me.display_name);toast('تم حذف الصورة الرئيسية');await refreshViewer();
  }
  async function changeMain(e){
    const f=e.target.files?.[0];e.target.value='';if(!f)return;
    if(!f.type.startsWith('image/'))return toast('الصورة الرئيسية لازم تكون صورة');
    const ext=(f.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'')||'jpg';
    const path=`${me.id}/avatar-${Date.now()}.${ext}`;
    const up=await sb.storage.from('avatars').upload(path,f,{upsert:false,contentType:f.type});
    if(up.error)return toast('تعذر رفع الصورة الرئيسية: '+up.error.message);
    const url=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const r=await sb.from('profiles').update({avatar_url:url}).eq('id',me.id);
    if(r.error)return toast('تعذر حفظ الصورة الرئيسية');
    me.avatar_url=url;renderAvatar(url,me.display_name);toast('تم تغيير الصورة الرئيسية');await refreshViewer();
  }
  const viewer=ensureProfileViewer();
  $('profileDeleteV22').onclick=deleteMain;
  $('profileAddV22').onclick=()=>$('profileMediaInput')?.click();
  $('profileChangeV22').onclick=()=>$('avatarFileInput')?.click();
  // Capture the avatar tap before older V5/profile handlers so there is exactly one action: fullscreen viewer.
  $('avatarActionBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openProfileViewer()},true);
  $('profileMediaInput')?.addEventListener('change',()=>setTimeout(refreshViewer,500));

  // Make wallpaper picker reliable and visible even if an older wrapper is still present.
  const oldShowWallpaper=window.showWallpaper;
  window.showWallpaper=function(){
    if(typeof openSimple!=='function')return oldShowWallpaper?.();
    const built=[
      ['0','افتراضي',''],['1','نقاط نيون',''],['2','أخضر زجاجي',''],['3','أزرق ليلي',''],['4','أسود سادة',''],['5','وردي ناعم',''],['6','فوشيا',''],['7','أحمر غامق',''],['8','بنفسجي',''],['9','ذهبي',''],['10','سماوي',''],['11','قلب ونقاط',''],
      ['img01','غروب وجسر','assets/wallpapers_custom/wall_01.jpg'],['img02','أسد وغزال','assets/wallpapers_custom/wall_02.jpg'],['img03','ورد وهدية','assets/wallpapers_custom/wall_03.jpg'],['img04','Porsche','assets/wallpapers_custom/wall_04.jpg'],['img05','برج إيفل','assets/wallpapers_custom/wall_05.jpg'],['img06','سماء درامية','assets/wallpapers_custom/wall_06.jpg'],['img07','قمر وشجرة','assets/wallpapers_custom/wall_07.jpg'],['img08','آيات وأذكار','assets/wallpapers_custom/wall_08.jpg'],['img09','قط كيوت','assets/wallpapers_custom/wall_09.jpg'],['img10','One Piece','assets/wallpapers_custom/wall_10.jpg']
    ];
    const colorMap={'0':'#07171e','1':'radial-gradient(#00e6b044 1px,transparent 1px)','2':'linear-gradient(135deg,#062a27,#03161b)','3':'linear-gradient(135deg,#071b38,#031016)','4':'#000','5':'linear-gradient(135deg,#4d1e3b,#17101c)','6':'linear-gradient(135deg,#8a195f,#291028)','7':'linear-gradient(135deg,#5d101d,#17070b)','8':'linear-gradient(135deg,#40205d,#100a19)','9':'linear-gradient(135deg,#624b16,#171108)','10':'linear-gradient(135deg,#0b4d64,#06131b)','11':'radial-gradient(#ff4d7d33 2px,transparent 2px),radial-gradient(#00e6b033 2px,transparent 2px)'}; const cards=built.map(w=>`<button type="button" class="v22-wall-card" data-v22-wall="${w[0]}">${w[2]?`<img src="${new URL(w[2],document.baseURI).href}" alt="" loading="lazy">`:`<span class="v22-wall-swatch" style="background:${colorMap[w[0]]||'#10262c'};${w[0]==='1'||w[0]==='11'?'background-size:14px 14px;':''}"></span>`}<b>${esc(w[1])}</b></button>`).join('');
    openSimple('خلفيات الدردشة',`<div class="v22-wall-tools"><button type="button" id="v22WallGallery" class="choice-btn">🖼️ اختار صورة من المعرض</button><button type="button" id="v22WallRemove" class="choice-btn">🧹 إزالة صورة الخلفية</button></div><div class="v22-wall-grid">${cards}</div><input id="v22WallInput" type="file" accept="image/*" hidden>`,'إغلاق');
    setTimeout(()=>{
      document.querySelectorAll('[data-v22-wall]').forEach(b=>b.onclick=()=>{localStorage.setItem('combo_wallpaper',b.dataset.v22Wall);localStorage.removeItem('combo_custom_wallpaper');applyChatWallpaper();closeSimple();toast('تم اختيار خلفية الدردشة')});
      $('v22WallGallery').onclick=()=>$('v22WallInput').click();
      $('v22WallRemove').onclick=()=>{localStorage.removeItem('combo_custom_wallpaper');localStorage.setItem('combo_wallpaper','0');applyChatWallpaper();closeSimple();toast('تمت إزالة الخلفية')};
      $('v22WallInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});localStorage.setItem('combo_custom_wallpaper',data);localStorage.setItem('combo_wallpaper','custom');applyChatWallpaper();closeSimple();toast('تم وضع صورتك كخلفية للدردشة')}catch(_){toast('تعذر استخدام الصورة')}};
    },30);
  };

  // Apply wallpaper directly to the message area. This works for built-in, supplied and gallery images.
  const oldApply=window.applyChatWallpaper;
  window.applyChatWallpaper=function(){
    const box=$('messagesBox'); if(!box)return oldApply?.();
    const v=localStorage.getItem('combo_wallpaper')||'0';
    box.style.backgroundImage='';box.style.backgroundSize='cover';box.style.backgroundPosition='center';box.style.backgroundAttachment='scroll';
    if(v==='custom'&&localStorage.getItem('combo_custom_wallpaper'))box.style.backgroundImage=`linear-gradient(#03101666,#03101666),url("${localStorage.getItem('combo_custom_wallpaper')}")`;
    else if(v.startsWith('img')){
      const map={img01:'wall_01.jpg',img02:'wall_02.jpg',img03:'wall_03.jpg',img04:'wall_04.jpg',img05:'wall_05.jpg',img06:'wall_06.jpg',img07:'wall_07.jpg',img08:'wall_08.jpg',img09:'wall_09.jpg',img10:'wall_10.jpg'};
      const file=map[v];if(file)box.style.backgroundImage=`linear-gradient(#03101666,#03101666),url("${new URL('assets/wallpapers_custom/'+file,document.baseURI).href}")`;
    }else{
      const p=['','wall-dots','wall-green','wall-blue','wall-black','wall-pink','wall-magenta','wall-red','wall-purple','wall-gold','wall-cyan','wall-hearts'][v]||'';
      box.className='messages '+p;
    }
  };

  // Ensure all chat controls remain wired after dynamic UI patches.
  function wireV22(){
    const bindClick=(id,fn)=>{const el=$(id);if(el){el.onclick=fn}};
    bindClick('notifyBtn',toggleGlobalNotifications);bindClick('settingsTopBtn',openGlobalSettings);bindClick('newChatBtn',openContacts);
    bindClick('sendMessageBtn',sendMessage);bindClick('emojiBtn',toggleEmoji);bindClick('attachContactBtn',openAttachmentSheet);bindClick('closeChatBtn',closeChat);
    bindClick('chatMenuBtn',()=>{$('chatMenuModal')?.classList.remove('hidden')});bindClick('menuCancelBtn',closeChatMenu);bindClick('menuArchiveBtn',archiveChat);bindClick('menuLockBtn',lockChat);bindClick('menuDeleteBtn',deleteChat);bindClick('menuReportBtn',reportChat);bindClick('menuAddContactBtn',addActiveContact);
    bindClick('attachCancelBtn',closeAttachmentSheet);bindClick('attachPhotoVideoBtn',()=>pickChatFile('media'));bindClick('attachAudioBtn',()=>pickChatFile('audio'));bindClick('attachCameraBtn',()=>pickChatFile('camera'));
    const mi=$('messageInput');if(mi)mi.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}};
    const search=$('userSearch');if(search)search.oninput=searchUsers;
    bindClick('backHomeBtn',()=>go('homePage'));
    bindClick('closeOtherProfileBtn',closeOtherProfile);
  }
})();

// Startup is deliberately last: V22 is loaded before the app binds and opens the session.
init();


/* ===== ComboApp V24 FINAL LIGHT FIXES ===== */
(function V24(){
  const q=id=>document.getElementById(id);
  const safe=s=>esc(s||'');
  let communityCache=[];

  // Exact username search: remove the old listener that queried optional columns and could return "تعذر البحث".
  function fixExactSearch(){
    const old=q('userSearch'); if(!old)return;
    const fresh=old.cloneNode(true); old.replaceWith(fresh);
    fresh.addEventListener('input',async()=>{
      const box=q('searchResults');
      const term=(fresh.value||'').trim().replace(/^@/,'').toLowerCase();
      if(!term){box?.classList.add('hidden');return;}
      box?.classList.remove('hidden');
      if(!/^[a-z0-9_.]{3,24}$/.test(term)){
        if(box)box.innerHTML="<div class='muted' style='padding:12px'>اكتب اليوزر كاملًا.</div>";return;
      }
      const r=await sb.from('profiles').select('id,username,display_name,avatar_url,phone,bio,last_seen').eq('username',term).neq('id',me?.id||'').maybeSingle();
      if(r.error){console.warn('username search',r.error);if(box)box.innerHTML="<div class='muted' style='padding:12px'>تعذر البحث حاليًا — تأكد من اتصال الإنترنت.</div>";return;}
      if(!r.data){if(box)box.innerHTML="<div class='muted' style='padding:12px'>مفيش حساب باليوزر ده.</div>";return;}
      const u=r.data;
      if(box)box.innerHTML=`<div class="result-item" data-id="${safe(u.id)}"><div class="avatar">${u.avatar_url?`<img src="${safe(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${safe(u.display_name||'مستخدم')}</strong><small>@${safe(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`;
      box?.querySelector('.result-item')?.addEventListener('click',()=>openUser(u.id));
    });
  }

  function ensureCommunityHome(){
    const home=q('homePage'); if(!home||q('communityHomePanel'))return;
    const panel=document.createElement('div');panel.id='communityHomePanel';panel.className='community-home-panel';
    panel.innerHTML=`<div class="community-home-head"><strong>👥 جروبات وقنوات</strong><button id="communityRefreshBtn" type="button">↻ تحديث</button></div><div id="communityList" class="community-list"><div class="community-empty">لسه مفيش جروبات أو قنوات.</div></div>`;
    const chatList=q('chatList');home.insertBefore(panel,chatList||null);
    q('communityRefreshBtn').onclick=loadCommunities;
  }

  async function loadCommunities(){
    ensureCommunityHome();
    const list=q('communityList');if(!list||!me?.id)return;
    const r=await sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,invite_code,created_at').order('updated_at',{ascending:false});
    if(r.error){
      console.warn('communities list',r.error);
      // Older DBs may not have invite_code until V24 SQL is run; still show existing communities.
      const fallback=await sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,created_at').order('updated_at',{ascending:false});
      if(fallback.error){list.innerHTML='<div class="community-empty">تعذر تحميل الجروبات والقنوات.</div>';return;}
      communityCache=(fallback.data||[]).map(x=>({...x,invite_code:null}));
    }else communityCache=r.data||[];
    list.innerHTML=communityCache.length?communityCache.map(c=>`<div class="community-card" data-community="${safe(c.id)}"><div class="community-icon">${c.kind==='channel'?'📢':'👥'}</div><div class="community-main"><strong>${safe(c.name)}</strong><small>${c.kind==='channel'?'قناة':'جروب'}${c.description?' • '+safe(c.description):''}</small></div><button type="button" class="community-link" data-community-link="${safe(c.id)}">🔗</button></div>`).join(''):'<div class="community-empty">لسه مفيش جروبات أو قنوات. استخدم زر + لإنشاء واحد.</div>';
    list.querySelectorAll('[data-community]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-community-link]'))return;openCommunity(el.dataset.community)});
    list.querySelectorAll('[data-community-link]').forEach(b=>b.onclick=e=>{e.stopPropagation();shareCommunity(b.dataset.community)});
  }

  function communityById(id){return communityCache.find(x=>String(x.id)===String(id))||null}
  async function getCommunity(id){
    let c=communityById(id);if(c)return c;
    const r=await sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,invite_code,created_at').eq('id',id).maybeSingle();
    if(r.data)return r.data;
    const f=await sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,created_at').eq('id',id).maybeSingle();
    return f.data||null;
  }
  async function shareCommunity(id){
    const c=await getCommunity(id);if(!c)return toast('الجروب أو القناة غير موجودة');
    if(!c.invite_code)return toast('شغّل ملف COMBOAPP_COMMUNITIES_V24_UPGRADE.sql مرة واحدة عشان نعمل رابط دعوة');
    const link=APP_BASE_URL+'?community='+encodeURIComponent(c.invite_code);
    sheet('رابط '+(c.kind==='channel'?'القناة':'الجروب'),`<input id="communityInviteInput" value="${safe(link)}" readonly><div class="modal-actions"><button class="primary" id="copyCommunityInvite">📋 نسخ الرابط</button><button class="choice-btn" id="shareCommunityInvite">↗ مشاركة الرابط</button></div>`);
    q('copyCommunityInvite').onclick=async()=>{try{await navigator.clipboard.writeText(link);toast('تم نسخ الرابط')}catch(_){q('communityInviteInput').select();document.execCommand('copy');toast('تم نسخ الرابط')}};
    q('shareCommunityInvite').onclick=async()=>{if(navigator.share)try{await navigator.share({title:c.name,text:'انضم إلى '+c.name,url:link})}catch(_){}else{q('communityInviteInput').select();document.execCommand('copy');toast('تم نسخ الرابط')}};
  }

  async function openCommunity(id){
    const c=await getCommunity(id);if(!c)return toast('تعذر فتح الجروب أو القناة');
    let modal=q('communityChatModal');
    if(!modal){modal=document.createElement('div');modal.id='communityChatModal';modal.className='modal hidden';document.body.appendChild(modal)}
    modal.innerHTML=`<div class="community-modal"><header class="community-head"><button id="communityClose" class="icon-btn">✕</button><div class="community-icon">${c.kind==='channel'?'📢':'👥'}</div><div class="community-info"><strong>${safe(c.name)}</strong><small>${c.kind==='channel'?'قناة':'جروب'}</small></div><button id="communityShare" class="icon-btn">🔗</button></header><div id="communityMessages" class="community-messages"><div class="community-empty">جاري تحميل الرسائل...</div></div><div class="community-actions"><button id="communityInviteBtn">👤＋ إضافة عضو</button><button id="communityShareBottom">🔗 رابط الدعوة</button></div><div class="community-compose"><input id="communityMessageInput" placeholder="اكتب رسالة..."><button id="communitySend">إرسال</button></div></div>`;
    modal.classList.remove('hidden');q('communityClose').onclick=()=>modal.classList.add('hidden');q('communityShare').onclick=()=>shareCommunity(c.id);q('communityShareBottom').onclick=()=>shareCommunity(c.id);q('communityInviteBtn').onclick=()=>chooseCommunityMember(c);q('communitySend').onclick=()=>sendCommunityMessage(c);
    q('communityMessageInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCommunityMessage(c)}};
    await loadCommunityMessages(c);
  }

  async function loadCommunityMessages(c){
    const box=q('communityMessages');if(!box)return;
    const r=await sb.from('community_messages').select('id,sender_id,content,created_at').eq('community_id',c.id).order('created_at',{ascending:true}).limit(200);
    if(r.error){box.innerHTML='<div class="community-empty">تعذر تحميل رسائل الجروب حاليًا.</div>';return}
    const ids=[...new Set((r.data||[]).map(x=>x.sender_id).filter(Boolean))];let names={};
    if(ids.length){const p=await sb.from('profiles').select('id,display_name,username').in('id',ids);(p.data||[]).forEach(x=>names[x.id]=x.display_name||x.username||'مستخدم')}
    box.innerHTML=(r.data||[]).map(m=>`<div class="community-message ${m.sender_id===me.id?'mine':''}"><div>${safe(m.content)}</div><small>${safe(names[m.sender_id]||'مستخدم')} • ${fmt(m.created_at)}</small></div>`).join('')||'<div class="community-empty">ابدأ أول رسالة هنا.</div>';
    box.scrollTop=box.scrollHeight;
  }
  async function sendCommunityMessage(c){
    if(c.kind==='channel'&&c.owner_id!==me.id)return toast('النشر في القناة متاح لمالك القناة حاليًا');
    const input=q('communityMessageInput');const content=(input?.value||'').trim();if(!content)return;
    const r=await sb.from('community_messages').insert({community_id:c.id,sender_id:me.id,content});
    if(r.error)return toast('تعذر إرسال الرسالة للجروب');input.value='';await loadCommunityMessages(c);await loadCommunities();
  }

  async function chooseCommunityMember(c){
    if(c.owner_id!==me.id)return toast('إضافة الأعضاء متاحة لمالك الجروب أو القناة حاليًا');
    const r=await sb.from('profiles').select('id,display_name,username,avatar_url').neq('id',me.id).order('display_name').limit(100);
    if(r.error)return toast('تعذر تحميل المستخدمين');
    sheet('إضافة إلى '+(c.kind==='channel'?'القناة':'الجروب'),`<input id="communityMemberSearch" class="modal-search" placeholder="ابحث باليوزر الكامل..."><div id="communityMemberList" class="list"></div>`);
    const render=()=>{const term=(q('communityMemberSearch').value||'').trim().replace(/^@/,'').toLowerCase();const rows=(r.data||[]).filter(u=>!term||String(u.username||'').toLowerCase()===term);q('communityMemberList').innerHTML=rows.length?rows.map(u=>`<button class="setting" data-add-member="${safe(u.id)}"><span>👤 ${safe(u.display_name||u.username)}</span><span>@${safe(u.username||'')}</span></button>`).join(''):'<div class="community-empty">اكتب اليوزر كاملًا.</div>';q('communityMemberList').querySelectorAll('[data-add-member]').forEach(b=>b.onclick=()=>addMemberToCommunity(c,b.dataset.addMember));};
    q('communityMemberSearch').oninput=render;render();
  }
  async function addMemberToCommunity(c,userId){
    const r=await sb.from('community_members').upsert({community_id:c.id,user_id:userId,role:'member'},{onConflict:'community_id,user_id'});
    if(r.error)return toast('تعذر إضافة العضو: '+r.error.message);closeSheet();toast('تمت إضافة العضو إلى '+c.name);loadCommunities();
  }

  async function patchContactActions(){
    const grid=q('otherProfileModal')?.querySelector('.profile-actions-grid');if(!grid)return;
    if(grid.dataset.v24==='1')return;
    grid.dataset.v24='1';grid.classList.add('v24-actions');
    grid.innerHTML=`<button id="otherSarhnyBtnV24" type="button"><span>💚</span><small>صارحني</small></button><button id="otherAddBtnV24" type="button"><span>👤＋</span><small>إضافة</small></button><button id="otherCommunityBtnV24" type="button"><span>👥＋</span><small>إضافة إلى جروب أو قناة</small></button>`;
    const u=activeChat?.user;
    q('otherSarhnyBtnV24').onclick=()=>{if(!u?.username)return toast('المستخدم ليس لديه يوزر');closeOtherProfile();go('sarhnyPage');q('sarhnyUsername').value=u.username;q('sarhnyContent').focus()};
    q('otherAddBtnV24').onclick=()=>{if(!u)return;addActiveContact()};
    q('otherCommunityBtnV24').onclick=async()=>{if(!u)return await chooseCommunityForUser(u)};
  }
  async function chooseCommunityForUser(u){
    const r=await sb.from('communities').select('id,kind,name,owner_id').eq('owner_id',me.id).order('created_at',{ascending:false});
    if(r.error||!r.data?.length)return toast('اعمل جروب أو قناة الأول');
    sheet('إضافة '+(u.display_name||'المستخدم')+' إلى',`<div class="list">${r.data.map(c=>`<button class="setting" data-pick-community="${safe(c.id)}"><span>${c.kind==='channel'?'📢':'👥'} ${safe(c.name)}</span><span>›</span></button>`).join('')}</div>`);
    q('communityMemberSearch')?.remove();
    document.querySelectorAll('[data-pick-community]').forEach(b=>b.onclick=async()=>{const c=r.data.find(x=>x.id===b.dataset.pickCommunity);if(!c)return;const x=await sb.from('community_members').upsert({community_id:c.id,user_id:u.id,role:'member'},{onConflict:'community_id,user_id'});if(x.error)return toast('تعذر إضافة الشخص: '+x.error.message);closeSheet();toast('تمت إضافة الشخص إلى '+c.name)});
  }

  function observeContactProfile(){
    const modal=q('otherProfileModal');if(!modal)return;
    const mo=new MutationObserver(()=>{if(!modal.classList.contains('hidden'))setTimeout(patchContactActions,0)});mo.observe(modal,{attributes:true,attributeFilter:['class']});
  }

  function handleInviteLink(){
    if(!me)return;
    const code=new URLSearchParams(location.search).get('community');if(!code)return;
    if(q('communityInvitePending'))return;
    const mark=document.createElement('div');mark.id='communityInvitePending';document.body.appendChild(mark);
    sb.rpc('combo_join_community_by_invite',{p_code:code}).then(r=>{
      if(r.error){toast('تعذر فتح رابط الجروب أو القناة: '+r.error.message);return}
      history.replaceState({},'',APP_BASE_URL);toast('تم الانضمام بنجاح إلى '+r.data?.[0]?.name);loadCommunities();if(r.data?.[0]?.id)setTimeout(()=>openCommunity(r.data[0].id),250);
    });
  }

  function addCommunityButtonToPlus(){
    const m=q('bottomComposeModal');if(!m)return;
    const grid=m.querySelector('.compose-grid-v16');if(!grid||grid.querySelector('[data-open-my-communities]'))return;
    const b=document.createElement('button');b.setAttribute('data-open-my-communities','1');b.innerHTML='<span>👥</span><strong>جروباتي وقنواتي</strong><small>عرض وإدارة الجروبات والقنوات</small>';b.onclick=()=>{m.classList.add('hidden');ensureCommunityHome();loadCommunities();go('homePage');setTimeout(()=>q('communityHomePanel')?.scrollIntoView({behavior:'smooth'}),80)};grid.appendChild(b);
  }

  function finalWire(){
    fixExactSearch();ensureCommunityHome();addCommunityButtonToPlus();observeContactProfile();
    const refresh=q('refreshBtn');if(refresh)refresh.addEventListener('click',loadCommunities);
    const notify=q('notifyBtn');if(notify)notify.onclick=toggleGlobalNotifications;
    const story=q('storiesPage');if(story)q('storiesPage').dataset.v24='1';
    if(me)loadCommunities();
    setTimeout(handleInviteLink,900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalWire,{once:true});else finalWire();
  window.loadCommunities=loadCommunities;
  window.openCommunity=openCommunity;
})();

/* ===== ComboApp V25: final community UX + contact profile tools ===== */
(function V25(){
  const q=id=>document.getElementById(id), safe=s=>esc(s||'');
  let communityCache=[];
  const currentUser=()=>me?.id||null;
  const commUrl=c=>c?.invite_code?APP_BASE_URL+'?community='+encodeURIComponent(c.invite_code):'';
  const mediaUrl=path=>sb.storage.from('community-media').getPublicUrl(path).data?.publicUrl||'';

  function ensureV25CommunityStyles(){
    if(q('v25CommunityStyle'))return;
    const st=document.createElement('style');st.id='v25CommunityStyle';st.textContent=`
      .v25-community-profile{width:min(700px,100%);height:100%;background:#031016;overflow:auto;padding-bottom:24px}
      .v25-community-cover{height:150px;background:radial-gradient(circle at 50% 0,#00e6b044,#06151b 68%);display:flex;align-items:center;justify-content:center;position:relative}
      .v25-community-avatar{width:104px;height:104px;border-radius:30px;border:3px solid #00e6b0;overflow:hidden;background:#0a2931;display:grid;place-items:center;font-size:44px;box-shadow:0 15px 45px #0009}
      .v25-community-avatar img,.v25-community-avatar video{width:100%;height:100%;object-fit:cover}
      .v25-community-body{padding:14px}.v25-community-body h2{margin:0 0 4px}.v25-community-desc{color:#91ada9;white-space:pre-wrap;margin:0 0 12px}
      .v25-community-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.v25-community-actions button,.v25-community-row{border:1px solid #16464e;background:#071d24;color:#eafffa;border-radius:15px;padding:11px;text-align:center}
      .v25-community-link{display:flex;gap:8px;align-items:center;direction:ltr;background:#061b22!important;text-align:left!important}.v25-community-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
      .v25-section{margin-top:14px;border-top:1px solid #143b42;padding-top:12px}.v25-section h3{font-size:14px;margin:0 0 8px}.v25-member{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;border:1px solid #123b43;background:#061820;border-radius:14px;padding:8px;margin:6px 0;text-align:right}.v25-member .avatar{width:42px;height:42px}.v25-member-main small{display:block;color:#789b96;margin-top:2px}.v25-member-actions{display:flex;gap:5px}.v25-member-actions button{border:1px solid #24515a;background:#0b2730;color:#eafffa;border-radius:9px;padding:6px;font-size:11px}.v25-member-actions .danger{color:#ff8191}
      .v25-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;border:1px solid #16464e;background:#071d24;color:#eafffa;border-radius:14px;padding:12px;margin:7px 0;text-align:right}.v25-toggle b{min-width:44px;padding:6px 9px;border-radius:18px;background:#102e35;color:#789b96}.v25-toggle.on b{background:#00e6b0;color:#00231d}.v25-request{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;border:1px solid #17464e;background:#071d24;border-radius:14px;padding:9px;margin:7px 0}.v25-request-actions{display:flex;gap:5px}.v25-request-actions button{width:36px;height:36px;border:0;border-radius:11px;font-size:18px}.v25-request-actions .yes{background:#00e6b0}.v25-request-actions .no{background:#3b1720;color:#ff8a98}
      .v25-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.v25-gallery button{aspect-ratio:1;border:1px solid #16464e;border-radius:13px;overflow:hidden;background:#071b22;padding:0;position:relative}.v25-gallery img,.v25-gallery video{width:100%;height:100%;object-fit:cover}.v25-gallery small{position:absolute;bottom:5px;right:5px;background:#00151bd9;color:#fff;border-radius:7px;padding:2px 5px}
      .v25-community-compose{display:grid;grid-template-columns:auto auto auto 1fr auto;gap:6px;padding:8px;border-top:1px solid #14363c;background:#04141a}.v25-community-compose button{border:1px solid #16464e;background:#09242c;color:#eafffa;border-radius:12px;min-width:40px}.v25-community-compose input{min-width:0}.v25-community-rich{position:absolute;bottom:62px;right:8px;left:8px;z-index:20;background:#061a22;border:1px solid #17464e;border-radius:18px;padding:8px;max-height:250px;overflow:auto;box-shadow:0 15px 50px #000b}.v25-community-rich.hidden{display:none}.v25-community-rich-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.v25-community-rich-grid button{border:0;background:transparent;color:#fff;font-size:23px;padding:6px}.v25-community-gifs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.v25-community-gifs button{border:1px solid #16464e;background:#071b22;border-radius:10px;overflow:hidden}.v25-community-gifs img{width:100%;display:block}
      .v25-profile-viewer{position:fixed;inset:0;z-index:1600;background:#000f;display:flex;align-items:center;justify-content:center}.v25-profile-viewer.hidden{display:none}.v25-profile-viewer-box{width:min(700px,100%);height:100%;display:flex;flex-direction:column;padding:10px}.v25-profile-viewer-media{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}.v25-profile-viewer-media img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}.v25-profile-viewer-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:9px 0}.v25-profile-viewer-actions button{border:1px solid #16464e;background:#09212a;color:#fff;border-radius:13px;padding:11px;font-weight:800}
    `;document.head.appendChild(st);
  }

  function getCommunityFresh(id){
    return sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,invite_code,created_at,allow_info_edit,admins_only_chat,allow_join_requests').eq('id',id).maybeSingle();
  }
  async function getCommunityV25(id){
    const c=typeof communityById==='function'?communityById(id):null;if(c?.id)return c;
    const r=await getCommunityFresh(id);return r.data||null;
  }

  async function loadCommunitiesV25(){
    ensureV25CommunityStyles();
    const list=q('communityList');if(!list||!currentUser())return;
    const r=await sb.from('communities').select('id,kind,name,description,owner_id,avatar_url,invite_code,created_at,allow_info_edit,admins_only_chat,allow_join_requests').order('updated_at',{ascending:false});
    if(r.error){list.innerHTML='<div class="community-empty">تعذر تحميل الجروبات والقنوات.</div>';return;}
    communityCache=r.data||[];
    list.innerHTML=communityCache.length?communityCache.map(c=>`<div class="community-card" data-community="${safe(c.id)}"><div class="community-icon">${c.avatar_url?`<img src="${safe(c.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`:c.kind==='channel'?'📢':'👥'}</div><div class="community-main"><strong>${safe(c.name)}</strong><small>${c.kind==='channel'?'قناة':'جروب'}${c.description?' • '+safe(c.description):''}</small></div></div>`).join(''):'<div class="community-empty">لسه مفيش جروبات أو قنوات.</div>';
    list.querySelectorAll('[data-community]').forEach(el=>el.onclick=()=>openCommunityV25(el.dataset.community));
  }

  async function communityMediaGallery(c){
    const r=await sb.rpc('combo_v25_list_media',{p_community_id:c.id});
    if(r.error||!r.data?.length)return '<div class="empty-card">مفيش صور أو فيديوهات لسه.</div>';
    return `<div class="v25-gallery">${r.data.map(x=>{const u=mediaUrl(x.media_path);return `<button type="button" data-v25-media-url="${safe(u)}" data-v25-media-mime="${safe(x.media_mime||'')}">${x.media_mime?.startsWith('video/')?`<video src="${safe(u)}" muted></video>`:`<img src="${safe(u)}" alt="">`}<small>${x.media_mime?.startsWith('video/')?'فيديو':'صورة'}</small></button>`}).join('')}</div>`;
  }

  async function uploadCommunityProfileMedia(c,file,setMain=false){
    if(c.owner_id!==currentUser())return toast('التعديل متاح لمالك الجروب أو القناة فقط');
    if(!file)return;
    if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))return toast('اختار صورة أو فيديو');
    const path=`${me.id}/${c.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const up=await sb.storage.from('community-media').upload(path,file,{upsert:false,contentType:file.type});
    if(up.error)return toast('تعذر رفع الملف: '+up.error.message);
    const add=await sb.rpc('combo_v25_add_media',{p_community_id:c.id,p_media_path:path,p_media_mime:file.type});
    if(add.error){await sb.storage.from('community-media').remove([path]);return toast('تعذر حفظ الملف');}
    if(setMain&&file.type.startsWith('image/')){
      const url=mediaUrl(path);const u=await sb.from('communities').update({avatar_url:url}).eq('id',c.id).eq('owner_id',me.id);
      if(u.error)return toast('تم رفع الصورة لكن تعذر جعلها صورة المجموعة');
    }
    toast(setMain?'تم تغيير صورة المجموعة':'تمت إضافة الوسائط');
  }

  async function openCommunityProfileV25(c){
    ensureV25CommunityStyles();
    let modal=q('communityProfileV25');if(!modal){modal=document.createElement('div');modal.id='communityProfileV25';modal.className='modal hidden';document.body.appendChild(modal)}
    const owner=c.owner_id===currentUser();
    const members=await sb.rpc('combo_v25_get_community_members',{p_community_id:c.id});
    const rows=members.data||[];
    const link=commUrl(c);
    modal.innerHTML=`<div class="v25-community-profile"><header class="sheet-head"><div><h3>معلومات ${c.kind==='channel'?'القناة':'المجموعة'}</h3><small class="muted">${safe(c.kind==='channel'?'قناة':'جروب')}</small></div><button id="v25CommProfileClose" class="icon-btn">✕</button></header><div class="v25-community-cover"><div class="v25-community-avatar">${c.avatar_url?`<img src="${safe(c.avatar_url)}">`:c.kind==='channel'?'📢':'👥'}</div></div><div class="v25-community-body"><h2>${safe(c.name)}</h2><p class="v25-community-desc">${safe(c.description||'مفيش نبذة')}</p><div class="v25-community-actions"><button id="v25AddCommMember">👤＋<br>إضافة عضو</button><button id="v25CommMediaAdd">🖼️＋<br>إضافة وسائط</button><button id="v25CommReport">⚠️<br>إبلاغ</button></div>${(!owner&&c.allow_info_edit)?'<button class="v25-community-row" id="v25EditCommInfo">✏️ تعديل معلومات المجموعة</button>':''}<button class="v25-community-row v25-community-link" id="v25CommLinkBtn"><span>🔗 ${safe(link||'الرابط غير جاهز')}</span><b>نسخ</b></button><div class="v25-section"><h3>الوسائط والصور</h3><div id="v25CommGallery">جاري التحميل...</div></div><div class="v25-section"><h3>الأعضاء (${rows.length})</h3><div id="v25CommMembers"></div></div>${owner?`<div class="v25-section"><h3>إدارة المجموعة</h3><button class="v25-community-row" id="v25CommSettingsBtn">⚙️ إعدادات المجموعة</button><button class="v25-community-row" id="v25JoinRequestsBtn">👥 طلبات الانضمام <span id="v25ReqCount"></span></button></div>`:''}<div class="v25-section"><button class="v25-community-row ${owner?'danger-text':''}" id="v25LeaveCommBtn">${owner?'🗑️ حذف المجموعة نهائيًا':'🚪 الخروج من المجموعة'}</button></div></div></div>`;
    modal.classList.remove('hidden');
    q('v25CommProfileClose').onclick=()=>modal.classList.add('hidden');
    q('v25CommLinkBtn').onclick=async()=>{if(!link)return toast('رابط الدعوة غير جاهز');try{await navigator.clipboard.writeText(link);toast('تم نسخ رابط الدعوة')}catch(_){toast(link)}};
    q('v25AddCommMember').onclick=()=>chooseCommunityMemberV25(c);
    q('v25CommMediaAdd').onclick=()=>{if(!owner)return toast('إضافة الوسائط متاحة للمالك فقط');let inp=q('v25CommMediaInput');if(!inp){inp=document.createElement('input');inp.id='v25CommMediaInput';inp.type='file';inp.accept='image/*,video/*';inp.multiple=true;inp.hidden=true;document.body.appendChild(inp);inp.onchange=async e=>{for(const f of [...(e.target.files||[])])await uploadCommunityProfileMedia(c,f,false);inp.value='';await openCommunityProfileV25(c)}}inp.click()};
    q('v25CommReport').onclick=()=>reportCommunityV25(c);if(q('v25EditCommInfo'))q('v25EditCommInfo').onclick=()=>editCommunityInfoV25(c);
    q('v25LeaveCommBtn').onclick=async()=>{if(!confirm(owner?'حذف المجموعة نهائيًا؟':'الخروج من المجموعة؟'))return;const r=await sb.rpc('combo_v25_leave_community',{p_community_id:c.id});if(r.error)return toast('تعذر تنفيذ العملية: '+r.error.message);modal.classList.add('hidden');await loadCommunitiesV25();toast(owner?'تم حذف المجموعة':'تم الخروج من المجموعة')};
    const gallery=q('v25CommGallery');if(gallery){gallery.innerHTML=await communityMediaGallery(c);gallery.querySelectorAll('[data-v25-media-url]').forEach(b=>b.onclick=()=>openV25ImageViewer(b.dataset.v25MediaUrl,b.dataset.v25MediaMime,c))}
    const memBox=q('v25CommMembers');if(memBox){memBox.innerHTML=rows.map(u=>{const mine=u.user_id===currentUser(),canManage=owner&&!mine&&u.role!=='owner';return `<div class="v25-member"><div class="avatar">${u.avatar_url?`<img src="${safe(u.avatar_url)}">`:initials(u.display_name)}</div><div class="v25-member-main"><strong>${safe(u.display_name||u.username||'مستخدم')}</strong><small>@${safe(u.username||'')} · ${u.role==='owner'?'مالك':u.role==='admin'?'مشرف':'عضو'}</small></div>${canManage?`<div class="v25-member-actions"><button data-mem-action="${u.role==='admin'?'demote':'promote'}" data-mem-id="${safe(u.user_id)}">${u.role==='admin'?'تنزيل':'رفع مشرف'}</button><button class="danger" data-mem-action="kick" data-mem-id="${safe(u.user_id)}">طرد</button></div>`:''}</div>`}).join('')||'<div class="community-empty">مفيش أعضاء.</div>';memBox.querySelectorAll('[data-mem-action]').forEach(b=>b.onclick=async()=>{const r=await sb.rpc('combo_v25_manage_member',{p_community_id:c.id,p_user_id:b.dataset.memId,p_action:b.dataset.memAction});if(r.error)return toast('تعذر تنفيذ العملية: '+r.error.message);toast(b.dataset.memAction==='kick'?'تم طرد العضو':b.dataset.memAction==='promote'?'تم رفعه مشرفًا':'تم تنزيله من المشرفين');openCommunityProfileV25(c)})}
    if(owner){q('v25CommSettingsBtn').onclick=()=>openCommunitySettingsV25(c);q('v25JoinRequestsBtn').onclick=()=>openCommunityRequestsV25(c)}
  }

  async function chooseCommunityMemberV25(c){
    if(c.owner_id!==currentUser())return toast('إضافة الأعضاء متاحة للمالك فقط');
    const r=await sb.from('profiles').select('id,display_name,username,avatar_url').neq('id',me.id).order('display_name').limit(200);
    if(r.error)return toast('تعذر تحميل المستخدمين');
    sheet('إضافة إلى '+(c.kind==='channel'?'القناة':'الجروب'),`<input id="v25MemberSearch" class="modal-search" placeholder="اكتب اليوزر كاملًا..."><div id="v25MemberList" class="list"></div>`);
    const render=()=>{const term=(q('v25MemberSearch').value||'').trim().replace(/^@/,'').toLowerCase();const rows=(r.data||[]).filter(x=>!term||String(x.username||'').toLowerCase()===term);q('v25MemberList').innerHTML=rows.length?rows.map(u=>`<button class="setting" data-v25-add-user="${safe(u.id)}"><span>👤 ${safe(u.display_name||u.username)}</span><span>@${safe(u.username||'')}</span></button>`).join(''):'<div class="community-empty">اكتب اليوزر كاملًا.</div>';q('v25MemberList').querySelectorAll('[data-v25-add-user]').forEach(b=>b.onclick=async()=>{const x=await sb.from('community_members').upsert({community_id:c.id,user_id:b.dataset.v25AddUser,role:'member'},{onConflict:'community_id,user_id'});if(x.error)return toast('تعذر إضافة العضو: '+x.error.message);closeSheet();toast('تمت إضافة العضو');openCommunityProfileV25(c)})};
    q('v25MemberSearch').oninput=render;render();
  }

  async function openCommunitySettingsV25(c){
    if(c.owner_id!==currentUser())return toast('الإعدادات للمالك فقط');
    const fresh=(await getCommunityFresh(c.id)).data||c;
    const toggle=(id,label,on)=>`<button type="button" class="v25-toggle ${on?'on':''}" id="${id}"><span>${label}</span><b>${on?'مفعل':'متوقف'}</b></button>`;
    openContactTools('إعدادات '+(fresh.kind==='channel'?'القناة':'المجموعة'),`${toggle('v25InfoToggle','السماح للجميع بتغيير معلومات المجموعة',fresh.allow_info_edit)}${toggle('v25AdminChatToggle','السماح للمشرفين فقط بالتكلم',fresh.admins_only_chat)}${toggle('v25JoinToggle','السماح بالانضمام للمجموعة',fresh.allow_join_requests)}<button class="primary" id="v25SaveCommSettings" style="width:100%;margin-top:10px">حفظ الإعدادات</button>`);
    let vals={info:!!fresh.allow_info_edit,admin:!!fresh.admins_only_chat,join:!!fresh.allow_join_requests};
    [['v25InfoToggle','info'],['v25AdminChatToggle','admin'],['v25JoinToggle','join']].forEach(([id,k])=>q(id).onclick=()=>{vals[k]=!vals[k];q(id).classList.toggle('on',vals[k]);q(id).querySelector('b').textContent=vals[k]?'مفعل':'متوقف'});
    q('v25SaveCommSettings').onclick=async()=>{const r=await sb.rpc('combo_v25_set_community_settings',{p_community_id:c.id,p_allow_info_edit:vals.info,p_admins_only_chat:vals.admin,p_allow_join_requests:vals.join});if(r.error)return toast('تعذر حفظ الإعدادات: '+r.error.message);q('contactToolsModal').classList.add('hidden');toast('تم حفظ إعدادات المجموعة');loadCommunitiesV25()};
  }

  async function openCommunityRequestsV25(c){
    const r=await sb.rpc('combo_v25_list_join_requests',{p_community_id:c.id});if(r.error)return toast('تعذر تحميل طلبات الانضمام');
    const rows=r.data||[];openContactTools('طلبات الانضمام',rows.length?rows.map(x=>`<div class="v25-request"><div class="avatar">${x.avatar_url?`<img src="${safe(x.avatar_url)}">`:initials(x.display_name)}</div><div><strong>${safe(x.display_name||x.username||'مستخدم')}</strong><small>@${safe(x.username||'')}</small></div><div class="v25-request-actions"><button class="yes" data-v25-req="${safe(x.id)}" data-approve="1">✓</button><button class="no" data-v25-req="${safe(x.id)}" data-approve="0">✕</button></div></div>`).join(''):'<div class="empty-card">مفيش طلبات انضمام حاليًا.</div>');
    document.querySelectorAll('[data-v25-req]').forEach(b=>b.onclick=async()=>{const x=await sb.rpc('combo_v25_review_join_request',{p_request_id:b.dataset.v25Req,p_approve:b.dataset.approve==='1'});if(x.error)return toast('تعذر مراجعة الطلب: '+x.error.message);toast(b.dataset.approve==='1'?'تم قبول الطلب':'تم رفض الطلب');openCommunityRequestsV25(c)})
  }

  function editCommunityInfoV25(c){
    openContactTools('تعديل معلومات المجموعة',`<input id="v25EditCommName" value="${safe(c.name)}" placeholder="اسم المجموعة"><textarea id="v25EditCommDesc" placeholder="النبذة">${safe(c.description||'')}</textarea><button class="primary" id="v25SaveCommInfo" style="width:100%;margin-top:10px">حفظ</button>`);
    q('v25SaveCommInfo').onclick=async()=>{const r=await sb.rpc('combo_v25_update_community_info',{p_community_id:c.id,p_name:q('v25EditCommName').value,p_description:q('v25EditCommDesc').value});if(r.error)return toast('تعذر حفظ المعلومات: '+r.error.message);q('contactToolsModal').classList.add('hidden');toast('تم تحديث معلومات المجموعة');await loadCommunitiesV25();openCommunityProfileV25((await getCommunityFresh(c.id)).data||c)};
  }

  function reportCommunityV25(c){
    openContactTools('إبلاغ عن '+c.name,`<textarea id="v25CommunityReportReason" maxlength="500" placeholder="اكتب سبب البلاغ (اختياري)"></textarea><button class="primary" id="v25SendCommunityReport" style="width:100%;margin-top:10px">إرسال البلاغ</button>`);
    q('v25SendCommunityReport').onclick=async()=>{const reason=q('v25CommunityReportReason').value.trim()||'بلاغ من المستخدم';const r=await sb.from('community_reports').insert({community_id:c.id,reporter_id:me.id,reason});if(r.error)return toast('تعذر إرسال البلاغ: '+r.error.message);q('contactToolsModal').classList.add('hidden');toast('تم إرسال البلاغ')};
  }

  function renderCommunityRich(c){
    let panel=q('v25CommunityRich');if(!panel)return;
    panel.innerHTML=`<div class="emoji-tabs"><button data-crich="emoji" class="emoji-tab active">😊</button><button data-crich="gif" class="emoji-tab">GIF</button><button data-crich="sticker" class="emoji-tab">🧸</button></div><div id="v25CommunityRichBody"></div>`;
    const body=q('v25CommunityRichBody');
    const emojis=['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😎','🤩','🤔','😢','😭','😡','🤬','👍','👎','👏','🙏','❤️','💚','🔥','✨','🎉','😂','💯','👋','🤝','💪','🥳','😴','🤗','😱','🤍','🫶','😈','💔','⭐'];
    const show=t=>{if(t==='emoji'){body.innerHTML=`<div class="v25-community-rich-grid">${emojis.map(x=>`<button type="button">${x}</button>`).join('')}</div>`;body.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=q('communityMessageInput');if(i){i.value+=b.textContent;i.focus()}})}else if(t==='gif'){body.innerHTML=`<div class="v25-community-gifs">${GIFS.map((src,i)=>`<button type="button" data-cgif="${i}"><img src="${src}" loading="lazy"></button>`).join('')}</div>`;body.querySelectorAll('[data-cgif]').forEach(b=>b.onclick=()=>{sendCommunityRich(c,'gif',b.dataset.cgif);panel.classList.add('hidden')})}else{body.innerHTML=`<div class="v25-community-rich-grid">${['😀','❤️','😂','👍','🔥','🎉','🥰','😎','👏','🙏','💚','✨'].map((x,i)=>`<button type="button" data-cst="${i}">${x}</button>`).join('')}</div>`;body.querySelectorAll('[data-cst]').forEach(b=>b.onclick=()=>{sendCommunityRich(c,'sticker',b.textContent);panel.classList.add('hidden')})}};
    panel.querySelectorAll('[data-crich]').forEach(b=>b.onclick=()=>{panel.querySelectorAll('[data-crich]').forEach(x=>x.classList.toggle('active',x===b));show(b.dataset.crich)});show('emoji');
  }

  async function sendCommunityRich(c,type,val){
    if(c.kind==='channel'&&c.owner_id!==currentUser())return toast('النشر في القناة متاح للمالك أو المشرفين');
    const content=type==='gif'?`__combo_gif__:${val}`:type==='sticker'?`__combo_community_sticker__:${val}`:(q('communityMessageInput')?.value||'').trim();
    if(!content)return;
    const r=await sb.from('community_messages').insert({community_id:c.id,sender_id:me.id,content});
    if(r.error)return toast('تعذر إرسال الرسالة: '+r.error.message);if(q('communityMessageInput'))q('communityMessageInput').value='';await loadCommunityMessagesV25(c);
  }

  async function sendCommunityMediaV25(c,file){
    if(c.kind==='channel'&&c.owner_id!==currentUser())return toast('النشر في القناة متاح للمالك أو المشرفين');
    const path=`${me.id}/${c.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const up=await sb.storage.from('community-media').upload(path,file,{upsert:false,contentType:file.type});if(up.error)return toast('تعذر رفع الملف: '+up.error.message);
    const r=await sb.from('community_messages').insert({community_id:c.id,sender_id:me.id,content:'',media_path:path,media_mime:file.type});if(r.error){await sb.storage.from('community-media').remove([path]);return toast('تعذر إرسال الملف: '+r.error.message)}
    await loadCommunityMessagesV25(c);toast('تم إرسال الملف');
  }

  async function loadCommunityMessagesV25(c){
    const box=q('communityMessages');if(!box)return;
    const r=await sb.from('community_messages').select('id,sender_id,content,created_at,media_path,media_mime').eq('community_id',c.id).order('created_at',{ascending:true}).limit(300);
    if(r.error){box.innerHTML='<div class="community-empty">تعذر تحميل الرسائل.</div>';return}
    const ids=[...new Set((r.data||[]).map(x=>x.sender_id).filter(Boolean))];let names={};if(ids.length){const p=await sb.from('profiles').select('id,display_name,username').in('id',ids);(p.data||[]).forEach(x=>names[x.id]=x.display_name||x.username||'مستخدم')}
    box.innerHTML=(r.data||[]).map(m=>{let body='';if(m.media_path){const u=mediaUrl(m.media_path);body=m.media_mime?.startsWith('video/')?`<video class="community-msg-media" src="${safe(u)}" controls playsinline></video>`:m.media_mime?.startsWith('image/')?`<img class="community-msg-media" src="${safe(u)}" alt="">`:`<a href="${safe(u)}" target="_blank" rel="noopener">📎 فتح الملف</a>`}else if(/^__combo_gif__:\d+$/.test(m.content||'')){const i=Number((m.content||'').split(':')[1]);body=`<img class="community-msg-media" src="${safe(GIFS[i]||GIFS[0])}" alt="GIF">`}else if((m.content||'').startsWith('__combo_community_sticker__:'))body=`<div class="community-sticker">${safe(m.content.split(':').slice(1).join(':'))}</div>`;else body=`<div>${safe(m.content||'')}</div>`;return `<div class="community-message ${m.sender_id===me.id?'mine':''}">${body}<small>${safe(names[m.sender_id]||'مستخدم')} • ${fmt(m.created_at)}</small></div>`}).join('')||'<div class="community-empty">ابدأ أول رسالة هنا.</div>';
    box.scrollTop=box.scrollHeight;
  }

  async function openCommunityV25(id){
    ensureV25CommunityStyles();const c=await getCommunityV25(id);if(!c)return toast('تعذر فتح الجروب أو القناة');
    let modal=q('communityChatModal');if(!modal){modal=document.createElement('div');modal.id='communityChatModal';modal.className='modal hidden';document.body.appendChild(modal)}
    const owner=c.owner_id===currentUser();
    modal.innerHTML=`<div class="community-modal" style="position:relative"><header class="community-head"><button id="communityClose" class="icon-btn">✕</button><div class="community-icon">${c.avatar_url?`<img src="${safe(c.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:13px">`:c.kind==='channel'?'📢':'👥'}</div><div class="community-info" id="v25CommunityTitle"><strong>${safe(c.name)}</strong><small>${c.kind==='channel'?'قناة':'جروب'}</small></div></header><div id="communityMessages" class="community-messages"><div class="community-empty">جاري تحميل الرسائل...</div></div><div id="v25CommunityRich" class="v25-community-rich hidden"></div><div class="v25-community-compose"><button id="v25CommEmoji">😊</button><button id="v25CommGif">GIF</button><button id="v25CommAttach">＋</button><input id="communityMessageInput" placeholder="اكتب رسالة..."><button id="communitySend">➤</button></div></div>`;
    modal.classList.remove('hidden');
    q('communityClose').onclick=()=>modal.classList.add('hidden');
    q('v25CommunityTitle').onclick=()=>openCommunityProfileV25(c);
    q('communitySend').onclick=()=>sendCommunityRich(c,'text','');
    q('communityMessageInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCommunityRich(c,'text','')}};
    q('v25CommEmoji').onclick=()=>{const p=q('v25CommunityRich');p.classList.toggle('hidden');if(!p.classList.contains('hidden'))renderCommunityRich(c)};
    q('v25CommGif').onclick=()=>{const p=q('v25CommunityRich');p.classList.remove('hidden');renderCommunityRich(c);p.querySelector('[data-crich="gif"]')?.click()};
    q('v25CommAttach').onclick=()=>{let inp=q('v25CommunityFileInput');if(!inp){inp=document.createElement('input');inp.id='v25CommunityFileInput';inp.type='file';inp.accept='image/*,video/*,audio/*';inp.hidden=true;document.body.appendChild(inp);inp.onchange=async e=>{for(const f of [...(e.target.files||[])])await sendCommunityMediaV25(c,f);inp.value=''}}inp.click()};
    await loadCommunityMessagesV25(c);
  }

  // Invite links now respect the owner-controlled join-request switch.
  function handleInviteV25(){
    if(!currentUser())return;const code=new URLSearchParams(location.search).get('community');if(!code||q('v25InvitePending'))return;
    const m=document.createElement('div');m.id='v25InvitePending';document.body.appendChild(m);
    sb.rpc('combo_v25_join_by_invite',{p_code:code}).then(r=>{if(r.error){toast('تعذر فتح رابط الجروب أو القناة: '+r.error.message);return}history.replaceState({},'',APP_BASE_URL);const x=r.data?.[0];if(x?.status==='pending')toast('تم إرسال طلب الانضمام للمالك');else toast('تم الانضمام بنجاح');loadCommunitiesV25();if(x?.id)setTimeout(()=>openCommunityV25(x.id),300)})
  }

  // Exact username search, case-insensitive, while still requiring the complete username.
  function patchExactUsernameSearch(){
    const old=q('userSearch');if(!old)return;const fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('input',async()=>{const box=q('searchResults');const term=(fresh.value||'').trim().replace(/^@/,'');if(!term){box?.classList.add('hidden');return}box?.classList.remove('hidden');if(!/^[a-zA-Z0-9_.]{3,32}$/.test(term)){if(box)box.innerHTML='<div class="muted" style="padding:12px">اكتب اليوزر كاملًا.</div>';return}const r=await sb.from('profiles').select('id,username,display_name,avatar_url,phone,bio,last_seen,privacy_last_seen').ilike('username',term).neq('id',me?.id||'').limit(1);if(r.error){console.warn(r.error);box.innerHTML='<div class="muted" style="padding:12px">تعذر البحث حاليًا.</div>';return}const u=r.data?.[0];if(!u){box.innerHTML='<div class="muted" style="padding:12px">مفيش حساب باليوزر ده.</div>';return}box.innerHTML=`<div class="result-item" data-id="${safe(u.id)}"><div class="avatar">${u.avatar_url?`<img src="${safe(u.avatar_url)}">`:initials(u.display_name)}</div><div class="chat-info"><strong>${safe(u.display_name||'مستخدم')}</strong><small>@${safe(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`;box.querySelector('.result-item').onclick=()=>openUser(u.id)})
  }

  function openV25ImageViewer(url,mime,u){
    let v=q('v25ProfileViewer');if(!v){v=document.createElement('div');v.id='v25ProfileViewer';v.className='v25-profile-viewer hidden';document.body.appendChild(v)}
    v.innerHTML=`<div class="v25-profile-viewer-box"><button class="icon-btn" id="v25ViewerClose">✕</button><div class="v25-profile-viewer-media">${mime?.startsWith('video/')?`<video src="${safe(url)}" controls autoplay playsinline style="max-width:100%;max-height:100%"></video>`:`<img src="${safe(url)}" alt="صورة الملف الشخصي">`}</div><div class="v25-profile-viewer-actions"><button id="v25ViewerSave">⬇️ حفظ الصورة</button><button id="v25ViewerReport">⚠️ إبلاغ</button><button id="v25ViewerShare">↗ مشاركة</button></div></div>`;
    v.classList.remove('hidden');q('v25ViewerClose').onclick=()=>v.classList.add('hidden');q('v25ViewerSave').onclick=()=>{const a=document.createElement('a');a.href=url;a.download='ComboApp-profile';a.target='_blank';a.click()};q('v25ViewerShare').onclick=async()=>{if(navigator.share)try{await navigator.share({title:u?.display_name||'ComboApp',url})}catch(_){}else{try{await navigator.clipboard.writeText(url);toast('تم نسخ الرابط')}catch(_){}}};q('v25ViewerReport').onclick=()=>{if(u)showContactReportForUser(u)};
  }
  function showContactReportForUser(u){openContactTools('إبلاغ عن '+(u.display_name||'الشخص'),`<textarea id="v25UserReportReason" maxlength="500" placeholder="اكتب سبب البلاغ (اختياري)"></textarea><button class="primary" id="v25UserReportSend" style="width:100%;margin-top:10px">إرسال البلاغ</button>`);q('v25UserReportSend').onclick=async()=>{const r=await sb.from('reports').insert({reporter_id:me.id,reported_user_id:u.id,reason:q('v25UserReportReason').value.trim()||'بلاغ من المستخدم'});if(r.error)return toast('تعذر إرسال البلاغ');q('contactToolsModal').classList.add('hidden');q('v25ProfileViewer')?.classList.add('hidden');toast('تم إرسال البلاغ')}}

  function patchContactProfileV25(){
    const av=q('otherProfileAvatar');if(!av||av.dataset.v25==='1')return;av.dataset.v25='1';av.onclick=async()=>{if(!activeChat?.user?.avatar_url)return toast('مفيش صورة لعرضها');openV25ImageViewer(activeChat.user.avatar_url,activeChat.user.avatar_url.match(/\.(mp4|webm|mov)(\?|$)/i)?'video/':'image/',activeChat.user)};
    const oldOpen=window.openOtherProfile;window.openOtherProfile=async function(u){if(!u)return;let fresh=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();if(fresh.data)u=fresh.data;q('otherProfileName').textContent=u.display_name||'مستخدم';q('otherProfileUsername').textContent=u.username?'@'+u.username:'';q('otherProfilePhone').textContent=u.phone?'📱 '+u.phone:'';q('otherProfileBio').textContent=u.bio||'';q('otherProfileAvatar').innerHTML=u.avatar_url?`<img src="${safe(u.avatar_url)}">`:safe(initials(u.display_name));let status='آخر ظهور غير متاح';if(u.privacy_last_seen!=='nobody'){let allowed=true;if(u.privacy_last_seen==='contacts'){const cr=await sb.from('conversations').select('id').or(`and(user1_id.eq.${me.id},user2_id.eq.${u.id}),and(user1_id.eq.${u.id},user2_id.eq.${me.id})`).limit(1);allowed=!!cr.data?.length}if(allowed)status=userOnlineText(u.last_seen)}q('otherProfileStatus').textContent=status;q('otherProfileModal').classList.remove('hidden');
      if(q('otherNotifyBtn'))q('otherNotifyBtn').onclick=async()=>{const p=await getContactPrefs(u.id);const r=await saveContactPrefs(u.id,{muted:!p.muted});if(r.error)return toast('تعذر حفظ الإعداد');toast(!p.muted?'تم كتم الإشعارات':'تم تشغيل الإشعارات');window.openOtherProfile(u)};
      if(q('otherMediaBtn'))q('otherMediaBtn').onclick=showContactMedia;
      if(q('otherSearchBtn'))q('otherSearchBtn').onclick=showContactSearch;
      if(q('otherPrivacyBtn'))q('otherPrivacyBtn').onclick=showContactPrivacy;
      if(q('otherReportBtn'))q('otherReportBtn').onclick=()=>showContactReportForUser(u);
      if(q('otherBlockBtn'))q('otherBlockBtn').onclick=async()=>{const p=await getContactPrefs(u.id);const r=await saveContactPrefs(u.id,{blocked:!p.blocked});if(r.error)return toast('تعذر حفظ الحظر');toast(!p.blocked?'تم حظر الشخص':'تم إلغاء حظر الشخص');window.openOtherProfile(u)};
      if(q('otherDeleteChatBtn'))q('otherDeleteChatBtn').onclick=async()=>{closeOtherProfile();await deleteChat()};
      if(typeof patchContactActions==='function')setTimeout(patchContactActions,0);};
  }

  // Archived chats: explicit unarchive action inside the archive list.
  const originalRenderChats=renderChats;
  renderChats=async function(archived){
    await originalRenderChats(archived);
    if(!archived)return;
    const target=q('archivedList');if(!target)return;
    target.querySelectorAll('.chat-item[data-cid]').forEach(el=>{const old=el.querySelector('.chat-meta');if(old&&!el.querySelector('.v25-unarchive')){const b=document.createElement('button');b.className='v25-unarchive';b.type='button';b.textContent='إلغاء الأرشفة';b.onclick=async e=>{e.stopPropagation();const c=await sb.from('conversations').select('*').eq('id',el.dataset.cid).single();if(!c.data)return;activeChat={conversation:c.data,user:null};const r=await sb.from('conversation_settings').update({archived:false}).eq('conversation_id',c.data.id).eq('user_id',me.id);if(r.error)return toast('تعذر إلغاء الأرشفة');await loadArchived();toast('تم إلغاء الأرشفة');await loadChats()};old.appendChild(b)}})
  };

  function finalV25(){
    ensureV25CommunityStyles();
    patchExactUsernameSearch();patchContactProfileV25();
    if(typeof ensureCommunityHome==='function')ensureCommunityHome();
    const ref=q('refreshBtn');if(ref){ref.onclick=async()=>{await loadChats();await loadCommunitiesV25();toast('تم التحديث')}}
    if(me)loadCommunitiesV25();
    setTimeout(handleInviteV25,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalV25,{once:true});else finalV25();
  window.loadCommunities=loadCommunitiesV25;window.openCommunity=openCommunityV25;window.openCommunityProfileV25=openCommunityProfileV25;
})();
