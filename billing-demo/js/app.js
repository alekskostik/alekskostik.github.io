document.addEventListener('alpine:init', () => {
  Alpine.data('billing', () => ({

    db: loadDB(), page:'wallet', theme:loadTheme(), showSeconds:false,
    modal:null, mStep:0,

    fsAccId:null, fsAmount:'', fsError:'', fsLoading:false, fsRid:'',
    fdAccId:null, fdAmount:'', fdTrade:'', fdPrincipalId:'', fdError:'', fdLoading:false, fdRid:'',
    wdAccId:null, wdAmount:'', wdType:'own', wdReqId:'', wdError:'', wdLoading:false, wdRid:'',
    wdDepositId:null, wdDepType:'debtor', wdDepSvcAmt:'', wdDepRestType:'debtor', wdDepSvcInvoiceId:'', wdDepSelectedInvoices:[], wdDepOwnReqId:'', wdDepError:'', wdDepLoading:false, wdDepRid:'',
    payServiceId:'acc',
    trFrom:null, trTo:null, trAmount:'', trError:'', trLoading:false, trRid:'',
    rqAccId:null, rqName:'', rqInn:'', rqKpp:'', rqBank:'', rqBik:'', rqAccNum:'', rqError:'', rqLoading:false,
    appAuctionId:null, appAmount:'', appError:'', appLoading:false,
    finishAuctionId:null,
    contractAuctionId:null, contractWith:null,
    admVirtualAccId:null, admVirtualAmt:'', admVirtualDesc:'', admVirtualExpiry:'', admVirtualError:'',
    sync1cFilter:'all', debtThresholdDays:0,
    prcName:'', prcInn:'', prcKpp:'', prcBank:'', prcBik:'', prcAccNum:'', prcError:'', prcLoading:false,
    actInvoiceId:null,
    brServiceId:null, brPayRid:'',

    CDT_NAME:'АО «Центр дистанционных торгов»', CDT_INN_KPP:'7812345678 / 780101001',
    CDT_BANK:'АО «Т-Банк»', CDT_BIK:'044525974', CDT_RS:'40702810000001234567',

    init() { applyTheme(this.theme); this.$nextTick(()=>this.checkExpiredAllocations()); },

    get currentUser()   { return USERS.find(u=>u.userId===this.db.currentUserId); },
    get currentUserId() { return this.db.currentUserId; },
    get currentRole()   { return this.currentUser?.role||'ut'; },
    get isBR()          { return this.currentRole==='br'; },
    get isBoth()        { return this.currentRole==='both'; },
    get isAdmin()       { return this.currentRole==='admin'; },
    get isUT()          { return this.currentRole==='ut'||this.currentRole==='both'; },
    get isOT()          { return this.currentRole==='ot'||this.currentRole==='both'; },
    // participantId текущего пользователя (null для админа и пользователей без участника)
    get myPid() { return this.currentUser?.participantId ?? null; },
    get currentParticipant() { return PARTICIPANTS.find(p => p.participantId === this.myPid) || null; },
    get currentParticipantUsers() {
      if (this.myPid == null) return [];
      return USERS.filter(u => u.participantId === this.myPid);
    },
    isMyAcc(accountId) { return accsForUser(this.db, this.currentUserId).some(a => a.accountId === accountId); },
    switchUser(uid)     { this.db.currentUserId=uid; saveDB(this.db); this.checkExpiredAllocations(); this.page=this.isAdmin?'adminAccounts':'wallet'; },

    setTheme(t)     { this.theme=t; applyTheme(t); },
    setPage(p)      { this.checkExpiredAllocations(); this.page=p; },
    openModal(name) { this.modal=name; this.mStep=0; },
    closeModal()    { this.modal=null; this.mStep=0; },

    resetAll()  { if(!confirm('Сбросить все данные?'))return; this.db=resetDB(); this.page='wallet'; },
    loadDemo()  { if(!confirm('Загрузить демонстрационные данные?'))return; loadDemoData(this.db); },
    clearData() { if(!confirm('Очистить все данные?'))return; clearAllData(this.db); },

    get accs()         {
      if(this.isAdmin) return [];
      const role=this.currentRole;
      // Для both: задатковые 03/04 объединены в отдельный блок, в accs только 02
      // Для BR: только задатковый 03 (01 и 02 скрыты)
      // Для остальных: 01 скрыт, сортировка 03→04→02
      let all=accsForUser(this.db,this.currentUserId);
      if(role==='br') all=all.filter(a=>a.subAccountTypeId==='03');
      else if(role==='both') all=all.filter(a=>a.subAccountTypeId==='02');
      else all=all.filter(a=>a.subAccountTypeId!=='01');
      return all.sort((a,b)=>({'03':0,'04':1,'02':2}[a.subAccountTypeId]||9)-({'03':0,'04':1,'02':2}[b.subAccountTypeId]||9));
    },
    get txs()          {
      return txsForUser(this.db,this.currentUserId).filter(t=>{
        if(this.currentRole!=='br') return true;
        if(t.type!=='пополнение') return true;
        // для БР скрываем пополнения счёта 01 (услуги), но показываем пополнения счёта 03 (задатки)
        const acc=this.db.accounts.find(a=>a.accountId===t.accountId);
        return acc?.subAccountTypeId!=='01';
      });
    },
    get invs()         {
      return invsForUser(this.db,this.currentUserId).filter(i=>{
        if(i.internal) return false;
        if(this.currentRole==='br'&&i.type==='пополнение'){
          const acc=this.db.accounts.find(a=>a.accountId===i.accountId);
          if(acc?.subAccountTypeId==='01') return false;
        }
        // скрываем отклонённые счета за торги/услуги
        if((i.type==='trade_invoice'||i.type==='service_invoice')&&i.status==='отклонено') return false;
        return true;
      });
    },
    get reqs()         { return reqsForUser(this.db,this.currentUserId); },
    get allInvs()      { return [...this.db.invoices].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
    get actsRequested() {
      return this.allInvs.filter(i=>i.actStatus==='запрошен');
    },
    get pendingInvs() {
      const pending=['создано','на рассмотрении','в обработке'];
      return this.allInvs.filter(i=>pending.includes(i.status));
    },
    // Счета, ожидающие оплаты (выставленные — вручную и авто)
    get issuedInvs() {
      return this.allInvs.filter(i=>
        (i.type==='trade_invoice'||i.type==='service_invoice')&&
        i.status==='выставлен'
      ).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    },
    // Счета за торги из единой таблицы invoices
    get myTradeInvs() {
      const myAccIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      return this.db.invoices.filter(i=>i.type==='trade_invoice'&&(myAccIds.includes(i.accountId)||i.organizerId===this.currentUserId))
        .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    },
    get allTradeInvs() {
      return this.db.invoices.filter(i=>i.type==='trade_invoice')
        .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    },
    // DocRequests — все запросы документов
    get myDocRequests() {
      const myInvIds=this.invs.map(i=>i.invoiceId);
      return (this.db.docRequests||[]).filter(r=>myInvIds.includes(r.refId))
        .sort((a,b)=>new Date(b.requestedAt)-new Date(a.requestedAt));
    },
    get pendingDocRequests() {
      return (this.db.docRequests||[]).filter(r=>r.status==='pending')
        .sort((a,b)=>new Date(b.requestedAt)-new Date(a.requestedAt));
    },
    get allTxs()       { return [...this.db.transactions].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
    get pendingCount() { return invsForUser(this.db,this.currentUserId).filter(i=>['создано','в обработке','на рассмотрении'].includes(i.status)).length; },
    get totalBalance() { return this.accs.reduce((s,a)=>s+a.balanceFree+a.balanceReserved+a.balanceVirtual,0); },

    get myDeposits() {
      const myIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      if(this.currentRole==='ut') return this.db.deposits.filter(d=>myIds.includes(d.payerAccountId));
      if(this.currentRole==='ot') return this.db.deposits.filter(d=>myIds.includes(d.receiverAccountId));
      return [];
    },
    get transferredDeposits() {
      const myIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      return this.db.deposits.filter(d=>myIds.includes(d.receiverAccountId)&&d.status==='переведён');
    },
    get myPrincipals() { return (this.db.principals||[]).filter(p=>p.userId===this.currentUserId); },

    depositHintForAuction(auctionId) {
      const myIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      return this.db.invoices.find(i=>myIds.includes(i.accountId)&&i.type==='пополнение'&&i.status==='исполнено'&&i.description&&i.description.includes('торги '+auctionId))||null;
    },

    get auctionsForUT()  { return this.db.auctions; },
    get auctionsForOT()  {
      const pid = this.myPid;
      if (pid == null) return [];
      const pUserIds = USERS.filter(u => u.participantId === pid).map(u => u.userId);
      return this.db.auctions.filter(a => pUserIds.includes(a.organizerId));
    },
    get allAuctions()    { return this.db.auctions; },
    myAppForAuction(aid) { return this.db.tradeApplications.find(a=>a.auctionId===aid&&a.bidderId===this.currentUserId); },
    // только принятые заявки, отсортированные по дате
    appsForAuction(aid)  { return [...this.db.tradeApplications.filter(a=>a.auctionId===aid)].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)); },
    // только активные (не отозванные) заявки для логики протокола
    activeAppsForAuction(aid) { return this.appsForAuction(aid).filter(a=>a.status==='принята'); },
    bidderName(uid)      { return USERS.find(u=>u.userId===uid)?.name||uid; },
    auctionById(aid)     { return this.db.auctions.find(a=>a.auctionId===aid); },

    get serviceAccs()  {
      if(this.currentRole==='br') return this.db.accounts.filter(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='01');
      return this.db.accounts.filter(a=>a.participantId===this.myPid&&a.subAccountTypeId==='02');
    },
    get depositAccs()  {
      const pid=this.myPid; const role=this.currentRole;
      if(role==='ot')   return this.db.accounts.filter(a=>a.participantId===pid&&a.subAccountTypeId==='04');
      if(role==='both') return this.db.accounts.filter(a=>a.participantId===pid&&(a.subAccountTypeId==='03'||a.subAccountTypeId==='04'));
      return this.db.accounts.filter(a=>a.participantId===pid&&a.subAccountTypeId==='03');
    },
    get withdrawableAccs() {
      const pid=this.myPid; const role=this.currentRole;
      if(role==='ut')   return this.db.accounts.filter(a=>a.participantId===pid&&(a.subAccountTypeId==='02'||a.subAccountTypeId==='03'));
      if(role==='both') return this.db.accounts.filter(a=>a.participantId===pid&&(a.subAccountTypeId==='02'||a.subAccountTypeId==='03'));
      if(role==='br')   return this.db.accounts.filter(a=>a.participantId===pid&&a.subAccountTypeId==='03');
      return this.serviceAccs;
    },
    get otDepAcc()     { return this.db.accounts.find(a=>a.participantId===this.myPid&&a.subAccountTypeId==='04')||null; },
    get verifiedReqs() { return reqsForUser(this.db,this.currentUserId).filter(r=>r.isVerified); },
    // текущий участник является агентом (может работать с принципалами)
    get isAgent() {
      const pid=this.myPid;
      return pid!=null&&(PARTICIPANTS.find(p=>p.participantId===pid)?.isAgent||false);
    },
    // принципалы, привязанные к текущему задатковому счёту в форме пополнения (только если участник — агент)
    get depositPrincipals() {
      if (!this.fdAccId||!this.isAgent) return [];
      return (this.db.principals||[]).filter(p=>p.agentAccountId===this.fdAccId&&p.isVerified);
    },
    // реквизиты для вывода с задаткового счёта: собственные + принципалов этого счёта
    get depositWithdrawReqs() {
      const ownReqs = this.verifiedReqs.filter(r=>!r.principalId);
      const prcIds = (this.db.principals||[]).filter(p=>p.agentAccountId===this.wdAccId&&p.isVerified).map(p=>p.principalId);
      const prcReqs = this.verifiedReqs.filter(r=>r.principalId&&prcIds.includes(r.principalId));
      return [...ownReqs, ...prcReqs];
    },
    // есть ли активные аллокации с принципалом на текущем счёте вывода
    get wdAccHasPrincipalFunds() {
      return (this.db.fundAllocations||[]).some(a=>a.accountId===this.wdAccId&&a.fundSourceType==='add_funds'&&a.status==='active'&&a.principalId);
    },
    get payServices()  { return SERVICES.filter(s=>!s.roles||s.roles.includes(this.currentRole)); },
    get currentPayService() { return this.payServices.find(s=>s.id===this.payServiceId); },
    get servAcc()      { return this.serviceAccs[0]||null; },
    get servAccEffectiveBalance() { const acc=this.servAcc; if(!acc) return 0; return acc.balanceFree+(acc.balanceVirtual||0); },
    get transferFrom() { return this.db.accounts.find(a=>a.participantId===this.myPid&&a.subAccountTypeId==='04')||null; },
    get transferTo()   { return this.db.accounts.find(a=>a.participantId===this.myPid&&a.subAccountTypeId==='02')||null; },
    get selectedWithdrawAcc() { return this.db.accounts.find(a=>a.accountId===this.wdAccId)||null; },
    get isDepositWithdraw()   { return this.selectedWithdrawAcc?.subAccountTypeId==='03'; },

    // ── Виртуальный долг = сумма virtualAmount по активным задаткам + потраченное на услуги ──
    _activeVirtualDebt(accountId) {
      // задатки в резерве с виртуальной частью
      const depDebt=this.db.deposits
        .filter(d=>d.payerAccountId===accountId&&(d.virtualAmount||0)>0&&d.status==='заблокирован')
        .reduce((s,d)=>s+d.virtualAmount,0);
      // услуги, оплаченные виртуальными (фиксируем в транзакции с типом 'оплата услуги' и полем virtualPart)
      const svcDebt=this.db.transactions
        .filter(t=>t.accountId===accountId&&t.type==='оплата услуги'&&(t.virtualPart||0)>0&&!t.repaid)
        .reduce((s,t)=>s+t.virtualPart,0);
      return depDebt+svcDebt;
    },
    _virtDebtForAcc(accountId) { return this._activeVirtualDebt(accountId); },

    // admin
    get adminAllAccounts() {
      return this.db.accounts.map(acc=>{
        const u=acc.userId?USERS.find(u=>u.userId===acc.userId):null;
        const p=acc.participantId!=null?PARTICIPANTS.find(p=>p.participantId===acc.participantId):null;
        const pUsers=!u&&acc.participantId!=null?USERS.filter(u=>u.participantId===acc.participantId):[];
        const userName=u?.name||p?.name||'—';
        const userLabel=u?.label||pUsers.map(u=>u.label).join(', ')||p?.name?.slice(0,14)||'—';
        return {...acc,userName,userLabel,typeLabel:ACC_TYPE_LABEL[acc.subAccountTypeId]||acc.subAccountTypeId};
      });
    },
    get adminAllDeposits() {
      return [...this.db.deposits].sort((a,b)=>new Date(b.blockedAt)-new Date(a.blockedAt)).map(d=>{
        const payer=this.db.accounts.find(a=>a.accountId===d.payerAccountId);
        let payerName='';
        if(payer?.userId) payerName=USERS.find(u=>u.userId===payer.userId)?.name||'';
        else if(payer?.participantId!=null) payerName=PARTICIPANTS.find(p=>p.participantId===payer.participantId)?.name||'';
        return {...d,payerDisplay:payer?.displayNumber||d.payerAccountId,payerName};
      });
    },
    get adminAllTxs() {
      return this.allTxs.map(tx=>{
        const acc=this.db.accounts.find(a=>a.accountId===tx.accountId);
        const u=acc?.userId?USERS.find(u=>u.userId===acc.userId):null;
        const p=acc?.participantId!=null?PARTICIPANTS.find(p=>p.participantId===acc.participantId):null;
        return {...tx,userName:u?.name||p?.name||'',userLabel:u?.label||p?.name?.slice(0,12)||'',accDisplay:acc?.displayNumber||tx.accountId};
      });
    },
    // П.2: баланс задаткового р/с ЦДТ = подтверждённые пополнения задатковых - подтверждённые выводы
    get cdtDepositBalance() {
      const depAccIds=this.db.accounts.filter(a=>a.subAccountTypeId==='03'||a.subAccountTypeId==='04').map(a=>a.accountId);
      const inflow=this.db.transactions
        .filter(t=>depAccIds.includes(t.accountId)&&t.type==='пополнение'&&t.status==='завершена')
        .reduce((s,t)=>s+t.amount,0);
      const outflow=this.db.transactions
        .filter(t=>depAccIds.includes(t.accountId)&&(t.type==='вывод'||t.type==='вывод задатка')&&t.status==='завершена')
        .reduce((s,t)=>s+Math.abs(t.amount),0);
      return Math.max(0,inflow-outflow);
    },

    fmt, fmtDt, SERVICES, USERS, QR_SVG,
    sync1cAccountType(inv) {
      if(inv.type==='trade_invoice'||inv.type==='service_invoice') return 'cdt_svc';
      if(inv.type==='internal_transfer') return 'deposit';
      const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
      if(!acc) return 'all';
      if(acc.subAccountTypeId==='01') return 'ip_svc';
      if(acc.subAccountTypeId==='02') return 'cdt_svc';
      if(acc.subAccountTypeId==='03'||acc.subAccountTypeId==='04') return 'deposit';
      return 'all';
    },
    sync1cAccountLabel(inv) {
      return {'ip_svc':'Р/с услуг ИП','cdt_svc':'Р/с услуг ЦДТ','deposit':'Р/с задатков ЦДТ'}[this.sync1cAccountType(inv)]||'—';
    },

    fmtDtFlex(d, withSec) {
      const dt=new Date(d);
      const date=dt.toLocaleDateString('ru-RU');
      const time=withSec
        ? dt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
        : dt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
      return date+' '+time;
    },
    // ── DocRequests: единый механизм для всех типов документов ──
    requestDoc(invoiceId, docType='act') {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId);
      if(!inv) return;
      if(!this.db.docRequests) this.db.docRequests=[];
      // проверяем нет ли уже pending запроса
      const existing=this.db.docRequests.find(r=>r.refId===invoiceId&&r.type===docType&&r.status==='pending');
      if(existing) return;
      this.db.docRequests.push({
        docRequestId:genId('DR'), type:docType,
        refId:invoiceId, status:'pending',
        requestedAt:new Date().toISOString(), issuedAt:null,
        description:(docType==='act'?'Запрос акта: ':'Запрос документа: ')+(inv.description||inv.type)
      });
      saveDB(this.db);
    },
    openActModal(invoiceId)      { this.actInvoiceId=invoiceId; this.openModal('actView'); },
    openInvRequisites(invoiceId) { this.actInvoiceId=invoiceId; this.openModal('invRequisites'); },
    openBRService(svcId) {
      const svc=SERVICES.find(s=>s.id===svcId);
      if(!svc) return;
      const acc=this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='01');
      if(!acc){alert('Счёт не найден');return;}
      // Генерируем заявку и сразу показываем реквизиты
      this.brServiceId=svcId;
      this.brPayRid=reqIdGen('P');
      this.mStep=0;
      // Создаём заявку в invoices
      const brInvId=genId('INV');
      this.db.invoices.unshift({
        invoiceId:brInvId, accountId:acc.accountId,
        type:'пополнение', status:'создано', sourceType:'internal', isActive:true, amountPaid:null,
        amount:svc.price, requestId:this.brPayRid,
        createdAt:new Date().toISOString(),
        description:'Оплата услуги: '+svc.name
      });
      this._log('invoice_created','invoice',brInvId,{type:'br_service',serviceId:svcId,amount:svc.price,accountId:acc.accountId});
      saveDB(this.db);
      this.openModal('brServicePay');
    },

    confirmDocRequest(docRequestId) {
      const dr=(this.db.docRequests||[]).find(r=>r.docRequestId===docRequestId);
      if(!dr) return;
      dr.status='ready'; dr.issuedAt=new Date().toISOString();
      saveDB(this.db);
    },
    // Deprecated aliases — оставлены для совместимости с HTML
    requestAct(invoiceId) { this.requestDoc(invoiceId,'act'); },
    requestActTI(invoiceId) { this.requestDoc(invoiceId,'act'); },
    openActModalTI(invoiceId) { this.openActModal(invoiceId); },
    // Статус DocRequest для конкретного invoice
    docRequestStatus(invoiceId, docType='act') {
      const r=(this.db.docRequests||[]).find(d=>d.refId===invoiceId&&d.type===docType);
      return r?.status||null;
    },

    accForId(id)    { return this.db.accounts.find(a=>a.accountId===id); },
    _log(eventType, entityType, entityId, payload={}, actorType='self') {
      if(!this.db.auditLog) this.db.auditLog=[];
      this.db.auditLog.push({auditId:genId('AL'),eventType,entityType,entityId,actorUserId:actorType==='system'?null:this.currentUserId,actorType,payload,createdAt:new Date().toISOString()});
    },
    userByAccId(id) { const acc=this.db.accounts.find(a=>a.accountId===id); return USERS.find(u=>u.userId===acc?.userId); },
    badgeClass(s)   { return ({'исполнено':'bs','завершена':'bs','на рассмотрении':'bp','создано':'bc','отклонено':'be','отменён':'be','в обработке':'bc','заблокирован':'bc','переведён':'bs','снята блокировка':'bs','выведен':'bs','удерживается':'bp','принята':'bs','победитель':'bs','второй участник':'bp','победитель (договор)':'bs','Приём заявок':'bs','Протокол опубликован':'bp','Договор подписан':'bs','Приостановлены':'be','Заблокирован':'be','Активен':'bs'})[s]||'bc'; },
    txClass(tx)     { return tx.type==='блокировка задатка'?'tx-res':tx.amount>0?'tx-plus':'tx-minus'; },
    depositBadge(s) { return ({'заблокирован':'bc','переведён':'bs','снята блокировка':'bs','выведен':'bs','удерживается':'bp','отменён':'be'})[s]||'bc'; },
    depositStatusLabel(s) { return ({'снята блокировка':'блокировка снята'})[s]||s; },

    openFundsService(accId) { this.fsAccId=accId||this.serviceAccs[0]?.accountId||null; this.fsAmount=''; this.fsError=''; this.fsLoading=false; this.fsRid=''; this.openModal('fundsService'); },
    openFundsDeposit(accId) { this.fdAccId=accId||this.depositAccs[0]?.accountId||null; this.fdAmount=''; this.fdTrade=''; this.fdPrincipalId=''; this.fdError=''; this.fdLoading=false; this.fdRid=''; this.openModal('fundsDeposit'); },
    openWithdraw(accId)     { this.wdAccId=accId||this.serviceAccs[0]?.accountId||null; this.wdAmount=''; this.wdType='own'; this.wdReqId=this.verifiedReqs.filter(r=>!r.principalId)[0]?.requisiteId||''; this.wdError=''; this.wdLoading=false; this.wdRid=''; this.openModal('withdraw'); },
    openWithdrawDeposit(depositId) { this.wdDepositId=depositId||null; this.wdDepType='debtor'; this.wdDepSvcAmt=''; this.wdDepRestType='debtor'; this.wdDepSvcInvoiceId=''; this.wdDepSelectedInvoices=[]; this.wdDepOwnReqId=this.verifiedReqs[0]?.requisiteId||''; this.wdDepError=''; this.wdDepLoading=false; this.wdDepRid=''; this.openModal('withdrawDeposit'); },
    openTransfer()   { this.trAmount=''; this.trError=''; this.trLoading=false; this.trRid=''; this.openModal('transfer'); },
    openAddReq()     { this.rqAccId=this.serviceAccs[0]?.accountId||null; this.rqName=''; this.rqInn=''; this.rqKpp=''; this.rqBank=''; this.rqBik=''; this.rqAccNum=''; this.rqError=''; this.rqLoading=false; this.openModal('addReq'); },
    openTradeApp(aid){ const auc=this.db.auctions.find(a=>a.auctionId===aid); this.appAuctionId=aid; this.appAmount=String(auc?.minDeposit||0); this.appError=''; this.appLoading=false; this.openModal('tradeApp'); },
    openFinishAuction(aid)  { this.finishAuctionId=aid; this.openModal('finishAuction'); },
    openSignContract(aid)   { this.contractAuctionId=aid; this.contractWith=null; this.openModal('signContract'); },
    openAdmVirtual(accId)   { this.admVirtualAccId=accId; this.admVirtualAmt=''; this.admVirtualDesc=''; this.admVirtualExpiry=''; this.admVirtualError=''; this.checkExpiredAllocations(); this.openModal('admVirtual'); },
    openAddPrincipal()      { this.prcName=''; this.prcInn=''; this.prcKpp=''; this.prcBank=''; this.prcBik=''; this.prcAccNum=''; this.prcError=''; this.prcLoading=false; this.openModal('addPrincipal'); },

    get selectedDepositForWithdraw() {
      if(!this.wdDepositId) return this.transferredDeposits[0]||null;
      return this.db.deposits.find(d=>d.depositId===this.wdDepositId)||null;
    },

    // ── ПОПОЛНЕНИЕ УСЛУГИ ──
    submitFundsService() {
      this.fsError=''; if(!this.fsAmount||parseFloat(this.fsAmount)<=0){this.fsError='Укажите сумму';return;}
      this.fsLoading=true;
      setTimeout(()=>{
        this.fsRid=reqIdGen('P');
        const invId=genId('INV');
        this.db.invoices.unshift({invoiceId:invId,accountId:this.fsAccId,type:'пополнение',status:'создано',sourceType:'internal',isActive:true,amountPaid:null,amount:parseFloat(this.fsAmount),requestId:this.fsRid,createdAt:new Date().toISOString(),description:'Пополнение счёта услуг'});
        // AccountingRequests
        if(!this.db.accountingRequests) this.db.accountingRequests=[];
        this.db.accountingRequests.push({requestId:genId('AR'),externalRequestId:this.fsRid,requestType:'add_funds',endpoint:'POST /invoices',status:'pending',attemptCount:1,lastAttemptAt:new Date().toISOString(),resolvedAt:null,relatedEntityType:'invoice',relatedEntityId:invId,createdAt:new Date().toISOString()});
        this._log('invoice_created','invoice',invId,{type:'пополнение',amount:parseFloat(this.fsAmount),accountId:this.fsAccId,requestId:this.fsRid});
        saveDB(this.db); this.fsLoading=false; this.mStep=1;
      },600);
    },

    // ── ПОПОЛНЕНИЕ ЗАДАТКА ──
    submitFundsDeposit() {
      this.fdError=''; if(!this.fdAmount||parseFloat(this.fdAmount)<=0){this.fdError='Укажите сумму';return;}
      this.fdLoading=true;
      setTimeout(()=>{
        this.fdRid=reqIdGen('P');
        const invId=genId('INV');
        const fdPrc=this.fdPrincipalId?(this.db.principals||[]).find(p=>p.principalId===this.fdPrincipalId):null;
        this.db.invoices.unshift({invoiceId:invId,accountId:this.fdAccId,type:'пополнение',status:'создано',sourceType:'internal',isActive:true,amountPaid:null,amount:parseFloat(this.fdAmount),requestId:this.fdRid,createdAt:new Date().toISOString(),principalId:this.fdPrincipalId||null,description:'Пополнение задаткового счёта'+(fdPrc?' (принципал: '+fdPrc.fullName+')':'')+(this.fdTrade?' (торги '+this.fdTrade+')':'')});
        if(!this.db.accountingRequests) this.db.accountingRequests=[];
        this.db.accountingRequests.push({requestId:genId('AR'),externalRequestId:this.fdRid,requestType:'add_funds',endpoint:'POST /invoices',status:'pending',attemptCount:1,lastAttemptAt:new Date().toISOString(),resolvedAt:null,relatedEntityType:'invoice',relatedEntityId:invId,createdAt:new Date().toISOString()});
        this._log('invoice_created','invoice',invId,{type:'пополнение задатка',amount:parseFloat(this.fdAmount),accountId:this.fdAccId,requestId:this.fdRid,tradeId:this.fdTrade||null});
        saveDB(this.db); this.fdLoading=false; this.mStep=1;
      },600);
    },

    // ── ВЫВОД ──
    submitWithdraw() {
      this.wdError=''; const amt=parseFloat(this.wdAmount);
      if(!this.wdAmount||isNaN(amt)||amt<=0){this.wdError='Укажите корректную сумму';return;}
      const acc=this.db.accounts.find(a=>a.accountId===this.wdAccId);
      if(acc.balanceFree<amt){this.wdError='Недостаточно свободных средств. Доступно: '+fmt(acc.balanceFree);return;}
      this.wdLoading=true;
      setTimeout(()=>{
        const balBefore=acc.balanceFree+acc.balanceReserved+(acc.balanceVirtual||0);
        acc.balanceFree-=amt; acc.balanceReserved+=amt;
        this.wdRid=reqIdGen('W');
        const selReq=(this.db.requisites||[]).find(r=>r.requisiteId===this.wdReqId);
        const wdPrcId=selReq?.principalId||null;
        const wdPrcName=wdPrcId?(this.db.principals||[]).find(p=>p.principalId===wdPrcId)?.fullName:null;
        const desc=wdPrcName?'Вывод задатка на реквизиты принципала '+wdPrcName:(acc.subAccountTypeId==='03'?'Вывод средств с задаткового счёта':'Вывод д/с на реквизиты');
        const invId=genId('INV'); const now=new Date().toISOString();
        this.db.invoices.unshift({invoiceId:invId,accountId:this.wdAccId,type:'вывод',status:'на рассмотрении',sourceType:'internal',isActive:true,amountPaid:null,amount:amt,requestId:this.wdRid,createdAt:now,description:desc});
        this.db.transactions.unshift({txId:genId('TX'),accountId:this.wdAccId,type:'вывод',status:'в обработке',amount:-amt,balanceBefore:balBefore,balanceAfter:balBefore-amt,actorType:'self',performedByUserId:userIddOf(this.currentUserId),onBehalfOfParticipantId:null,onBehalfOfPrincipalId:wdPrcId,requestId:this.wdRid,sourceInvoiceId:invId,sourceDepositId:null,createdAt:now,description:desc});
        if(!this.db.accountingRequests) this.db.accountingRequests=[];
        this.db.accountingRequests.push({requestId:genId('AR'),externalRequestId:this.wdRid,requestType:'withdrawal',endpoint:'POST /withdrawals',status:'pending',attemptCount:1,lastAttemptAt:now,resolvedAt:null,relatedEntityType:'invoice',relatedEntityId:invId,createdAt:now});
        if(!this.db.auditLog) this.db.auditLog=[];
        this.db.auditLog.push({auditId:genId('AL'),eventType:'balance_change',entityType:'transaction',entityId:this.db.transactions[0].txId,actorUserId:this.currentUserId,actorType:'self',payload:{amount:-amt,type:'вывод',accountId:this.wdAccId},createdAt:now});
        this._log('invoice_created','invoice',invId,{type:'вывод',amount:amt,accountId:this.wdAccId,requestId:this.wdRid});
        saveDB(this.db); this.wdLoading=false; this.mStep=1;
      },500);
    },

    // ── ВЫВОД ЗАДАТКА ОТ ──
    submitWithdrawDeposit() {
      this.wdDepError='';
      const dep=this.selectedDepositForWithdraw;
      if(!dep){this.wdDepError='Выберите задаток';return;}
      const acc=this.db.accounts.find(a=>a.accountId===dep.receiverAccountId);
      if(!acc||acc.balanceFree<dep.amount){this.wdDepError='Нет средств для вывода';return;}
      const auc=this.db.auctions.find(a=>a.auctionId===dep.auctionId);
      const amt=dep.amount;
      const now=new Date().toISOString();
      this.wdDepLoading=true;
      setTimeout(()=>{
        acc.balanceFree-=amt;
        let remaining=amt; // сколько задатка ещё не распределено

        if(this.wdDepType==='service'&&(this.wdDepSelectedInvoices||[]).length>0){
          // оплачиваем выбранные счета из задатка (FIFO по сумме)
          const svcAcc=this.db.accounts.find(a=>a.participantId===this.myPid&&a.subAccountTypeId==='02');
          const selectedTIs=this.db.invoices.filter(i=>i.type==='trade_invoice'&&this.wdDepSelectedInvoices.includes(i.invoiceId));
          let totalPaidFromDeposit=0;
          for(const ti of selectedTIs){
            if(remaining<=0) break;
            const pay=Math.min(ti.amount||0, remaining);
            remaining-=pay;
            totalPaidFromDeposit+=pay;
            if(pay>=(ti.amount||0)){
              ti.status='оплачен'; ti.paidAt=now;
            }
            this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'зачёт задатка в оплату счёта',status:'завершена',amount:-pay,createdAt:now,description:'Зачёт задатка в оплату счёта за торги '+dep.auctionId+' ('+ti.description+')'});
            // если задатка не хватило — доплачиваем со счёта услуг ОТ
            const diff=(ti.amount||0)-pay;
            if(diff>0&&svcAcc&&svcAcc.balanceFree>=diff){
              svcAcc.balanceFree-=diff;
              this.db.transactions.unshift({txId:genId('TX'),accountId:svcAcc.accountId,type:'доплата по счёту за торги',status:'завершена',amount:-diff,createdAt:now,description:'Доплата остатка счёта за торги ('+ti.description+')'});
              ti.status='оплачен'; ti.paidAt=now;
            }
          }
          // П.2: фиксируем внутренний перевод задатковый р/с → р/с услуг ОТ
          // Это внутренняя проводка ЦДТ (POST /deposit-payments в 1С), не видна в ЛК пользователя
          // Отображается только в "Обработке 1С" как системная операция
          if(totalPaidFromDeposit>0){
            this.db.invoices.push({
              invoiceId:genId('INV'), accountId:acc.accountId,
              type:'internal_transfer', status:'завершена',
              amount:totalPaidFromDeposit, createdAt:now, completedAt:now,
              requestId:reqIdGen('T'),
              description:'Авто-перевод задатковый р/с → р/с услуг ОТ (торги '+dep.auctionId+')',
              internal:true
            });
          }
        }

        // остаток — вывод
        if(remaining>0){
          acc.balanceReserved+=remaining;
          this.wdDepRid=reqIdGen('W');
          const toDebtor=this.wdDepType==='debtor'||(this.wdDepType==='service'&&this.wdDepRestType==='debtor');
          const restDesc=toDebtor
            ? 'Вывод задатка по торгам '+dep.auctionId+' (должник: '+(auc?.debtorName||'—')+')'
            : 'Вывод задатка на собственные реквизиты ОТ (торги '+dep.auctionId+')';
          this.db.invoices.unshift({invoiceId:genId('INV'),accountId:acc.accountId,type:'вывод задатка',status:'на рассмотрении',sourceType:'internal',isActive:true,amountPaid:null,amount:remaining,requestId:this.wdDepRid,createdAt:now,description:restDesc});
          this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'вывод задатка',status:'в обработке',amount:-remaining,createdAt:now,description:restDesc,requestId:this.wdDepRid});
        }
        dep.status='выведен';
        this._log('deposit_withdrawal_initiated','deposit',dep.depositId,{auctionId:dep.auctionId,amount:dep.amount,withdrawType:this.wdDepType});
        saveDB(this.db); this.wdDepLoading=false; this.mStep=1;
      },500);
    },


    // ── ОПЛАТА УСЛУГ ──
    submitPay() {
      const svc=this.currentPayService;
      const acc=this.db.accounts.find(a=>a.accountId===this.servAcc?.accountId);
      if(!acc){alert('Счёт не найден');return;}
      const effective=acc.balanceFree+(acc.balanceVirtual||0);
      if(effective<svc.price){alert('Недостаточно средств (доступно: '+fmt(effective)+')');return;}
      setTimeout(()=>{
        const balBefore=acc.balanceFree+acc.balanceReserved+(acc.balanceVirtual||0);
        const fromReal=Math.min(acc.balanceFree, svc.price);
        const fromVirt=svc.price-fromReal;
        acc.balanceFree-=fromReal;
        if(fromVirt>0) acc.balanceVirtual=Math.max(0,(acc.balanceVirtual||0)-fromVirt);
        const rid=reqIdGen('S'); const now=new Date().toISOString(); const invId=genId('INV');
        this.db.invoices.unshift({invoiceId:invId,accountId:acc.accountId,type:'оплата услуги',status:'исполнено',sourceType:'internal',isActive:true,amountPaid:svc.price,amount:svc.price,requestId:rid,createdAt:now,description:'Услуга: '+svc.name});
        this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'оплата услуги',status:'завершена',amount:-svc.price,balanceBefore:balBefore,balanceAfter:balBefore-svc.price,actorType:'self',performedByUserId:userIddOf(this.currentUserId),onBehalfOfParticipantId:null,onBehalfOfPrincipalId:null,virtualPart:fromVirt,repaid:false,requestId:rid,sourceInvoiceId:invId,sourceDepositId:null,createdAt:now,description:'Услуга: '+svc.name});
        if(!this.db.accountingRequests) this.db.accountingRequests=[];
        this.db.accountingRequests.push({requestId:genId('AR'),externalRequestId:rid,requestType:'service_payment',endpoint:'POST /service-payments',status:'completed',attemptCount:1,lastAttemptAt:now,resolvedAt:now,relatedEntityType:'invoice',relatedEntityId:invId,createdAt:now});
        if(!this.db.auditLog) this.db.auditLog=[];
        this.db.auditLog.push({auditId:genId('AL'),eventType:'balance_change',entityType:'transaction',entityId:this.db.transactions[0].txId,actorUserId:this.currentUserId,actorType:'self',payload:{amount:-svc.price,type:'оплата услуги',accountId:acc.accountId},createdAt:now});
        saveDB(this.db); this.mStep=1;
      },400);
    },

    // ── ПЕРЕВОД ОТ ──
    submitTransfer() {
      this.trError='';
      const amt=parseFloat(this.trAmount); if(!this.trAmount||isNaN(amt)||amt<=0){this.trError='Укажите сумму';return;}
      const from=this.transferFrom; if(!from||from.balanceFree<amt){this.trError='Недостаточно средств. Доступно: '+fmt(from?.balanceFree||0);return;}
      this.trLoading=true;
      setTimeout(()=>{
        from.balanceFree-=amt; from.balanceReserved+=amt; this.trRid=reqIdGen('T');
        const trInvId=genId('INV');
        this.db.invoices.unshift({invoiceId:trInvId,accountId:from.accountId,type:'перевод задаткового на услуги',status:'в обработке',sourceType:'internal',isActive:true,amountPaid:null,amount:amt,requestId:this.trRid,createdAt:new Date().toISOString(),description:'Перевод с задаткового счёта на счёт услуг'});
        this.db.transactions.unshift({txId:genId('TX'),accountId:from.accountId,type:'перевод между субсчетами',status:'в обработке',amount:-amt,createdAt:new Date().toISOString(),description:'Перевод ('+this.trRid+')'});
        this._log('transfer_initiated','invoice',trInvId,{amount:amt,fromAccountId:from.accountId,requestId:this.trRid});
        saveDB(this.db); this.trLoading=false; this.mStep=1;
      },400);
    },

    // ── РЕКВИЗИТЫ ──
    submitAddReq() {
      this.rqError=''; if(!this.rqName||!this.rqInn||!this.rqBank||!this.rqBik||!this.rqAccNum){this.rqError='Заполните все обязательные поля';return;}
      this.rqLoading=true;
      setTimeout(()=>{
        const ex=this.db.requisites.filter(r=>r.accountId===this.rqAccId);
        const reqId=genId('REQ');
        this.db.requisites.push({requisiteId:reqId,accountId:this.rqAccId,bankName:this.rqBank,bik:this.rqBik,corAccount:'',accountNumber:this.rqAccNum,inn:this.rqInn,kpp:this.rqKpp,fullName:this.rqName,isVerified:false,isDefault:ex.length===0,createdAt:new Date().toISOString()});
        this._log('requisite_added','requisite',reqId,{accountId:this.rqAccId,fullName:this.rqName,bik:this.rqBik});
        saveDB(this.db); this.rqLoading=false; this.closeModal(); this.page='requisites';
      },400);
    },

    // ── ПРИНЦИПАЛ ──
    submitAddPrincipal() {
      this.prcError=''; if(!this.prcName||!this.prcInn||!this.prcBank||!this.prcBik||!this.prcAccNum){this.prcError='Заполните все обязательные поля';return;}
      this.prcLoading=true;
      setTimeout(()=>{
        if(!this.db.principals) this.db.principals=[];
        const prcId=genId('PRC');
        this.db.principals.push({principalId:prcId,userId:this.currentUserId,fullName:this.prcName,inn:this.prcInn,kpp:this.prcKpp,bankName:this.prcBank,bik:this.prcBik,accountNumber:this.prcAccNum,isVerified:false,createdAt:new Date().toISOString()});
        this._log('principal_added','principal',prcId,{fullName:this.prcName,inn:this.prcInn});
        saveDB(this.db); this.prcLoading=false; this.closeModal();
      },400);
    },

    // ── ПОДАЧА ЗАЯВКИ ──
    submitTradeApp() {
      this.appError=''; const auc=this.db.auctions.find(a=>a.auctionId===this.appAuctionId);
      if(!auc||auc.status!=='Приём заявок'){this.appError='Торги не принимают заявки';return;}
      const amt=parseFloat(this.appAmount); if(!this.appAmount||isNaN(amt)||amt<=0){this.appError='Укажите сумму задатка';return;}
      if(amt<auc.minDeposit){this.appError='Минимальная сумма: '+fmt(auc.minDeposit);return;}
      if(this.myAppForAuction(this.appAuctionId)){this.appError='Вы уже подали заявку';return;}
      const depAcc=this.db.accounts.find(a=>a.participantId===this.myPid&&a.subAccountTypeId==='03');
      const depEffective=(depAcc?.balanceFree||0)+(depAcc?.balanceVirtual||0);
      if(!depAcc||depEffective<amt){this.appError='Недостаточно средств. Доступно: '+fmt(depEffective);return;}
      this.appLoading=true;
      setTimeout(()=>{
        const fromRealDep=Math.min(depAcc.balanceFree, amt);
        const fromVirtDep=amt-fromRealDep;
        const virtInDeposit=fromVirtDep;
        const balBefore=depAcc.balanceFree+depAcc.balanceReserved+(depAcc.balanceVirtual||0);
        depAcc.balanceFree-=fromRealDep;
        if(fromVirtDep>0) depAcc.balanceVirtual=Math.max(0,(depAcc.balanceVirtual||0)-fromVirtDep);
        depAcc.balanceReserved+=amt;
        const now=new Date().toISOString();
        const depId=genId('DEP');
        const orgParticipantId=USERS.find(u=>u.userId===auc.organizerId)?.participantId;
        const otDepAcc=this.db.accounts.find(a=>a.participantId===orgParticipantId&&a.subAccountTypeId==='04');
        // FundAllocations: исходная запись add_funds → split, дочерняя deposit_ut
        // Предпочитаем аллокацию с principalId (агент внёс задаток от имени принципала)
        const _allocCandidates=(this.db.fundAllocations||[]).filter(a=>a.accountId===depAcc.accountId&&a.fundSourceType==='add_funds'&&a.status==='active'&&a.amount>=amt);
        const existingAlloc=_allocCandidates.find(a=>a.principalId)||_allocCandidates.find(a=>!a.principalId)||null;
        const allocPrincipalId=existingAlloc?.principalId||null;
        this.db.deposits.unshift({depositId:depId,payerAccountId:depAcc.accountId,receiverAccountId:otDepAcc?.accountId||null,auctionId:auc.auctionId,tradeLotId:auc.lotId,amount:amt,virtualAmount:virtInDeposit,status:'заблокирован',blockedAt:now,releasedAt:null,releaseAfter:null,holdUntilContract:false,payer:this.currentUser.name,allowedWithdrawalType:'none',debtorInn:auc.debtorReq?.inn||null,principalId:allocPrincipalId});
        if(existingAlloc){
          existingAlloc.status='split';
          const remainder=existingAlloc.amount-amt;
          this.db.fundAllocations.push({allocId:genId('FA'),parentAllocationId:existingAlloc.allocId,accountId:depAcc.accountId,amount:amt,fundSourceType:'deposit_ut',sourceEntityId:depId,sourceTransactionId:null,allowedWithdrawalType:'none',principalId:allocPrincipalId,auctionId:auc.auctionId,debtorInn:auc.debtorReq?.inn||null,status:'active',expiresAt:null,createdAt:now});
          if(remainder>0) this.db.fundAllocations.push({allocId:genId('FA'),parentAllocationId:existingAlloc.allocId,accountId:depAcc.accountId,amount:remainder,fundSourceType:'add_funds',sourceEntityId:null,sourceTransactionId:null,allowedWithdrawalType:allocPrincipalId?'principal':'own',principalId:allocPrincipalId,auctionId:null,debtorInn:null,status:'active',expiresAt:null,createdAt:now});
        }
        const txId=genId('TX');
        this.db.transactions.unshift({txId,accountId:depAcc.accountId,type:'блокировка задатка',status:'завершена',amount:-amt,balanceBefore:balBefore,balanceAfter:balBefore-amt,actorType:'self',performedByUserId:userIddOf(this.currentUserId),onBehalfOfParticipantId:null,onBehalfOfPrincipalId:null,requestId:null,sourceDepositId:depId,createdAt:now,description:'Задаток по торгам '+auc.auctionId+(virtInDeposit>0?' (вкл. '+fmt(virtInDeposit)+' вирт.)':'')});
        this.db.tradeApplications.unshift({appId:genId('APP'),auctionId:auc.auctionId,bidderId:this.currentUserId,depositId:depId,amount:amt,virtualAmount:virtInDeposit,status:'принята',createdAt:now});
        // AuditLog
        if(!this.db.auditLog) this.db.auditLog=[];
        this.db.auditLog.push({auditId:genId('AL'),eventType:'deposit_reserved',entityType:'deposit',entityId:depId,actorUserId:this.currentUserId,actorType:'self',payload:{amount:amt,auctionId:auc.auctionId,accountId:depAcc.accountId},createdAt:now});
        saveDB(this.db); this.appLoading=false; this.mStep=1;
      },600);
    },

    // ── ВОЗВРАТ ЗАДАТКА (снятие резерва без победы) ──
    // При возврате виртуальная часть возвращается в balanceVirtual — долга нет, задаток не был задействован реально
    _releaseDeposit(dep, now) {
      const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId);
      if(!payerAcc) return;
      const realPart=dep.amount-(dep.virtualAmount||0);
      payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount);
      payerAcc.balanceFree+=realPart;
      // возвращаем виртуальную часть обратно в balanceVirtual (долг по задатку снимается)
      if((dep.virtualAmount||0)>0) payerAcc.balanceVirtual=(payerAcc.balanceVirtual||0)+dep.virtualAmount;
      const wdType=dep.principalId?'principal':'own';
      dep.status='снята блокировка'; dep.releasedAt=now||new Date().toISOString(); dep.allowedWithdrawalType=wdType;
      if(realPart>0 || (dep.virtualAmount||0)>0){
        this.db.transactions.unshift({txId:genId('TX'),accountId:dep.payerAccountId,type:'снятие блокировки задатка',status:'завершена',amount:dep.amount,createdAt:now||new Date().toISOString(),description:'Снятие блокировки задатка (торги '+dep.auctionId+')'+(dep.virtualAmount>0?' — возврат '+fmt(dep.virtualAmount)+' вирт.':'')});
      }
      // если задаток был привязан к принципалу — возвращаем помеченную аллокацию
      if(dep.principalId&&realPart>0){
        if(!this.db.fundAllocations) this.db.fundAllocations=[];
        this.db.fundAllocations.push({allocId:genId('FA'),parentAllocationId:null,accountId:dep.payerAccountId,amount:realPart,fundSourceType:'add_funds',sourceEntityId:dep.depositId,sourceTransactionId:null,allowedWithdrawalType:'principal',principalId:dep.principalId,auctionId:null,debtorInn:null,status:'active',expiresAt:null,createdAt:now||new Date().toISOString()});
      }
    },

    // ── ПЕРЕВОД ЗАДАТКА К ОТ (победитель) ──
    // Виртуальная часть задатка гасится из аллокаций — это и есть "погашение долга" по задатку
    _transferDepositToOT(dep, now, auctionId) {
      const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId);
      const receiverAcc=dep.receiverAccountId?this.db.accounts.find(a=>a.accountId===dep.receiverAccountId):null;
      if(!payerAcc||!receiverAcc) return;
      payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount);
      receiverAcc.balanceFree+=dep.amount;
      dep.status='переведён'; dep.releasedAt=now; dep.allowedWithdrawalType='debtor';
      // виртуальная часть задатка при переводе НЕ возвращается в balanceVirtual — она уже погашена
      // аллокации уже были уменьшены при резервировании — здесь ничего не меняем
      this.db.transactions.unshift({txId:genId('TX'),accountId:payerAcc.accountId,type:'перевод задатка',status:'завершена',amount:-dep.amount,createdAt:now,description:'Задаток переведён организатору (торги '+auctionId+')'});
      this.db.transactions.unshift({txId:genId('TX'),accountId:receiverAcc.accountId,type:'перевод задатка',status:'завершена',amount:dep.amount,createdAt:now,description:'Задаток победителя (торги '+auctionId+')'});
    },

    // ── ПУБЛИКАЦИЯ ПРОТОКОЛА ──
    // Используем activeAppsForAuction — только не отозванные заявки
    submitFinishAuction() {
      const auc=this.db.auctions.find(a=>a.auctionId===this.finishAuctionId); if(!auc) return;
      const apps=this.activeAppsForAuction(auc.auctionId);
      if(!apps.length){alert('Нет активных заявок');return;}
      if((apps[0].virtualAmount||0)>0){
        alert('Невозможно опубликовать протокол: задаток победителя содержит виртуальные средства ('+fmt(apps[0].virtualAmount)+'). УТ должен погасить виртуальный долг путём пополнения задаткового счёта.');
        return;
      }
      const now=new Date().toISOString();
      auc.status='Протокол опубликован'; auc.protocolSignedAt=now;
      apps.forEach((app,idx)=>{
        const dep=this.db.deposits.find(d=>d.depositId===app.depositId);
        if(idx===0){
          app.status='победитель';
          if(dep) this._transferDepositToOT(dep,now,auc.auctionId);
        } else if(idx===1){
          app.status='второй участник';
          if(dep){ dep.holdUntilContract=true; dep.status='удерживается'; dep.releaseAfter=new Date(new Date(now).getTime()+24*60*60*1000).toISOString(); }
        } else {
          app.status='резерв снят';
          if(dep){ dep.status='удерживается'; dep.releaseAfter=new Date(new Date(now).getTime()+24*60*60*1000).toISOString(); }
        }
      });
      this._log('protocol_published','auction',auc.auctionId,{winnerId:apps[0]?.bidderId,participantCount:apps.length});
      saveDB(this.db); this.closeModal();
    },

    // ── ПОДПИСАНИЕ ДОГОВОРА ──
    submitSignContract() {
      const auc=this.db.auctions.find(a=>a.auctionId===this.contractAuctionId); if(!auc) return;
      if(!this.contractWith){alert('Выберите вариант');return;}
      const apps=this.appsForAuction(auc.auctionId);
      const second=apps.find(a=>a.status==='второй участник');
      const now=new Date().toISOString();
      auc.status='Договор подписан'; auc.contractSignedWith=this.contractWith;
      if(this.contractWith==='winner'){
        if(second){
          second.status='резерв снят';
          const dep=this.db.deposits.find(d=>d.depositId===second.depositId);
          // задаток второго удерживается до releaseAfter (уже установлен при публикации протокола)
          // НЕ снимаем сразу — снимет администратор или автоматически по таймауту
          if(dep){ dep.holdUntilContract=false; }
        }
      } else {
        if(second){
          second.status='победитель (договор)';
          const dep=this.db.deposits.find(d=>d.depositId===second.depositId);
          if(dep){ dep.holdUntilContract=false; this._transferDepositToOT(dep,now,auc.auctionId); }
        }
      }
      // формируем счёт за торги как Invoice с type='trade_invoice'
      const orgPid=USERS.find(u=>u.userId===auc.organizerId)?.participantId;
      const otSvcAcc=this.db.accounts.find(a=>a.participantId===orgPid&&a.subAccountTypeId==='02');
      const tiId=genId('INV');
      this.db.invoices.push({
        invoiceId:tiId, accountId:otSvcAcc?.accountId||null,
        type:'trade_invoice', status:'ожидает выставления',
        amount:null, createdAt:now, completedAt:null, paidAt:null,
        requestId:reqIdGen('I'),
        auctionId:auc.auctionId, organizerId:auc.organizerId,
        paidExternal:false,
        description:'Счёт за проведение торгов № '+auc.auctionId
      });
      this._log('contract_signed','auction',auc.auctionId,{contractWith:this.contractWith,tradeInvoiceId:tiId});
      saveDB(this.db); this.closeModal();
    },

    // ── ОПЛАТА СЧЁТА ЗА ТОРГИ ──
    // П.3: пометить счёт как оплаченный вне ЭТП
    markTIPaidExternal(invId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invId&&(i.type==='trade_invoice'||i.type==='service_invoice'));
      if(!inv){return;}
      if(!confirm('Пометить счёт как оплаченный вне ЭТП?'))return;
      inv.status='оплачено вне ЭТП'; inv.paidAt=new Date().toISOString();
      inv.completedAt=new Date().toISOString(); inv.paidExternal=true;
      this._log('invoice_paid_external','invoice',invId,{auctionId:inv.auctionId,amount:inv.amount});
      saveDB(this.db);
    },

    payTradeInvoice(invId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invId&&(i.type==='trade_invoice'||i.type==='service_invoice'));
      if(!inv||!inv.amount){alert('Счёт не выставлен');return;}
      const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
      const effective=(acc?.balanceFree||0)+(acc?.balanceVirtual||0);
      if(effective<inv.amount){alert('Недостаточно средств на счёте услуг (доступно: '+fmt(effective)+')');return;}
      if(!confirm('Оплатить счёт за торги на сумму '+fmt(inv.amount)+'?'))return;
      if(acc){
        const fromReal=Math.min(acc.balanceFree,inv.amount);
        const fromVirt=inv.amount-fromReal;
        acc.balanceFree-=fromReal;
        if(fromVirt>0) acc.balanceVirtual=Math.max(0,(acc.balanceVirtual||0)-fromVirt);
      }
      inv.status='оплачен'; inv.paidAt=new Date().toISOString(); inv.completedAt=new Date().toISOString();
      const tiTxId=genId('TX');
      this.db.transactions.unshift({txId:tiTxId,accountId:acc?.accountId,type:'оплата счёта за торги',status:'завершена',amount:-inv.amount,virtualPart:0,repaid:false,createdAt:new Date().toISOString(),description:inv.description,requestId:inv.requestId});
      this._log('invoice_paid','invoice',invId,{amount:inv.amount,txId:tiTxId,auctionId:inv.auctionId});
      saveDB(this.db);
    },

    // ── ВИРТУАЛЬНЫЕ: аннуляция одного начисления ──
    _annulAlloc(alloc) {
      const acc=this.db.accounts.find(a=>a.accountId===alloc.accountId);
      // свободный остаток = начисление минус задействованное (в активных задатках)
      const activeInDeposits=this.db.deposits
        .filter(d=>d.payerAccountId===alloc.accountId&&(d.virtualAmount||0)>0&&d.status==='заблокирован')
        .reduce((s,d)=>s+d.virtualAmount,0);
      // при аннуляции списываем свободный виртуальный остаток с balanceVirtual
      // свободный остаток = то что не задействовано в активных задатках
      const freeVirt=Math.max(0,(acc?.balanceVirtual||0)-activeInDeposits);
      alloc.status='cancelled';
      const now=new Date().toISOString();
      if(acc&&freeVirt>0){
        acc.balanceVirtual=Math.max(0,(acc.balanceVirtual||0)-freeVirt);
        this.db.transactions.unshift({txId:genId('TX'),accountId:alloc.accountId,type:'аннуляция виртуальных д/с',status:'завершена',amount:-freeVirt,createdAt:now,description:'Аннуляция виртуальных д/с — свободный остаток ('+fmt(freeVirt)+')'});
      }
      // задатки с виртуальной частью → отзываем, возвращаем только реальную часть
      const virtDeps=this.db.deposits.filter(d=>d.payerAccountId===alloc.accountId&&(d.virtualAmount||0)>0&&d.status==='заблокирован');
      virtDeps.forEach(dep=>{
        const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId);
        const realPart=dep.amount-dep.virtualAmount;
        if(payerAcc){
          payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount);
          if(realPart>0) payerAcc.balanceFree+=realPart;
          // виртуальная часть НЕ возвращается — она аннулирована
        }
        dep.status='снята блокировка'; dep.releasedAt=now; dep.virtualAmount=0;
        const app=this.db.tradeApplications.find(a=>a.depositId===dep.depositId);
        if(app){ app.status='отозвана (аннуляция вирт. средств)'; app.virtualAmount=0; }
        this.db.transactions.unshift({txId:genId('TX'),accountId:dep.payerAccountId,type:'отзыв задатка',status:'завершена',amount:realPart,createdAt:now,description:'Задаток отозван — аннуляция виртуальных д/с (торги '+dep.auctionId+')'});
      });
      // услуги, оплаченные виртуальными → если не погашены, уменьшаем balanceFree (может уйти в минус)
      const virtSvcTxs=this.db.transactions.filter(t=>t.accountId===alloc.accountId&&t.type==='оплата услуги'&&(t.virtualPart||0)>0&&!t.repaid);
      virtSvcTxs.forEach(t=>{
        t.repaid=true; // помечаем как обработанную
        if(acc){ acc.balanceFree-=t.virtualPart; } // балans может уйти в минус
        this.db.transactions.unshift({txId:genId('TX'),accountId:alloc.accountId,type:'списание за услуги (вирт.)',status:'завершена',amount:-t.virtualPart,createdAt:now,description:'Списание за неоплаченные услуги при аннуляции виртуальных д/с'});
      });
      // торги завершены с виртуальным задатком → приостановка
      const doneDep=this.db.deposits.find(d=>d.payerAccountId===alloc.accountId&&(d.virtualAmount||0)>0&&d.status==='переведён');
      if(doneDep){
        const auc=this.db.auctions.find(a=>a.auctionId===doneDep.auctionId);
        if(auc&&(auc.status==='Протокол опубликован'||auc.status==='Договор подписан')) auc.status='Приостановлены';
      }
      saveDB(this.db);
    },

    checkExpiredAllocations() {
      const now=new Date();
      const expired=(this.db.fundAllocations||[]).filter(a=>a.fundSourceType==='virtual'&&a.status==='active'&&new Date(a.expiresAt)<now);
      expired.forEach(a=>this._annulAlloc(a));
      if(expired.length>0) saveDB(this.db);
      return expired.length;
    },
    adminAnnulAlloc(allocId) {
      const alloc=(this.db.fundAllocations||[]).find(a=>a.allocId===allocId);
      if(!alloc||alloc.status!=='active') return;
      if(!confirm('Аннулировать виртуальное начисление '+fmt(alloc.originalAmount||alloc.amount)+'?')) return;
      this._annulAlloc(alloc);
    },

    // ── НАЧИСЛЕНИЕ ВИРТУАЛЬНЫХ (ADMIN) ──
    submitAdmVirtual() {
      this.admVirtualError=''; const amt=parseFloat(this.admVirtualAmt);
      if(!this.admVirtualAccId){this.admVirtualError='Выберите счёт';return;}
      if(!this.admVirtualAmt||isNaN(amt)||amt<=0){this.admVirtualError='Укажите корректную сумму';return;}
      const acc=this.db.accounts.find(a=>a.accountId===this.admVirtualAccId);
      if(!acc){this.admVirtualError='Счёт не найден';return;}
      acc.balanceVirtual=(acc.balanceVirtual||0)+amt;
      if(!this.db.fundAllocations) this.db.fundAllocations=[];
      const expiresAt=this.admVirtualExpiry ? new Date(this.admVirtualExpiry).toISOString() : new Date(Date.now()+30*24*60*60*1000).toISOString();
      const now=new Date().toISOString();
      const allocId=genId('FA');
      const txId=genId('TX');
      this.db.fundAllocations.push({
        allocId, parentAllocationId:null, accountId:this.admVirtualAccId,
        amount:amt, fundSourceType:'virtual',
        sourceEntityId:null, sourceTransactionId:txId,
        allowedWithdrawalType:'none', auctionId:null, debtorInn:null,
        status:'active', expiresAt, createdAt:now,
        originalAmount:amt, repaidAmount:0,
        description:(this.admVirtualDesc||'Начисление виртуальных средств (адм.)'),
      });
      this.db.transactions.unshift({txId, accountId:this.admVirtualAccId, type:'начисление виртуальных средств', status:'завершена', amount:amt, balanceBefore:acc.balanceVirtual-amt, balanceAfter:acc.balanceVirtual, actorType:'self', performedByUserId:userIddOf(this.currentUserId), onBehalfOfParticipantId:null, onBehalfOfPrincipalId:null, createdAt:now, description:(this.admVirtualDesc||'Начисление виртуальных средств (адм.)')});
      if(!this.db.auditLog) this.db.auditLog=[];
      this.db.auditLog.push({auditId:genId('AL'), eventType:'virtual_credited', entityType:'fund_allocation', entityId:allocId, actorUserId:this.currentUserId, actorType:'self', payload:{amount:amt, accountId:this.admVirtualAccId, expiresAt}, createdAt:now});
      syncAccountBalances(this.db);
      saveDB(this.db); this.closeModal();
    },

    // ── ADMIN ──
    adminToggleBlock(accountId) { const acc=this.db.accounts.find(a=>a.accountId===accountId); if(!acc) return; if(!confirm((acc.isBlocked?'Разблокировать':'Заблокировать')+' счёт '+acc.displayNumber+'?'))return; acc.isBlocked=!acc.isBlocked; acc.accountStatusId=acc.isBlocked?'blocked':'active'; acc.blockReason=acc.isBlocked?'Административная блокировка':null; acc.updatedAt=new Date().toISOString(); if(!this.db.auditLog)this.db.auditLog=[]; this.db.auditLog.push({auditId:genId('AL'),eventType:acc.isBlocked?'account_blocked':'account_unblocked',entityType:'account',entityId:accountId,actorUserId:this.currentUserId,actorType:'self',payload:{isBlocked:acc.isBlocked},createdAt:new Date().toISOString()}); saveDB(this.db); },
    adminReleaseDeposit(depositId) { const dep=this.db.deposits.find(d=>d.depositId===depositId); if(!dep) return; if(!confirm('Принудительно снять блокировку задатка '+fmt(dep.amount)+'?'))return; this._releaseDeposit(dep); this._log('deposit_released','deposit',depositId,{amount:dep.amount,auctionId:dep.auctionId}); saveDB(this.db); },
    adminVerifyReq(reqId) { const req=this.db.requisites.find(r=>r.requisiteId===reqId); if(!req) return; req.isVerified=true; this._log('requisite_verified','requisite',reqId,{accountId:req.accountId}); saveDB(this.db); },
    adminVerifyPrc(prcId) { const p=this.db.principals?.find(p=>p.principalId===prcId); if(!p) return; p.isVerified=true; this._log('principal_verified','principal',prcId,{fullName:p.fullName}); saveDB(this.db); },

    // ── 1С ──
    // При подтверждении пополнения: гасим виртуальный долг (только задействованную сумму)
    confirm1C(invoiceId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(!inv) return;
      const now=new Date().toISOString();
      inv.status='исполнено'; inv.completedAt=now;
      if(inv.type==='пополнение'&&inv.amount>0){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc){
          // активный долг = задатки + услуги (не погашенные)
          const activeDebt=this._activeVirtualDebt(inv.accountId);
          const toRepay=Math.min(activeDebt, inv.amount);
          const toFree=inv.amount-toRepay;
          acc.balanceFree+=toFree;
          if(toRepay>0){
            // погашаем задатки с виртуальной частью (FIFO по дате резервирования)
            let rem=toRepay;
            this.db.deposits
              .filter(d=>d.payerAccountId===inv.accountId&&(d.virtualAmount||0)>0&&d.status==='заблокирован')
              .sort((a,b)=>new Date(a.blockedAt)-new Date(b.blockedAt))
              .forEach(d=>{
                if(rem<=0) return;
                const pay=Math.min(d.virtualAmount||0, rem);
                d.virtualAmount=Math.max(0,(d.virtualAmount||0)-pay);
                rem-=pay;
                // обновляем заявку
                const app=this.db.tradeApplications.find(a=>a.depositId===d.depositId);
                if(app) app.virtualAmount=d.virtualAmount;
              });
            // погашаем услуги с виртуальной частью (FIFO)
            this.db.transactions
              .filter(t=>t.accountId===inv.accountId&&t.type==='оплата услуги'&&(t.virtualPart||0)>0&&!t.repaid)
              .sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))
              .forEach(t=>{ if(rem<=0) return; const pay=Math.min(t.virtualPart||0,rem); t.virtualPart-=pay; rem-=pay; if(t.virtualPart<=0) t.repaid=true; });
            // пересчитываем balanceVirtual = свободный остаток виртуальных (не задействованный)
            // balanceVirtual уже был уменьшен при расходовании, здесь не меняем
            this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'погашение виртуальных д/с',status:'завершена',amount:-toRepay,createdAt:now,description:'Погашение виртуальных д/с ('+fmt(toRepay)+')'});
          }
          this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'пополнение',status:'завершена',amount:inv.amount,balanceBefore:acc.balanceFree-toFree,balanceAfter:acc.balanceFree,actorType:'system',performedByUserId:null,onBehalfOfParticipantId:null,onBehalfOfPrincipalId:null,requestId:inv.requestId,sourceInvoiceId:inv.invoiceId,sourceDepositId:null,createdAt:now,description:inv.description+' (подтверждено)'});
          // FundAllocations: создаём запись add_funds на зачисленную сумму
          if(!this.db.fundAllocations) this.db.fundAllocations=[];
          const txIdNew=this.db.transactions[0].txId;
          this.db.fundAllocations.push({allocId:genId('FA'),parentAllocationId:null,accountId:inv.accountId,amount:toFree,fundSourceType:'add_funds',sourceEntityId:inv.invoiceId,sourceTransactionId:txIdNew,allowedWithdrawalType:inv.principalId?'principal':'own',principalId:inv.principalId||null,auctionId:null,debtorInn:null,status:'active',expiresAt:null,createdAt:now});
          // для БР: после подтверждения пополнения создаём запись об оплате услуги
          if(inv.description&&inv.description.startsWith('Оплата услуги:')){
            const svcName=inv.description.replace('Оплата услуги: ','');
            const svc=SERVICES.find(s=>s.name===svcName);
            if(svc){
              const svcRid=reqIdGen('S');
              const balBeforeSvc=acc.balanceFree+acc.balanceReserved+(acc.balanceVirtual||0);
              acc.balanceFree=Math.max(0, acc.balanceFree-inv.amount); // списываем стоимость услуги
              this.db.invoices.push({invoiceId:genId('INV'),accountId:inv.accountId,type:'оплата услуги',status:'исполнено',sourceType:'internal',isActive:true,amountPaid:inv.amount,amount:inv.amount,requestId:svcRid,createdAt:now,description:'Услуга: '+svcName});
              this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'оплата услуги',status:'завершена',amount:-inv.amount,balanceBefore:balBeforeSvc,balanceAfter:balBeforeSvc-inv.amount,actorType:'system',performedByUserId:null,onBehalfOfParticipantId:null,onBehalfOfPrincipalId:null,virtualPart:0,repaid:false,requestId:svcRid,sourceInvoiceId:null,sourceDepositId:null,createdAt:now,description:'Услуга: '+svcName});
            }
          }
        }
      }
      if(inv.type==='вывод'||inv.type==='вывод задатка'){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc) acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);
        // обновляем статус транзакции вывода на "завершена"
        const wdTx=this.db.transactions.find(t=>t.requestId===inv.requestId&&(t.type==='вывод'||t.type==='вывод задатка'));
        if(wdTx){ wdTx.status='завершена'; wdTx.completedAt=now; }
      }
      if(inv.type==='перевод задаткового на услуги'){
        const from=this.db.accounts.find(a=>a.accountId===inv.accountId);
        const to=this.db.accounts.find(a=>a.participantId===from?.participantId&&a.subAccountTypeId==='02');
        if(from&&to){from.balanceReserved=Math.max(0,from.balanceReserved-inv.amount);to.balanceFree+=inv.amount;}
      }
      // DocRequests: помечаем pending запрос для этого invoice как ready
      const dr=(this.db.docRequests||[]).find(r=>r.refId===inv.invoiceId&&r.status==='pending');
      if(dr){ dr.status='ready'; dr.issuedAt=now; }
      // AccountingRequests: обновляем статус запроса
      if(!this.db.accountingRequests) this.db.accountingRequests=[];
      const ar=this.db.accountingRequests.find(r=>r.externalRequestId===inv.requestId&&r.status==='pending');
      if(ar){ ar.status='completed'; ar.resolvedAt=now; }
      // AuditLog
      this._log('invoice_confirmed','invoice',inv.invoiceId,{status:'исполнено',type:inv.type,amount:inv.amount},'system');
      // SyncState: обновляем метку синхронизации для statuses
      if(this.db.syncState){
        const ss=this.db.syncState.find(s=>s.endpointType==='statuses');
        if(ss){ ss.lastSyncAt=now; ss.updatedAt=now; }
      }
      saveDB(this.db);
    },
    // выставление счёта за торги через 1С
    confirmTI(invId, amount) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invId&&i.type==='trade_invoice');
      if(!inv) return;
      const amt=parseFloat(amount);
      if(!amt||amt<=0){alert('Укажите сумму');return;}
      const now=new Date().toISOString();
      inv.amount=amt; inv.status='выставлен'; inv.issuedAt=now; inv.sourceType='external'; inv.amountPaid=0;
      // AccountingRequests
      if(!this.db.accountingRequests) this.db.accountingRequests=[];
      this.db.accountingRequests.push({requestId:genId('AR'),externalRequestId:inv.requestId,requestType:'invoices_poll',endpoint:'GET /invoices?since=',status:'completed',attemptCount:1,lastAttemptAt:now,resolvedAt:now,relatedEntityType:'invoice',relatedEntityId:invId,createdAt:now});
      // AuditLog
      if(!this.db.auditLog) this.db.auditLog=[];
      this.db.auditLog.push({auditId:genId('AL'),eventType:'invoice_status_changed',entityType:'invoice',entityId:invId,actorUserId:this.currentUserId,actorType:'system',payload:{status:'выставлен',amount:amt,type:'trade_invoice'},createdAt:now});
      // SyncState: обновляем метку для invoices
      if(this.db.syncState){
        const ss=this.db.syncState.find(s=>s.endpointType==='invoices');
        if(ss){ ss.lastSyncAt=now; ss.updatedAt=now; }
      }
      saveDB(this.db);
    },

    rejectWithComment(invoiceId) {
      const reason=window.prompt('Причина отмены:');
      if(reason===null) return;
      if(reason) { const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(inv) inv.cancelReason=reason; }
      this.reject1C(invoiceId, reason||'');
    },

    reject1C(invoiceId, reason) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(!inv) return;
      const now=new Date().toISOString();
      inv.status=(inv.status==='выставлен')?'отменён':'отклонено';
      inv.completedAt=now;
      if(reason) inv.cancelReason=reason;
      if(inv.type==='вывод'||inv.type==='вывод задатка'||inv.type==='перевод задаткового на услуги'){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc){acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);acc.balanceFree+=inv.amount;}
        const wdTx=this.db.transactions.find(t=>t.requestId===inv.requestId);
        if(wdTx){ wdTx.status='отменена'; wdTx.completedAt=now; }
      }
      // AccountingRequests: обновляем статус
      if(!this.db.accountingRequests) this.db.accountingRequests=[];
      const arR=this.db.accountingRequests.find(r=>r.externalRequestId===inv.requestId&&r.status==='pending');
      if(arR){ arR.status='failed'; arR.resolvedAt=now; }
      // AuditLog
      if(!this.db.auditLog) this.db.auditLog=[];
      this.db.auditLog.push({auditId:genId('AL'),eventType:'invoice_status_changed',entityType:'invoice',entityId:inv.invoiceId,actorUserId:this.currentUserId,actorType:'system',payload:{status:inv.status,reason:reason||null,type:inv.type},createdAt:now});
      // SyncState
      if(this.db.syncState){
        const ss=this.db.syncState.find(s=>s.endpointType==='statuses');
        if(ss){ ss.lastSyncAt=now; ss.updatedAt=now; }
      }
      saveDB(this.db);
    },
  }));
});
