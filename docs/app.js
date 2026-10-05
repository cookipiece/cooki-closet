'use strict';
(() => {
  const data=window.MILLTINA_CATALOGUE;
  const $=id=>document.getElementById(id);
  if(!data||data.schema!=='milltina-web-catalogue-v1'){$('empty').hidden=false;$('empty').textContent='목록을 읽지 못했어요.';return;}
  // Hide the parts-only Preppy Look record; retain the complete outfit W0027.
  const hiddenIds=new Set(['W0205']);
  const entries=data.entries.filter(e=>!hiddenIds.has(e.id)).sort((a,b)=>Number(Object.keys(b.photos||{}).length>0)-Number(Object.keys(a.photos||{}).length>0)), byId=new Map(entries.map(e=>[e.id,e]));
  const views={front:'정면',threeQuarter:'사선',back:'뒷면'};
  const viewFiles={front:'front',threeQuarter:'three-quarter',back:'back'};
  const partsData=window.MILLTINA_PARTS;
  const requestPreference='cooki-closet:request-tools';
  const requestToggles=[...document.querySelectorAll('[data-request-toggle]')];
  let limit=30,selected=null,selectedPart=null,selectedView='front',lastTrigger=null,requestTools=false;
  const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
  const norm=v=>v.normalize('NFKC').toLocaleLowerCase().trim();
  const moods=[...new Set(entries.flatMap(e=>e.moods||[]))].sort((a,b)=>a.localeCompare(b,'ko'));
  for(const mood of moods)$('mood').append(new Option(mood,mood));
  $('mood').hidden=!moods.length;
  for(let i=1;i<=8;i++)$('target-slot').append(new Option(i+'번 의상',String(i)));
  try{requestTools=localStorage.getItem(requestPreference)==='true';}catch{}
  function setRequestTools(visible,persist=false){
    requestTools=visible;$('request-controls').hidden=!visible;
    requestToggles.forEach(button=>button.setAttribute('aria-pressed',String(visible)));
    if(persist)try{localStorage.setItem(requestPreference,String(visible));}catch{}
  }
  requestToggles.forEach(button=>button.addEventListener('click',()=>setRequestTools(!requestTools,true)));
  setRequestTools(requestTools);
  const moodNodes=e=>(e.moods||[]).map(m=>el('span','mood-tag',m));
  function photoSource(entry,view,part=null){
    if(!/^W\d{4}$/.test(entry.id)||!Object.hasOwn(viewFiles,view))return '';
    const src=(part||entry).photos?.[view];
    const base='photos/'+entry.id+'/',file=viewFiles[view];
    if(part)return /^P(?:\d{3}|[0-9a-f]{12})$/.test(part.id)&&src===base+'parts/'+part.id+'/'+file+'.webp'?src:'';
    return ['webp','png','jpg'].some(ext=>src===base+file+'.'+ext)?src+'?v=20261006-fullparts':'';
  }
  function partsFor(entry){
    const parts=partsData?.schema==='cooki-wardrobe-parts-v1'?partsData.entries?.[entry.id]:null;
    if(!Array.isArray(parts))return [];
    const seen=new Set();
    return parts.filter(part=>{
      if(!part||!/^P(?:\d{3}|[0-9a-f]{12})$/.test(part.id)||typeof part.name!=='string'||!part.name.trim()||seen.has(part.id)||!Object.keys(views).some(view=>photoSource(entry,view,part))||!Object.keys(views).every(view=>!part.photos?.[view]||photoSource(entry,view,part)))return false;
      seen.add(part.id);return true;
    });
  }
  function photo(entry,view='front',eager=false,part=null){
    const frame=el('div','frame tone-'+(Number(entry.id.slice(1))%5));
    const src=photoSource(entry,view,part);
    if(src){
      const image=el('img');image.src=src;image.alt=entry.name+(part?' · '+part.name:'')+' '+views[view];image.width=1200;image.height=1500;image.decoding='async';
      if(eager)image.fetchPriority='high';else image.loading='lazy';
      image.addEventListener('error',()=>{image.remove();frame.append(el('span','pending','사진 없음'));},{once:true});frame.append(image);
    }else frame.append(el('span','pending','사진 없음'));
    return frame;
  }
  function card(entry,index){
    const article=el('article','card'),button=el('button');button.type='button';button.setAttribute('aria-label',entry.id+' '+entry.name+' 보기');
    const tags=el('div','moods');tags.append(...moodNodes(entry));
    button.append(photo(entry,entry.photos.threeQuarter?'threeQuarter':Object.keys(entry.photos)[0]||'front',index===0),el('h2','',entry.name),tags);
    button.addEventListener('click',()=>openDetail(entry.id,button));article.append(button);return article;
  }
  function render(){
    const q=norm($('search').value),category=$('category').value,mood=$('mood').value;
    const filtered=entries.filter(e=>(q||Object.keys(e.photos||{}).length>0)&&(!q||norm([e.id,e.name,...(e.moods||[])].join(' ')).includes(q))&&(category==='all'||e.group===category)&&(mood==='all'||e.moods?.includes(mood)));
    $('grid').replaceChildren(...filtered.slice(0,limit).map(card));$('empty').hidden=!!filtered.length;$('more').hidden=filtered.length<=limit;
    $('result-count').textContent=filtered.length+'개';
  }
  const refresh=()=>{limit=30;render();};
  $('filters').addEventListener('submit',e=>{e.preventDefault();refresh();});
  $('search').addEventListener('input',e=>{if(!e.isComposing)refresh();});$('search').addEventListener('compositionend',refresh);
  $('category').addEventListener('change',refresh);$('mood').addEventListener('change',refresh);
  $('more').addEventListener('click',()=>{const first=limit;limit+=30;render();$('grid').children[first]?.querySelector('button')?.focus({preventScroll:true});});
  function updateRequest(){if(!selected)return;$('request-text').value=selected.id+' '+selected.name+(selectedPart?' 중 '+selectedPart.name+' ('+selectedPart.id+') 파츠':'')+'를 2025 밀티나 '+$('target-slot').value+'번 의상에 넣어줘. 기존 연결을 확인하고 필요한 의존성도 함께 옮겨줘.';$('copy-status').textContent='';}
  function updatePhoto(){
    $('detail-photo').replaceChildren(photo(selected,selectedView,true,selectedPart));
    document.querySelectorAll('[data-view]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.view===selectedView));button.disabled=!photoSource(selected,button.dataset.view,selectedPart);});
    $('detail-parts').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.part===(selectedPart?.id||'all'))));
  }
  function renderParts(){
    const parts=partsFor(selected);$('detail-parts').replaceChildren();$('detail-parts').hidden=!parts.length;
    if(!parts.length)return;
    for(const part of [null,...parts]){
      const button=el('button','',part?part.name:'전체');button.type='button';button.dataset.part=part?.id||'all';button.setAttribute('aria-pressed',String(!part));
      button.addEventListener('click',()=>{selectedPart=part;if(!photoSource(selected,selectedView,part))selectedView=['threeQuarter','front','back'].find(view=>photoSource(selected,view,part))||'front';updatePhoto();updateRequest();if($('detail').scrollTop>0)$('detail').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
      $('detail-parts').append(button);
    }
  }
  function openDetail(id,trigger){
    selected=byId.get(id);if(!selected)return;selectedPart=null;lastTrigger=trigger||document.activeElement;selectedView=selected.photos.threeQuarter?'threeQuarter':Object.keys(selected.photos)[0]||'front';
    $('detail-id').textContent=selected.id;$('detail-name').textContent=selected.name;$('detail-moods').replaceChildren(...moodNodes(selected));
    $('target-slot').value=selected.recordedSlot.match(/^(\d)번/)?.[1]||'1';renderParts();updatePhoto();updateRequest();if(!$('detail').open)$('detail').showModal();
    history.replaceState(null,'','#'+selected.id);
  }
  $('close-detail').addEventListener('click',()=>$('detail').close());
  $('detail').addEventListener('close',()=>{history.replaceState(null,'',location.pathname+location.search);lastTrigger?.focus({preventScroll:true});});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{selectedView=b.dataset.view;updatePhoto();}));
  $('target-slot').addEventListener('change',updateRequest);
  $('copy-request').addEventListener('click',async()=>{try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText($('request-text').value);$('copy-status').textContent='복사했어요.';}catch{$('request-text').focus();$('request-text').select();$('copy-status').textContent='선택한 문구를 복사해주세요.';}});
  const q=new URLSearchParams(location.search).get('q');if(q)$('search').value=q;
  render();if(byId.has(location.hash.slice(1)))openDetail(location.hash.slice(1));
})();
