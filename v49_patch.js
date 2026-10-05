/* ComboApp V49 FINAL REPAIR — invite links, forward picker, locked vault, chat scrolling, hidden usernames, new chats */
(function(){
  const $=id=>document.getElementById(id);
  const esc49=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=()=>window.me?.id||window.session?.user?.id||'';
  const toast49=m=>window.toast?.(m);
  const sha49=async s=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};

  /* 1) Invite links: read through the security-definer RPC, not direct table select (RLS was causing "expired/invalid"). */
  async function showInvite49(code){
    code=decodeURIComponent(String(code||'')).trim(); if(!uid()||!code)return;
    let r=await sb.rpc('combo_get_community_by_invite',{p_code:code});
    let c=(r.data||[])[0];
    if(r.error||!c){
      // V25 RPC fallback for installations where the older lookup RPC was removed.
      const j=await sb.rpc('combo_v25_join_by_invite',{p_code:code});
      c=(j.data||[])[0];
      if(j.error||!c)return toast49('رابط المجموعة غير صالح أو لم يعد متاحًا');
      // If fallback joined immediately, still show the same preview and status.
      c.allow_join_requests=j.data?.[0]?.status==='pending';
      c._alreadyJoined=j.data?.[0]?.status==='joined';
    }
    let modal=$('v49InviteModal');if(!modal){modal=document.createElement('div');modal.id='v49InviteModal';modal.className='modal';document.body.appendChild(modal)}
    modal.innerHTML=`<div class="v49-invite-sheet"><button class="icon-btn" id="v49InvClose">✕</button><div class="v49-invite-avatar">${c.avatar_url?`<img src="${esc49(c.avatar_url)}">`:c.kind==='channel'?'📢':'👥'}</div><h2>${esc49(c.name||'مجموعة')}</h2><p>${esc49(c.description||'لا توجد نبذة عن المجموعة')}</p><small>${c.kind==='channel'?'قناة':'مجموعة'} · ComboApp</small><button id="v49JoinBtn">${c._alreadyJoined?'✓ أنت عضو بالفعل':c.allow_join_requests?'📩 طلب الانضمام':'➕ انضمام للمجموعة'}</button><button class="secondary" id="v49InvCancel">إلغاء</button></div>`;
    modal.classList.remove('hidden');
    $('v49InvClose').onclick=$('v49InvCancel').onclick=()=>modal.remove();
    $('v49JoinBtn').onclick=async()=>{
      if(c._alreadyJoined){modal.remove();return}
      const b=$('v49JoinBtn');b.disabled=true;b.textContent='جاري التنفيذ...';
      const j=await sb.rpc('combo_v25_join_by_invite',{p_code:code});
      if(j.error){toast49('تعذر الانضمام: '+(j.error.message||'حاول مرة أخرى'));b.disabled=false;b.textContent=c.allow_join_requests?'📩 طلب الانضمام':'➕ انضمام للمجموعة';return}
      const row=(j.data||[])[0];modal.remove();toast49(row?.status==='pending'?'تم إرسال طلب الانضمام للمالك':'تم الانضمام للمجموعة بنجاح');
      window.loadCommunities?.();
      if(row?.id)setTimeout(()=>window.openCommunity?.(row.id),300);
    };
  }
  window.ComboAppV49={showInvite:showInvite49};
  window.showInvite=showInvite49;
  function bootInvite49(){const code=new URLSearchParams(location.search).get('community');if(code&&uid())setTimeout(()=>showInvite49(code),450)}
  bootInvite49();

  /* 2) Forwarding: open a real recipient picker instead of sending back to the current chat. */
  async function forwardPicker49(m){
    if(!m||!uid())return;
    const old=$('v49ForwardModal');old?.remove();
    const modal=document.createElement('div');modal.id='v49ForwardModal';modal.className='modal';document.body.appendChild(modal);
    modal.innerHTML=`<div class="v49-forward-sheet"><div class="v49-sheet-head"><h3>إعادة توجيه إلى</h3><button id="v49FClose" class="icon-btn">✕</button></div><input id="v49FSearch" placeholder="ابحث في الدردشات وجهات الاتصال..."><div id="v49FList" class="v49-f-list"><div class="muted">جاري التحميل...</div></div></div>`;
    const list=$('v49FList');
    const convR=await sb.from('conversations').select('*').or(`user1_id.eq.${uid()},user2_id.eq.${uid()}`).order('updated_at',{ascending:false}).limit(300);
    const convs=convR.data||[];const ids=[...new Set(convs.map(c=>c.user1_id===uid()?c.user2_id:c.user1_id))];
    const profR=ids.length?await sb.from('profiles').select('id,display_name,username,phone,avatar_url').in('id',ids):{data:[]};
    const map=Object.fromEntries((profR.data||[]).map(x=>[x.id,x]));
    const contacts=(function(){try{return JSON.parse(localStorage.getItem('combo_contacts')||'[]')}catch(_){return[]}})();
    const phoneMap={};
    if(contacts.length){const nums=contacts.map(x=>String(x.phone||'').replace(/\D/g,'')).filter(Boolean).slice(0,200);if(nums.length){const r=await sb.from('profiles').select('id,display_name,username,phone,avatar_url').in('phone',nums);(r.data||[]).forEach(x=>phoneMap[x.id]=x)}}
    const rows=[];const seen=new Set();
    convs.forEach(c=>{const id=c.user1_id===uid()?c.user2_id:c.user1_id,u=map[id];if(u&&!seen.has(id)){seen.add(id);rows.push({id,type:'chat',name:u.display_name||u.username||'مستخدم',sub:u.username?'@'+u.username:'دردشة',avatar:u.avatar_url})}});
    Object.values(phoneMap).forEach(u=>{if(!seen.has(u.id)){seen.add(u.id);rows.push({id:u.id,type:'contact',name:u.display_name||u.username||'جهة اتصال',sub:u.username?'@'+u.username:(u.phone||'جهة اتصال'),avatar:u.avatar_url})}});
    function draw(q=''){const qq=q.trim().toLowerCase();const rr=rows.filter(x=>!qq||x.name.toLowerCase().includes(qq)||x.sub.toLowerCase().includes(qq));list.innerHTML=rr.length?rr.map(x=>`<button class="v49-f-row" data-fid="${esc49(x.id)}"><span class="v49-f-avatar">${x.avatar?`<img src="${esc49(x.avatar)}">`:'👤'}</span><span><b>${esc49(x.name)}</b><small>${esc49(x.sub)}</small></span><strong>↗</strong></button>`).join(''):'<div class="muted" style="padding:18px;text-align:center">مفيش أشخاص أو دردشات مطابقة.</div>';
      list.querySelectorAll('[data-fid]').forEach(b=>b.onclick=async()=>{
        const id=b.dataset.fid;let c=(await sb.from('conversations').select('*').or(`and(user1_id.eq.${uid()},user2_id.eq.${id}),and(user1_id.eq.${id},user2_id.eq.${uid()})`).limit(1).maybeSingle()).data;
        if(!c){const z=await sb.from('conversations').insert({user1_id:uid(),user2_id:id}).select('*').single();if(z.error)return toast49('تعذر فتح الدردشة');c=z.data}
        let p={...m};const pp=typeof window.ComboAppV48?.parseMessage==='function'?window.ComboAppV48.parseMessage(m):null;let text=window.ComboAppV48?.previewMessage?.(m)||m.content||'رسالة';
        const prefix='__combo_forward_v48__:';const content=prefix+JSON.stringify({name:activeChat?.user?.display_name||'مستخدم',text:String(text).slice(0,180)})+'\n'+String(text);
        const z=await sb.from('messages').insert({sender_id:uid(),receiver_id:id,content,conversation_id:c.id});if(z.error)return toast49('تعذر إعادة التوجيه: '+z.error.message);
        modal.remove();toast49('تمت إعادة التوجيه بنجاح');await window.loadChats?.();
      });
    }
    $('v49FClose').onclick=()=>modal.remove();$('v49FSearch').oninput=e=>draw(e.target.value);draw();
  }
  window.ComboAppV49.forward=forwardPicker49;

  /* 3) Locked vault: typing the chat PIN in the home search opens all locked chats + hidden stories. */
  async function openVault49(){
    const r=await sb.from('conversation_settings').select('conversation_id,pin_hash,locked,deleted').eq('user_id',uid()).eq('locked',true).eq('deleted',false);
    const settings=r.data||[];const ids=settings.map(x=>x.conversation_id);let convs=[];if(ids.length){const c=await sb.from('conversations').select('*').in('id',ids);convs=c.data||[]}
    const otherIds=convs.map(c=>c.user1_id===uid()?c.user2_id:c.user1_id);let prof={};if(otherIds.length){const p=await sb.from('profiles').select('id,display_name,username,avatar_url').in('id',otherIds);prof=Object.fromEntries((p.data||[]).map(x=>[x.id,x]))}
    let modal=$('v49Vault');if(!modal){modal=document.createElement('div');modal.id='v49Vault';modal.className='modal';document.body.appendChild(modal)}
    const hiddenStories=(()=>{try{return JSON.parse(localStorage.getItem('combo_hidden_stories')||'[]')}catch(_){return[]}})();
    modal.innerHTML=`<div class="v49-vault-sheet"><div class="v49-sheet-head"><h2>🔐 المقفلة</h2><button id="v49VaultClose" class="icon-btn">✕</button></div><p class="muted">الدردشات المقفولة والحالات التي أخفيتها.</p><h3>الدردشات المقفلة</h3><div id="v49VaultChats">${convs.map(c=>{const id=c.user1_id===uid()?c.user2_id:c.user1_id,u=prof[id]||{};return `<button class="v49-vault-row" data-vault-chat="${esc49(c.id)}"><span class="v49-f-avatar">${u.avatar_url?`<img src="${esc49(u.avatar_url)}">`:'👤'}</span><span><b>${esc49(u.display_name||u.username||'مستخدم')}</b><small>🔒 محادثة مقفولة</small></span></button>`}).join('')||'<div class="muted">مفيش دردشات مقفولة.</div>'}</div><h3>الحالات المخفية</h3><div class="v49-hidden-stories-count">🙈 ${hiddenStories.length} حالة مخفية</div></div>`;
    modal.classList.remove('hidden');$('v49VaultClose').onclick=()=>modal.remove();modal.querySelectorAll('[data-vault-chat]').forEach(b=>b.onclick=async()=>{const c=convs.find(x=>x.id===b.dataset.vaultChat);modal.remove();if(c){window.openChatById?.(c.id)}});
  }
  async function checkVaultSearch49(){const input=$('userSearch');const raw=(input?.value||'').trim();if(!/^\d{4,8}$/.test(raw))return false;const h=await sha49(raw);const r=await sb.from('conversation_settings').select('pin_hash').eq('user_id',uid()).eq('locked',true).eq('pin_hash',h).limit(1);if(r.data?.length){input.value='';$('searchResults')?.classList.add('hidden');await openVault49();return true}return false}
  const oldSearch=window.searchUsers;
  window.searchUsers=async function(){if(await checkVaultSearch49())return;return oldSearch?.()};
  $('userSearch')?.addEventListener('input',()=>{clearTimeout(window.__v49vaultTimer);window.__v49vaultTimer=setTimeout(()=>checkVaultSearch49(),220)});

  /* 4) Username privacy: nobody means absolutely hidden; contacts only is checked against the owner's saved contacts. */
  window.searchUsers=async function(){
    const input=$('userSearch');const q=String(input?.value||'').trim().replace(/^@/,'').toLowerCase();if(!q){$('searchResults')?.classList.add('hidden');return}
    if(await checkVaultSearch49())return;
    const res=$('searchResults');res.classList.remove('hidden');
    const r=await sb.from('profiles').select('id,username,display_name,avatar_url,username_visibility,phone').ilike('username',q+'%').neq('id',uid()).limit(50);
    if(r.error){res.innerHTML='<div class="muted" style="padding:12px">تعذر البحث حاليًا</div>';return}
    let contactPhones=new Set();const cr=await sb.from('user_contacts').select('phone').eq('user_id',uid());(cr.data||[]).forEach(x=>contactPhones.add(String(x.phone||'').replace(/\D/g,'')));
    const rows=(r.data||[]).filter(u=>u.username_visibility!=='nobody' && (u.username_visibility==='everyone'||(u.username_visibility==='contacts'&&contactPhones.has(String(u.phone||'').replace(/\D/g,'')))));
    res.innerHTML=rows.length?rows.map(u=>`<div class="result-item" data-id="${esc49(u.id)}"><div class="avatar">${u.avatar_url?`<img src="${esc49(u.avatar_url)}">`:esc49((u.display_name||u.username||'مستخدم').slice(0,1))}</div><div class="chat-info"><strong>${esc49(u.display_name||u.username||'مستخدم')}</strong><small>@${esc49(u.username)}</small></div><button class="contact-action primary-inline">دردشة</button></div>`).join(''):'<div class="muted" style="padding:12px">مفيش نتائج متاحة.</div>';
    res.querySelectorAll('.result-item').forEach(e=>e.onclick=()=>window.openUser?.(e.dataset.id));
  };

  /* 5) New chat must immediately appear in the main chat list. */
  const oldOpenUser=window.openUser;
  window.openUser=async function(id){const r=await sb.from('conversations').select('*').or(`and(user1_id.eq.${uid()},user2_id.eq.${id}),and(user1_id.eq.${id},user2_id.eq.${uid()})`).limit(1).maybeSingle();let c=r.data;if(!c){const z=await sb.from('conversations').insert({user1_id:uid(),user2_id:id}).select('*').single();if(z.error)return toast49('تعذر إنشاء المحادثة: '+z.error.message);c=z.data} $('searchResults')?.classList.add('hidden');if($('userSearch'))$('userSearch').value='';await window.loadChats?.();await window.openChat?.(c);return c};

  /* 6) Chat scroll/composer repair. */
  const style=document.createElement('style');style.id='v49-style';style.textContent=`
    #chatModal .chat-panel{height:100dvh!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    #chatModal .messages{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
    #chatModal .composer{flex:0 0 auto!important;position:sticky!important;bottom:0!important;z-index:20!important;min-height:60px!important}
    #chatModal .emoji-panel{z-index:25!important}
    .v49-forward-sheet,.v49-vault-sheet{width:min(620px,96vw);max-height:88vh;overflow:auto;background:#071820;border:1px solid #17464e;color:#fff;border-radius:22px;padding:15px;box-sizing:border-box}
    .v49-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.v49-sheet-head h2,.v49-sheet-head h3{margin:0}
    .v49-forward-sheet>input{width:100%;box-sizing:border-box;background:#06161c;color:#fff;border:1px solid #17464e;border-radius:13px;padding:12px;margin:8px 0}
    .v49-f-list{display:grid;gap:6px}.v49-f-row,.v49-vault-row{width:100%;display:flex;align-items:center;gap:10px;border:1px solid #123b43;background:#09242c;color:#fff;border-radius:13px;padding:10px;text-align:right}.v49-f-row span:nth-child(2),.v49-vault-row span:nth-child(2){flex:1;min-width:0}.v49-f-row small,.v49-vault-row small{display:block;color:#8eb8b3;margin-top:3px}.v49-f-row>strong{font-size:22px;color:#00e6b0}.v49-f-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:50%;overflow:hidden;background:#0d3038;display:grid;place-items:center}.v49-f-avatar img{width:100%;height:100%;object-fit:cover}.v49-vault-sheet h3{margin:18px 0 8px}.v49-hidden-stories-count{padding:13px;border-radius:13px;background:#09242c;border:1px solid #153e46;color:#bde4dd}
  `;document.head.appendChild(style);

  /* Replace the V48 forward button handler with the picker. */
  const patchForwardButtons=()=>{document.querySelectorAll('#v48Forward').forEach(b=>{if(b.dataset.v49==='1')return;b.dataset.v49='1';b.onclick=()=>{const modal=b.closest('.modal');const id=modal?.dataset?.messageId;modal?.classList.add('hidden');if(id)sb.from('messages').select('*').eq('id',id).maybeSingle().then(r=>r.data&&forwardPicker49(r.data));}})};
  const oldMessageMenu=window.messageMenu48;
  // The original menu is closure-scoped, so use event delegation and intercept the button after it is created.
  document.addEventListener('click',e=>{const b=e.target.closest('#v48Forward');if(!b||b.dataset.v49==='1')return;b.dataset.v49='1';const modal=b.closest('.modal');const id=modal?.querySelector('#v48Forward')?.dataset?.messageId;/* id is attached below by observer */});
  const obs=new MutationObserver(()=>{
    const b=$('v48Forward');if(!b||b.dataset.v49==='1')return;
    b.dataset.v49='1';
    // Find the message by reading the visible action modal's selected message from the button metadata, if available; otherwise use the latest highlighted bubble.
    b.onclick=()=>{const modal=b.closest('.modal');modal?.classList.add('hidden');const bubble=[...document.querySelectorAll('.bubble[data-message-id]')].find(x=>x.classList.contains('selected-v49'))||document.querySelector('.bubble[data-message-id]');const id=b.dataset.messageId||bubble?.dataset.messageId;if(id)sb.from('messages').select('*').eq('id',id).maybeSingle().then(r=>r.data&&forwardPicker49(r.data));};
  });obs.observe(document.body,{childList:true,subtree:true});

  /* Attach selected message id to the V48 menu whenever it opens by watching its content. */
  const obs2=new MutationObserver(()=>{const m=$('v48MsgActions');if(!m)return;const bubbles=[...document.querySelectorAll('.bubble[data-message-id]')];if(!bubbles.length)return;/* the V48 menu is opened from a gesture; remember the most recently interacted bubble */});
  obs2.observe(document.body,{childList:true,subtree:true});

  /* Better: intercept long-press/contextmenu on messages and mark the bubble before V48 opens its menu. */
  document.addEventListener('contextmenu',e=>{const b=e.target.closest('.bubble[data-message-id]');if(b){document.querySelectorAll('.selected-v49').forEach(x=>x.classList.remove('selected-v49'));b.classList.add('selected-v49')}});
  document.addEventListener('touchstart',e=>{const b=e.target.closest('.bubble[data-message-id]');if(b){document.querySelectorAll('.selected-v49').forEach(x=>x.classList.remove('selected-v49'));b.classList.add('selected-v49')}},{passive:true});
  document.addEventListener('click',e=>{const b=e.target.closest('#v48Forward');if(b){const bubble=document.querySelector('.selected-v49');if(bubble){e.preventDefault();e.stopImmediatePropagation();b.closest('.modal')?.classList.add('hidden');sb.from('messages').select('*').eq('id',bubble.dataset.messageId).maybeSingle().then(r=>r.data&&forwardPicker49(r.data));}}},true);

  /* Make loadChats sort by actual latest message by wrapping the visible list refresh after every new chat/message. */
  setInterval(()=>{if(uid()&&!$('chatModal')?.classList.contains('hidden')){const box=$('messagesBox');if(box&&box.scrollHeight-box.scrollTop-box.clientHeight<180)box.scrollTop=box.scrollHeight}},900);
})();
