'use strict';
(() => {
  const data=window.MILLTINA_CATALOGUE;
  const $=id=>document.getElementById(id);
  if(!data||data.schema!=='milltina-web-catalogue-v1'){$('empty').hidden=false;$('empty').textContent='목록을 읽지 못했어요.';return;}
  const entries=[...data.entries].sort((a,b)=>Number(Object.keys(b.photos||{}).length>0)-Number(Object.keys(a.photos||{}).length>0)), byId=new Map(entries.map(e=>[e.id,e]));
  const views={front:'정면',threeQuarter:'사선',back:'뒷면'};
  let limit=30,selected=null,selectedView='front',lastTrigger=null;
  const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
  const norm=v=>v.normalize('NFKC').toLocaleLowerCase().trim();
  const moods=[...new Set(entries.flatMap(e=>e.moods||[]))].sort((a,b)=>a.localeCompare(b,'ko'));
  for(const mood of moods)$('mood').append(new Option(mood,mood));
  $('mood').hidden=!moods.length;
  for(let i=1;i<=8;i++)$('target-slot').append(new Option(i+'번 의상',String(i)));
  const moodNodes=e=>(e.moods||[]).map(m=>el('span','mood-tag',m));
  function photo(entry,view='front',eager=false){
    const frame=el('div','frame tone-'+(Number(entry.id.slice(1))%5));
    const src=entry.photos?.[view];
    if(src&&/^photos\/W\d{4}\/[a-zA-Z0-9_-]+\.(webp|png|jpg)$/.test(src)){
      const image=el('img');image.src=src;image.alt=entry.name+' '+views[view];image.width=1200;image.height=1500;image.decoding='async';
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
  function updateRequest(){if(!selected)return;$('request-text').value=selected.id+' '+selected.name+'를 2025 밀티나 '+$('target-slot').value+'번 의상에 넣어줘. 기존 연결을 확인하고 필요한 의존성도 함께 옮겨줘.';$('copy-status').textContent='';}
  function updatePhoto(){$('detail-photo').replaceChildren(photo(selected,selectedView));document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===selectedView)));}
  function openDetail(id,trigger){
    selected=byId.get(id);if(!selected)return;lastTrigger=trigger||document.activeElement;selectedView=selected.photos.threeQuarter?'threeQuarter':Object.keys(selected.photos)[0]||'front';
    $('detail-id').textContent=selected.id;$('detail-name').textContent=selected.name;$('detail-moods').replaceChildren(...moodNodes(selected));
    $('target-slot').value=selected.recordedSlot.match(/^(\d)번/)?.[1]||'1';updatePhoto();updateRequest();if(!$('detail').open)$('detail').showModal();
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
