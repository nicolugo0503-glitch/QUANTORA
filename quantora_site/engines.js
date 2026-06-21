/* QUANTORA ENGINES — zero-dependency quant library.
   Every formula verified against authoritative sources + machine-checked test vectors.
   Pure math: inputs in, numbers out. No data dependency, no rate limit. */
(function(global){
'use strict';
var Q = {};

/* ---------- Normal distribution (Hart/West, ~1e-15) ---------- */
function normCdf(x){
  var b=Math.abs(x), n;
  if(b>37){ n=0; }
  else{
    var e=Math.exp(-b*b/2);
    if(b<7.07106781186547){
      var num=3.52624965998911e-2*b+0.700383064443688;
      num=num*b+6.37396220353165; num=num*b+33.912866078383;
      num=num*b+112.079291497871; num=num*b+221.213596169931;
      num=num*b+220.206867912376;
      var den=8.83883476483184e-2*b+1.75566716318264;
      den=den*b+16.064177579207; den=den*b+86.7807322029461;
      den=den*b+296.564248779674; den=den*b+637.333633378831;
      den=den*b+793.826512519948; den=den*b+440.413735824752;
      n=e*num/den;
    } else {
      var a=b+0.65; a=b+4/a; a=b+3/a; a=b+2/a; a=b+1/a;
      n=e/(a*2.506628274631);
    }
  }
  return x>0 ? 1-n : n;
}
function normPdf(x){ return Math.exp(-0.5*x*x)/2.5066282746310002; }
Q.normCdf=normCdf; Q.normPdf=normPdf;

/* ================= OPTIONS ================= */
function bsm(S,K,T,r,q,sig){
  if(T<=0){ return {d1:0,d2:0,call:Math.max(S-K,0),put:Math.max(K-S,0)}; }
  if(sig<=0) sig=1e-8;
  var sq=sig*Math.sqrt(T);
  var d1=(Math.log(S/K)+(r-q+0.5*sig*sig)*T)/sq;
  var d2=d1-sq;
  var dfR=Math.exp(-r*T), dfQ=Math.exp(-q*T);
  return {
    d1:d1, d2:d2,
    call:S*dfQ*normCdf(d1)-K*dfR*normCdf(d2),
    put:K*dfR*normCdf(-d2)-S*dfQ*normCdf(-d1)
  };
}
function greeks(S,K,T,r,q,sig){
  var b=bsm(S,K,T,r,q,sig), d1=b.d1, d2=b.d2;
  var dfR=Math.exp(-r*T), dfQ=Math.exp(-q*T), pdf=normPdf(d1), sqT=Math.sqrt(T);
  return {
    call:b.call, put:b.put, d1:d1, d2:d2,
    deltaCall:dfQ*normCdf(d1),
    deltaPut:dfQ*(normCdf(d1)-1),
    gamma:dfQ*pdf/(S*sig*sqT),
    vega:S*dfQ*pdf*sqT,                 // raw (per 1.00 = 100 vol pts)
    thetaCall:-S*dfQ*pdf*sig/(2*sqT)-r*K*dfR*normCdf(d2)+q*S*dfQ*normCdf(d1),
    thetaPut:-S*dfQ*pdf*sig/(2*sqT)+r*K*dfR*normCdf(-d2)-q*S*dfQ*normCdf(-d1),
    rhoCall:K*T*dfR*normCdf(d2),
    rhoPut:-K*T*dfR*normCdf(-d2)
  };
}
function impliedVol(price,S,K,T,r,q,isCall,opts){
  opts=opts||{}; var lo=opts.lo||1e-6, hi=opts.hi||5, tol=opts.tol||1e-8;
  function px(sig){ var b=bsm(S,K,T,r,q,sig); return isCall?b.call:b.put; }
  function vg(sig){ var sq=sig*Math.sqrt(T); var d1=(Math.log(S/K)+(r-q+0.5*sig*sig)*T)/sq; return S*Math.exp(-q*T)*normPdf(d1)*Math.sqrt(T); }
  var dfR=Math.exp(-r*T), dfQ=Math.exp(-q*T);
  var intr=isCall?Math.max(S*dfQ-K*dfR,0):Math.max(K*dfR-S*dfQ,0);
  var upper=isCall?S*dfQ:K*dfR;
  if(price<=intr+1e-12) return lo;
  if(price>=upper-1e-12) return hi;
  var sig=Math.sqrt(2*Math.PI/T)*price/S; sig=Math.min(Math.max(sig,lo),hi);
  for(var i=0;i<50;i++){ var diff=px(sig)-price, v=vg(sig);
    if(Math.abs(diff)<tol) return sig;
    if(!isFinite(v)||v<1e-8) break;
    var nx=sig-diff/v; if(nx<=lo||nx>=hi||!isFinite(nx)) break; sig=nx; }
  var a=lo,bb=hi,fa=px(a)-price;
  for(var j=0;j<200;j++){ var m=0.5*(a+bb), fm=px(m)-price;
    if(Math.abs(fm)<tol||(bb-a)<tol) return m;
    if(fa*fm<0) bb=m; else { a=m; fa=fm; } }
  return 0.5*(a+bb);
}
function crr(S,K,T,r,q,sig,N,isCall,american){
  N=N||500; american=american!==false;
  var dt=T/N, u=Math.exp(sig*Math.sqrt(dt)), d=1/u;
  var p=(Math.exp((r-q)*dt)-d)/(u-d), disc=Math.exp(-r*dt);
  function payoff(ST){ return isCall?Math.max(ST-K,0):Math.max(K-ST,0); }
  var v=new Array(N+1), i;
  for(i=0;i<=N;i++) v[i]=payoff(S*Math.pow(u,N-i)*Math.pow(d,i));
  for(var s=N-1;s>=0;s--){ for(i=0;i<=s;i++){
    v[i]=disc*(p*v[i]+(1-p)*v[i+1]);
    if(american){ var ST=S*Math.pow(u,s-i)*Math.pow(d,i), ex=payoff(ST); if(ex>v[i]) v[i]=ex; }
  } }
  return v[0];
}
function sviVol(k,p,T){ var w=p.a+p.b*(p.rho*(k-p.m)+Math.sqrt((k-p.m)*(k-p.m)+p.sigma*p.sigma)); return Math.sqrt(w/T); }
Q.bsm=bsm; Q.greeks=greeks; Q.impliedVol=impliedVol; Q.crr=crr; Q.sviVol=sviVol;

/* ================= FIXED INCOME ================= */
function bondPrice(face,couponRate,yld,n,m){
  m=m||1; var c=face*couponRate/m, y=yld/m, N=n*m, p=0;
  for(var t=1;t<=N;t++) p+=c/Math.pow(1+y,t);
  return p+face/Math.pow(1+y,N);
}
function ytm(face,couponRate,price,n,m){
  m=m||1; var c=face*couponRate/m, N=n*m;
  function pv(y){ var s=0; for(var t=1;t<=N;t++) s+=c/Math.pow(1+y,t); return s+face/Math.pow(1+y,N); }
  function dpv(y){ var s=0; for(var t=1;t<=N;t++) s+=-t*c/Math.pow(1+y,t+1); return s-N*face/Math.pow(1+y,N+1); }
  var y=couponRate>0?couponRate:0.05;
  for(var i=0;i<60;i++){ var f=pv(y)-price, d=dpv(y); if(Math.abs(f)<1e-10) return y*m; if(d===0) break; var ny=y-f/d; if(ny<=-0.9999) ny=(y-0.9999)/2; y=ny; }
  var a=-0.9999,b=2;
  for(var j=0;j<200;j++){ var mid=(a+b)/2; if(pv(mid)-price>0) a=mid; else b=mid; if(b-a<1e-12) break; }
  return ((a+b)/2)*m;
}
function bondAnalytics(face,couponRate,yld,n,m){
  m=m||1; var c=face*couponRate/m, y=yld/m, N=n*m, P=0, dur=0, cvx=0, t;
  for(t=1;t<=N;t++){ var cf=(t===N)?c+face:c, pv=cf/Math.pow(1+y,t); P+=pv; dur+=t*pv; cvx+=t*(t+1)*pv; }
  var macaulay=(dur/P)/m;
  var mod=macaulay/(1+y);
  var convexity=(cvx/(P*Math.pow(1+y,2)))/(m*m);
  var dv01=mod*P*0.0001;
  return {price:P, macaulay:macaulay, modified:mod, convexity:convexity, dv01:dv01};
}
function nelsonSiegel(t,b0,b1,b2,tau){
  if(t<=0) return b0+b1;
  var x=t/tau, e=Math.exp(-x), a=(1-e)/x;
  return b0+b1*a+b2*(a-e);
}
Q.bondPrice=bondPrice; Q.ytm=ytm; Q.bondAnalytics=bondAnalytics; Q.nelsonSiegel=nelsonSiegel;

/* ================= RISK & PORTFOLIO ================= */
function mean(a){ var s=0; for(var i=0;i<a.length;i++) s+=a[i]; return s/a.length; }
function stdev(a,sample){ var mu=mean(a), s=0; for(var i=0;i<a.length;i++) s+=(a[i]-mu)*(a[i]-mu); return Math.sqrt(s/(a.length-(sample===false?0:1))); }
function histVaR(returns,conf){ conf=conf||0.95; var s=returns.slice().sort(function(a,b){return a-b;}); var k=Math.max(0,Math.ceil((1-conf)*s.length)-1); return -s[k]; }
function histCVaR(returns,conf){ conf=conf||0.95; var s=returns.slice().sort(function(a,b){return a-b;}); var mm=Math.max(1,Math.ceil((1-conf)*s.length)), sum=0; for(var i=0;i<mm;i++) sum+=s[i]; return -(sum/mm); }
function paramVaR(returns,conf){ var Z={0.95:1.6448536269514722,0.99:2.3263478740408408}; conf=conf||0.95; return -(mean(returns)-(Z[conf]||1.6448536269514722)*stdev(returns)); }
function annVol(returns,P){ P=P||252; return stdev(returns)*Math.sqrt(P); }
function sharpe(returns,rfPeriod,P){ rfPeriod=rfPeriod||0; P=P||252; return ((mean(returns)-rfPeriod)/stdev(returns))*Math.sqrt(P); }
function sortino(returns,mar,P){ mar=mar||0; P=P||252; var ss=0; for(var i=0;i<returns.length;i++){ var d=Math.min(returns[i]-mar,0); ss+=d*d; } var dd=Math.sqrt(ss/returns.length); return ((mean(returns)-mar)/dd)*Math.sqrt(P); }
function maxDrawdown(returns){ var eq=1,peak=1,mdd=0; for(var i=0;i<returns.length;i++){ eq*=1+returns[i]; if(eq>peak) peak=eq; var dd=eq/peak-1; if(dd<mdd) mdd=dd; } return mdd; }
function beta(asset,bench){ var ma=mean(asset), mb=mean(bench), cov=0, vb=0; for(var i=0;i<asset.length;i++){ cov+=(asset[i]-ma)*(bench[i]-mb); vb+=(bench[i]-mb)*(bench[i]-mb); } return cov/vb; }
function correlation(x,y){ var mx=mean(x),my=mean(y),cov=0,sx=0,sy=0; for(var i=0;i<x.length;i++){ cov+=(x[i]-mx)*(y[i]-my); sx+=(x[i]-mx)*(x[i]-mx); sy+=(y[i]-my)*(y[i]-my); } return cov/Math.sqrt(sx*sy); }
Q.mean=mean; Q.stdev=stdev; Q.histVaR=histVaR; Q.histCVaR=histCVaR; Q.paramVaR=paramVaR; Q.annVol=annVol; Q.sharpe=sharpe; Q.sortino=sortino; Q.maxDrawdown=maxDrawdown; Q.beta=beta; Q.correlation=correlation;

/* ================= MACRO ================= */
function taylorRule(inflation,outputGap,o){ o=o||{}; var rStar=o.rStar==null?2:o.rStar, piT=o.piTarget==null?2:o.piTarget, wPi=o.wPi==null?0.5:o.wPi, wY=o.wY==null?0.5:o.wY; return rStar+inflation+wPi*(inflation-piT)+wY*outputGap; }
function recessionProb(tenY,threeM,slope){ slope=slope==null?-0.6330:slope; return normCdf(-0.5333+slope*(tenY-threeM)); }
function sahmRule(u3){ function sma(i){return (u3[i]+u3[i-1]+u3[i-2])/3;} var cur=sma(u3.length-1), low=Infinity; for(var i=u3.length-13;i<u3.length;i++){ if(i>=2){ var v=sma(i); if(v<low) low=v; } } var val=cur-low; return {value:val, triggered:val>=0.5}; }
Q.taylorRule=taylorRule; Q.recessionProb=recessionProb; Q.sahmRule=sahmRule;

/* ================= CREDIT ================= */
function merton(V,D,sig,drift,T){ var d2=(Math.log(V/D)+(drift-0.5*sig*sig)*T)/(sig*Math.sqrt(T)); return {dd:d2, pd:normCdf(-d2)}; }
function expectedLoss(pd,lgd,ead){ return pd*lgd*ead; }
function cdsTriangle(hazard,recovery){ return hazard*(1-recovery); }
function pdFromSpread(spread,recovery,T){ var lambda=spread/(1-recovery); return {hazard:lambda, pd:1-Math.exp(-lambda*(T||1))}; }
function ocRatio(collateralPar,seniorPlusCurrentPar){ return collateralPar/seniorPlusCurrentPar; }
Q.merton=merton; Q.expectedLoss=expectedLoss; Q.cdsTriangle=cdsTriangle; Q.pdFromSpread=pdFromSpread; Q.ocRatio=ocRatio;

/* ================= CORPORATE FINANCE ================= */
function npv(rate,cfs){ var s=0; for(var t=0;t<cfs.length;t++) s+=cfs[t]/Math.pow(1+rate,t); return s; }
function irr(cfs,guess){ guess=guess==null?0.1:guess;
  function f(r){ return npv(r,cfs); }
  var r=guess;
  for(var i=0;i<100;i++){ var fv=0,df=0; for(var t=0;t<cfs.length;t++){ fv+=cfs[t]/Math.pow(1+r,t); if(t) df+=-t*cfs[t]/Math.pow(1+r,t+1); } if(df===0) break; var rn=r-fv/df; if(!isFinite(rn)||rn<=-1) break; if(Math.abs(rn-r)<1e-10) return rn; r=rn; }
  var lo=-0.9999, prev=f(lo);
  for(var hi=lo+0.01; hi<=10; hi+=0.01){ var cur=f(hi); if((prev<0)!==(cur<0)){ var a=hi-0.01,b=hi; for(var k=0;k<200;k++){ var m=(a+b)/2, fm=f(m); if(Math.abs(fm)<1e-12) return m; if((f(a)<0)===(fm<0)) a=m; else b=m; } return (a+b)/2; } prev=cur; }
  return NaN;
}
function xnpv(rate,cfs,dates){ var d0=dates[0].getTime(), DAY=864e5,s=0; for(var i=0;i<cfs.length;i++) s+=cfs[i]/Math.pow(1+rate,(dates[i].getTime()-d0)/DAY/365); return s; }
function xirr(cfs,dates,guess){ guess=guess==null?0.1:guess; var r=guess;
  for(var i=0;i<100;i++){ var f=xnpv(r,cfs,dates), df=(xnpv(r+1e-6,cfs,dates)-f)/1e-6; if(df===0) break; var rn=r-f/df; if(!isFinite(rn)||rn<=-1) break; if(Math.abs(rn-r)<1e-9) return rn; r=rn; }
  var lo=-0.9999, prev=xnpv(lo,cfs,dates);
  for(var hi=lo+0.01; hi<=10; hi+=0.01){ var cur=xnpv(hi,cfs,dates); if((prev<0)!==(cur<0)){ var a=hi-0.01,b=hi; for(var k=0;k<200;k++){ var m=(a+b)/2, fm=xnpv(m,cfs,dates); if(Math.abs(fm)<1e-10) return m; if((xnpv(a,cfs,dates)<0)===(fm<0)) a=m; else b=m; } return (a+b)/2; } prev=cur; }
  return NaN;
}
function dcf(o){ var fcf=o.fcf, disc=o.discount, g=o.g, netDebt=o.netDebt||0, N=fcf.length, pv=0; for(var t=0;t<N;t++) pv+=fcf[t]/Math.pow(1+disc,t+1); var tv=fcf[N-1]*(1+g)/(disc-g); var pvTV=tv/Math.pow(1+disc,N); var ev=pv+pvTV; return {ev:ev, equity:ev-netDebt, pvExplicit:pv, pvTerminal:pvTV, tv:tv}; }
function wacc(E,D,Re,Rd,tax){ var V=E+D; return (E/V)*Re+(D/V)*Rd*(1-tax); }
function capm(rf,b,erp){ return rf+b*erp; }
function gordon(d0,r,g){ return d0*(1+g)/(r-g); }
function reUnderwrite(o){ var noi=o.gpr-o.vacancy+(o.other||0)-o.opex; return {noi:noi, value:o.capRate?noi/o.capRate:null, capRate:o.value?noi/o.value:null, dscr:o.debtService?noi/o.debtService:null, coc:(o.debtService&&o.equity)?(noi-o.debtService)/o.equity:null}; }
Q.npv=npv; Q.irr=irr; Q.xnpv=xnpv; Q.xirr=xirr; Q.dcf=dcf; Q.wacc=wacc; Q.capm=capm; Q.gordon=gordon; Q.reUnderwrite=reUnderwrite;

/* ================= CRYPTO ================= */
function fundingAPR(rate,periodHours){ periodHours=periodHours||8; return rate*(8760/periodHours); }
function fundingAPY(rate,periodHours){ periodHours=periodHours||8; return Math.pow(1+rate,8760/periodHours)-1; }
function liqPrice(entry,lev,mmr,side){ var m=1/lev; return side==='short'?entry*(1+m-mmr):entry*(1-m+mmr); }
function impermanentLoss(r){ return 2*Math.sqrt(r)/(1+r)-1; }
function basisAnnualized(spot,fut,days){ return (fut/spot-1)*(365/days); }
function aprToApy(apr,n){ n=n||365; return Math.pow(1+apr/n,n)-1; }
function dcaAverage(buys){ var spent=0,units=0; for(var i=0;i<buys.length;i++){ spent+=buys[i].amount; units+=buys[i].amount/buys[i].price; } return {avgCost:spent/units, units:units, spent:spent}; }
function positionSize(equity,riskFrac,entry,stop){ var r=Math.abs(entry-stop); var units=equity*riskFrac/r; return {units:units, notional:units*entry, riskDollars:equity*riskFrac, rPerUnit:r}; }
function kelly(p,avgWin,avgLoss,fraction){ fraction=fraction==null?1:fraction; var b=avgWin/avgLoss, q=1-p; var f=(b*p-q)/b; return Math.max(0,f)*fraction; }
Q.fundingAPR=fundingAPR; Q.fundingAPY=fundingAPY; Q.liqPrice=liqPrice; Q.impermanentLoss=impermanentLoss; Q.basisAnnualized=basisAnnualized; Q.aprToApy=aprToApy; Q.dcaAverage=dcaAverage; Q.positionSize=positionSize; Q.kelly=kelly;


/* ================= ADDED ENGINES ================= */
function probITM(S,K,T,r,q,sig){ var d2=Q.bsm(S,K,T,r,q,sig).d2; return {call:normCdf(d2), put:normCdf(-d2)}; }
function markowitz2(s1,s2,rho){ var cov=rho*s1*s2; var w1=(s2*s2-cov)/(s1*s1+s2*s2-2*cov); var w2=1-w1; var v=w1*w1*s1*s1+w2*w2*s2*s2+2*w1*w2*cov; return {w1:w1,w2:w2,vol:Math.sqrt(v)}; }
function sqrtImpact(Q_,V,sigma,price,Y){ Y=Y==null?1:Y; var f=Y*sigma*Math.sqrt(Q_/V); return {frac:f, bps:f*1e4, dollar:f*price*Q_}; }
function almgrenChriss(X,T,N,lambda,sigma,eta,gamma){ var tau=T/N; var etaT=eta-0.5*gamma*tau; var kappa=Math.sqrt(lambda*sigma*sigma/etaT); var sh=Math.sinh(kappa*T); var hold=[],tr=[],j; for(j=0;j<=N;j++){ var t=j*tau; hold.push(X*Math.sinh(kappa*(T-t))/sh); } for(j=1;j<=N;j++) tr.push(hold[j-1]-hold[j]); return {kappa:kappa, halfLife:1/kappa, holdings:hold, trades:tr}; }
Q.probITM=probITM; Q.markowitz2=markowitz2; Q.sqrtImpact=sqrtImpact; Q.almgrenChriss=almgrenChriss;

Q.version='1.1';
global.QENG=Q;
if(typeof module!=='undefined'&&module.exports) module.exports=Q;
})(typeof window!=='undefined'?window:globalThis);
