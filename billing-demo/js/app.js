document.addEventListener('alpine:init', () => {
  Alpine.data('billing', () => ({

    db: loadDB(), page:'wallet', theme:loadTheme(),
    modal:null, mStep:0,

    fsAccId:null, fsAmount:'', fsError:'', fsLoading:false, fsRid:'',
    fdAccId:null, fdAmount:'', fdTrade:'', fdError:'', fdLoading:false, fdRid:'',
    wdAccId:null, wdAmount:'', wdType:'own', wdError:'', wdLoading:false, wdRid:'',
    wdDepositId:null, wdDepError:'', wdDepLoading:false, wdDepRid:'',
    payServiceId:'acc',
    trFrom:null, trTo:null, trAmount:'', trError:'', trLoading:false, trRid:'',
    rqAccId:null, rqName:'', rqInn:'', rqKpp:'', rqBank:'', rqBik:'', rqAccNum:'', rqError:'', rqLoading:false,
    appAuctionId:null, appAmount:'', appError:'', appLoading:false,
    finishAuctionId:null,
    contractAuctionId:null, contractWith:null,
    admVirtualAccId:null, admVirtualAmt:'', admVirtualDesc:'', admVirtualError:'',
    prcName:'', prcInn:'', prcKpp:'', prcBank:'', prcBik:'', prcAccNum:'', prcError:'', prcLoading:false,

    CDT_NAME:'АО «Центр дистанционных торгов»', CDT_INN_KPP:'7812345678 / 780101001',
    CDT_BANK:'АО «Тинькофф Банк»', CDT_BIK:'044525974', CDT_RS:'40702810000001234567',

    init() { applyTheme(this.theme); },

    get currentUser()   { return USERS.find(u=>u.userId===this.db.currentUserId); },
    get currentUserId() { return this.db.currentUserId; },
    get currentRole()   { return this.currentUser?.role||'ut'; },
    get isAdmin()       { return this.currentRole==='admin'; },
    switchUser(uid)     { this.db.currentUserId=uid; saveDB(this.db); this.page=this.isAdmin?'adminAccounts':'wallet'; },

    setTheme(t)     { this.theme=t; applyTheme(t); },
    setPage(p)      { this.page=p; },
    openModal(name) { this.modal=name; this.mStep=0; },
    closeModal()    { this.modal=null; this.mStep=0; },

    resetAll()  { if(!confirm('Сбросить все данные?'))return; this.db=resetDB(); this.page='wallet'; },
    loadDemo()  { if(!confirm('Загрузить демонстрационные данные?'))return; loadDemoData(this.db); },
    clearData() { if(!confirm('Очистить все данные?'))return; clearAllData(this.db); },

    get accs()         { return this.isAdmin?[]:accsForRole(this.db,this.currentRole,this.currentUserId); },
    get txs()          { return txsForUser(this.db,this.currentUserId); },
    get invs()         { return invsForUser(this.db,this.currentUserId); },
    get reqs()         { return reqsForUser(this.db,this.currentUserId); },
    get allInvs()      { return [...this.db.invoices].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
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

    // п.6: подсказка о пополнении по коду торгов
    depositHintForAuction(auctionId) {
      const myIds=accsForUser(this.db,this.currentUserId).map(a=>a.accountId);
      return this.db.invoices.find(i=>
        myIds.includes(i.accountId)&&i.type==='пополнение'&&i.status==='исполнено'&&
        i.description&&i.description.includes('торги '+auctionId)
      )||null;
    },

    // п.2: проверка наличия виртуальных средств в задатке победителя
    auctionHasVirtualDeposit(auctionId) {
      const apps=this.appsForAuction(auctionId).filter(a=>a.status==='принята');
      if(!apps.length) return false;
      const winner=apps[0]; // первый по дате = потенциальный победитель
      const dep=this.db.deposits.find(d=>d.depositId===winner.depositId);
      if(!dep) return false;
      const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId);
      return !!(payerAcc&&(payerAcc.balanceVirtual||0)>0&&dep.virtualAmount>0);
    },

    get auctionsForUT()  { return this.db.auctions; },
    get auctionsForOT()  { return this.db.auctions.filter(a=>a.organizerId===this.currentUserId); },
    get allAuctions()    { return this.db.auctions; },
    myAppForAuction(aid) { return this.db.tradeApplications.find(a=>a.auctionId===aid&&a.bidderId===this.currentUserId); },
    appsForAuction(aid)  { return [...this.db.tradeApplications.filter(a=>a.auctionId===aid)].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)); },
    bidderName(uid)      { return USERS.find(u=>u.userId===uid)?.name||uid; },
    auctionById(aid)     { return this.db.auctions.find(a=>a.auctionId===aid); },

    get serviceAccs()  { return accsForRole(this.db,this.currentRole,this.currentUserId).filter(a=>a.subAccountTypeId==='01'||a.subAccountTypeId==='02'); },
    get depositAccs()  { return accsForRole(this.db,this.currentRole,this.currentUserId).filter(a=>a.subAccountTypeId==='03'); },
    // вывод: для УТ — все счета включая задатковый; для ОТ — только счета услуг
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

    fmt, fmtDt,
    accForId(id)    { return this.db.accounts.find(a=>a.accountId===id); },
    userByAccId(id) { const acc=this.db.accounts.find(a=>a.accountId===id); return USERS.find(u=>u.userId===acc?.userId); },
    badgeClass(s)   { return ({'исполнено':'bs','завершена':'bs','на рассмотрении':'bp','создано':'bc','отклонено':'be','в обработке':'bc','зарезервирован':'bc','переведён':'bs','снят резерв':'bs','выведен':'bs','удерживается':'bp','отменён':'be','принята':'bs','победитель':'bs','второй участник':'bp','резерв снят':'bs','победитель (договор)':'bs','Приём заявок':'bs','Протокол опубликован':'bp','Договор подписан':'bs','Приостановлены':'be','Заблокирован':'be','Активен':'bs'})[s]||'bc'; },
    txClass(tx)     { return tx.type==='резервирование задатка'?'tx-res':tx.amount>0?'tx-plus':'tx-minus'; },
    depositBadge(s) { return ({'зарезервирован':'bc','переведён':'bs','снят резерв':'bs','выведен':'bs','удерживается':'bp','отменён':'be'})[s]||'bc'; },

    openFundsService(accId) { this.fsAccId=accId||this.serviceAccs[0]?.accountId||null; this.fsAmount=''; this.fsError=''; this.fsLoading=false; this.fsRid=''; this.openModal('fundsService'); },
    openFundsDeposit(accId) { this.fdAccId=accId||this.depositAccs[0]?.accountId||null; this.fdAmount=''; this.fdTrade=''; this.fdError=''; this.fdLoading=false; this.fdRid=''; this.openModal('fundsDeposit'); },
    openWithdraw(accId)     { this.wdAccId=accId||this.serviceAccs[0]?.accountId||null; this.wdAmount=''; this.wdType='own'; this.wdError=''; this.wdLoading=false; this.wdRid=''; this.openModal('withdraw'); },
    openWithdrawDeposit(depositId) { this.wdDepositId=depositId||null; this.wdDepError=''; this.wdDepLoading=false; this.wdDepRid=''; this.openModal('withdrawDeposit'); },
    openTransfer()   { this.trAmount=''; this.trError=''; this.trLoading=false; this.trRid=''; this.openModal('transfer'); },
    openAddReq()     { this.rqAccId=this.serviceAccs[0]?.accountId||null; this.rqName=''; this.rqInn=''; this.rqKpp=''; this.rqBank=''; this.rqBik=''; this.rqAccNum=''; this.rqError=''; this.rqLoading=false; this.openModal('addReq'); },
    openTradeApp(aid){ const auc=this.db.auctions.find(a=>a.auctionId===aid); this.appAuctionId=aid; this.appAmount=String(auc?.minDeposit||0); this.appError=''; this.appLoading=false; this.openModal('tradeApp'); },
    openFinishAuction(aid)  { this.finishAuctionId=aid; this.openModal('finishAuction'); },
    openSignContract(aid)   { this.contractAuctionId=aid; this.contractWith=null; this.openModal('signContract'); },
    openAdmVirtual(accId)   { this.admVirtualAccId=accId; this.admVirtualAmt=''; this.admVirtualDesc=''; this.admVirtualError=''; this.openModal('admVirtual'); },
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

    // ── ПОПОЛНЕНИЕ ЗАДАТКОВОГО ──
    // п.3: если счёт пополняется и на нём есть виртуальные средства —
    // отдельная транзакция конвертации виртуальных в реальные
    submitFundsDeposit() {
      this.fdError=''; if(!this.fdAmount||parseFloat(this.fdAmount)<=0){this.fdError='Укажите сумму';return;}
      this.fdLoading=true;
      setTimeout(()=>{
        this.fdRid=reqIdGen('P');
        const amt=parseFloat(this.fdAmount);
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:this.fdAccId,type:'пополнение',status:'создано',amount:amt,requestId:this.fdRid,createdAt:new Date().toISOString(),description:'Пополнение задаткового счёта'+(this.fdTrade?' (торги '+this.fdTrade+')':'')});
        saveDB(this.db); this.fdLoading=false; this.mStep=1;
      },600);
    },

    // ── ВЫВОД ──
    submitWithdraw() {
      this.wdError='';
      const amt=parseFloat(this.wdAmount);
      if(!this.wdAmount||isNaN(amt)||amt<=0){this.wdError='Укажите корректную сумму';return;}
      const acc=this.db.accounts.find(a=>a.accountId===this.wdAccId);
      if(acc.balanceFree<amt){this.wdError='Недостаточно свободных средств. Доступно: '+fmt(acc.balanceFree);return;}
      this.wdLoading=true;
      setTimeout(()=>{
        acc.balanceFree-=amt; acc.balanceReserved+=amt;
        this.wdRid=reqIdGen('W');
        const desc=acc.subAccountTypeId==='03'?'Вывод средств с задаткового счёта':'Вывод д/с на реквизиты';
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:this.wdAccId,type:'вывод',status:'на рассмотрении',amount:amt,requestId:this.wdRid,createdAt:new Date().toISOString(),description:desc});
        this.db.transactions.unshift({txId:genId('TX'),accountId:this.wdAccId,type:'вывод',status:'в обработке',amount:-amt,createdAt:new Date().toISOString(),description:desc+' ('+this.wdRid+')'});
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
      this.wdDepLoading=true;
      setTimeout(()=>{
        acc.balanceFree-=amt; acc.balanceReserved+=amt;
        this.wdDepRid=reqIdGen('W');
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:acc.accountId,type:'вывод задатка',status:'на рассмотрении',amount:amt,requestId:this.wdDepRid,createdAt:new Date().toISOString(),description:'Вывод задатка по торгам '+dep.auctionId+' (должник: '+(auc?.debtorName||'—')+')'});
        this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'вывод задатка',status:'в обработке',amount:-amt,createdAt:new Date().toISOString(),description:'Вывод задатка на реквизиты должника (торги '+dep.auctionId+')'});
        dep.status='выведен';
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
        const fromReal=Math.min(acc.balanceFree,svc.price);
        const fromVirt=svc.price-fromReal;
        acc.balanceFree-=fromReal;
        if(fromVirt>0) acc.balanceVirtual=Math.max(0,(acc.balanceVirtual||0)-fromVirt);
        const rid=reqIdGen('S');
        this.db.invoices.unshift({invoiceId:genId('INV'),accountId:acc.accountId,type:'оплата услуги',status:'исполнено',amount:svc.price,requestId:rid,createdAt:new Date().toISOString(),description:'Услуга: '+svc.name});
        this.db.transactions.unshift({txId:genId('TX'),accountId:acc.accountId,type:'оплата услуги',status:'завершена',amount:-svc.price,createdAt:new Date().toISOString(),description:'Услуга: '+svc.name});
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
    // п.2: фиксируем долю виртуальных средств в задатке
    submitTradeApp() {
      this.appError=''; const auc=this.db.auctions.find(a=>a.auctionId===this.appAuctionId);
      if(!auc||auc.status!=='Приём заявок'){this.appError='Торги не принимают заявки';return;}
      const amt=parseFloat(this.appAmount); if(!this.appAmount||isNaN(amt)||amt<=0){this.appError='Укажите сумму задатка';return;}
      if(amt<auc.minDeposit){this.appError='Минимальная сумма: '+fmt(auc.minDeposit);return;}
      if(this.myAppForAuction(this.appAuctionId)){this.appError='Вы уже подали заявку';return;}
      const depAcc=this.db.accounts.find(a=>a.userId===this.currentUserId&&a.subAccountTypeId==='03');
      if(!depAcc||depAcc.balanceFree<amt){this.appError='Недостаточно средств. Доступно: '+fmt(depAcc?.balanceFree||0);return;}
      this.appLoading=true;
      setTimeout(()=>{
        // п.2: сколько виртуальных идёт в задаток
        const virtInDeposit=Math.min(depAcc.balanceVirtual||0, amt);
        depAcc.balanceFree-=amt; depAcc.balanceReserved+=amt;
        const depId=genId('DEP'); const otDepAcc=this.db.accounts.find(a=>a.userId===auc.organizerId&&a.subAccountTypeId==='04');
        this.db.deposits.unshift({depositId:depId,payerAccountId:depAcc.accountId,receiverAccountId:otDepAcc?.accountId||null,auctionId:auc.auctionId,tradeLotId:auc.lotId,amount:amt,virtualAmount:virtInDeposit,status:'зарезервирован',reservedAt:new Date().toISOString(),releasedAt:null,releaseAfter:null,holdUntilContract:false,payer:this.currentUser.name,allowedWithdrawalType:'none'});
        this.db.transactions.unshift({txId:genId('TX'),accountId:depAcc.accountId,type:'резервирование задатка',status:'завершена',amount:-amt,createdAt:new Date().toISOString(),description:'Задаток по торгам '+auc.auctionId+(virtInDeposit>0?' (вкл. '+fmt(virtInDeposit)+' вирт.)':'')});
        this.db.tradeApplications.unshift({appId:genId('APP'),auctionId:auc.auctionId,bidderId:this.currentUserId,depositId:depId,amount:amt,virtualAmount:virtInDeposit,status:'принята',createdAt:new Date().toISOString()});
        saveDB(this.db); this.appLoading=false; this.mStep=1;
      },600);
    },

    // ── ПУБЛИКАЦИЯ ПРОТОКОЛА ──
    // п.2: блокируем если в задатке победителя есть виртуальные средства
    submitFinishAuction() {
      const auc=this.db.auctions.find(a=>a.auctionId===this.finishAuctionId); if(!auc) return;
      const apps=this.appsForAuction(auc.auctionId).filter(a=>a.status==='принята');
      if(!apps.length){alert('Нет заявок');return;}
      // проверяем победителя (первый по дате)
      const winnerApp=apps[0];
      if((winnerApp.virtualAmount||0)>0){
        alert('Невозможно опубликовать протокол: задаток победителя содержит виртуальные средства ('+fmt(winnerApp.virtualAmount)+'). УТ должен погасить виртуальные средства путём пополнения задаткового счёта.');
        return;
      }
      const now=new Date().toISOString();
      auc.status='Протокол опубликован'; auc.protocolSignedAt=now;
      apps.forEach((app,idx)=>{
        const dep=this.db.deposits.find(d=>d.depositId===app.depositId);
        const payerAcc=this.db.accounts.find(a=>a.accountId===dep?.payerAccountId);
        const receiverAcc=dep?.receiverAccountId?this.db.accounts.find(a=>a.accountId===dep.receiverAccountId):null;
        if(idx===0){
          app.status='победитель';
          if(dep&&payerAcc&&receiverAcc){ payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount); receiverAcc.balanceFree+=dep.amount; dep.status='переведён'; dep.releasedAt=now; dep.allowedWithdrawalType='debtor'; this.db.transactions.unshift({txId:genId('TX'),accountId:payerAcc.accountId,type:'перевод задатка',status:'завершена',amount:-dep.amount,createdAt:now,description:'Задаток переведён организатору (торги '+auc.auctionId+')'}); this.db.transactions.unshift({txId:genId('TX'),accountId:receiverAcc.accountId,type:'перевод задатка',status:'завершена',amount:dep.amount,createdAt:now,description:'Задаток победителя (торги '+auc.auctionId+')'}); }
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
        if(second){ second.status='резерв снят'; const dep=this.db.deposits.find(d=>d.depositId===second.depositId); if(dep) dep.holdUntilContract=false; }
      } else {
        if(second){
          second.status='победитель (договор)';
          const dep=this.db.deposits.find(d=>d.depositId===second.depositId);
          const payerAcc=dep?this.db.accounts.find(a=>a.accountId===dep.payerAccountId):null;
          const receiverAcc=dep?.receiverAccountId?this.db.accounts.find(a=>a.accountId===dep.receiverAccountId):null;
          if(dep&&payerAcc&&receiverAcc){ payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount); receiverAcc.balanceFree+=dep.amount; dep.status='переведён'; dep.releasedAt=now; dep.holdUntilContract=false; dep.allowedWithdrawalType='debtor'; this.db.transactions.unshift({txId:genId('TX'),accountId:payerAcc.accountId,type:'перевод задатка',status:'завершена',amount:-dep.amount,createdAt:now,description:'Задаток переведён (договор со вторым, торги '+auc.auctionId+')'}); this.db.transactions.unshift({txId:genId('TX'),accountId:receiverAcc.accountId,type:'перевод задатка',status:'завершена',amount:dep.amount,createdAt:now,description:'Задаток второго участника (торги '+auc.auctionId+')'}); }
        }
      }
      saveDB(this.db); this.closeModal();
    },

    // ── ADMIN: виртуальные средства ──
    // п.1: начисляем на задатковый тоже
    submitAdmVirtual() {
      this.admVirtualError=''; const amt=parseFloat(this.admVirtualAmt);
      if(!this.admVirtualAccId){this.admVirtualError='Выберите счёт';return;}
      if(!this.admVirtualAmt||isNaN(amt)||amt<=0){this.admVirtualError='Укажите корректную сумму';return;}
      const acc=this.db.accounts.find(a=>a.accountId===this.admVirtualAccId);
      if(!acc){this.admVirtualError='Счёт не найден';return;}
      acc.balanceVirtual=(acc.balanceVirtual||0)+amt;
      this.db.transactions.unshift({txId:genId('TX'),accountId:this.admVirtualAccId,type:'начисление виртуальных средств',status:'завершена',amount:amt,createdAt:new Date().toISOString(),description:(this.admVirtualDesc||'Начисление виртуальных средств (адм.)')});
      saveDB(this.db); this.closeModal();
    },

    // п.3: конвертация виртуальных в реальные при подтверждении пополнения задаткового счёта


    adminToggleBlock(accountId) { const acc=this.db.accounts.find(a=>a.accountId===accountId); if(!acc) return; if(!confirm((acc.isBlocked?'Разблокировать':'Заблокировать')+' счёт '+acc.displayNumber+'?'))return; acc.isBlocked=!acc.isBlocked; saveDB(this.db); },
    adminReleaseDeposit(depositId) { const dep=this.db.deposits.find(d=>d.depositId===depositId); if(!dep) return; if(!confirm('Принудительно снять резерв задатка '+fmt(dep.amount)+'?'))return; const payerAcc=this.db.accounts.find(a=>a.accountId===dep.payerAccountId); if(payerAcc){payerAcc.balanceReserved=Math.max(0,payerAcc.balanceReserved-dep.amount);payerAcc.balanceFree+=dep.amount;} dep.status='снят резерв'; dep.releasedAt=new Date().toISOString(); dep.releaseAfter=null; dep.allowedWithdrawalType='own'; this.db.transactions.unshift({txId:genId('TX'),accountId:dep.payerAccountId,type:'снятие резерва задатка',status:'завершена',amount:dep.amount,createdAt:new Date().toISOString(),description:'Принудительное снятие резерва (адм.)'}); saveDB(this.db); },
    adminVerifyReq(reqId)   { const req=this.db.requisites.find(r=>r.requisiteId===reqId); if(!req) return; req.isVerified=true; saveDB(this.db); },
    adminVerifyPrc(prcId)   { const p=this.db.principals?.find(p=>p.principalId===prcId); if(!p) return; p.isVerified=true; saveDB(this.db); },

    // ── 1С ──
    confirm1C(invoiceId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(!inv) return;
      const now=new Date().toISOString();
      inv.status='исполнено'; inv.completedAt=now;
      if(inv.type==='пополнение'&&inv.amount>0){
        const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);
        if(acc){
          // сначала гасим виртуальный долг, остаток идёт на balanceFree
          const virtDebt=acc.balanceVirtual||0;
          const toRepay=Math.min(virtDebt, inv.amount);
          const toFree=inv.amount-toRepay;
          acc.balanceFree+=toFree;
          if(toRepay>0){
            acc.balanceVirtual=Math.max(0,virtDebt-toRepay);
            // для задаткового — снижаем virtualAmount в задатках
            if(acc.subAccountTypeId==='03'){
              let remaining=toRepay;
              this.db.deposits.filter(d=>d.payerAccountId===inv.accountId&&(d.virtualAmount||0)>0).forEach(d=>{
                const reduce=Math.min(d.virtualAmount||0, remaining);
                d.virtualAmount=Math.max(0,(d.virtualAmount||0)-reduce);
                remaining-=reduce;
                const app=this.db.tradeApplications.find(a=>a.depositId===d.depositId);
                if(app) app.virtualAmount=d.virtualAmount;
              });
            }
            this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'погашение виртуальных средств',status:'завершена',amount:-toRepay,createdAt:now,description:'Погашение виртуальных средств ('+fmt(toRepay)+')'});
          }
          this.db.transactions.unshift({txId:genId('TX'),accountId:inv.accountId,type:'пополнение',status:'завершена',amount:inv.amount,createdAt:now,description:inv.description+' (подтверждено)'});
        }
      }
      if(inv.type==='вывод'||inv.type==='вывод задатка'){const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);if(acc)acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);}
      if(inv.type==='перевод задаткового на услуги'){const from=this.db.accounts.find(a=>a.accountId===inv.accountId);const to=this.db.accounts.find(a=>a.userId===from?.userId&&a.subAccountTypeId==='02');if(from&&to){from.balanceReserved=Math.max(0,from.balanceReserved-inv.amount);to.balanceFree+=inv.amount;}}
      saveDB(this.db);
    },
    reject1C(invoiceId) {
      const inv=this.db.invoices.find(i=>i.invoiceId===invoiceId); if(!inv) return;
      const now=new Date().toISOString();
      inv.status='отклонено'; inv.completedAt=now;
      if(inv.type==='вывод'||inv.type==='вывод задатка'||inv.type==='перевод задаткового на услуги'){const acc=this.db.accounts.find(a=>a.accountId===inv.accountId);if(acc){acc.balanceReserved=Math.max(0,acc.balanceReserved-inv.amount);acc.balanceFree+=inv.amount;}}
      saveDB(this.db);
    },
  }));
});
