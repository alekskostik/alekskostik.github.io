const STORE_KEY = 'cdt_billing_v30';

// Участники ЭТП (Основная БД, DB_bTrade.dbo.Participants)
const PARTICIPANTS = [
  { participantId:1, name:'ООО «Тест Трейд»',         inn:'7801234561',   flagJur:true,  roleParticipant:true,  roleOrganizer:false, participantStatusId:'active'  },
  { participantId:2, name:'Петрова Анна Сергеевна',      inn:'780123456789', flagJur:false, roleParticipant:true,  roleOrganizer:false, participantStatusId:'active'  },
  { participantId:3, name:'ООО «Новиков»',             inn:'7801234563',   flagJur:true,  roleParticipant:true,  roleOrganizer:false, participantStatusId:'active'  },
  { participantId:4, name:'ООО «Сидоров и Партнёры»', inn:'7801234564',   flagJur:true,  roleParticipant:false, roleOrganizer:true,  participantStatusId:'active'  },
  { participantId:5, name:'ООО «Козлова»',             inn:'7801234565',   flagJur:true,  roleParticipant:false, roleOrganizer:true,  participantStatusId:'active'  },
  { participantId:6, name:'Громов Павел Витальевич',    inn:'780123456896', flagJur:false, roleParticipant:false, roleOrganizer:false, participantStatusId:'pending' },
  { participantId:7, name:'ООО «Власов и Партнёры»',  inn:'7801234567',   flagJur:true,  roleParticipant:true,  roleOrganizer:true,  participantStatusId:'active'  },
];

// Пользователи ЭТП (Основная БД, DB_bTrade.dbo.Users)
// participantId — логическая ссылка на Participants; для счетов 02–04 поиск ведётся по participantId
const USERS = [
  { userId:'USR-BR1', name:'Громов Павел',       initials:'ПГ', role:'br',    label:'БР 1',           participantId:6    },
  { userId:'USR-UT1', name:'Иванов Константин',  initials:'КИ', role:'ut',    label:'УТ 1',           participantId:1    },
  { userId:'USR-UT2', name:'Петрова Анна',        initials:'АП', role:'ut',    label:'УТ 2',           participantId:2    },
  { userId:'USR-UT3', name:'Новиков Дмитрий',     initials:'ДН', role:'ut',    label:'УТ 3',           participantId:3    },
  { userId:'USR-OT1', name:'Сидоров Михаил',      initials:'МС', role:'ot',    label:'ОТ 1',           participantId:4    },
  { userId:'USR-OT2', name:'Козлова Елена',        initials:'ЕК', role:'ot',    label:'ОТ 2',           participantId:5    },
  { userId:'USR-OT3', name:'Романова Светлана',   initials:'СР', role:'ot',    label:'ОТ 3 (Сидоров)', participantId:4    },
  { userId:'USR-OT4', name:'Андреев Виктор',      initials:'ВА', role:'ot',    label:'ОТ 4 (Сидоров)', participantId:4    },
  { userId:'USR-BO1', name:'Власов Игорь',         initials:'ИВ', role:'both',  label:'УТ+ОТ',          participantId:7    },
  { userId:'USR-ADM', name:'Смирнов Алексей',     initials:'АС', role:'admin', label:'Адм',            participantId:null },
];

// Типы субсчетов:
// 01 — услуги БР (р/с ИП, скрыт в ЛК, только через «Оплата услуг»)
// 02 — услуги УТ и ОТ (р/с ЦДТ, общий)
// 03 — задатковый УТ
// 04 — задатковый ОТ
const ACC_TYPE_LABEL = {
  '01': 'Для услуг БР (ИП)',
  '02': 'Для услуг (ЦДТ)',
  '03': 'Задатковый УТ',
  '04': 'Задатковый ОТ',
};

// Справочник услуг
const SERVICES = [
  { id:'acc',  name:'Аккредитация на ЭТП',       price:5400,  roles:['ut','ot','both'] },
  { id:'pub',  name:'Публикация торгов',          price:12000, roles:['ot','both'] },
  { id:'prot', name:'Публикация протокола',       price:3200,  roles:['ot','both'] },
  { id:'doc',  name:'Получение документов',       price:1500,  roles:['ut','ot','both'] },
  { id:'fast', name:'Ускоренная регистрация',     price:10000, roles:['br'] },
  { id:'xacc', name:'Экспресс-допуск к торгам',  price:15000, roles:['br'] },
];

function buildAuctions() {
  return [
    { auctionId:'481201', organizerId:'USR-OT1', title:'Продажа имущества ООО «Альфа» — лот 1', lotId:1, minDeposit:150000, startPrice:3200000, debtorName:'ООО «Альфа»',
      debtorReq:{ fullName:'ООО «Альфа»', inn:'7701111111', kpp:'770101001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000200001' },
      status:'Приём заявок', deadline:'30.04.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481202', organizerId:'USR-OT1', title:'Продажа имущества ООО «Альфа» — лот 2', lotId:2, minDeposit:250000, startPrice:5500000, debtorName:'ООО «Альфа»',
      debtorReq:{ fullName:'ООО «Альфа»', inn:'7701111111', kpp:'770101001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000200001' },
      status:'Приём заявок', deadline:'30.04.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481203', organizerId:'USR-OT2', title:'Реализация активов ЗАО «Бета»', lotId:1, minDeposit:100000, startPrice:1800000, debtorName:'ЗАО «Бета»',
      debtorReq:{ fullName:'ЗАО «Бета»', inn:'7712222222', kpp:'771201001', bankName:'АО «Т-Банк»', bik:'044525974', accountNumber:'40702810000002200002' },
      status:'Приём заявок', deadline:'05.05.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481204', organizerId:'USR-OT2', title:'Торги по делу № А40-12345/2026', lotId:1, minDeposit:500000, startPrice:12000000, debtorName:'ООО «Гамма»',
      debtorReq:{ fullName:'ООО «Гамма»', inn:'7723333333', kpp:'772301001', bankName:'ПАО «ВТБ»', bik:'044525187', accountNumber:'40702810200000300003' },
      status:'Приём заявок', deadline:'10.05.2026', protocolSignedAt:null, contractSignedWith:null },
    { auctionId:'481205', organizerId:'USR-BO1', title:'Торги УТ+ОТ — реализация активов ООО «Дельта»', lotId:1, minDeposit:200000, startPrice:4500000, debtorName:'ООО «Дельта»',
      debtorReq:{ fullName:'ООО «Дельта»', inn:'7734567890', kpp:'773401001', bankName:'ПАО «Сбербанк»', bik:'044525225', accountNumber:'40702810938000400004' },
      status:'Приём заявок', deadline:'25.05.2026', protocolSignedAt:null, contractSignedWith:null },
  ];
}

// ── Фабрика счёта (Accounts) — поля по ОТР п.3.2.1 ──
function makeAccount(accountId, userId, participantId, subAccountTypeId, label, displayNumber) {
  return {
    accountId,
    userId,
    participantId:   participantId || null,
    subAccountTypeId,
    label,
    displayNumber,
    accountStatusId: 'active',
    isBlocked:       false,
    blockReason:     null,
    balanceFree:     0,
    balanceReserved: 0,
    balanceVirtual:  0,
    createdAt:       '2026-01-01T00:00:00Z',
    updatedAt:       '2026-01-01T00:00:00Z',
  };
}

function makeAccounts(userId, role, yr, seq, inn) {
  const pid = parseInt(seq, 10);
  const nP = t => `${yr}.${String(pid).padStart(6,'0')}.${inn}-${t}`;
  const nU = t => `${yr}.${String(userIddOf(userId)||pid).padStart(6,'0')}.${inn}-${t}`;
  // Типы 02/03/04 принадлежат участнику (pid), не конкретному пользователю → userId=null
  // Тип 01 — личный счёт БР (userId заполнен, participantId=null)
  if (role === 'ut') return [
    makeAccount(`ACC-${userId}-02`, null, pid, '02', 'Счёт услуг',         nP('02')),
    makeAccount(`ACC-${userId}-03`, null, pid, '03', 'Задатковый счёт',    nP('03')),
  ];
  if (role === 'ot') return [
    makeAccount(`ACC-${userId}-02`, null, pid, '02', 'Счёт услуг',         nP('02')),
    makeAccount(`ACC-${userId}-04`, null, pid, '04', 'Задатковый счёт ОТ', nP('04')),
  ];
  if (role === 'br') return [
    makeAccount(`ACC-${userId}-01`, userId, null, '01', 'Счёт услуг БР',   nU('01')),
    makeAccount(`ACC-${userId}-03`, null, pid,    '03', 'Задатковый счёт', nP('03')),
  ];
  if (role === 'both') return [
    makeAccount(`ACC-${userId}-02`, null, pid, '02', 'Счёт услуг',     nP('02')),
    makeAccount(`ACC-${userId}-03`, null, pid, '03', 'Задатковый УТ',  nP('03')),
    makeAccount(`ACC-${userId}-04`, null, pid, '04', 'Задатковый ОТ',  nP('04')),
  ];
  return [];
}

function buildPrincipals() {
  return [
    { principalId:'PRC-UT1-01', agentAccountId:'ACC-USR-UT1-03', userId:'USR-UT1', fullName:'ООО «Гарант Плюс»', inn:'7701234567', entityType:'ul', phone:'+7 495 123-45-67', registrationAddressId:null, isVerified:true,  createdAt:'2026-03-01T00:00:00Z' },
    { principalId:'PRC-UT2-01', agentAccountId:'ACC-USR-UT2-03', userId:'USR-UT2', fullName:'ИП Смирнова О.В.',   inn:'780123456789', entityType:'ip', phone:'+7 812 987-65-43', registrationAddressId:null, isVerified:true,  createdAt:'2026-03-01T00:00:00Z' },
    { principalId:'PRC-UT3-01', agentAccountId:'ACC-USR-UT3-03', userId:'USR-UT3', fullName:'ООО «Новая Волна»',  inn:'7712345678', entityType:'ul', phone:null,                registrationAddressId:null, isVerified:false, createdAt:'2026-03-10T00:00:00Z' },
  ];
}

function buildSeed() {
  const accounts = [
    ...makeAccounts('USR-UT1','ut',  '26','1','67890'),
    ...makeAccounts('USR-UT2','ut',  '26','2','11223'),
    ...makeAccounts('USR-UT3','ut',  '26','3','33445'),
    ...makeAccounts('USR-OT1','ot',  '26','4','44556'),
    ...makeAccounts('USR-OT2','ot',  '26','5','77889'),
    ...makeAccounts('USR-BR1','br',  '26','6','88001'),
    ...makeAccounts('USR-BO1','both','26','7','99001'),
  ];

  // AccountBalances — по одной записи на каждый счёт (ОТР п.3.2.2)
  const accountBalances = accounts.map(a => ({
    balanceId:       `BAL-${a.accountId}`,
    accountId:       a.accountId,
    balanceFree:     0,
    balanceReserved: 0,
    balanceVirtual:  0,
    balanceTotal:    0,
    updatedAt:       '2026-01-01T00:00:00Z',
  }));

  // SyncState — 4 записи (ОТР п.3.2.13)
  const syncState = [
    { syncStateId:'SS-1', accountingSystem:'unf', endpointType:'statuses', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
    { syncStateId:'SS-2', accountingSystem:'buh', endpointType:'statuses', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
    { syncStateId:'SS-3', accountingSystem:'unf', endpointType:'invoices', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
    { syncStateId:'SS-4', accountingSystem:'buh', endpointType:'invoices', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
  ];

  return {
    _v: 30,
    currentUserId: 'USR-UT1',
    auctions: buildAuctions(),
    accounts,
    accountBalances,        // ОТР п.3.2.2
    transactions: [],       // ОТР п.3.2.3
    fundAllocations: [],    // ОТР п.3.2.4 (заменяет virtualAllocations)
    deposits: [],           // ОТР п.3.2.5
    invoices: [],           // ОТР п.3.2.6
    docRequests: [],        // ОТР п.3.2.7
    accountingRequests: [], // ОТР п.3.2.8
    requisites: [           // ОТР п.3.2.9
      { requisiteId:'REQ-UT1', accountId:'ACC-USR-UT1-02', principalId:null, bankName:'ПАО «Сбербанк»', bik:'044525225', corAccount:'30101810400000000225', accountNumber:'40702810938000123456', inn:'781234567890', kpp:'780101001', fullName:'ООО «Тест Трейд»',        isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-UT2', accountId:'ACC-USR-UT2-02', principalId:null, bankName:'АО «Т-Банк»',   bik:'044525974', corAccount:'30101810145250000974', accountNumber:'40702810000001234567', inn:'781234567891', kpp:'780101002', fullName:'ИП Петрова А.С.',        isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-UT3', accountId:'ACC-USR-UT3-02', principalId:null, bankName:'ПАО «ВТБ»',      bik:'044525187', corAccount:'30101810700000000187', accountNumber:'40702810200000099999', inn:'781234567895', kpp:'780101005', fullName:'ООО «Новиков»',           isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-OT1', accountId:'ACC-USR-OT1-02', principalId:null, bankName:'ПАО «ВТБ»',      bik:'044525187', corAccount:'30101810700000000187', accountNumber:'40702810200000012345', inn:'781234567892', kpp:'780101003', fullName:'ООО «Сидоров»',           isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-OT2', accountId:'ACC-USR-OT2-02', principalId:null, bankName:'ПАО «Сбербанк»', bik:'044525225', corAccount:'30101810400000000225', accountNumber:'40702810938000999999', inn:'781234567893', kpp:'780101004', fullName:'ООО «Козлова»',           isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-BO1', accountId:'ACC-USR-BO1-02', principalId:null, bankName:'АО «Альфа-Банк»',bik:'044525593', corAccount:'30101810200000000593', accountNumber:'40702810501234567890', inn:'781234567896', kpp:'780101006', fullName:'ООО «Власов и партнёры»', isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      // реквизиты принципалов (accountId=null, principalId заполнен)
      { requisiteId:'REQ-PRC-UT1', accountId:null, principalId:'PRC-UT1-01', bankName:'ПАО «Сбербанк»', bik:'044525225', corAccount:'30101810400000000225', accountNumber:'40702810938000111111', inn:'7701234567', kpp:'770101001', fullName:'ООО «Гарант Плюс»',  isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-PRC-UT2', accountId:null, principalId:'PRC-UT2-01', bankName:'АО «Т-Банк»',   bik:'044525974', corAccount:'30101810145250000974', accountNumber:'40802810000001111111', inn:'780123456789', kpp:'',         fullName:'ИП Смирнова О.В.',   isVerified:true,  isDefault:true, createdAt:'2026-03-01T00:00:00Z' },
      { requisiteId:'REQ-PRC-UT3', accountId:null, principalId:'PRC-UT3-01', bankName:'ПАО «ВТБ»',      bik:'044525187', corAccount:'30101810700000000187', accountNumber:'40702810200000111111', inn:'7712345678', kpp:'771201001',  fullName:'ООО «Новая Волна»',  isVerified:false, isDefault:true, createdAt:'2026-03-10T00:00:00Z' },
    ],
    principals: buildPrincipals(), // ОТР п.3.2.11
    tradeApplications: [],
    auditLog: [],    // ОТР п.3.2.12
    syncState,       // ОТР п.3.2.13
  };
}

// ── Синхронизация accountBalances с балансами в accounts ──
function syncAccountBalances(db) {
  if (!db.accountBalances) db.accountBalances = [];
  db.accounts.forEach(a => {
    let bal = db.accountBalances.find(b => b.accountId === a.accountId);
    if (!bal) {
      bal = { balanceId:`BAL-${a.accountId}`, accountId:a.accountId, balanceFree:0, balanceReserved:0, balanceVirtual:0, balanceTotal:0, updatedAt:new Date().toISOString() };
      db.accountBalances.push(bal);
    }
    bal.balanceFree     = a.balanceFree     || 0;
    bal.balanceReserved = a.balanceReserved || 0;
    bal.balanceVirtual  = a.balanceVirtual  || 0;
    bal.balanceTotal    = bal.balanceFree + bal.balanceReserved + bal.balanceVirtual;
    bal.updatedAt       = new Date().toISOString();
  });
}

function loadDemoData(db) {
  const set = (id, free) => { const a=db.accounts.find(a=>a.accountId===id); if(a) a.balanceFree=free; };
  set('ACC-USR-UT1-03', 1500000);
  set('ACC-USR-UT2-03', 800000);
  set('ACC-USR-UT3-03', 600000);
  set('ACC-USR-UT1-02', 25000);
  set('ACC-USR-OT1-02', 56700);
  set('ACC-USR-OT2-02', 30000);
  db.transactions = [
    { txId:'TX-D1', accountId:'ACC-USR-UT1-03', type:'пополнение', status:'завершена', amount:1500000, balanceBefore:0, balanceAfter:1500000, actorType:'self', performedByUserId:1002, onBehalfOfParticipantId:null, onBehalfOfPrincipalId:null, requestId:'P-20260408-000001', createdAt:'2026-04-08T10:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D2', accountId:'ACC-USR-UT2-03', type:'пополнение', status:'завершена', amount:800000,  balanceBefore:0, balanceAfter:800000,  actorType:'self', performedByUserId:1003, onBehalfOfParticipantId:null, onBehalfOfPrincipalId:null, requestId:'P-20260409-000001', createdAt:'2026-04-09T10:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D3', accountId:'ACC-USR-UT3-03', type:'пополнение', status:'завершена', amount:600000,  balanceBefore:0, balanceAfter:600000,  actorType:'self', performedByUserId:1004, onBehalfOfParticipantId:null, onBehalfOfPrincipalId:null, requestId:'P-20260409-000002', createdAt:'2026-04-09T12:00:00Z', description:'Пополнение задаткового счёта' },
    { txId:'TX-D4', accountId:'ACC-USR-UT1-02', type:'пополнение', status:'завершена', amount:25000,   balanceBefore:0, balanceAfter:25000,   actorType:'self', performedByUserId:1002, onBehalfOfParticipantId:null, onBehalfOfPrincipalId:null, requestId:'P-20260410-000001', createdAt:'2026-04-10T10:00:00Z', description:'Пополнение счёта услуг' },
  ];
  db.fundAllocations = [
    { allocId:'FA-D1', parentAllocationId:null, accountId:'ACC-USR-UT1-03', amount:1500000, fundSourceType:'add_funds', sourceEntityId:null, sourceTransactionId:'TX-D1', allowedWithdrawalType:'own', auctionId:null, debtorInn:null, status:'active', expiresAt:null, createdAt:'2026-04-08T10:00:00Z' },
    { allocId:'FA-D2', parentAllocationId:null, accountId:'ACC-USR-UT2-03', amount:800000,  fundSourceType:'add_funds', sourceEntityId:null, sourceTransactionId:'TX-D2', allowedWithdrawalType:'own', auctionId:null, debtorInn:null, status:'active', expiresAt:null, createdAt:'2026-04-09T10:00:00Z' },
    { allocId:'FA-D3', parentAllocationId:null, accountId:'ACC-USR-UT3-03', amount:600000,  fundSourceType:'add_funds', sourceEntityId:null, sourceTransactionId:'TX-D3', allowedWithdrawalType:'own', auctionId:null, debtorInn:null, status:'active', expiresAt:null, createdAt:'2026-04-09T12:00:00Z' },
    { allocId:'FA-D4', parentAllocationId:null, accountId:'ACC-USR-UT1-02', amount:25000,   fundSourceType:'add_funds', sourceEntityId:null, sourceTransactionId:'TX-D4', allowedWithdrawalType:'own', auctionId:null, debtorInn:null, status:'active', expiresAt:null, createdAt:'2026-04-10T10:00:00Z' },
  ];
  db.auditLog = [
    { auditId:'AL-D1', eventType:'balance_change', entityType:'transaction', entityId:'TX-D1', actorUserId:null, actorType:'system', payload:{amount:1500000, accountId:'ACC-USR-UT1-03'}, createdAt:'2026-04-08T10:00:00Z' },
    { auditId:'AL-D2', eventType:'balance_change', entityType:'transaction', entityId:'TX-D2', actorUserId:null, actorType:'system', payload:{amount:800000,  accountId:'ACC-USR-UT2-03'}, createdAt:'2026-04-09T10:00:00Z' },
    { auditId:'AL-D3', eventType:'balance_change', entityType:'transaction', entityId:'TX-D3', actorUserId:null, actorType:'system', payload:{amount:600000,  accountId:'ACC-USR-UT3-03'}, createdAt:'2026-04-09T12:00:00Z' },
    { auditId:'AL-D4', eventType:'balance_change', entityType:'transaction', entityId:'TX-D4', actorUserId:null, actorType:'system', payload:{amount:25000,   accountId:'ACC-USR-UT1-02'}, createdAt:'2026-04-10T10:00:00Z' },
  ];
  syncAccountBalances(db);
  saveDB(db);
}

function clearAllData(db) {
  db.transactions       = [];
  db.invoices           = [];
  db.deposits           = [];
  db.tradeApplications  = [];
  db.fundAllocations    = [];
  db.accountingRequests = [];
  db.auditLog           = [];
  db.auctions           = buildAuctions();
  db.principals         = buildPrincipals();
  db.docRequests        = [];
  db.accounts.forEach(a => {
    a.balanceFree=0; a.balanceReserved=0; a.balanceVirtual=0;
    a.isBlocked=false; a.blockReason=null; a.accountStatusId='active';
    a.updatedAt=new Date().toISOString();
  });
  syncAccountBalances(db);
  db.syncState.forEach(s => { s.lastSyncAt=new Date().toISOString(); s.updatedAt=new Date().toISOString(); });
  db.requisites = buildSeed().requisites;
  saveDB(db);
}

// ── Миграция v27 → v28 ──
function migrateV27toV28(db) {
  db._v = 28;
  db.accounts.forEach(a => {
    if (a.participantId  === undefined) a.participantId  = null;
    if (a.accountStatusId=== undefined) a.accountStatusId= a.isBlocked ? 'blocked' : 'active';
    if (a.blockReason    === undefined) a.blockReason    = null;
    if (a.createdAt      === undefined) a.createdAt      = '2026-01-01T00:00:00Z';
    if (a.updatedAt      === undefined) a.updatedAt      = '2026-01-01T00:00:00Z';
  });
  if (!db.accountBalances) {
    db.accountBalances = db.accounts.map(a => ({
      balanceId:`BAL-${a.accountId}`, accountId:a.accountId,
      balanceFree:a.balanceFree||0, balanceReserved:a.balanceReserved||0,
      balanceVirtual:a.balanceVirtual||0,
      balanceTotal:(a.balanceFree||0)+(a.balanceReserved||0)+(a.balanceVirtual||0),
      updatedAt:new Date().toISOString(),
    }));
  }
  db.transactions.forEach(t => {
    if (t.balanceBefore              === undefined) t.balanceBefore              = null;
    if (t.balanceAfter               === undefined) t.balanceAfter               = null;
    if (t.actorType                  === undefined) t.actorType                  = 'self';
    if (t.performedByUserId          === undefined) t.performedByUserId          = null;
    if (t.onBehalfOfParticipantId    === undefined) t.onBehalfOfParticipantId    = null;
    if (t.onBehalfOfPrincipalId      === undefined) t.onBehalfOfPrincipalId      = null;
  });
  db.invoices.forEach(i => {
    if (i.sourceType       === undefined) i.sourceType       = 'internal';
    if (i.amountPaid       === undefined) i.amountPaid       = null;
    if (i.isActive         === undefined) i.isActive         = true;
    if (i.externalId       === undefined) i.externalId       = null;
    if (i.billingRequestId === undefined) i.billingRequestId = null;
  });
  db.deposits.forEach(d => {
    if (d.debtorInn === undefined) d.debtorInn = null;
  });
  if (db.principals) {
    db.principals.forEach(p => {
      if (p.agentAccountId === undefined) {
        const acc = db.accounts.find(a => a.userId===p.userId && a.subAccountTypeId==='03');
        p.agentAccountId = acc ? acc.accountId : null;
      }
      if (p.entityType             === undefined) p.entityType             = 'ul';
      if (p.phone                  === undefined) p.phone                  = null;
      if (p.registrationAddressId  === undefined) p.registrationAddressId  = null;
    });
  }
  db.requisites.forEach(r => { if (r.principalId === undefined) r.principalId = null; });
  if (!db.fundAllocations) {
    db.fundAllocations = (db.virtualAllocations || []).map(va => ({
      allocId:va.allocId, parentAllocationId:null, accountId:va.accountId,
      amount:va.originalAmount, fundSourceType:'virtual',
      sourceEntityId:null, sourceTransactionId:null,
      allowedWithdrawalType:'none', auctionId:null, debtorInn:null,
      status:va.status==='active'?'active':'cancelled',
      expiresAt:va.expiresAt||null, createdAt:va.createdAt,
      originalAmount:va.originalAmount, repaidAmount:0,
      description:va.description||'',
    }));
  }
  if (!db.accountingRequests) db.accountingRequests = [];
  if (!db.auditLog)           db.auditLog           = [];
  if (!db.syncState) {
    db.syncState = [
      { syncStateId:'SS-1', accountingSystem:'unf', endpointType:'statuses', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
      { syncStateId:'SS-2', accountingSystem:'buh', endpointType:'statuses', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
      { syncStateId:'SS-3', accountingSystem:'unf', endpointType:'invoices', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
      { syncStateId:'SS-4', accountingSystem:'buh', endpointType:'invoices', lastSyncAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' },
    ];
  }
  return db;
}

// ── Миграция v29 → v30: обновление формата displayNumber (6-знаковый идентификатор) ──
function migrateV29toV30(db) {
  db._v = 30;
  db.accounts.forEach(a => {
    const m = (a.displayNumber || '').match(/^(\d{2})\.(\d+)\.(\d{5})-(\d{2})$/);
    if (!m) return;
    const [, yr, , inn, type] = m;
    const idNum = a.userId ? (userIddOf(a.userId) || 0) : (a.participantId || 0);
    a.displayNumber = `${yr}.${String(idNum).padStart(6,'0')}.${inn}-${type}`;
  });
  return db;
}

// ── Миграция v28 → v29: типы 02-04 → userId=null, participantId заполняется из USERS ──
function migrateV28toV29(db) {
  db._v = 29;
  db.accounts.forEach(a => {
    if (a.subAccountTypeId !== '01') {
      if (a.participantId == null && a.userId) {
        const user = USERS.find(u => u.userId === a.userId);
        if (user?.participantId != null) a.participantId = user.participantId;
      }
      a.userId = null;
    }
  });
  return db;
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p=JSON.parse(raw);
      if(p._v===30) return p;
      if(p._v===29) { const m=migrateV29toV30(p); saveDB(m); return m; }
      if(p._v===28) { const m=migrateV29toV30(migrateV28toV29(p)); saveDB(m); return m; }
    }
    // попытка мигрировать с v27
    const old = localStorage.getItem('cdt_billing_v27');
    if (old) { const p=JSON.parse(old); if(p._v===27) { const m=migrateV29toV30(migrateV28toV29(migrateV27toV28(p))); saveDB(m); return m; } }
  } catch(e) {}
  const db=buildSeed(); saveDB(db); return db;
}
function saveDB(db) {
  syncAccountBalances(db); // всегда актуализируем AccountBalances перед сохранением
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch(e) {}
}
function resetDB()   { localStorage.removeItem(STORE_KEY); localStorage.removeItem('cdt_billing_v27'); const db=buildSeed(); saveDB(db); return db; }

// Целочисленный userIdd (как в ETP DB) по строковому userId биллинга
function userIddOf(uid) {
  const i = USERS.findIndex(u => u.userId === uid);
  return i >= 0 ? 1000 + (i + 1) : null;
}

function accsForUser(db, uid) {
  const user = USERS.find(u => u.userId === uid);
  const pid = user?.participantId;
  // Тип 01: userId заполнен, participantId=null → ищем по userId
  // Типы 02–04: userId=null, participantId заполнен → ищем по participantId участника
  return db.accounts.filter(a =>
    a.userId === uid ||
    (pid != null && a.participantId === pid)
  );
}
function txsForUser(db,uid)      { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.transactions.filter(t=>ids.includes(t.accountId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
function invsForUser(db,uid)     { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.invoices.filter(i=>ids.includes(i.accountId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
function reqsForUser(db,uid)     { const ids=accsForUser(db,uid).map(a=>a.accountId); return db.requisites.filter(r=>ids.includes(r.accountId)); }
function accsForRole(db,role,uid){ return accsForUser(db,uid).filter(a=>['ut','both'].includes(role)?(a.subAccountTypeId==='02'||a.subAccountTypeId==='03'):['ot'].includes(role)?(a.subAccountTypeId==='02'||a.subAccountTypeId==='04'):(a.subAccountTypeId==='01'||a.subAccountTypeId==='03')); }

// virtualAllocations — виртуальные средства из fundAllocations (совместимость)
function virtualAllocs(db) { return (db.fundAllocations||[]).filter(a=>a.fundSourceType==='virtual'); }

// ── Хелпер создания транзакции с автозаполнением полей ОТР п.3.2.3 ──
function makeTx(db, fields) {
  const acc = db.accounts.find(a => a.accountId === fields.accountId);
  const balBefore = acc ? (acc.balanceFree + acc.balanceReserved + acc.balanceVirtual) : null;
  const amount = fields.amount || 0;
  const balAfter = balBefore !== null ? balBefore + amount : null;
  return Object.assign({
    txId:                    genId('TX'),
    balanceBefore:           balBefore,
    balanceAfter:            balAfter,
    actorType:               'self',
    performedByUserId:       null,
    onBehalfOfParticipantId: null,
    onBehalfOfPrincipalId:   null,
    requestId:               null,
    sourceInvoiceId:         null,
    sourceDepositId:         null,
    createdAt:               new Date().toISOString(),
  }, fields);
}

function releaseDeadline(iso) { const d=new Date(iso); d.setHours(d.getHours()+24); return d; }
function fmtDeadline(iso)     { return releaseDeadline(iso).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
