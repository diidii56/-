(()=>{
  const form=document.querySelector('#comments-login'),input=document.querySelector('#admin-password'),status=document.querySelector('#comments-status'),list=document.querySelector('#comments-list'),logout=document.querySelector('#comments-logout'),pagination=document.querySelector('#comments-pagination'),reset=document.querySelector('#stats-reset');
  let token='',page=0,total=0,busy=false,generation=0,resetRequestId=null;
  function lock(){generation++;token='';page=0;list.replaceChildren();pagination.hidden=true;logout.hidden=true;reset.hidden=true;form.hidden=false;input.value='';status.textContent='인증 후 자유 의견을 확인할 수 있습니다.'}
  async function load(candidate=token){if(!candidate||busy)return;const activeGeneration=generation;busy=true;form.querySelector('button').disabled=true;try{const response=await fetch(window.SURVEY_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminComments',token:candidate,page}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const data=await response.json();if(activeGeneration!==generation)return;if(!data.ok||!Number.isInteger(data.total)||data.total<0||!Array.isArray(data.comments)||data.comments.length>50||!data.comments.every(c=>typeof c.comment==='string'&&typeof c.time==='string'))throw Error();token=candidate;total=data.total;form.hidden=true;logout.hidden=false;reset.hidden=false;list.replaceChildren();data.comments.forEach(c=>{const article=document.createElement('article');article.className='comment-entry';const time=document.createElement('time');const date=new Date(c.time);time.textContent=Number.isNaN(date.getTime())?'제출 시각 미확인':date.toLocaleString('ko-KR');const text=document.createElement('p');text.textContent=c.comment;article.append(time,text);list.append(article)});status.textContent=total?`자유 의견 ${total}건 · 최근 갱신 ${new Date().toLocaleTimeString('ko-KR')}`:'아직 자유 의견이 없습니다.';pagination.hidden=total<=50;document.querySelector('#comments-page').textContent=`${page+1} / ${Math.max(1,Math.ceil(total/50))}`;document.querySelector('#comments-prev').disabled=page===0;document.querySelector('#comments-next').disabled=(page+1)*50>=total;}catch{if(activeGeneration!==generation)return;status.textContent=token?'의견을 새로 불러오지 못했습니다. 이전 내용을 표시합니다.':'의견을 열지 못했습니다. 운영자 비밀번호와 Google 웹 앱의 새 버전 배포를 확인해주세요.';}finally{busy=false;form.querySelector('button').disabled=false}}
  reset.addEventListener('click',async()=>{
    if(!token||busy)return;
    if(!window.confirm('점수 통계와 자유 의견을 모두 초기화할까요? 기존 응답은 Google 스프레드시트의 백업 시트에 보관됩니다.'))return;
    const activeGeneration=generation;
    resetRequestId=resetRequestId||crypto.randomUUID();
    busy=true;reset.disabled=true;logout.disabled=true;status.textContent='기존 응답을 백업하고 초기화하고 있습니다…';
    try{
      const response=await fetch(window.SURVEY_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminReset',token,confirm:'RESET_SURVEY',requestId:resetRequestId}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw Error();const data=await response.json();if(!data.ok)throw Error();
      if(activeGeneration!==generation)return;
      resetRequestId=null;page=0;total=0;list.replaceChildren();pagination.hidden=true;
      status.textContent=data.backup?'초기화 완료. 기존 응답은 '+data.backup+' 시트에 보관했습니다.':'초기화 완료. 저장된 응답이 없습니다.';
      document.querySelector('#refresh').click();
    }catch{status.textContent='초기화를 확인하지 못했습니다. Google 코드의 새 버전 배포와 비밀번호를 확인해주세요. 기존 응답을 삭제했다고 가정하지 마세요.';}
    finally{busy=false;reset.disabled=false;logout.disabled=false;}
  });
  form.addEventListener('submit' ,e=>{e.preventDefault();if(!form.reportValidity())return;const candidate=input.value;input.value='';page=0;load(candidate)});logout.addEventListener('click',lock);document.querySelector('#comments-prev').addEventListener('click',()=>{if(page>0&&!busy){page--;load()}});document.querySelector('#comments-next').addEventListener('click',()=>{if((page+1)*50<total&&!busy){page++;load()}});document.querySelector('#refresh').addEventListener('click',()=>load());setInterval(()=>load(),15000);
})();
