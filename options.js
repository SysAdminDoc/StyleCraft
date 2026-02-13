(async function(){
  const $=id=>document.getElementById(id);
  const send=msg=>new Promise(r=>chrome.runtime.sendMessage(msg,r));

  /* Tabs */
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      $('tab-'+btn.dataset.tab).classList.add('active');
    });
  });

  /* Load */
  let allData=await send({action:'sc-get-all-data'})||{};
  let settings=await send({action:'sc-get-settings'})||{};

  // Apply theme
  SC_APPLY_THEME(settings.theme || 'catppuccin');

  // Theme dropdown in settings
  const themeSelect=$('set-theme');
  if(themeSelect){
    themeSelect.value=settings.theme||'catppuccin';
    themeSelect.addEventListener('change',()=>{
      settings.theme=themeSelect.value;
      SC_APPLY_THEME(themeSelect.value);
      send({action:'sc-save-settings',settings});
      chrome.runtime.sendMessage({action:'sc-theme-changed',theme:themeSelect.value});
    });
  }

  // Listen for theme changes from other UIs
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.action==='sc-theme-changed'&&msg.theme){
      SC_APPLY_THEME(msg.theme);
      if(themeSelect)themeSelect.value=msg.theme;
      settings.theme=msg.theme;
    }
  });

  /* Stats */
  function updateStats(){
    const domains=Object.keys(allData);
    let tc=0,cl=0;
    for(const d of domains){
      tc+=Object.keys(allData[d].themes||{}).length;
      cl+=(allData[d].customCSS||'').split('\n').filter(l=>l.trim()).length;
    }
    $('stat-sites').textContent=domains.length;
    $('stat-themes').textContent=tc;
    $('stat-css').textContent=cl;
  }
  updateStats();

  chrome.storage.local.getBytesInUse(null,bytes=>{
    const kb=(bytes/1024).toFixed(1);
    $('storage-size').textContent=kb+' KB';
    $('storage-desc').textContent=bytes>100000?'Consider exporting and cleaning old styles':'Healthy';
  });

  /* ─── CUSTOM CSS TAB ─── */
  function renderStyles(filter=''){
    const list=$('styles-list');
    const entries=Object.entries(allData).filter(([d,data])=>(data.customCSS||'').trim()&&(!filter||d.toLowerCase().includes(filter.toLowerCase()))).sort((a,b)=>a[0].localeCompare(b[0]));
    if(!entries.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">&#x1F3A8;</div><div class="empty-text">'+(filter?'No matching styles':'No custom CSS saved yet. Open the editor on any site to get started.')+'</div></div>';return;}
    list.innerHTML=entries.map(([domain,data])=>{
      const lines=(data.customCSS||'').split('\n').length;
      return '<div class="card" data-domain="'+esc(domain)+'"><div class="card-header"><div><div class="card-domain">'+esc(domain)+'</div><div class="card-meta">'+lines+' lines &middot; Custom CSS '+(data.customEnabled!==false?'enabled':'disabled')+'</div></div><div class="card-actions"><label class="toggle"><input type="checkbox" class="toggle-custom" '+(data.customEnabled!==false?'checked':'')+'/><span class="toggle-sl"></span></label><button class="card-btn edit-btn" title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="card-btn danger delete-btn" title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></div><div class="card-body"><textarea class="editor-area css-ed" spellcheck="false">'+esc(data.customCSS||'')+'</textarea><div class="editor-row"><button class="save-btn save-css">Save</button></div></div></div>';
    }).join('');
    wireStyleCards();
  }
  function wireStyleCards(){
    $('styles-list').querySelectorAll('.card').forEach(card=>{
      const domain=card.dataset.domain;
      card.querySelector('.edit-btn').addEventListener('click',()=>card.classList.toggle('expanded'));
      card.querySelector('.toggle-custom').addEventListener('change',e=>{send({action:'sc-toggle-custom',domain,enabled:e.target.checked});allData[domain].customEnabled=e.target.checked;});
      card.querySelector('.delete-btn').addEventListener('click',()=>{allData[domain].customCSS='';send({action:'sc-save-custom',domain,css:'',enabled:true}).then(()=>{renderStyles($('search-styles').value);updateStats();toast('Deleted CSS for '+domain);});});
      const sb=card.querySelector('.save-css');
      if(sb)sb.addEventListener('click',()=>{const css=card.querySelector('.css-ed').value;allData[domain].customCSS=css;send({action:'sc-save-custom',domain,css,enabled:allData[domain].customEnabled!==false}).then(()=>{toast('Saved CSS for '+domain);updateStats();});});
    });
  }
  renderStyles();
  $('search-styles').addEventListener('input',e=>renderStyles(e.target.value));

  /* ─── THEMES TAB ─── */
  function renderThemes(filter=''){
    const list=$('themes-list');
    const entries=[];
    for(const[domain,data]of Object.entries(allData)){
      for(const[id,theme]of Object.entries(data.themes||{})){
        if(!filter||(theme.name||'').toLowerCase().includes(filter.toLowerCase())||domain.toLowerCase().includes(filter.toLowerCase()))
          entries.push({domain,id,theme});
      }
    }
    if(!entries.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">&#x1F3A8;</div><div class="empty-text">'+(filter?'No matching themes':'No themes installed. Use the popup to browse UserStyles.world.')+'</div></div>';return;}
    list.innerHTML=entries.map(({domain,id,theme})=>{
      const lines=((theme.rawCSS||theme.css||'').match(/\n/g)||[]).length+1;
      return '<div class="card" data-domain="'+esc(domain)+'" data-id="'+esc(id)+'"><div class="card-header"><div><div class="theme-domain">'+esc(domain)+'</div><div class="theme-name">'+esc(theme.name||'Theme #'+id)+'</div><div class="card-meta">'+lines+' lines &middot; USw #'+esc(id)+' &middot; '+(theme.enabled!==false?'Enabled':'Disabled')+'</div></div><div class="card-actions"><label class="toggle"><input type="checkbox" class="toggle-theme" '+(theme.enabled!==false?'checked':'')+'/><span class="toggle-sl"></span></label><button class="card-btn edit-btn" title="Edit CSS"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="card-btn danger delete-btn" title="Uninstall"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></div><div class="card-body"><textarea class="editor-area theme-ed" spellcheck="false">'+esc(theme.rawCSS||theme.css||'')+'</textarea><div class="editor-row"><button class="save-btn save-theme">Save Theme CSS</button></div></div></div>';
    }).join('');
    wireThemeCards();
  }
  function wireThemeCards(){
    $('themes-list').querySelectorAll('.card').forEach(card=>{
      const domain=card.dataset.domain,id=card.dataset.id;
      card.querySelector('.edit-btn').addEventListener('click',()=>card.classList.toggle('expanded'));
      card.querySelector('.toggle-theme').addEventListener('change',e=>{allData[domain].themes[id].enabled=e.target.checked;send({action:'sc-save-domain-data',domain,data:allData[domain]});});
      card.querySelector('.delete-btn').addEventListener('click',()=>{send({action:'sc-uninstall-style',id,domain}).then(()=>{delete allData[domain].themes[id];renderThemes($('search-themes').value);updateStats();toast('Uninstalled theme');});});
      const sb=card.querySelector('.save-theme');
      if(sb)sb.addEventListener('click',()=>{const css=card.querySelector('.theme-ed').value;allData[domain].themes[id].rawCSS=css;send({action:'sc-save-domain-data',domain,data:allData[domain]}).then(()=>toast('Theme CSS saved'));});
    });
  }
  renderThemes();
  $('search-themes').addEventListener('input',e=>renderThemes(e.target.value));

  /* ─── GLOBAL CSS ─── */
  $('global-css').value=settings.globalCSS||'';
  $('save-global').addEventListener('click',()=>{settings.globalCSS=$('global-css').value;send({action:'sc-save-settings',settings}).then(()=>toast('Global CSS saved'));});

  /* ─── SETTINGS ─── */
  $('set-panel-width').value=settings.panelWidth||420;
  $('set-font-size').value=settings.fontSize||12;
  $('set-auto-picker').checked=settings.autoPicker!==false;
  $('set-default-tab').value=settings.defaultTab||'selector';
  $('set-custom-on-top').checked=settings.customOnTop!==false;
  $('set-important').checked=settings.useImportant===true;
  $('set-live-preview').checked=settings.livePreview!==false;
  $('set-accent').value=settings.accentColor||'#cba6f7';
  $('set-highlight').value=settings.highlightColor||'#89b4fa';

  $('save-settings').addEventListener('click',()=>{
    settings.panelWidth=parseInt($('set-panel-width').value)||420;
    settings.fontSize=parseInt($('set-font-size').value)||12;
    settings.autoPicker=$('set-auto-picker').checked;
    settings.defaultTab=$('set-default-tab').value;
    settings.customOnTop=$('set-custom-on-top').checked;
    settings.useImportant=$('set-important').checked;
    settings.livePreview=$('set-live-preview').checked;
    settings.accentColor=$('set-accent').value;
    settings.highlightColor=$('set-highlight').value;
    send({action:'sc-save-settings',settings}).then(()=>toast('Settings saved'));
  });

  $('shortcuts-link').addEventListener('click',e=>{e.preventDefault();navigator.clipboard.writeText('chrome://extensions/shortcuts').then(()=>toast('URL copied! Paste it in your address bar'));});

  /* ─── BROWSE THEMES ─── */
  let browseInstalled=new Set();
  function updateBrowseInstalled(){
    browseInstalled.clear();
    for(const data of Object.values(allData)){
      for(const id of Object.keys(data.themes||{})) browseInstalled.add(id);
    }
  }
  updateBrowseInstalled();

  $('browse-go').addEventListener('click',doBrowseSearch);
  $('browse-query').addEventListener('keydown',e=>{if(e.key==='Enter')doBrowseSearch();});

  async function doBrowseSearch(){
    const q=$('browse-query').value.trim();
    if(!q){toast('Enter a search term');return;}
    const status=$('browse-status');
    const results=$('browse-results');
    status.style.display='block';status.textContent='Searching...';
    results.innerHTML='';
    const res=await send({action:'sc-search-styles',query:q,domain:''});
    status.style.display='none';
    if(!res||res.error){results.innerHTML='<div class="empty-state"><div class="empty-text">Search failed: '+(res?.error||'Unknown error')+'</div></div>';return;}
    if(!res.styles||!res.styles.length){results.innerHTML='<div class="empty-state"><div class="empty-text">No styles found for "'+esc(q)+'"</div></div>';return;}
    if(res.installed)res.installed.forEach(id=>browseInstalled.add(id));
    results.innerHTML=res.styles.map(s=>{
      const inst=browseInstalled.has(s.id);
      const thumbHtml=s.thumb?'<img class="browse-thumb" src="'+esc(s.thumb)+'" loading="lazy"/>':'';
      return '<div class="browse-card'+(inst?' installed':'')+'" data-id="'+esc(s.id)+'" data-name="'+esc(s.name)+'">'+
        thumbHtml+
        '<div class="browse-info"><div class="browse-name">'+esc(s.name)+'</div>'+
        '<div class="browse-author">'+(s.author?'by '+esc(s.author):'')+'</div>'+
        '<div class="browse-actions">'+
        '<button class="browse-btn install'+(inst?' done':'')+'">'+(inst?'Installed':'Install')+'</button>'+
        (inst?'<button class="browse-btn uninstall">Uninstall</button>':'')+
        '<a href="'+esc(s.url)+'" target="_blank" style="font-size:10px;color:#89b4fa;text-decoration:none;margin-left:4px">View</a>'+
        '<span class="browse-installs">'+esc(s.installs)+' installs</span>'+
        '</div></div></div>';
    }).join('');
    wireBrowseCards();
  }

  function wireBrowseCards(){
    $('browse-results').querySelectorAll('.browse-card').forEach(card=>{
      const id=card.dataset.id,name=card.dataset.name;
      const instBtn=card.querySelector('.install');
      instBtn.addEventListener('click',()=>{
        if(instBtn.classList.contains('done'))return;
        instBtn.disabled=true;instBtn.textContent='...';
        // Use first matching domain or prompt — for options page, ask for domain
        const domain=$('browse-query').value.trim().replace(/\s+/g,'').toLowerCase();
        send({action:'sc-install-style',id,name,domain}).then(async res=>{
          instBtn.disabled=false;
          if(res&&res.ok){
            instBtn.classList.add('done');instBtn.textContent='Installed';
            browseInstalled.add(id);card.classList.add('installed');
            // Add uninstall button if not present
            if(!card.querySelector('.uninstall')){
              const ubtn=document.createElement('button');
              ubtn.className='browse-btn uninstall';ubtn.textContent='Uninstall';
              ubtn.addEventListener('click',()=>doUninstallBrowse(card,id,domain));
              instBtn.after(ubtn);
            }
            allData=await send({action:'sc-get-all-data'})||{};
            renderThemes();updateStats();
            toast('Installed: '+(res.name||name));
          }else{instBtn.textContent=res?.error||'Failed';setTimeout(()=>{instBtn.textContent='Install';},2000);}
        });
      });
      const unBtn=card.querySelector('.uninstall');
      if(unBtn){
        const domain=$('browse-query').value.trim().replace(/\s+/g,'').toLowerCase();
        unBtn.addEventListener('click',()=>doUninstallBrowse(card,id,domain));
      }
    });
  }

  async function doUninstallBrowse(card,id,domain){
    // Find actual domain for this theme
    let actualDomain=domain;
    for(const[d,data]of Object.entries(allData)){
      if(data.themes&&data.themes[id]){actualDomain=d;break;}
    }
    const res=await send({action:'sc-uninstall-style',id,domain:actualDomain});
    if(res&&res.ok){
      browseInstalled.delete(id);card.classList.remove('installed');
      const instBtn=card.querySelector('.install');
      if(instBtn){instBtn.classList.remove('done');instBtn.textContent='Install';}
      const unBtn=card.querySelector('.uninstall');if(unBtn)unBtn.remove();
      allData=await send({action:'sc-get-all-data'})||{};
      renderThemes();updateStats();
      toast('Uninstalled');
    }
  }

  /* ─── TAB SELECTION VIA MESSAGE (from editor nav buttons) ─── */
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.action==='sc-select-options-tab'&&msg.tab){
      const tabName=msg.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      const btn=document.querySelector('.tab-btn[data-tab="'+tabName+'"]');
      if(btn)btn.classList.add('active');
      const content=$('tab-'+tabName);
      if(content)content.classList.add('active');
    }
  });
  // Also check URL hash on load
  const hashTab=location.hash.replace('#','');
  if(hashTab){
    const btn=document.querySelector('.tab-btn[data-tab="'+hashTab+'"]');
    if(btn)btn.click();
  }

  /* ─── IMPORT/EXPORT ─── */
  $('btn-export').addEventListener('click',()=>{
    const exp={data:allData,settings,version:'1.0.0',exported:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(exp,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='stylecraft-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
    toast('Exported '+Object.keys(allData).length+' domains');
  });
  const importFile=$('import-file');
  $('btn-import').addEventListener('click',()=>importFile.click());
  importFile.addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const raw=JSON.parse(reader.result);
        const imported=raw.data||raw;
        send({action:'sc-import-all',data:imported}).then(async()=>{
          allData=await send({action:'sc-get-all-data'})||{};
          if(raw.settings){settings=Object.assign(settings,raw.settings);send({action:'sc-save-settings',settings});}
          renderStyles();renderThemes();updateStats();
          toast('Imported '+Object.keys(imported).length+' domains');
        });
      }catch{toast('Invalid JSON file');}
    };
    reader.readAsText(file);importFile.value='';
  });

  $('btn-reset').addEventListener('click',()=>{
    if(!confirm('Delete ALL styles, themes, and settings? This cannot be undone.'))return;
    chrome.storage.local.clear(()=>{allData={};renderStyles();renderThemes();updateStats();$('global-css').value='';toast('All data cleared');});
  });

  function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2000);}
})();
