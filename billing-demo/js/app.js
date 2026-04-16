document.addEventListener('alpine:init', () => {
  Alpine.data('billing', () => ({

    db: loadDB(), page:'wallet', theme:loadTheme(), showSeconds:false,
    modal:null, mStep:0,

    fsAccId:null, fsAmount:'', fsError:'', fsLoading:false, fsRid:'',
    fdAccId:null, fdAmount:'', fdTrade:'', fdError:'', fdLoading:false, fdRid:'',
    wdAccId:null, wdAmount:'', wdType:'own', wdError:'', wdLoading:false, wdRid:'',
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

    CDT_NAME:'АО «Центр дистанционных торгов»', CDT_INN_KPP:'7812345678 / 780101001',
    CDT_BANK:'АО «Тинькофф Банк»', CDT_BIK:'044525974', CDT_RS:'40702810000001234567',

    init() { applyTheme(this.theme); this.$nextTick(()=>this.checkExpiredAllocations()); },

    get currentUser()   { return USERS.find(u=>u.userId===this.db.currentUserId); },
    get currentUserId() { return this.db.currentUserId; },
    get currentRole()   { return this.currentUser?.role||'ut'; },
    get isAdmin()       { return this.currentRole==='admin'; },
    switchUser(uid)     { this.db.currentUserId=uid; saveDB(this.db); this.checkExpiredAllocations(); this.page=this.isAdmin?'adminAccounts':'wallet'; },

    setTheme(t)     { this.theme=t; applyTheme(t); },
    setPage(p)      { this.checkExpiredAllocations(); this.page=p; },
    openModal(name) { this.modal=name; this.mStep=0; },
    closeModal()    { this.modal=null; this.mStep=0; },

    resetAll()  { if(!confirm('Сбросить все данные?'))return; this.db=resetDB(); this.page='wallet'; },
    loadDemo()  { if(!confirm('Загрузить демонстрационные данные?'))return; loadDemoData(this.db); },
    clearData() { if(!confirm('Очистить все данные?'))return; clearAllData(this.db); },

    get accs()         { return this.isAdmin?[]:accsForRole(this.db,this.currentRole,this.currentUserId); },
    get txs()          { return txsForUser(this.db,this.currentUserId); },
    get invs()         { return invsForUser(this.db,this.currentUserId).filter(i=>!i.internal); },
    get reqs()         { return reqsForUser(this.db,this.currentUserId); },
    get allInvs()      { return [...this.db.invoices].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
    get actsRequested() {
      return this.allInvs.filter(i=>i.actStatus==='запрошен');
    },
    get pendingInvs() {
      const pending=['создано','на рассмотрении','в обработке'];
      return this.allInvs.filter(i=>pending.includes(i.status));
    },
    // Счета за торги из единой таблицы invoices
    get myTradeInvs() {
      const myAccIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      return this.db.invoices.filter(i=>i.type==='trade_invoice'&&myAccIds.includes(i.accountId))
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
    get auctionsForOT()  { return this.db.auctions.filter(a=>a.organizerId===this.currentUserId); },
    get allAuctions()    { return this.db.auctions; },
    myAppForAuction(aid) { return this.db.tradeApplications.find(a=>a.auctionId===aid&&a.bidderId===this.currentUserId); },
    // только принятые заявки, отсортированные по дате
    appsForAuction(aid)  { return [...this.db.tradeApplications.filter(a=>a.auctionId===aid)].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)); },
    // только активные (не отозванные) заявки для логики протокола
    activeAppsForAuction(aid) { return this.appsForAuction(aid).filter(a=>a.status==='принята'); },
    bidderName(uid)      { return USERS.find(u=>u.userId===uid)?.name||uid; },
    auctionById(aid)     { return this.db.auctions.find(a=>a.auctionId===aid); },

    get serviceAccs()  { return accsForRole(this.db,this.currentRole,this.currentUserId).filter(a=>a.subAccountTypeId==='01'||a.subAccountTypeId==='02'); },
    get depositAccs()  { return accsForRole(this.db,this.currentRole,this.currentUserId).filter(a=>a.subAccountTypeId==='03'); },
    get withdrawableAccs() {
      if(this.currentRole==='ut') return accsForRole(this.db,'ut',this.currentUserId);
      return this.serviceAccs;
    },
    get otDepAcc()     { return this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='04')||null; },
    get verifiedReqs() { return reqsForUser(this.db,this.currentUserId).filter(r=>r.isVerified); },
    get payServices()  { return [{id:'acc',name:'Аккредитация на ЭТП',price:5400},{id:'pub',name:'Публикация торгов',price:12000},{id:'cer',name:'Получение сертификата ЭП',price:3200},{id:'mch',name:'Сервис МЧД',price:1500}]; },
    get currentPayService() { return this.payServices.find(s=>s.id===this.payServiceId); },
    get servAcc()      { return this.serviceAccs[0]||null; },
    get servAccEffectiveBalance() { const acc=this.servAcc; if(!acc) return 0; return acc.balanceFree+(acc.balanceVirtual||0); },
    get transferFrom() { return this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='04')||null; },
    get transferTo()   { return this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='02')||null; },
    get selectedWithdrawAcc() { return this.db.accounts.find(a=>a.accountId===this.wdAccId)||null; },
    get isDepositWithdraw()   { return this.selectedWithdrawAcc?.subAccountTypeId==='03'; },

    // ── Виртуальный долг = сумма virtualAmount по активным задаткам + потраченное на услуги ──
    _activeVirtualDebt(accountId) {
      // задатки в резерве с виртуальной частью
      const depDebt=this.db.deposits
        .filter(d=>d.payerAccountId===accountId&&(d.virtualAmount||0)>0&&d.status==='зарезервирован')
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
        const u=USERS.find(u=>u.userId===acc.userId);
        return {...acc,userName:u?.name||acc.userId,userLabel:u?.label||acc.userId,typeLabel:ACC_TYPE_LABEL[acc.subAccountTypeId]||acc.subAccountTypeId};
      });
    },
    get adminAllDeposits() {
      return [...this.db.deposits].sort((a,b)=>new Date(b.reservedAt)-new Date(a.reservedAt)).map(d=>{
        const payer=this.db.accounts.find(a=>a.accountId===d.payerAccountId);
        const payerUser=USERS.find(u=>u.userId===payer?.userId);
        return {...d,payerDisplay:payer?.displayNumber||d.payerAccountId,payerName:payerUser?.name||''};
      });
    },
    get adminAllTxs() {
      return this.allTxs.map(tx=>{
        const acc=this.db.accounts.find(a=>a.accountId===tx.accountId);
        const u=USERS.find(u=>u.userId===acc?.userId);
        return {...tx,userName:u?.name||'',userLabel:u?.label||'',accDisplay:acc?.displayNumber||tx.accountId};
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

    fmt, fmtDt,
    // ── Тип счёта зачисления для 1С ──
    sync1cAccountType(inv) {
      if(inv.type==='trade_invoice'||inv.type==='service_invoice') return 'ot_svc';
      if(inv.type==='internal_transfer') return 'deposit';
      const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
      if(!acc) return 'all';
      if(acc.subAccountTypeId==='01') return 'ut_svc';
      if(acc.subAccountTypeId==='02') return 'ot_svc';
      if(acc.subAccountTypeId==='03'||acc.subAccountTypeId==='04') return 'deposit';
      return 'all';
    },
    sync1cAccountLabel(inv) {
      return {'ut_svc':'Счёт для услуг УТ','ot_svc':'Счёт для услуг ОТ','deposit':'Счёт задатков ЦДТ'}[this.sync1cAccountType(inv)]||'—';
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
    openActModal(invoiceId) { this.actInvoiceId=invoiceId; this.openModal('actView'); },
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
    userByAccId(id) { const acc=this.db.accounts.find(a=>a.accountId===id); return USERS.find(u=>u.userId===acc?.userId); },
    badgeClass(s)   { return ({'исполнено':'bs','завершена':'bs','на рассмотрении':'bp','создано':'bc','отклонено':'be','в обработке':'bc','зарезервирован':'bc','переведён':'bs','снят резерв':'bs','выведен':'bs','удерживается':'bp','отменён':'be','принята':'bs','победитель':'bs','второй участник':'bp','резерв снят':'bs','победитель (договор)':'bs','Приём заявок':'bs','Протокол опубликован':'bp','Договор подписан':'bs','Приостановлены':'be','Заблокирован':'be','Активен':'bs'})[s]||'bc'; },
    txClass(tx)     { return tx.type==='резервирование задатка'?'tx-res':tx.amount>0?'tx-plus':'tx-minus'; },
    depositBadge(s) { return ({'зарезервирован':'bc','переведён':'bs','снят резерв':'bs','выведен':'bs','удерживается':'bp','отменён':'be'})[s]||'bc'; },

    openFundsService(accId) { this.fsAccId=accId||this.serviceAccs[0]?.accountId||null; this.fsAmount=''; this.fsError=''; this.fsLoading=false; this.fsRid=''; this.openModal('fundsService'); },
    openFundsDeposit(accId) { this.fdAccId=accId||this.depositAccs[0]?.accountId||null; this.fdAmount=''; this.fdTrade=''; this.fdError=''; this.fdLoading=false; this.fdRid=''; this.openModal('fundsDeposit'); },
    openWithdraw(accId)     { this.wdAccId=accId||this.serviceAccs[0]?.accountId||null; this.wdAmount=''; this.wdType='own'; this.wdError=''; this.wdLoading=false; this.wdRid=''; this.openModal('withdraw'); },
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
      setTimeout(()=>{ this.fsRid=reqIdGen('P'); this.db.invoices.unshift({invoiceId:genId('INV'),accountId:this.fsAccId,type:'пополнение',status:'создано',amount:parseFloat(this.fsAmount),requestId:this.fsRid,createdAt:new Date().toISOString(),description:'Пополнение счёта услуг'}); saveDB(this.db); this.fsLoading=false; this.mStep=1; },600);
    },

    // ── ПОПОЛНЕНИЕ ЗАДАТКА ──
    submitFundsDeposit() {
      this.fdError=''; if(!this.fdAmount||parseFloat(this.fdAmount)<=0){this.fdError='Укажите сумму';return;}
      this.fdLoading=true;
      setTimeout(()=>{ this.fdRid=reqIdGen('P'); this.db.invoices.unshift({invoiceId:genId('INV'),accountId:this.fdAccId,type:'пополнение',status:'создано',amount:parseFloat(this.fdAmount),requestId:this.fdRid,createdAt:new Date().toISOString(),description:'Пополнение задаткового счёта'+(this.fdTrade?' (торги '+this.fdTrade+')':'')}); saveDB(this.db); this.fdLoading=false; this.mStep=1; },600);
    },

    // ── ВЫВОД ──
    submitWithdraw() {
      this.wdError=''; const amt=parseFloat(this.wdAmount);
      if(!this.wdAmount||isNaN(amt)||amt<=0){this.wdError='Укажите корректную сумму';return;}
      const acc=this.db.accounts.find(a=>a.accountId===this.wdAccId);
      if(acc.balanceFree<amt){this.wdError='Недостаточно свободных средств. Доступно: '+fmt(acc.balanceFree);return;}
      this.wdLoading=true;
      setTimeout(()=>{
        acc.balanceFree-=amt; acc.balanceReserved+=amt;
        this.wdRid=reqIdGen('W');
        const desc=acc.subAccountTypeId==='03'?'Вывод средств с задаткового счёта':'Вывод д/с на реквизиты';
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:this.wdAccId,type:'вывод',status:'на рассмотрении',amount:amt,requestId:this.wdRid,createdAt:new Date().toISOString(),description:desc});
        this.db.transactions.unshift({txId:genId('TX'),accountId:this.wdAccId,type:'вывод',status:'в обработке',amount:-amt,createdAt:new Date().toISOString(),description:desc,requestId:this.wdRid});
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
          const svcAcc=this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='02');
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
          this.db.invoices.unshift({invoiceId:genId('INV'),accountId:acc.accountId,type:'вывод задатка',status:'на рассмотрении',amount:remaining,requestId:this.wdDepRid,createdAt:now,description:restDesc});
          this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'вывод задатка',status:'в обработке',amount:-remaining,createdAt:now,description:restDesc,requestId:this.wdDepRid});
        }
        dep.status='выведен';
        saveDB(this.db); this.wdDepLoading=false; this.mStep=1;
      },500);
    },


    // ── ОПЛАТА УСЛУГ ──
    // Долг по услугам = сумма потраченных виртуальных (фиксируется в транзакции как virtualPart)
    submitPay() {
      const svc=this.currentPayService;
      const acc=this.db.accounts.find(a=>a.accountId===this.servAcc?.accountId);
      if(!acc){alert('Счёт не найден');return;}
      const effective=acc.balanceFree+(acc.balanceVirtual||0);
      if(effective<svc.price){alert('Недостаточно средств (доступно: '+fmt(effective)+')');return;}
      setTimeout(()=>{
        const fromReal=Math.min(acc.balanceFree, svc.price);
        const fromVirt=svc.price-fromReal;
        acc.balanceFree-=fromReal;
        if(fromVirt>0) acc.balanceVirtual=Math.max(0,(acc.balanceVirtual||0)-fromVirt);
        const rid=reqIdGen('S');
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:acc.accountId,type:'оплата услуги',status:'исполнено',amount:svc.price,requestId:rid,createdAt:new Date().toISOString(),description:'Услуга: '+svc.name});
        // фиксируем virtualPart в транзакции — нужно для расчёта долга
        this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'оплата услуги',status:'завершена',amount:-svc.price,virtualPart:fromVirt,repaid:false,createdAt:new Date().toISOString(),description:'Услуга: '+svc.name,requestId:rid});
        saveDB(this.db); this.mStep=1;
      },400);
    },

    // ── ПЕРЕВОД ОТ ──
    submitTransfer() {
      this.trError='';
      const amt=parseFloat(this.trAmount); if(!this.trAmount||isNaN(amt)||amt<=0){this.trError='Укажите сумму';return;}
      const from=this.transferFrom; if(!from||from.balanceFree<amt){this.trError='Недостаточно средств. Доступно: '+fmt(from?.balanceFree||0);return;}
      this.trLoading=true;
      setTimeout(()=>{ from.balanceFree-=amt; from.balanceReserved+=amt; this.trRid=reqIdGen('T'); this.db.invoices.unshift({invoiceId:genId('INV'),accountId:from.accountId,type:'перевод задаткового на услуги',status:'в обработке',amount:amt,requestId:this.trRid,createdAt:new Date().toISOString(),description:'Перевод с задаткового счёта на счёт услуг'}); this.db.transactions.unshift({txId:genId('TX'),accountId:from.accountId,type:'перевод между субсчетами',status:'в обработке',amount:-amt,createdAt:new Date().toISOString(),description:'Перевод ('+this.trRid+')'}); saveDB(this.db); this.trLoading=false; this.mStep=1; },400);
    },

    // ── РЕКВИЗИТЫ ──
    submitAddReq() {
      this.rqError=''; if(!this.rqName||!this.rqInn||!this.rqBank||!this.rqBik||!this.rqAccNum){this.rqError='Заполните все обязательные поля';return;}
      this.rqLoading=true;
      setTimeout(()=>{ const ex=this.db.requisites.filter(r=>r.accountId===this.rqAccId); this.db.requisites.push({requisiteId:genId('REQ'),accountId:this.rqAccId,bankName:this.rqBank,bik:this.rqBik,corAccount:'',accountNumber:this.rqAccNum,inn:this.rqInn,kpp:this.rqKpp,fullName:this.rqName,isVerified:false,isDefault:ex.length===0,createdAt:new Date().toISOString()}); saveDB(this.db); this.rqLoading=false; this.closeModal(); this.page='requisites'; },400);
    },

    // ── ПРИНЦИПАЛ ──
    submitAddPrincipal() {
      this.prcError=''; if(!this.prcName||!this.prcInn||!this.prcBank||!this.prcBik||!this.prcAccNum){this.prcError='Заполните все обязательные поля';return;}
      this.prcLoading=true;
      setTimeout(()=>{ if(!this.db.principals) this.db.principals=[]; this.db.principals.push({principalId:genId('PRC'),userId:this.currentUserId,fullName:this.prcName,inn:this.prcInn,kpp:this.prcKpp,bankName:this.prcBank,bik:this.prcBik,accountNumber:this.prcAccNum,isVerified:false,createdAt:new Date().toISOString()}); saveDB(this.db); this.prcLoading=false; this.closeModal(); },400);
    },

    // ── ПОДАЧА ЗАЯВКИ ──
    submitTradeApp() {
      this.appError=''; const auc=this.db.auctions.find(a=>a.auctionId===this.appAuctionId);
      if(!auc||auc.status!=='Приём заявок'){this.appError='Торги не принимают заявки';return;}
      const amt=parseFloat(this.appAmount); if(!this.appAmount||isNaN(amt)||amt<=0){this.appError='Укажите сумму задатка';return;}
      if(amt<auc.minDeposit){this.appError='Минимальная сумма: '+fmt(auc.minDeposit);return;}
      if(this.myAppForAuction(this.appAuctionId)){this.appError='Вы уже подали заявку';return;}
      const depAcc=this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='03');
      const depEffective=(depAcc?.balanceFree||0)+(depAcc?.balanceVirtual||0);
      if(!depAcc||depEffective<amt){this.appError='Недостаточно средств. Доступно: '+fmt(depEffective);return;}
      this.appLoading=true;
      setTimeout(()=>{
        const fromRealDep=Math.min(depAcc.balanceFree, amt);
        const fromVirtDep=amt-fromRealDep;
        const virtInDeposit=fromVirtDep;
        depAcc.balanceFree-=fromRealDep;
        if(fromVirtDep>0) depAcc.balanceVirtual=Math.max(0,(depAcc.balanceVirtual||0)-fromVirtDep);
        depAcc.balanceReserved+=amt;
        const depId=genId('DEP'); const otDepAcc=this.db.accounts.find(a=>a.userId===auc.organizerId&&a.subAccountTypeId==='04');
        this.db.deposits.unshift({depositId:depId,payerAccountId:depAcc.accountId,receiverAccountId:otDepAcc?.accountId||null,auctionId:auc.auctionId,tradeLotId:auc.lotId,amount:amt,virtualAmount:virtInDeposit,status:'зарезервирован',reservedAt:new Date().toISOString(),releasedAt:null,releaseAfter:null,holdUntilContract:false,payer:this.currentUser.name,allowedWithdrawalType:'none'});
        this.db.transactions.unshift({txId:genId('TX'),accountId:depAcc.accountId,type:'резервирование задатка',status:'завершена',amount:-amt,createdAt:new Date().toISOString(),description:'Задаток по торгам '+auc.auctionId+(virtInDeposit>0?' (вкл. '+fmt(virtInDeposit)+' вирт.)':'')});
        this.db.tradeApplications.unshift({appId:genId('APP'),auctionId:auc.auctionId,bidderId:this.currentUserId,depositId:depId,amount:amt,virtualAmount:virtInDeposit,status:'принята',createdAt:new Date().toISOString()});
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
      dep.status='снят резерв'; dep.releasedAt=now||new Date().toISOString(); dep.allowedWithdrawalType='own';
      if(realPart>0 || (dep.virtualAmount||0)>0){
        this.db.transactions.unshift({txId:genId('TX'),accountId:dep.payerAccountId,type:'снятие резерва задатка',status:'завершена',amount:dep.amount,createdAt:now||new Date().toISOString(),description:'Снятие резерва задатка (торги '+dep.auctionId+')'+(dep.virtualAmount>0?' — возврат '+fmt(dep.virtualAmount)+' вирт.':'')});
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
      const otSvcAcc=this.db.accounts.find(a=>a.userId===auc.organizerId&&a.subAccountTypeId==='02');
      this.db.invoices.push({
        invoiceId:genId('INV'), accountId:otSvcAcc?.accountId||null,
        type:'trade_invoice', status:'ожидает выставления',
        amount:null, createdAt:now, completedAt:null, paidAt:null,
        requestId:reqIdGen('I'),
        auctionId:auc.auctionId, organizerId:auc.organizerId,
        paidExternal:false,
        description:'Счёт за проведение торгов № '+auc.auctionId
      });
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
      this.db.transactions.unshift({txId:genId('TX'),accountId:acc?.accountId,type:'оплата счёта за торги',status:'завершена',amount:-inv.amount,virtualPart:0,repaid:false,createdAt:new Date().toISOString(),description:inv.description,requestId:inv.requestId});
      saveDB(this.db);
    },

    // ── ВИРТУАЛЬНЫЕ: аннуляция одного начисления ──
    _annulAlloc(alloc) {
      const acc=this.db.accounts.find(a=>a.accountId===alloc.accountId);
      // свободный остаток = начисление минус задействованное (в активных задатках)
      const activeInDeposits=this.db.deposits
        .filter(d=>d.payerAccountId===alloc.accountId&&(d.virtualAmount||0)>0&&d.status==='зарезервирован')
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
      const virtDeps=this.db.deposits.filter(d=>d.payerAccountId===alloc.accountId&&(d.virtualAmount||0)>0&&d.status==='зарезервирован');
      virtDeps.forEach(dep=>{
        const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId);
        const realPart=dep.amount-dep.virtualAmount;
        if(payerAcc){
          payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount);
          if(realPart>0) payerAcc.balanceFree+=realPart;
          // виртуальная часть НЕ возвращается — она аннулирована
        }
        dep.status='снят резерв'; dep.releasedAt=now; dep.virtualAmount=0;
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
      const expired=(this.db.virtualAllocations||[]).filter(a=>a.status==='active'&&new Date(a.expiresAt)<now);
      expired.forEach(a=>this._annulAlloc(a));
      if(expired.length>0) saveDB(this.db);
      return expired.length;
    },
    adminAnnulAlloc(allocId) {
      const alloc=(this.db.virtualAllocations||[]).find(a=>a.allocId===allocId);
      if(!alloc||alloc.status!=='active') return;
      if(!confirm('Аннулировать виртуальное начисление '+fmt(alloc.originalAmount)+'?')) return;
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
      if(!this.db.virtualAllocations) this.db.virtualAllocations=[];
      const expiresAt=this.admVirtualExpiry ? new Date(this.admVirtualExpiry).toISOString() : new Date(Date.now()+30*24*60*60*1000).toISOString();
      this.db.virtualAllocations.push({allocId:genId('VA'),accountId:this.admVirtualAccId,originalAmount:amt,repaidAmount:0,status:'active',expiresAt,createdAt:new Date().toISOString(),description:(this.admVirtualDesc||'Начисление виртуальных средств (адм.)')});
      this.db.transactions.unshift({txId:genId('TX'),accountId:this.admVirtualAccId,type:'начисление виртуальных средств',status:'завершена',amount:amt,createdAt:new Date().toISOString(),description:(this.admVirtualDesc||'Начисление виртуальных средств (адм.)')});
      saveDB(this.db); this.closeModal();
    },

    // ── ADMIN ──
    adminToggleBlock(accountId) { const acc=this.db.accounts.find(a=>a.accountId===accountId); if(!acc) return; if(!confirm((acc.isBlocked?'Разблокировать':'Заблокировать')+' счёт '+acc.displayNumber+'?'))return; acc.isBlocked=!acc.isBlocked; saveDB(this.db); },
    adminReleaseDeposit(depositId) { const dep=this.db.deposits.find(d=>d.depositId===depositId); if(!dep) return; if(!confirm('Принудительно снять резерв задатка '+fmt(dep.amount)+'?'))return; this._releaseDeposit(dep); saveDB(this.db); },
    adminVerifyReq(reqId) { const req=this.db.requisites.find(r=>r.requisiteId===reqId); if(!req) return; req.isVerified=true; saveDB(this.db); },
    adminVerifyPrc(prcId) { const p=this.db.principals?.find(p=>p.principalId===prcId); if(!p) return; p.isVerified=true; saveDB(this.db); },

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
              .filter(d=>d.payerAccountId===inv.accountId&&(d.virtualAmount||0)>0&&d.status==='зарезервирован')
              .sort((a,b)=>new Date(a.reservedAt)-new Date(b.reservedAt))
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
          this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'пополнение',status:'завершена',amount:inv.amount,createdAt:now,description:inv.description+' (подтверждено)',requestId:inv.requestId});
        }
      }
      if(inv.type==='вывод'||inv.type==='вывод задатка'){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc) acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);
        // обновляем статус транзакции вывода на "завершена"
        const wdTx=this.db.transactions.find(t=>t.requestId===inv.requestId&&(t.type==='вывод'||t.type==='вывод задатка'));
        if(wdTx){ wdTx.status='завершена'; wdTx.completedAt=now; }
      }
      if(inv.type==='перевод задаткового на услуги'){const from=this.db.accounts.find(a=>a.accountId===inv.accountId);const to=this.db.accounts.find(a=>a.userId===from?.userId&&a.subAccountTypeId==='02');if(from&&to){from.balanceReserved=Math.max(0,from.balanceReserved-inv.amount);to.balanceFree+=inv.amount;}}
      // DocRequests: помечаем pending запрос для этого invoice как ready
      const dr=(this.db.docRequests||[]).find(r=>r.refId===inv.invoiceId&&r.status==='pending');
      if(dr){ dr.status='ready'; dr.issuedAt=now; }
      saveDB(this.db);
    },
    // выставление счёта за торги через 1С
    confirmTI(invId, amount) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invId&&i.type==='trade_invoice');
      if(!inv) return;
      const amt=parseFloat(amount);
      if(!amt||amt<=0){alert('Укажите сумму');return;}
      inv.amount=amt; inv.status='выставлен'; inv.issuedAt=new Date().toISOString();
      saveDB(this.db);
    },

    reject1C(invoiceId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(!inv) return;
      const now=new Date().toISOString(); inv.status='отклонено'; inv.completedAt=now;
      if(inv.type==='вывод'||inv.type==='вывод задатка'||inv.type==='перевод задаткового на услуги'){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc){acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);acc.balanceFree+=inv.amount;}
        const wdTx=this.db.transactions.find(t=>t.requestId===inv.requestId);
        if(wdTx){ wdTx.status='отменена'; wdTx.completedAt=now; }
      }
      saveDB(this.db);
    },
  }));
});
