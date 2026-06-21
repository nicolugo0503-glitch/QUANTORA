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


/* ================= BLOOMBERG-GRADE BATCH ================= */
/* Futures options (Black-76) & FX options (Garman-Kohlhagen) */
function black76(F,K,T,r,sig){ var b=bsm(F,K,T,r,r,sig); return {call:b.call, put:b.put, d1:b.d1, d2:b.d2}; }
function garmanKohlhagen(S,K,T,rd,rf,sig){ var b=bsm(S,K,T,rd,rf,sig); return {call:b.call, put:b.put}; }

/* Second-order Greeks */
function greeks2(S,K,T,r,q,sig){
  var b=bsm(S,K,T,r,q,sig), d1=b.d1, d2=b.d2, sqT=Math.sqrt(T);
  var vega=S*Math.exp(-q*T)*normPdf(d1)*sqT;
  return { vanna:(vega/S)*(1-d1/(sig*sqT)), volga:vega*d1*d2/sig };
}

/* Options strategy P&L (multi-leg, at expiry) */
function legPnL(leg,S){
  var q=leg.qty||0, prem=leg.premium||0;
  if(leg.kind==='stock') return q*(S-(leg.strike||0));
  var intr=leg.kind==='put'?Math.max((leg.strike||0)-S,0):Math.max(S-(leg.strike||0),0);
  return q*intr-q*prem;
}
function strategyPnL(legs,S0,opts){
  opts=opts||{}; var lo=opts.lo!=null?opts.lo:0, hi=opts.hi!=null?opts.hi:S0*2, n=opts.n||120;
  var xs=[],ys=[],i,prev=null,bes=[],maxP=-Infinity,maxL=Infinity;
  for(i=0;i<=n;i++){ var S=lo+(hi-lo)*i/n, p=0; for(var j=0;j<legs.length;j++) p+=legPnL(legs[j],S);
    xs.push(S); ys.push(p);
    if(p>maxP) maxP=p; if(p<maxL) maxL=p;
    if(prev!==null && (prev<0)!==(p<0) && prev!==p){ var Sb=xs[i-1]+(0-prev)/(p-prev)*(S-xs[i-1]); bes.push(Sb); }
    prev=p;
  }
  var net=0; for(var k=0;k<legs.length;k++) net+=legPnL(legs[k],S0);
  return {xs:xs, ys:ys, breakevens:bes, maxProfit:maxP, maxLoss:maxL, atSpot:net};
}

/* Equity & fundamentals */
function altmanZ(wc,re,ebit,mktEq,sales,ta,tl){
  var X1=wc/ta,X2=re/ta,X3=ebit/ta,X4=mktEq/tl,X5=sales/ta;
  var z=1.2*X1+1.4*X2+3.3*X3+0.6*X4+1.0*X5;
  var zone=z>2.99?'Safe':(z>=1.81?'Grey':'Distress');
  return {z:z, zone:zone};
}
function dupont(ni,sales,assets,equity){
  var margin=ni/sales, turnover=sales/assets, leverage=assets/equity;
  return {margin:margin, turnover:turnover, leverage:leverage, roe:margin*turnover*leverage};
}
function multiples(price,eps,growthPct,ev,ebitda,bookps){
  var pe=price/eps;
  return {pe:pe, peg:growthPct?pe/growthPct:null, evEbitda:ev/ebitda, pb:price/bookps};
}
function piotroskiF(t){ // t: object of 9 boolean signals
  var keys=['roaPos','cfoPos','roaUp','accrual','levDown','currUp','noDilution','marginUp','turnUp'];
  var sc=0; for(var i=0;i<keys.length;i++) if(t[keys[i]]) sc++;
  return {score:sc, max:9};
}

/* Performance analytics */
function cagr(start,end,years){ return Math.pow(end/start,1/years)-1; }
function treynor(returns,beta,rfAnnual,P){ P=P||252; rfAnnual=rfAnnual||0; return (mean(returns)*P-rfAnnual)/beta; }
function calmar(returns,P){ P=P||252; var dd=Math.abs(maxDrawdown(returns)); return dd===0?Infinity:(mean(returns)*P)/dd; }
function omega(returns,thr){ thr=thr||0; var up=0,dn=0; for(var i=0;i<returns.length;i++){ var d=returns[i]-thr; if(d>0) up+=d; else dn+=-d; } return dn===0?Infinity:up/dn; }
function informationRatio(returns,bench,P){ P=P||252; var diff=[]; for(var i=0;i<returns.length;i++) diff.push(returns[i]-bench[i]); return (mean(diff)/stdev(diff))*Math.sqrt(P); }
function jensenAlpha(returns,bench,beta,rfAnnual,P){ P=P||252; rfAnnual=rfAnnual||0; var rp=mean(returns)*P, rm=mean(bench)*P; return rp-(rfAnnual+beta*(rm-rfAnnual)); }

/* Rates: forward rate */
function forwardRate(z1,t1,z2,t2){ return Math.pow(Math.pow(1+z2,t2)/Math.pow(1+z1,t1),1/(t2-t1))-1; }

/* Personal finance */
function mortgage(principal,annualRate,years,perYr){
  perYr=perYr||12; var r=annualRate/perYr, n=years*perYr;
  var pay=r===0?principal/n:principal*r/(1-Math.pow(1+r,-n));
  return {payment:pay, totalPaid:pay*n, totalInterest:pay*n-principal, n:n};
}
function futureValue(pmt,annualRate,years,perYr,pv){
  perYr=perYr||12; var r=annualRate/perYr, n=years*perYr; pv=pv||0;
  var fvAnnuity=r===0?pmt*n:pmt*((Math.pow(1+r,n)-1)/r);
  return pv*Math.pow(1+r,n)+fvAnnuity;
}

Q.black76=black76; Q.garmanKohlhagen=garmanKohlhagen; Q.greeks2=greeks2;
Q.legPnL=legPnL; Q.strategyPnL=strategyPnL;
Q.altmanZ=altmanZ; Q.dupont=dupont; Q.multiples=multiples; Q.piotroskiF=piotroskiF;
Q.cagr=cagr; Q.treynor=treynor; Q.calmar=calmar; Q.omega=omega; Q.informationRatio=informationRatio; Q.jensenAlpha=jensenAlpha;
Q.forwardRate=forwardRate; Q.mortgage=mortgage; Q.futureValue=futureValue;


/* ================= MONTE CARLO ================= */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function randn(rng){ var u1=rng()||1e-12, u2=rng(); return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); }
function mcGBM(S0,mu,sig,T,paths,seed){
  var rng=seed!=null?mulberry32(seed):Math.random, t=[], i;
  for(i=0;i<paths;i++){ var z=randn(rng); t.push(S0*Math.exp((mu-0.5*sig*sig)*T+sig*Math.sqrt(T)*z)); }
  t.sort(function(a,b){return a-b;});
  function pct(p){ return t[Math.min(t.length-1,Math.floor(p*t.length))]; }
  var up=0; for(i=0;i<t.length;i++) if(t[i]>S0) up++;
  return {terminals:t, mean:mean(t), p5:pct(0.05), p25:pct(0.25), p50:pct(0.5), p75:pct(0.75), p95:pct(0.95), probUp:up/t.length, min:t[0], max:t[t.length-1]};
}
function mcOption(S0,K,T,r,q,sig,paths,isCall,seed){
  var rng=seed!=null?mulberry32(seed):Math.random, sum=0, i;
  for(i=0;i<paths;i++){ var z=randn(rng), ST=S0*Math.exp((r-q-0.5*sig*sig)*T+sig*Math.sqrt(T)*z); sum+=isCall?Math.max(ST-K,0):Math.max(K-ST,0); }
  return Math.exp(-r*T)*sum/paths;
}
Q.mcGBM=mcGBM; Q.mcOption=mcOption;

/* ================= SWAPS & CURVE ================= */
function bootstrapCurve(parRates,taus){
  // parRates: annualized par (coupon) rates per tenor; taus: year fraction of each period (e.g. all 1)
  var DF=[], zeros=[], i, j;
  for(i=0;i<parRates.length;i++){
    var c=parRates[i], sumPrev=0;
    for(j=0;j<i;j++) sumPrev+=DF[j]*taus[j];
    var df=(1-c*sumPrev)/(1+c*taus[i]);
    DF.push(df);
    var T=0; for(j=0;j<=i;j++) T+=taus[j];
    zeros.push(Math.pow(1/df,1/T)-1);
  }
  return {DF:DF, zeros:zeros};
}
function parSwapRate(DF,taus){
  var n=DF.length, ann=0; for(var i=0;i<n;i++) ann+=DF[i]*taus[i];
  return (1-DF[n-1])/ann;
}
function swapValue(notional,fixedRate,DF,taus,payFixed){
  var n=DF.length, ann=0; for(var i=0;i<n;i++) ann+=DF[i]*taus[i];
  var floatLeg=1-DF[n-1], fixedLeg=fixedRate*ann;
  var v=notional*(floatLeg-fixedLeg);
  return payFixed===false?-v:v;
}
Q.bootstrapCurve=bootstrapCurve; Q.parSwapRate=parSwapRate; Q.swapValue=swapValue;

/* ================= VOLATILITY & SIGNALS ================= */
function ewmaVol(returns,lambda,P){
  lambda=lambda==null?0.94:lambda; P=P||252;
  var v=returns[0]*returns[0];
  for(var i=1;i<returns.length;i++) v=lambda*v+(1-lambda)*returns[i]*returns[i];
  return {daily:Math.sqrt(v), annual:Math.sqrt(v)*Math.sqrt(P)};
}
function expectedMove(S,sig,days){ var m=S*sig*Math.sqrt(days/365); return {move:m, low:S-m, high:S+m, pct:m/S}; }
function zScore(series){ var mu=mean(series), sd=stdev(series); return (series[series.length-1]-mu)/sd; }
Q.ewmaVol=ewmaVol; Q.expectedMove=expectedMove; Q.zScore=zScore;


/* ================= GARCH(1,1) & BOND LADDER ================= */
function garch11(returns,alpha,beta){
  alpha=alpha==null?0.08:alpha; beta=beta==null?0.90:beta;
  var mu=mean(returns), n=returns.length, i;
  var sv=0; for(i=0;i<n;i++) sv+=(returns[i]-mu)*(returns[i]-mu); sv/=n; // population sample var = LR target
  var omega=sv*(1-alpha-beta);
  var v=sv;
  for(i=1;i<n;i++){ var e=returns[i-1]-mu; v=omega+alpha*e*e+beta*v; }
  var persist=alpha+beta;
  function fc(h){ return sv+Math.pow(persist,h)*(v-sv); }
  return { omega:omega, persistence:persist, longRunVar:sv,
    dailyVol:Math.sqrt(v), annualVol:Math.sqrt(v)*Math.sqrt(252),
    longRunVol:Math.sqrt(sv)*Math.sqrt(252),
    forecast10:Math.sqrt(fc(10))*Math.sqrt(252) };
}
function bondLadder(bonds){
  var tv=0,wd=0,dv=0,inc=0,wy=0;
  for(var i=0;i<bonds.length;i++){ var b=bonds[i], m=b.m||1;
    var a=bondAnalytics(b.face,b.coupon,b.yield,b.years,m);
    tv+=a.price; wd+=a.price*a.modified; dv+=a.dv01; inc+=b.face*b.coupon; wy+=a.price*b.yield;
  }
  return { count:bonds.length, totalValue:tv, wDuration:tv?wd/tv:0, totalDV01:dv,
    annualIncome:inc, avgYield:tv?wy/tv:0, currentYield:tv?inc/tv:0 };
}
Q.garch11=garch11; Q.bondLadder=bondLadder;


/* ================= LINEAR ALGEBRA ================= */
function matInv(A){
  var n=A.length, M=[], i, j, k;
  for(i=0;i<n;i++){ M[i]=[]; for(j=0;j<n;j++) M[i][j]=A[i][j]; for(j=0;j<n;j++) M[i][n+j]=(i===j)?1:0; }
  for(i=0;i<n;i++){
    var piv=M[i][i], pr=i;
    for(k=i+1;k<n;k++) if(Math.abs(M[k][i])>Math.abs(piv)){ piv=M[k][i]; pr=k; }
    if(Math.abs(piv)<1e-14) throw new Error('singular');
    if(pr!==i){ var tmp=M[i]; M[i]=M[pr]; M[pr]=tmp; }
    var d=M[i][i]; for(j=0;j<2*n;j++) M[i][j]/=d;
    for(k=0;k<n;k++){ if(k===i) continue; var fct=M[k][i]; for(j=0;j<2*n;j++) M[k][j]-=fct*M[i][j]; }
  }
  var inv=[]; for(i=0;i<n;i++){ inv[i]=[]; for(j=0;j<n;j++) inv[i][j]=M[i][n+j]; }
  return inv;
}
function matVec(A,v){ var n=A.length, r=[]; for(var i=0;i<n;i++){ var s=0; for(var j=0;j<v.length;j++) s+=A[i][j]*v[j]; r.push(s); } return r; }
function vdot(a,b){ var s=0; for(var i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
Q.matInv=matInv;

/* ================= MONTE CARLO PATHS (FAN) ================= */
function mcGBMPaths(S0,mu,sig,T,steps,paths,seed){
  var rng=seed!=null?mulberry32(seed):Math.random, dt=T/steps, sdt=Math.sqrt(dt);
  var cols=[]; for(var t=0;t<=steps;t++) cols.push([]);
  var samples=[], i, t;
  for(i=0;i<paths;i++){
    var S=S0, path=(i<8)?[S0]:null; cols[0].push(S0);
    for(t=1;t<=steps;t++){ S*=Math.exp((mu-0.5*sig*sig)*dt+sig*sdt*randn(rng)); cols[t].push(S); if(path) path.push(S); }
    if(path) samples.push(path);
  }
  function band(arr,p){ var a=arr.slice().sort(function(x,y){return x-y;}); return a[Math.min(a.length-1,Math.floor(p*a.length))]; }
  var p5=[],p25=[],p50=[],p75=[],p95=[],times=[];
  for(t=0;t<=steps;t++){ times.push(T*t/steps); p5.push(band(cols[t],0.05)); p25.push(band(cols[t],0.25)); p50.push(band(cols[t],0.5)); p75.push(band(cols[t],0.75)); p95.push(band(cols[t],0.95)); }
  return {times:times, p5:p5, p25:p25, p50:p50, p75:p75, p95:p95, samples:samples};
}
Q.mcGBMPaths=mcGBMPaths;

/* ================= EFFICIENT FRONTIER (N-asset) ================= */
function covFromVolCorr(vols,rho){
  var n=vols.length, S=[]; for(var i=0;i<n;i++){ S[i]=[]; for(var j=0;j<n;j++) S[i][j]=(i===j)?vols[i]*vols[i]:rho*vols[i]*vols[j]; } return S;
}
function efficientFrontier(mu,Sigma,rf){
  rf=rf||0; var n=mu.length, inv=matInv(Sigma), ones=[]; for(var i=0;i<n;i++) ones.push(1);
  var invOnes=matVec(inv,ones), invMu=matVec(inv,mu);
  var A=vdot(ones,invOnes), B=vdot(ones,invMu), C=vdot(mu,invMu), D=A*C-B*B;
  // GMV
  var wG=invOnes.map(function(x){return x/A;}), retG=B/A, volG=Math.sqrt(1/A);
  // Tangency
  var ex=mu.map(function(m){return m-rf;}), invEx=matVec(inv,ex), den=vdot(ones,invEx);
  var wT=invEx.map(function(x){return x/den;}), retT=vdot(wT,mu), volT=Math.sqrt(vdot(wT,matVec(Sigma,wT)));
  var sharpeT=(retT-rf)/volT;
  // frontier curve
  var lo=Math.min.apply(null,mu), hi=Math.max.apply(null,mu), fr=[];
  for(var k=0;k<=40;k++){ var mp=lo+(hi-lo)*k/40; var varp=(A*mp*mp-2*B*mp+C)/D; fr.push({ret:mp, vol:Math.sqrt(Math.max(varp,0))}); }
  return {gmv:{w:wG, ret:retG, vol:volG}, tangency:{w:wT, ret:retT, vol:volT, sharpe:sharpeT}, frontier:fr, A:A, B:B, C:C, D:D};
}
Q.covFromVolCorr=covFromVolCorr; Q.efficientFrontier=efficientFrontier;

Q.version='1.5';
global.QENG=Q;
if(typeof module!=='undefined'&&module.exports) module.exports=Q;
})(typeof window!=='undefined'?window:globalThis);
