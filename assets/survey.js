(() => {
  const items=[['이해도','전시의 설명을 쉽게 이해할 수 있었다.'],['흥미도','체험이 흥미롭고 참여하기 좋았다.'],['진행 만족','전시 안내와 진행이 만족스러웠다.'],['정보 도움','고준위 방사성폐기물을 이해하는 데 도움이 되었다.'],['전반적 만족','전반적으로 이번 전시에 만족한다.']];
  const labels=['매우 그렇지 않다','그렇지 않다','보통이다','그렇다','매우 그렇다'];
  const root=document.querySelector('#satisfaction');
  root.innerHTML=`<h2>오늘의 체험, 어떠셨나요?</h2><p class="survey-intro">여러분의 의견으로 더 나은 전시를 만듭니다.<br>다섯 문항에 답해주세요. 약 1분이면 충분합니다.</p><form id="survey-form"><div id="survey-questions"></div><label class="survey-comment" for="survey-comment">좋았던 점이나 개선할 점 <small>(선택)</small></label><textarea id="survey-comment" maxlength="1000" placeholder="자유롭게 남겨주세요. 이름·연락처 등 개인정보는 적지 마세요."></textarea><p class="survey-note">이름과 연락처는 수집하지 않습니다. 점수와 자유 의견은 운영자만 확인합니다. 전송되는 정보: 점수, 의견, 제출 시각, 중복 확인용 임의 번호.</p><button type="submit" id="survey-submit">평가 제출하기</button><p class="survey-status" role="status" aria-live="polite" id="survey-status"></p><button type="button" id="survey-reset" hidden>초기화하고 다시 작성</button><p class="survey-note" id="survey-reset-note" hidden>기존 응답은 유지됩니다. 다시 제출하면 새로운 응답으로 저장됩니다.</p></form>`;
  const questions=root.querySelector('#survey-questions');
  items.forEach(([name,text],i)=>{const f=document.createElement('fieldset');f.innerHTML=`<legend>${i+1}. ${text}</legend><div class="rating-options">${labels.map((l,j)=>`<label><input type="radio" name="q${i}" value="${j+1}" required aria-label="${j+1}점 · ${l}"><span aria-hidden="true">${j+1}</span></label>`).join('')}</div><div class="scale-caption"><span>1 · 매우 그렇지 않다</span><span>5 · 매우 그렇다</span></div>`;questions.append(f)});
  const status=root.querySelector('#survey-status'),button=root.querySelector('#survey-submit'),form=root.querySelector('form');
  const endpoint=window.SURVEY_ENDPOINT||'';
  let previous;try{previous=JSON.parse(localStorage.getItem('neighborhood-survey-submission')||'null')}catch{}
  let pendingId=previous?.id||crypto.randomUUID(),submitted=previous?.submitted===true;
  const valid=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  if(!valid){button.disabled=true;status.textContent='만족도 조사는 현재 준비 중입니다.';return;}
  const resetButton=root.querySelector('#survey-reset'),resetNote=root.querySelector('#survey-reset-note');
  let submittedObserver=null,submittedDialog=null;
  resetButton.hidden=resetNote.hidden=!submitted;
  function resetSubmission(){
    submittedObserver?.disconnect();
    if(submittedDialog){if(submittedDialog.open)submittedDialog.close();submittedDialog.remove();submittedDialog=null;}
    try{localStorage.removeItem('neighborhood-survey-submission')}catch{}
    pendingId=crypto.randomUUID();submitted=false;
    form.reset();form.querySelectorAll('input,textarea').forEach(input=>input.disabled=false);
    button.disabled=false;button.textContent='평가 제출하기';resetButton.hidden=resetNote.hidden=true;
    status.textContent='초기화되었습니다. 새 응답을 작성해주세요.';
    root.scrollIntoView({block:'start',behavior:'auto'});root.tabIndex=-1;root.focus({preventScroll:true});
  }
  resetButton.addEventListener('click',resetSubmission);
  if(submitted){
    button.disabled=true;button.textContent='평가 제출 완료';
    form.querySelectorAll('input,textarea').forEach(input=>input.disabled=true);
    status.textContent='이미 제출한 평가입니다.';
    const dialog=document.createElement('dialog');
    submittedDialog=dialog;
    dialog.className='survey-notice';
    dialog.setAttribute('aria-labelledby','survey-notice-title');
    dialog.setAttribute('aria-describedby','survey-notice-description');
    dialog.innerHTML='<div class="survey-notice-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg></div><h2 id="survey-notice-title">이미 참여해주셨어요!</h2><p id="survey-notice-description">이 브라우저에서 이미 평가를 제출했습니다.<br>참여해주셔서 감사합니다.</p><button type="button" autofocus>확인</button><button type="button" class="notice-reset">초기화하고 다시 작성</button>';
    document.body.append(dialog);
    dialog.querySelector('button').addEventListener('click',()=>dialog.close());
    dialog.querySelector('.notice-reset').addEventListener('click',resetSubmission);
    dialog.addEventListener('close',()=>{root.tabIndex=-1;root.focus({preventScroll:true});dialog.remove();});
    // 설문 영역을 볼 때 한 번만 안내합니다.
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();dialog.showModal();}
    },{threshold:0});
    submittedObserver=observer;observer.observe(root);
  }
  form.addEventListener('submit',async e=>{e.preventDefault();if(submitted||!form.reportValidity())return;const values=new FormData(form);const ratings=items.map((_,i)=>Number(values.get('q'+i)));button.disabled=true;root.setAttribute('aria-busy','true');status.textContent='평가를 전송하고 있습니다…';try{try{localStorage.setItem('neighborhood-survey-submission',JSON.stringify({id:pendingId,submitted:false}))}catch{}const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({id:pendingId,ratings,comment:root.querySelector('textarea').value.trim()}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const result=await response.json();if(!result.ok)throw Error();submitted=true;try{localStorage.setItem('neighborhood-survey-submission',JSON.stringify({id:pendingId,submitted:true}))}catch{}status.textContent='평가가 제출되었습니다. 의견을 나눠주셔서 감사합니다!';button.textContent='제출 완료';resetButton.hidden=resetNote.hidden=false;form.querySelectorAll('input,textarea').forEach(x=>x.disabled=true);}catch{status.textContent='제출을 확인하지 못했습니다. 다시 눌러주세요. 같은 응답은 중복 저장하지 않습니다.';button.disabled=false}finally{root.removeAttribute('aria-busy')}});
})();
