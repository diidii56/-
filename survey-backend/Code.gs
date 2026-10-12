// 이 코드는 설문 응답을 저장할 Google 스프레드시트의 확장 프로그램 → Apps Script에 붙여 넣습니다.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트에서 Apps Script를 열어 실행하세요.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  getResponseSheet_();
}
function getResponseSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('setup을 먼저 실행하세요.');
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName('만족도응답');
  if (!sheet) {sheet = ss.insertSheet('만족도응답');sheet.appendRow(['제출시각','응답번호','이해도','흥미도','진행만족','정보도움','전반적만족','자유의견']);sheet.setFrozenRows(1);}
  return sheet;
}
function json_(data) {return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet() {
  try {
    const sheet = getResponseSheet_();
    const rows = Math.max(0, sheet.getLastRow()-1);
    const sums = [0,0,0,0,0];
    const distributions = Array.from({length:5},()=>[0,0,0,0,0]);
    let count=0,opinionCount=0;
    if(rows) sheet.getRange(2,3,rows,5).getValues().forEach(row=>{
      if(row.every(n=>typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=5)){
        count++;row.forEach((n,i)=>{sums[i]+=n;distributions[i][n-1]++;});
      }else if(row.every(n=>n==='')) opinionCount++;
    });
    return json_({ok:true,count:count,opinionCount:opinionCount,averages:sums.map(n=>count?n/count:0),distributions:distributions});
  } catch (e) {return json_({ok:false,error:'집계를 사용할 수 없습니다.'});}
}
function doPost(e) {
  let lock;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 12000) return json_({ok:false,error:'잘못된 요청'});
    const data = JSON.parse(raw);
    if(data.action === "adminComments") return adminComments_(data);
    if (!/^[a-f0-9-]{36}$/i.test(data.id) || !Array.isArray(data.ratings) || data.ratings.length !== 5 || !data.ratings.every(n=>Number.isInteger(n)&&n>=1&&n<=5) || typeof data.comment !== 'string' || data.comment.length > 1000) return json_({ok:false,error:'잘못된 응답'});
    lock=LockService.getScriptLock();lock.waitLock(15000);
    const sheet=getResponseSheet_();
    const count=sheet.getLastRow()-1;
    if(count && sheet.getRange(2,2,count,1).createTextFinder(data.id).matchEntireCell(true).findNext())return json_({ok:true,duplicate:true});
    // 시트 수식으로 해석되지 않도록 자유 의견을 텍스트로 저장합니다.
    const safeComment = /^[=+\-@]/.test(data.comment) ? "'"+data.comment : data.comment;
    sheet.appendRow([new Date(),data.id].concat(data.ratings,[safeComment]));
    SpreadsheetApp.flush();
    return json_({ok:true});
  } catch(e){return json_({ok:false,error:'저장하지 못했습니다.'});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}

// 운영자 조회: secret lives only in Apps Script properties, never in GitHub.
function adminComments_(data) {
  const expected=PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if(!expected || expected.length<32 || typeof data.token!=='string' || data.token!==expected)return json_({ok:false,error:'운영자 인증이 필요합니다'});
  const page=Number.isInteger(data.page)&&data.page>=0?data.page:0;
  const sheet=getResponseSheet_();
  const rows=Math.max(0,sheet.getLastRow()-1);
  const values=rows?sheet.getRange(2,1,rows,8).getValues():[];
  const comments=values.filter(row=>typeof row[7]==='string'&&row[7].trim()).reverse();
  const selected=comments.slice(page*50,page*50+50).map(row=>({time:row[0] instanceof Date?row[0].toISOString():String(row[0]),comment:row[7],ratings:row.slice(2,7)}));
  return json_({ok:true,total:comments.length,page:page,pageSize:50,comments:selected});
}
