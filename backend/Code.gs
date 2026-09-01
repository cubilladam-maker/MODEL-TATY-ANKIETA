// Backend Google Apps Script — system tworzenia, zapisu i pobierania ankiety.
// Wklej ten plik do prywatnego arkusza Google Sheets jako Apps Script.
// Kody rodzinne są przechowywane jawnie wyłącznie w prywatnej zakładce Kody;
// strona publiczna otrzymuje tylko kod wpisany przez daną osobę.
const SHEET_CODES = 'Kody';
const SHEET_RESPONSES = 'Odpowiedzi';
const VIEWS = 35;
const PEOPLE = [
  ['P01','Piotr Szukalski'], ['P02','Piotr Jankiewicz'], ['P03','Andrzej Szukalski'], ['P04','Emilia Jankiewicz'],
  ['P05','Monika Jankiewicz'], ['P06','Violeta Jakóbczak'], ['P07','Ewa Szukalska'], ['P08','Zofia Szukalska']
];
const ALLOWED = ['TAK','NIE','NIE WIEM'];
const CODE_HEADERS = ['id','label','code_plain','code_hash','used','used_at','session_id','opened_at'];
const RESPONSE_HEADERS = ['timestamp','id','label'].concat(Array.from({length:VIEWS},(_,i)=>'view_'+('0'+(i+1)).slice(-2)));

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'status');
  try {
    if (action === 'health') return json_({ok:true,service:'ankieta',views:VIEWS});
    if (action === 'status') return json_({ok:true,status:getStatus_()});
    if (action === 'download') return download_(p);
    return json_({ok:false,error:'Niedozwolona operacja.'});
  } catch (err) { return json_({ok:false,error:'Błąd serwera ankiety.'}); }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const p = JSON.parse(body);
    if (p.action === 'open') return open_(String(p.code || ''));
    if (p.action === 'submit') return submit_(p);
    return json_({ok:false,error:'Niedozwolona operacja.'});
  } catch (err) { return json_({ok:false,error:'Nie udało się przetworzyć danych.'}); }
}

function open_(code) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureSheets_();
    if (isAdminCode_(code)) {
      const adminSession = Utilities.getUuid();
      CacheService.getScriptCache().put('admin:'+adminSession,'1',21600);
      return json_({ok:true,mode:'admin',admin_session:adminSession,session_id:adminSession});
    }
    const row = findCode_(code);
    if (!row || String(row.used).toUpperCase() === 'TAK') return json_({ok:false,error:'Kod niedostępny.'});
    const session = row.session || Utilities.getUuid();
    const info = codesInfo_();
    if (!row.session) info.sheet.getRange(row.row, info.idx.session_id, 1, 2).setValues([[session,new Date()]]);
    return json_({ok:true,mode:'respondent',respondent_id:row.id,session_id:session,code:code});
  } finally { lock.releaseLock(); }
}

function submit_(p) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureSheets_();
    const row = findCode_(String(p.code || ''));
    if (!row || String(row.used).toUpperCase() === 'TAK' || !row.session || row.session !== String(p.session_id || '')) return json_({ok:false,error:'Kod niedostępny.'});
    const answers = p.answers || {};
    const values = [];
    for (let i=1;i<=VIEWS;i++) { const key='view_'+('0'+i).slice(-2); if (ALLOWED.indexOf(answers[key])<0) return json_({ok:false,error:'Niepełne dane.'}); values.push(answers[key]); }
    SpreadsheetApp.getActive().getSheetByName(SHEET_RESPONSES).appendRow([new Date(),row.id,row.label].concat(values));
    const info = codesInfo_();
    info.sheet.getRange(row.row, info.idx.used, 1, 2).setValues([['TAK',new Date()]]);
    return json_({ok:true});
  } finally { lock.releaseLock(); }
}

function getStatus_() {
  const info = codesInfo_(); if (!info) return [];
  const rows = info.sheet.getDataRange().getValues();
  return rows.slice(1).filter(r=>r[info.idx.id-1]).map(r=>({id:r[info.idx.id-1],label:r[info.idx.label-1],submitted:String(r[info.idx.used-1]).toUpperCase()==='TAK'}));
}

function download_(p) {
  if (!isAdminSession_(String(p.admin_session || ''))) return json_({ok:false,error:'Brak uprawnień administratora.'});
  const format = String(p.format || 'csv').toLowerCase();
  const records = getResponseRecords_();
  if (format === 'json') return ContentService.createTextOutput(JSON.stringify({ok:true,generated_at:new Date().toISOString(),records:records})).setMimeType(ContentService.MimeType.JSON);
  if (format !== 'csv') return json_({ok:false,error:'Nieobsługiwany format.'});
  const lines = [RESPONSE_HEADERS.map(csvEscape_).join(',')];
  records.forEach(r=>lines.push(RESPONSE_HEADERS.map(h=>csvEscape_(r[h])).join(',')));
  return ContentService.createTextOutput('\uFEFF'+lines.join('\r\n')).setMimeType(ContentService.MimeType.CSV);
}

function getResponseRecords_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_RESPONSES); if (!sh || sh.getLastRow()<2) return [];
  const rows = sh.getDataRange().getDisplayValues(); const headers = rows[0];
  return rows.slice(1).filter(r=>r[0]).map(r=>{const o={}; headers.forEach((h,i)=>o[h]=r[i] || ''); return o;});
}

function csvEscape_(v) { const s=String(v==null?'':v); return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }

function codesInfo_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_CODES); if (!sh) return null;
  const headers = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),CODE_HEADERS.length)).getValues()[0]; const idx={};
  headers.forEach((h,i)=>{if(h)idx[String(h)]=i+1;});
  if (!idx.id || !idx.label || !idx.code_hash || !idx.used || !idx.session_id) return null;
  return {sheet:sh,idx:idx};
}

function findCode_(code) {
  if (!/^\d{5}$/.test(code)) return null;
  const info = codesInfo_(); if (!info) return null; const rows=info.sheet.getDataRange().getValues(); const wanted=hash_(code);
  for(let i=1;i<rows.length;i++) if(String(rows[i][info.idx.code_hash-1])===wanted) return {row:i+1,id:rows[i][info.idx.id-1],label:rows[i][info.idx.label-1],used:rows[i][info.idx.used-1],session:rows[i][info.idx.session_id-1]};
  return null;
}

function ensureSheets_() {
  const ss=SpreadsheetApp.getActive(); let c=ss.getSheetByName(SHEET_CODES); if(!c)c=ss.insertSheet(SHEET_CODES);
  if(c.getLastRow()===0){c.getRange(1,1,1,CODE_HEADERS.length).setValues([CODE_HEADERS]);}
  else if(c.getLastRow()===1){c.clear();c.getRange(1,1,1,CODE_HEADERS.length).setValues([CODE_HEADERS]);}
  else {const h=c.getRange(1,1,1,c.getLastColumn()).getValues()[0]; if(h.indexOf('code_hash')<0 || h.indexOf('session_id')<0) throw new Error('Zakładka Kody ma niezgodny nagłówek.');}
  let o=ss.getSheetByName(SHEET_RESPONSES); if(!o)o=ss.insertSheet(SHEET_RESPONSES);
  if(o.getLastRow()===0){o.getRange(1,1,1,RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);}
  else if(o.getLastRow()===1 && o.getLastColumn()!==RESPONSE_HEADERS.length){o.clear();o.getRange(1,1,1,RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);}
}

function setupSurvey() {
  const ss=SpreadsheetApp.getActive(); const c=ss.getSheetByName(SHEET_CODES); const o=ss.getSheetByName(SHEET_RESPONSES);
  if ((c&&c.getLastRow()>1)||(o&&o.getLastRow()>1)) throw new Error('Ankieta zawiera dane. Użyj resetSurveyForNewRound() tylko przy nowej rundzie.');
  ensureSheets_(); generateFamilyCodes();
}

function generateFamilyCodes() {
  ensureSheets_(); const info=codesInfo_(); if(info.sheet.getLastRow()>1) return 'Kody już istnieją — nie nadpisano ich.';
  const used={}; const adminHash=PropertiesService.getScriptProperties().getProperty('ADMIN_CODE_HASH'); const rows=[];
  PEOPLE.forEach(p=>{let code;do{code=String(Math.floor(10000+Math.random()*90000));}while(used[code]|| (adminHash && hash_(code)===adminHash));used[code]=true;rows.push([p[0],p[1],code,hash_(code),'NIE','','','']);});
  info.sheet.getRange(2,1,rows.length,CODE_HEADERS.length).setValues(rows); info.sheet.autoResizeColumns(1,CODE_HEADERS.length); return 'Wygenerowano kody w prywatnej zakładce Kody.';
}

function resetSurveyForNewRound() {
  const ss=SpreadsheetApp.getActive(); let c=ss.getSheetByName(SHEET_CODES); let o=ss.getSheetByName(SHEET_RESPONSES); if(!c)c=ss.insertSheet(SHEET_CODES); if(!o)o=ss.insertSheet(SHEET_RESPONSES);
  c.clear();o.clear();c.getRange(1,1,1,CODE_HEADERS.length).setValues([CODE_HEADERS]);o.getRange(1,1,1,RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);generateFamilyCodes();
}

function setAdminCodeFromPrompt() {
  const ui=SpreadsheetApp.getUi(); const answer=ui.prompt('Kod administratora','Wpisz pięciocyfrowy kod administratora:',ui.ButtonSet.OK_CANCEL);
  if(answer.getSelectedButton()!==ui.Button.OK)return; const code=answer.getResponseText().trim(); if(!/^\d{5}$/.test(code))throw new Error('Kod musi mieć dokładnie pięć cyfr.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_CODE_HASH',hash_(code));
}

function seedCodes() {
  const codes=['WPROWADZ_KOD_1','WPROWADZ_KOD_2','WPROWADZ_KOD_3','WPROWADZ_KOD_4','WPROWADZ_KOD_5','WPROWADZ_KOD_6','WPROWADZ_KOD_7','WPROWADZ_KOD_8'];
  if(codes.some(c=>!/^[0-9]{5}$/.test(c))||new Set(codes).size!==codes.length)throw new Error('Wpisz osiem różnych kodów pięciocyfrowych.');
  const adminHash=PropertiesService.getScriptProperties().getProperty('ADMIN_CODE_HASH'); if(adminHash&&codes.some(c=>hash_(c)===adminHash))throw new Error('Kod administratora musi być różny od kodów rodziny.');
  const ss=SpreadsheetApp.getActive();let c=ss.getSheetByName(SHEET_CODES);if(!c)c=ss.insertSheet(SHEET_CODES);let o=ss.getSheetByName(SHEET_RESPONSES);if(!o)o=ss.insertSheet(SHEET_RESPONSES);c.clear();o.clear();c.getRange(1,1,1,CODE_HEADERS.length).setValues([CODE_HEADERS]);c.getRange(2,1,PEOPLE.length,CODE_HEADERS.length).setValues(PEOPLE.map((p,i)=>[p[0],p[1],codes[i],hash_(codes[i]),'NIE','','','']));o.getRange(1,1,1,RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);
}

function isAdminCode_(code){const configured=PropertiesService.getScriptProperties().getProperty('ADMIN_CODE_HASH');return !!configured&&/^\d{5}$/.test(code)&&hash_(code)===configured;}
function isAdminSession_(token){return /^[-\w]{20,}$/.test(token)&&CacheService.getScriptCache().get('admin:'+token)==='1';}
function hash_(code){const salt=getSalt_();const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+'|'+code,Utilities.Charset.UTF_8);return bytes.map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');}
function getSalt_(){const props=PropertiesService.getScriptProperties();let s=props.getProperty('SURVEY_SALT');if(!s){s=Utilities.getUuid()+'|'+Utilities.getUuid();props.setProperty('SURVEY_SALT',s);}return s;}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
