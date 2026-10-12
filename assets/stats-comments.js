(()=>{
  const form=document.querySelector('#comments-login'),input=document.querySelector('#admin-password'),status=document.querySelector('#comments-status'),list=document.querySelector('#comments-list'),logout=document.querySelector('#comments-logout'),pagination=document.querySelector('#comments-pagination'),reset=document.querySelector('#stats-reset'),resetStatus=document.querySelector('#reset-status');
  let token='',page=0,total=0,busy=false,generation=0,resetRequestId=null;
  function lock(){generation++;token='';page=0;list.replaceChildren();pagination.hidden=true;logout.hidden=true;reset.hidden=true;form.hidden=false;input.value='';status.textContent='인증 후 자유 의견을 확인할 수 있습니다.'}
  async function load(candidate=token){if(!candidate||busy)return;const activeGeneration=generation;busy=true;form.querySelector('button').disabled=true;try{const response=await fetch(window.SURVEY_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminComments',token:candidate,page}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const data=await response.json();if(activeGeneration!==generation)return;if(!data.ok||!Number.isInteger(data.total)||data.total<0||!Array.isArray(data.comments)||data.comments.length>50||!data.comments.every(c=>typeof c.comment==='string'&&typeof c.time==='string'))throw Error();token=candidate;total=data.total;form.hidden=true;logout.hidden=false;reset.hidden=false;list.replaceChildren();data.comments.forEach(c=>{const article=document.createElement('article');article.className='comment-entry';const time=document.createElement('time');const date=new Date(c.time);time.textContent=Number.isNaN(date.getTime())?'제출 시각 미확인':date.toLocaleString('ko-KR');const text=document.createElement('p');text.textContent=c.comment;article.append(time,text);list.append(article)});status.textContent=total?`자유 의견 ${total}건 · 최근 갱신 ${new Date().toLocaleTimeString('ko-KR')}`:'아직 자유 의견이 없습니다.';pagination.hidden=total<=50;document.querySelector('#comments-page').textContent=`${page+1} / ${Math.max(1,Math.ceil(total/50))}`;document.querySelector('#comments-prev').disabled=page===0;document.querySelector('#comments-next').disabled=(page+1)*50>=total;}catch{if(activeGeneration!==generation)return;status.textContent=token?'의견을 새로 불러오지 못했습니다. 이전 내용을 표시합니다.':'의견을 열지 못했습니다. 운영자 비밀번호와 Google 웹 앱의 새 버전 배포를 확인해주세요.';}finally{busy=false;form.querySelector('button').disabled=false}}
  reset.addEventListener('click',async()=>{
    if(!token||busy)return;
    if(!window.confirm('점수 통계와 자유 의견을 모두 초기화할까요? 기존 응답은 Google 스프레드시트의 백업 시트에 보관됩니다.'))return;
    const activeGeneration=generation;
    resetRequestId=resetRequestId||crypto.randomUUID();
    busy=true;reset.disabled=true;logout.disabled=true;resetStatus.textContent='기존 응답을 백업하고 초기화하고 있습니다…';
    try{
      const response=await fetch(window.SURVEY_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminReset',token,confirm:'RESET_SURVEY',requestId:resetRequestId}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error('HTTP_'+response.status);let data;try{data=await response.json()}catch{throw new Error('NOT_JSON')}if(!data.ok)throw new Error(typeof data.error==='string'?data.error:'INVALID_RESET_RESPONSE');
      if(activeGeneration!==generation)return;
      resetRequestId=null;page=0;total=0;list.replaceChildren();pagination.hidden=true;
      resetStatus.textContent=data.backup?'초기화 완료. 기존 응답은 '+data.backup+' 시트에 보관했습니다.':'초기화 완료. 저장된 응답이 없습니다.';
      document.querySelector('#refresh').click();
    }catch(error){
      const message=error.message||'';
      if(message==='잘못된 응답')resetStatus.textContent='Google 웹 앱이 초기화 요청을 지원하지 않는 이전 코드를 실행하고 있습니다. 최신 Code.gs로 교체하고 기존 배포를 새 버전으로 갱신해주세요.';
      else if(message.includes('운영자 인증'))resetStatus.textContent='Google 웹 앱의 ADMIN_TOKEN과 입력한 비밀번호가 일치하지 않습니다. 운영자 잠그기 후 다시 로그인해주세요.';
      else if(message==='NOT_JSON')resetStatus.textContent='Google에서 JSON 대신 로그인·오류 페이지를 반환했습니다. 웹 앱 접근 권한을 모든 사용자로 설정하고 실행 사용자를 나로 설정해주세요.';
      else if(error.name==='TimeoutError')resetStatus.textContent='초기화 응답 대기 시간이 초과됐습니다. 다시 누르기 전에 스프레드시트의 원본 응답과 백업 시트를 확인해주세요.';
      else if(message.includes('초기화를 완료하지 못'))resetStatus.textContent='Google 서버의 백업 또는 초기화 단계에서 실패했습니다. 스프레드시트의 편집 권한과 백업 시트를 확인해주세요.';
      else resetStatus.textContent='초기화 응답을 확인하지 못했습니다. 오류 유형: '+(message==='Failed to fetch'?'네트워크 연결 또는 Google 공개 권한':message.startsWith('HTTP_')?message:'서버 응답 오류')+'. 원본 응답과 백업 시트를 확인해주세요.';
    }
    finally{busy=false;reset.disabled=false;logout.disabled=false;}
  });
  form.addEventListener('submit' ,e=>{e.preventDefault();if(!form.reportValidity())return;const candidate=input.value;input.value='';page=0;load(candidate)});logout.addEventListener('click',lock);document.querySelector('#comments-prev').addEventListener('click',()=>{if(page>0&&!busy){page--;load()}});document.querySelector('#comments-next').addEventListener('click',()=>{if((page+1)*50<total&&!busy){page++;load()}});document.querySelector('#refresh').addEventListener('click',()=>load());setInterval(()=>load(),15000);
})();
