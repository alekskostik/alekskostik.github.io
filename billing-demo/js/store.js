const STORE_KEY = 'cdt_billing_v11';

const USERS = [
  { userId:'USR-UT1', name:'Иванов Константин', initials:'КИ', role:'ut', label:'УТ 1' },
  { userId:'USR-UT2', name:'Петрова Анна',       initials:'АП', role:'ut', label:'УТ 2' },
  { userId:'USR-UT3', name:'Новиков Дмитрий',    initials:'ДН', role:'ut', label:'УТ 3' },
  { userId:'USR-OT1', name:'Сидоров Михаил',     initials:'МС', role:'ot', label:'ОТ 1' },
  { userId:'USR-OT2', name:'Козлова Елена',       initials:'ЕК', role:'ot', label:'ОТ 2' },
  { userId:'USR-ADM', name:'Смирнов Алексей',    initials:'АС', role:'admin', label:'Адм' },
];

function buildAuctions() {
  return [
    { auctionId:'481201', organizerId:'USR-OT1', title:'Продажа имущества ООО «Альфа» — лот 1', lotId:1, minDeposit:150000,  startPrice:3200000,  debtorName:'ООО «Альфа»',
      debtorReq:{ fullName:'ООО «Альфа»', inn:'7701111111', kpp:'770101001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000200001' },
      status:'Приём заявок', deadline:'30.04.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481202', organizerId:'USR-OT1', title:'Продажа имущества ООО «Альфа» — лот 2', lotId:2, minDeposit:250000,  startPrice:5500000,  debtorName:'ООО «Альфа»',
      debtorReq:{ fullName:'ООО «Альфа»', inn:'7701111111', kpp:'770101001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000200001' },
      status:'Приём заявок', deadline:'30.04.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481203', organizerId:'USR-OT2', title:'Реализация активов ЗАО «Бета»',          lotId:1, minDeposit:100000,  startPrice:1800000,  debtorName:'ЗАО «Бета»',
      debtorReq:{ fullName:'ЗАО «Бета»', inn:'7712222222', kpp:'771201001', bankName:'АО «Тинькофф»', bik:'044525974', accountNumber:'40702810000002200002' },
      status:'Приём заявок', deadline:'05.05.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481204', organizerId:'USR-OT2', title:'Торги по делу № А40-12345/2026',          lotId:1, minDeposit:500000,  startPrice:12000000, debtorName:'ООО «Гамма»',
      debtorReq:{ fullName:'ООО «Гамма»', inn:'7723333333', kpp:'772301001', bankName:'ПАО «ВТБ»', bik:'044525187', accountNumber:'40702810200000300003' },
      status:'Приём заявок', deadline:'10.05.2026', protocolSignedAt:null, contractSignedWith:null },
  ];
}

function makeAccounts(userId, role, yr, seq, inn) {
  const n = t => `${yr}.0${seq}054.${inn}-${t}`;
  if (role === 'ut') return [
    { accountId:`ACC-${userId}-01`, userId, subAccountTypeId:'01', label:'Счёт услуг УТ',   displayNumber:n('01'), balanceFree:0, balanceReserved:0, balanceVirtual:0, isBlocked:false },
    { accountId:`ACC-${userId}-03`, userId, subAccountTypeId:'03', label:'Задатковый счёт', displayNumber:n('03'), balanceFree:0, balanceReserved:0, balanceVirtual:0, isBlocked:false },
  ];
  if (role === 'ot') return [
    { accountId:`ACC-${userId}-02`, userId, subAccountTypeId:'02', label:'Счёт услуг ОТ',   displayNumber:n('02'), balanceFree:0, balanceReserved:0, balanceVirtual:0, isBlocked:false },
    { accountId:`ACC-${userId}-04`, userId, subAccountTypeId:'04', label:'Задатковый счёт', displayNumber:n('04'), balanceFree:0, balanceReserved:0, balanceVirtual:0, isBlocked:false },
  ];
  return [];
}

const ACC_TYPE_LABEL = {
  '01': 'Для услуг УТ (01)',
  '02': 'Для услуг ОТ (02)',
  '03': 'Задатковый УТ (03)',
  '04': 'Задатковый ОТ (04)',
};

function buildSeed() {
  return {
    _v: 11,
    currentUserId: 'USR-UT1',
    auctions: buildAuctions(),
    accounts: [
      ...makeAccounts('USR-UT1','ut','26','1','67890'),
      ...makeAccounts('USR-UT2','ut','26','2','11223'),
      ...makeAccounts('USR-UT3','ut','26','3','33445'),
      ...makeAccounts('USR-OT1','ot','26','4','44556'),
      ...makeAccounts('USR-OT2','ot','26','5','77889'),
    ],
    transactions: [],
    invoices: [],
    deposits: [],
    tradeApplications: [],
    principals: buildPrincipals(),
    requisites: [
      { requisiteId:'REQ-UT1', accountId:'ACC-USR-UT1-01', bankName:'ПАО «Сбербанк»', bik:'044525225', corAccount:'30101810400000000225', accountNumber:'40702810938000123456', inn:'781234567890', kpp:'780101001', fullName:'ООО «Тест Трейд»',  isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-UT2', accountId:'ACC-USR-UT2-01', bankName:'АО «Тинькофф»',  bik:'044525974', corAccount:'30101810145250000974', accountNumber:'40702810000001234567', inn:'781234567891', kpp:'780101002', fullName:'ИП Петрова А.С.', isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-UT3', accountId:'ACC-USR-UT3-01', bankName:'ПАО «ВТБ»',       bik:'044525187', corAccount:'30101810700000000187', accountNumber:'40702810200000099999', inn:'781234567895', kpp:'780101005', fullName:'ООО «Новиков»',    isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-OT1', accountId:'ACC-USR-OT1-02', bankName:'ПАО «ВТБ»',       bik:'044525187', corAccount:'30101810700000000187', accountNumber:'40702810200000012345', inn:'781234567892', kpp:'780101003', fullName:'ООО «Сидоров»',    isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-OT2', accountId:'ACC-USR-OT2-02', bankName:'ПАО «Сбербанк»', bik:'044525225', corAccount:'30101810400000000225', accountNumber:'40702810938000999999', inn:'781234567893', kpp:'780101004', fullName:'ООО «Козлова»',    isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
    ],
  };
}

function loadDemoData(db) {
  const set = (id, free) => { const a=db.accounts.find(a=>a.accountId===id); if(a) a.balanceFree=free; };
  set('ACC-USR-UT1-03', 1500000);
  set('ACC-USR-UT2-03', 800000);
  set('ACC-USR-UT3-03', 600000);
  set('ACC-USR-UT1-01', 25000);
  set('ACC-USR-OT1-02', 56700);
  set('ACC-USR-OT2-02', 30000);
  db.transactions = [
    { txId:'TX-D1', accountId:'ACC-USR-UT1-03', type:'пополнение', status:'завершена', amount:1500000, createdAt:'2026-04-08T10:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D2', accountId:'ACC-USR-UT2-03', type:'пополнение', status:'завершена', amount:800000,  createdAt:'2026-04-09T10:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D3', accountId:'ACC-USR-UT3-03', type:'пополнение', status:'завершена', amount:600000,  createdAt:'2026-04-09T12:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D4', accountId:'ACC-USR-UT1-01', type:'пополнение', status:'завершена', amount:25000,   createdAt:'2026-04-10T10:00:00Z', description:'Пополнение счёта услуг' },
  ];
  saveDB(db);
}

function clearAllData(db) {
  db.transactions=[]; db.invoices=[]; db.deposits=[]; db.tradeApplications=[];
  db.auctions = buildAuctions();
  db.principals = buildPrincipals();
  db.accounts.forEach(a=>{ a.balanceFree=0; a.balanceReserved=0; a.balanceVirtual=0; a.isBlocked=false; });
  saveDB(db);
}

function loadDB() {
  try { const raw=localStorage.getItem(STORE_KEY); if(raw){const p=JSON.parse(raw);if(p._v===11)return p;} } catch(e){}
  const db=buildSeed(); saveDB(db); return db;
}
function saveDB(db)  { try{localStorage.setItem(STORE_KEY,JSON.stringify(db));}catch(e){} }
function resetDB()   { localStorage.removeItem(STORE_KEY); const db=buildSeed(); db.principals=buildPrincipals(); saveDB(db); return db; }

function accsForUser(db,uid)    { return db.accounts.filter(a=>a.userId===uid); }
function txsForUser(db,uid)     { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.transactions.filter(t=>ids.includes(t.accountId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
function invsForUser(db,uid)    { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.invoices.filter(i=>ids.includes(i.accountId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
function reqsForUser(db,uid)    { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.requisites.filter(r=>ids.includes(r.accountId)); }
function accsForRole(db,role,uid){ return accsForUser(db,uid).filter(a=>role==='ut'?(a.subAccountTypeId==='01'||a.subAccountTypeId==='03'):(a.subAccountTypeId==='02'||a.subAccountTypeId==='04')); }
// время снятия резерва = дата протокола + 24ч
function releaseDeadline(iso) { const d=new Date(iso); d.setHours(d.getHours()+24); return d; }
function fmtDeadline(iso)     { return releaseDeadline(iso).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

// principals: { principalId, userId, fullName, inn, kpp, bankName, bik, accountNumber, isVerified }
function buildPrincipals() {
  return [
    { principalId:'PRC-UT1-01', userId:'USR-UT1', fullName:'ООО «Гарант Плюс»',    inn:'7701234567', kpp:'770101001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000111111', isVerified:true,  createdAt:'2026-03-01T00:00:00Z' },
    { principalId:'PRC-UT2-01', userId:'USR-UT2', fullName:'ИП Смирнова О.В.',      inn:'780123456789', kpp:'',       bankName:'АО «Тинькофф»',  bik:'044525974', accountNumber:'40802810000001111111', isVerified:true,  createdAt:'2026-03-01T00:00:00Z' },
    { principalId:'PRC-UT3-01', userId:'USR-UT3', fullName:'ООО «Новая Волна»',     inn:'7712345678', kpp:'771201001', bankName:'ПАО «ВТБ»',       bik:'044525187', accountNumber:'40702810200000111111', isVerified:false, createdAt:'2026-03-10T00:00:00Z' },
  ];
}
