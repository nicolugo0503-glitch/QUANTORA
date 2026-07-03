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


/* ================= LONG-ONLY FRONTIER ================= */
function _portVol(w,Sigma){ var n=w.length,s=0,i,j; for(i=0;i<n;i++) for(j=0;j<n;j++) s+=w[i]*w[j]*Sigma[i][j]; return Math.sqrt(Math.max(s,0)); }
function _refine(w,obj){ // hill-climb on simplex; obj(w)->higher is better
  var n=w.length, d=0.10, best=obj(w);
  for(var it=0;it<4000 && d>1e-5;it++){
    var improved=false;
    for(var i=0;i<n;i++) for(var j=0;j<n;j++){ if(i===j||w[i]<d) continue;
      var t=w.slice(); t[i]-=d; t[j]+=d; var o=obj(t); if(o>best){ best=o; w=t; improved=true; } }
    if(!improved) d*=0.5;
  }
  return w;
}
function efficientFrontierLO(mu,Sigma,rf,opts){
  opts=opts||{}; var n=mu.length, N=opts.samples||16000, rng=opts.seed!=null?mulberry32(opts.seed):Math.random, i,k;
  var pts=[], gmv=null, tan=null;
  for(k=0;k<N;k++){
    var w=[],sw=0; for(i=0;i<n;i++){ var x=-Math.log(rng()||1e-12); w.push(x); sw+=x; }
    for(i=0;i<n;i++) w[i]/=sw;
    var ret=0; for(i=0;i<n;i++) ret+=w[i]*mu[i]; var vol=_portVol(w,Sigma); var sh=(ret-rf)/vol;
    pts.push({ret:ret,vol:vol});
    if(!gmv||vol<gmv.vol) gmv={w:w,ret:ret,vol:vol};
    if(!tan||sh>tan.sharpe) tan={w:w,ret:ret,vol:vol,sharpe:sh};
  }
  // refine
  var gw=_refine(gmv.w.slice(),function(w){ return -_portVol(w,Sigma); });
  var gret=0; for(i=0;i<n;i++) gret+=gw[i]*mu[i]; gmv={w:gw,ret:gret,vol:_portVol(gw,Sigma)};
  var tw=_refine(tan.w.slice(),function(w){ var r=0;for(var z=0;z<n;z++) r+=w[z]*mu[z]; var v=_portVol(w,Sigma); return (r-rf)/v; });
  var tret=0; for(i=0;i<n;i++) tret+=tw[i]*mu[i]; var tvol=_portVol(tw,Sigma); tan={w:tw,ret:tret,vol:tvol,sharpe:(tret-rf)/tvol};
  // frontier: min vol per return bin
  var lo=Math.min.apply(null,mu), hi=Math.max.apply(null,mu), K=28, bins=new Array(K).fill(null);
  for(i=0;i<pts.length;i++){ var b=Math.min(K-1,Math.max(0,Math.floor((pts[i].ret-lo)/(hi-lo)*K))); if(!bins[b]||pts[i].vol<bins[b].vol) bins[b]=pts[i]; }
  var fr=bins.filter(function(x){return x;}).sort(function(a,b){return a.ret-b.ret;});
  return {gmv:gmv, tangency:tan, frontier:fr, cloud:pts};
}
Q.efficientFrontierLO=efficientFrontierLO;

/* ================= GARCH FORECAST PATH ================= */
function garchPath(returns,alpha,beta,horizon){
  alpha=alpha==null?0.08:alpha; beta=beta==null?0.90:beta; horizon=horizon||60;
  var mu=mean(returns), n=returns.length, i, sv=0;
  for(i=0;i<n;i++) sv+=(returns[i]-mu)*(returns[i]-mu); sv/=n;
  var omega=sv*(1-alpha-beta), v=sv;
  for(i=1;i<n;i++){ var e=returns[i-1]-mu; v=omega+alpha*e*e+beta*v; }
  var pers=alpha+beta, vols=[];
  for(var h=0;h<=horizon;h++){ var vh=sv+Math.pow(pers,h)*(v-sv); vols.push(Math.sqrt(Math.max(vh,0))*Math.sqrt(252)); }
  return {vols:vols, current:vols[0], longRun:Math.sqrt(sv)*Math.sqrt(252), persistence:pers};
}
Q.garchPath=garchPath;

/* ================= VOL SURFACE (parametric) ================= */
function skewCurve(atmVol,skew,curv,moneyness){ return moneyness.map(function(k){ return atmVol - skew*k + curv*k*k; }); }
function termCurve(shortVol,longVol,lambda,maturities){ return maturities.map(function(T){ return longVol+(shortVol-longVol)*Math.exp(-lambda*T); }); }
Q.skewCurve=skewCurve; Q.termCurve=termCurve;

/* ================= VaR BACKTEST (Kupiec POF) ================= */
function varBacktest(returns,conf,window){
  conf=conf||0.95; window=window||100; var breaches=0, n=0, i;
  for(i=window;i<returns.length;i++){ var hist=returns.slice(i-window,i); var v=histVaR(hist,conf); if(returns[i]<-v) breaches++; n++; }
  var p=1-conf, x=breaches, phat=n?x/n:0;
  var LR=0;
  if(n>0 && x>0 && x<n){ LR=-2*((n-x)*Math.log(1-p)+x*Math.log(p)-((n-x)*Math.log(1-phat)+x*Math.log(phat))); }
  else if(n>0 && x===0){ LR=-2*(n*Math.log(1-p)); }
  return {observations:n, breaches:x, breachRate:phat, expected:p, kupiecLR:LR, pass:LR<3.841};
}
Q.varBacktest=varBacktest;


/* ================= STRESS / SCENARIO ================= */
function stressTest(positions,scen){
  var pnl=0,total=0,byClass={};
  for(var i=0;i<positions.length;i++){ var p=positions[i], r=(scen[p.cls]!=null?scen[p.cls]:0); var d=p.value*r; pnl+=d; total+=p.value; byClass[p.cls]=(byClass[p.cls]||0)+d; }
  return {pnl:pnl, total:total, pnlPct:total?pnl/total:0, byClass:byClass};
}
Q.stressTest=stressTest;

/* ================= CORRELATION MATRIX ================= */
function corrMatrix(series){
  var n=series.length, M=[], i, j;
  for(i=0;i<n;i++){ M[i]=[]; for(j=0;j<n;j++){ M[i][j]= i===j?1:correlation(series[i],series[j]); } }
  return M;
}
Q.corrMatrix=corrMatrix;


/* ================= TECHNICAL STUDIES ================= */
function sma(arr,n){ var r=[]; for(var i=0;i<arr.length;i++){ if(i<n-1){ r.push(null); continue; } var s=0; for(var j=i-n+1;j<=i;j++) s+=arr[j]; r.push(s/n); } return r; }
function ema(arr,n){ var k=2/(n+1), r=[arr[0]]; for(var i=1;i<arr.length;i++) r.push(arr[i]*k+r[i-1]*(1-k)); return r; }
function rsi(arr,n){ n=n||14; if(arr.length<n+1) return null; var g=0,l=0,i;
  for(i=1;i<=n;i++){ var d=arr[i]-arr[i-1]; if(d>=0) g+=d; else l-=d; } g/=n; l/=n;
  for(i=n+1;i<arr.length;i++){ var d2=arr[i]-arr[i-1]; var up=d2>0?d2:0, dn=d2<0?-d2:0; g=(g*(n-1)+up)/n; l=(l*(n-1)+dn)/n; }
  if(l===0) return 100; var rs=g/l; return 100-100/(1+rs);
}
function macd(arr,fast,slow,sig){ fast=fast||12; slow=slow||26; sig=sig||9;
  var ef=ema(arr,fast), es=ema(arr,slow), line=arr.map(function(_,i){return ef[i]-es[i];});
  var sgn=ema(line,sig); var i=arr.length-1; return {macd:line[i], signal:sgn[i], hist:line[i]-sgn[i]};
}
function bollinger(arr,n,k){ n=n||20; k=k||2; if(arr.length<n) return null; var last=arr.slice(arr.length-n); var m=mean(last), sd=0; for(var i=0;i<last.length;i++) sd+=(last[i]-m)*(last[i]-m); sd=Math.sqrt(sd/n); return {mid:m, upper:m+k*sd, lower:m-k*sd, sd:sd}; }
Q.sma=sma; Q.ema=ema; Q.rsi=rsi; Q.macd=macd; Q.bollinger=bollinger;

/* ================= OLS MULTI-FACTOR REGRESSION ================= */
function ols(y,X){ // X: array of rows, each row = factor values (no intercept)
  var n=y.length, k=X[0].length, i, j, c;
  var D=[]; for(i=0;i<n;i++){ D.push([1].concat(X[i])); }
  var p=k+1, DtD=[], Dty=[];
  for(i=0;i<p;i++){ DtD[i]=[]; for(j=0;j<p;j++){ var s=0; for(c=0;c<n;c++) s+=D[c][i]*D[c][j]; DtD[i][j]=s; } var sy=0; for(c=0;c<n;c++) sy+=D[c][i]*y[c]; Dty[i]=sy; }
  var inv=matInv(DtD), beta=matVec(inv,Dty);
  var ybar=mean(y), ssr=0, sst=0;
  for(c=0;c<n;c++){ var fit=0; for(i=0;i<p;i++) fit+=D[c][i]*beta[i]; ssr+=(y[c]-fit)*(y[c]-fit); sst+=(y[c]-ybar)*(y[c]-ybar); }
  return {alpha:beta[0], betas:beta.slice(1), r2:sst?1-ssr/sst:0, resStd:Math.sqrt(ssr/Math.max(1,n-p))};
}
Q.ols=ols;

/* ================= DISTRIBUTION STATS ================= */
function _moment(a,p){ var m=mean(a),s=0; for(var i=0;i<a.length;i++) s+=Math.pow(a[i]-m,p); return s/a.length; }
function skewness(a){ var m2=_moment(a,2); return _moment(a,3)/Math.pow(m2,1.5); }
function kurtosis(a){ var m2=_moment(a,2); return _moment(a,4)/(m2*m2)-3; }
function jarqueBera(a){ var S=skewness(a), K=kurtosis(a), n=a.length; return n/6*(S*S+K*K/4); }
Q.skewness=skewness; Q.kurtosis=kurtosis; Q.jarqueBera=jarqueBera;

/* ================= PERFORMANCE EXTRAS ================= */
function ulcerIndex(returns){ var eq=1,peak=1,s=0,n=returns.length; for(var i=0;i<n;i++){ eq*=1+returns[i]; if(eq>peak) peak=eq; var dd=(eq/peak-1)*100; s+=dd*dd; } return Math.sqrt(s/n); }
function gainToPain(returns){ var g=0,p=0; for(var i=0;i<returns.length;i++){ g+=returns[i]; if(returns[i]<0) p-=returns[i]; } return p===0?Infinity:g/p; }
function tailRatio(returns){ var s=returns.slice().sort(function(a,b){return a-b;}); function q(pp){ return s[Math.min(s.length-1,Math.floor(pp*s.length))]; } var lo=Math.abs(q(0.05)); return lo===0?Infinity:Math.abs(q(0.95))/lo; }
Q.ulcerIndex=ulcerIndex; Q.gainToPain=gainToPain; Q.tailRatio=tailRatio;

/* ================= DIGITAL OPTION + CARRY ================= */
function digitalOption(S,K,T,r,q,sig,isCall,payout){ payout=payout==null?1:payout; var d2=bsm(S,K,T,r,q,sig).d2; return payout*Math.exp(-r*T)*(isCall?normCdf(d2):normCdf(-d2)); }
function futureFair(spot,r,q,T){ return spot*Math.exp((r-q)*T); }
function forwardFX(spot,rd,rf,T){ return spot*Math.exp((rd-rf)*T); }
Q.digitalOption=digitalOption; Q.futureFair=futureFair; Q.forwardFX=forwardFX;


/* ================= BACKTESTER ================= */
function portfolioReturns(series,weights){
  var n=Math.min.apply(null,series.map(function(s){return s.length;})), out=[], t, i;
  for(t=0;t<n;t++){ var r=0; for(i=0;i<series.length;i++) r+=(weights[i]||0)*series[i][t]; out.push(r); }
  return out;
}
function backtest(returns,P){
  P=P||252; var eq=[1], dd=[0], peak=1, i;
  for(i=0;i<returns.length;i++){ var v=eq[eq.length-1]*(1+returns[i]); eq.push(v); if(v>peak) peak=v; dd.push(v/peak-1); }
  var vol=stdev(returns)*Math.sqrt(P), annRet=mean(returns)*P;
  return {equity:eq, drawdown:dd, totalReturn:eq[eq.length-1]-1, annReturn:annRet, vol:vol, sharpe:vol?annRet/vol:0, maxDD:Math.min.apply(null,dd)};
}
Q.portfolioReturns=portfolioReturns; Q.backtest=backtest;

/* ================= FRAUD / BANKRUPTCY ================= */
function beneishM(d){
  var M=-4.84+0.92*d.DSRI+0.528*d.GMI+0.404*d.AQI+0.892*d.SGI+0.115*d.DEPI-0.172*d.SGAI+4.679*d.TATA-0.327*d.LVGI;
  return {m:M, flag:M>-1.78};
}
function ohlsonO(TA,TL,WC,CL,CA,NI,FFO,niPrev,gnp){
  gnp=gnp||1;
  var X=TL>TA?1:0, Y=(NI<0&&niPrev<0)?1:0, chg=(NI-niPrev)/(Math.abs(NI)+Math.abs(niPrev)||1);
  var o=-1.32-0.407*Math.log(TA/gnp)+6.03*(TL/TA)-1.43*(WC/TA)+0.0757*(CL/CA)-1.72*X-2.37*(NI/TA)-1.83*(FFO/TL)+0.285*Y-0.521*chg;
  return {o:o, prob:1/(1+Math.exp(-o)), flag:o>0.5};
}
Q.beneishM=beneishM; Q.ohlsonO=ohlsonO;

/* ================= PROBABILISTIC SHARPE ================= */
function probabilisticSharpe(returns,srStar){
  srStar=srStar||0; var sr=mean(returns)/stdev(returns), n=returns.length;
  var sk=skewness(returns), ku=kurtosis(returns)+3;
  var denom=Math.sqrt(1-sk*sr+(ku-1)/4*sr*sr);
  return {sr:sr, psr:normCdf((sr-srStar)*Math.sqrt(n-1)/denom)};
}
Q.probabilisticSharpe=probabilisticSharpe;


/* ================= MATRIX HELPERS ================= */
function matMul(A,B){ var n=A.length,m=B[0].length,p=B.length,R=[],i,j,k; for(i=0;i<n;i++){ R[i]=[]; for(j=0;j<m;j++){ var sm=0; for(k=0;k<p;k++) sm+=A[i][k]*B[k][j]; R[i][j]=sm; } } return R; }
function matT(A){ var n=A.length,m=A[0].length,R=[],i,j; for(j=0;j<m;j++){ R[j]=[]; for(i=0;i<n;i++) R[j][i]=A[i][j]; } return R; }
function matScale(A,s){ return A.map(function(r){return r.map(function(x){return x*s;});}); }

/* ================= SORTINO/CALMAR-OPTIMIZED ALLOCATION ================= */
function optimizeAllocation(series,objective,P,opts){
  opts=opts||{}; objective=objective||'sortino'; P=P||252; var n=series.length, N=opts.samples||16000, rng=opts.seed!=null?mulberry32(opts.seed):Math.random, i,k;
  function ratio(w){ var pr=portfolioReturns(series,w); var r; if(objective==='calmar') r=calmar(pr,P); else if(objective==='sharpe') r=sharpe(pr,0,P); else if(objective==='omega') r=omega(pr,0); else r=sortino(pr,0,P); if(!isFinite(r)) r=1e6+mean(pr)*1e6; return r; }
  var best=null,bw=null;
  for(k=0;k<N;k++){ var w=[],sw=0; for(i=0;i<n;i++){ var x=-Math.log(rng()||1e-12); w.push(x); sw+=x; } for(i=0;i<n;i++) w[i]/=sw; var r=ratio(w); if(!isNaN(r)&&(best===null||r>best)){ best=r; bw=w; } }
  if(!bw){ bw=series.map(function(){return 1/n;}); }
  bw=_refine(bw.slice(),function(w){ var r=ratio(w); return isFinite(r)?r:-1e9; });
  var pr=portfolioReturns(series,bw);
  return {weights:bw, sortino:sortino(pr,0,P), calmar:calmar(pr,P), sharpe:sharpe(pr,0,P), objective:objective};
}
Q.optimizeAllocation=optimizeAllocation;

/* ================= SPOT-CURVE BOND PRICING + Z-SPREAD ================= */
function bondPriceFromCurve(face,coupon,n,zeros){ var c=face*coupon, p=0; for(var t=1;t<=n;t++){ var cf=c+(t===n?face:0); p+=cf/Math.pow(1+zeros[t-1],t); } return p; }
function zSpread(face,coupon,n,zeros,mktPrice){
  var c=face*coupon;
  function pv(z){ var p=0; for(var t=1;t<=n;t++){ var cf=c+(t===n?face:0); p+=cf/Math.pow(1+zeros[t-1]+z,t); } return p; }
  var a=-0.2,b=0.5;
  for(var i=0;i<200;i++){ var m=(a+b)/2; if(pv(m)>mktPrice) a=m; else b=m; if(b-a<1e-10) break; }
  return (a+b)/2;
}
Q.bondPriceFromCurve=bondPriceFromCurve; Q.zSpread=zSpread;

/* ================= BLACK-LITTERMAN ================= */
function blackLitterman(wMkt,Sigma,lambda,views,tau){
  tau=tau||0.05; var n=wMkt.length, i, k;
  var Pi=matVec(matScale(Sigma,lambda),wMkt); // equilibrium excess returns
  if(!views||!views.length){ return {equilibrium:Pi, posterior:Pi.slice(), weights:wMkt.slice()}; }
  var m=views.length, Pm=[], Q=[], omega=[];
  for(k=0;k<m;k++){ var row=new Array(n).fill(0); row[views[k].asset]=1; Pm.push(row); Q.push(views[k].ret);
    var pv=0; for(i=0;i<n;i++) for(var j=0;j<n;j++) pv+=row[i]*tau*Sigma[i][j]*row[j];
    var conf=Math.min(0.999,Math.max(0.001,views[k].confidence||0.5));
    omega.push((1/conf-1)*pv+1e-9);
  }
  var tauSig=matScale(Sigma,tau), invTauSig=matInv(tauSig);
  var Pt=matT(Pm);
  // Pt * invOmega * P  and Pt*invOmega*Q
  var PtOmP=[]; for(i=0;i<n;i++){ PtOmP[i]=[]; for(var j2=0;j2<n;j2++){ var sm=0; for(k=0;k<m;k++) sm+=Pt[i][k]*(1/omega[k])*Pm[k][j2]; PtOmP[i][j2]=sm; } }
  var A=invTauSig.map(function(r,i2){return r.map(function(x,j3){return x+PtOmP[i2][j3];});});
  var invTauSigPi=matVec(invTauSig,Pi);
  var PtOmQ=new Array(n).fill(0); for(i=0;i<n;i++){ var sm=0; for(k=0;k<m;k++) sm+=Pt[i][k]*(1/omega[k])*Q[k]; PtOmQ[i]=sm; }
  var bvec=invTauSigPi.map(function(x,i2){return x+PtOmQ[i2];});
  var post=matVec(matInv(A),bvec);
  var wStar=matVec(matInv(matScale(Sigma,lambda)),post);
  return {equilibrium:Pi, posterior:post, weights:wStar};
}
Q.blackLitterman=blackLitterman;

/* ================= VALUE/MOMENTUM FACTOR SCORING ================= */
function crossZ(vals){ var m=mean(vals), sd=stdev(vals)||1; return vals.map(function(v){return (v-m)/sd;}); }
function factorRank(assets,wValue,wMom){ wValue=wValue==null?0.5:wValue; wMom=wMom==null?0.5:wMom;
  var zv=crossZ(assets.map(function(a){return a.value;})), zm=crossZ(assets.map(function(a){return a.momentum;}));
  var out=assets.map(function(a,i){ return {name:a.name, value:a.value, momentum:a.momentum, zValue:zv[i], zMom:zm[i], score:wValue*zv[i]+wMom*zm[i]}; });
  out.sort(function(a,b){return b.score-a.score;});
  return out;
}
Q.crossZ=crossZ; Q.factorRank=factorRank;


/* ================= LONG-ONLY BLACK-LITTERMAN ================= */
function blackLittermanLO(wMkt,Sigma,lambda,views,tau,rf){
  rf=rf||0; var bl=blackLitterman(wMkt,Sigma,lambda,views,tau), mu=bl.posterior, n=mu.length;
  function sh(w){ var r=0,i; for(i=0;i<n;i++) r+=w[i]*mu[i]; var v=_portVol(w,Sigma); return v?(r-rf)/v:-1e9; }
  var best=null,bw=null,rng=mulberry32(123),i,k;
  for(k=0;k<14000;k++){ var w=[],sw=0; for(i=0;i<n;i++){ var x=-Math.log(rng()||1e-12); w.push(x); sw+=x; } for(i=0;i<n;i++) w[i]/=sw; var r=sh(w); if(best===null||r>best){ best=r; bw=w; } }
  bw=_refine(bw.slice(),sh);
  return {posterior:mu, equilibrium:bl.equilibrium, weights:bw};
}
Q.blackLittermanLO=blackLittermanLO;

/* ================= SCENARIO-WEIGHTED VaR ================= */
function scenarioVaR(scenarios,conf){
  conf=conf||0.95; var tp=0,i; for(i=0;i<scenarios.length;i++) tp+=scenarios[i].prob;
  var sc=scenarios.map(function(s){return {prob:s.prob/tp, pnl:s.pnl};}).sort(function(a,b){return a.pnl-b.pnl;});
  var exp=0; for(i=0;i<sc.length;i++) exp+=sc[i].prob*sc[i].pnl;
  var alpha=1-conf, cum=0, varv=-sc[sc.length-1].pnl, esNum=0, esDen=0;
  for(i=0;i<sc.length;i++){ cum+=sc[i].prob; if(cum>=alpha && varv===-sc[sc.length-1].pnl){ varv=-sc[i].pnl; } }
  // ES: prob-weighted mean of losses in the worst alpha mass
  var need=alpha, j=0;
  while(need>1e-12 && j<sc.length){ var take=Math.min(sc[j].prob,need); esNum+=take*sc[j].pnl; esDen+=take; need-=take; j++; }
  return {expected:exp, var:varv, es:esDen? -esNum/esDen : varv, worst:sc[0].pnl};
}
Q.scenarioVaR=scenarioVaR;

/* ================= VOL SURFACE GRID ================= */
function volSurfaceGrid(skew,curv,shortVol,longVol,lambda,moneyness,mats){
  var grid=[]; for(var i=0;i<mats.length;i++){ var level=longVol+(shortVol-longVol)*Math.exp(-lambda*mats[i]); var row=[]; for(var j=0;j<moneyness.length;j++){ var k=moneyness[j]; row.push(level - skew*k + curv*k*k); } grid.push(row); } return grid;
}
Q.volSurfaceGrid=volSurfaceGrid;


/* ================= KEY-RATE DURATIONS ================= */
function keyRateDuration(face,coupon,n,zeros,bump){
  bump=bump||0.0001;
  var base=bondPriceFromCurve(face,coupon,n,zeros), out=[];
  for(var t=0;t<n;t++){
    var up=zeros.slice(); up[t]+=bump; var dn=zeros.slice(); dn[t]-=bump;
    var krd=-(bondPriceFromCurve(face,coupon,n,up)-bondPriceFromCurve(face,coupon,n,dn))/(2*base*bump);
    out.push({tenor:t+1, krd:krd});
  }
  return {base:base, krd:out, total:out.reduce(function(a,b){return a+b.krd;},0)};
}
Q.keyRateDuration=keyRateDuration;

/* ================= ROLLING SHARPE ================= */
function rollingSharpe(returns,window,P){
  window=window||12; P=P||12; var out=[];
  for(var i=window;i<=returns.length;i++){ var seg=returns.slice(i-window,i); out.push({i:i, sharpe:sharpe(seg,0,P)}); }
  return out;
}
Q.rollingSharpe=rollingSharpe;

/* ================= M2 (MODIGLIANI) + CAPTURE + HIT RATE ================= */
function m2(returns,bench,rfA,P){ rfA=rfA||0; P=P||12; var srp=(mean(returns)*P-rfA)/(stdev(returns)*Math.sqrt(P)); var sb=stdev(bench)*Math.sqrt(P); return rfA+srp*sb; }
function captureRatios(returns,bench){
  var upP=0,upB=0,dnP=0,dnB=0,nu=0,nd=0;
  for(var i=0;i<bench.length;i++){ if(bench[i]>0){ upP+=returns[i]; upB+=bench[i]; nu++; } else if(bench[i]<0){ dnP+=returns[i]; dnB+=bench[i]; nd++; } }
  return { up: upB!==0?(upP/nu)/(upB/nu):0, down: dnB!==0?(dnP/nd)/(dnB/nd):0 };
}
function hitRate(returns){ var w=0; for(var i=0;i<returns.length;i++) if(returns[i]>0) w++; return w/returns.length; }
Q.m2=m2; Q.captureRatios=captureRatios; Q.hitRate=hitRate;


/* ================= RISK PARITY + MAX DIVERSIFICATION ================= */
function riskParity(vols,corr){
  var n=vols.length, Sig=covFromVolCorr(vols,corr), i;
  var inv=vols.map(function(v){return 1/v;}), si=inv.reduce(function(a,b){return a+b;},0);
  var naive=inv.map(function(x){return x/si;});
  var w=new Array(n).fill(1/n);
  for(var it=0;it<3000;it++){
    var Sw=matVec(Sig,w), rc=w.map(function(wi,i2){return wi*Sw[i2];});
    var tot=rc.reduce(function(a,b){return a+b;},0), tgt=tot/n;
    var nw=w.map(function(wi,i2){return wi*Math.sqrt(tgt/(rc[i2]||1e-12));});
    var ns=nw.reduce(function(a,b){return a+b;},0); nw=nw.map(function(x){return x/ns;});
    var diff=0; for(i=0;i<n;i++) diff+=Math.abs(nw[i]-w[i]); w=nw; if(diff<1e-12) break;
  }
  return {naive:naive, erc:w};
}
function maxDiversification(vols,corr,opts){
  opts=opts||{}; var n=vols.length, Sig=covFromVolCorr(vols,corr), rng=mulberry32(opts.seed||7), i,k;
  function dr(w){ var num=0; for(i=0;i<n;i++) num+=w[i]*vols[i]; var pv=_portVol(w,Sig); return pv?num/pv:0; }
  var best=null,bw=null;
  for(k=0;k<12000;k++){ var w=[],sw=0; for(i=0;i<n;i++){var x=-Math.log(rng()||1e-12);w.push(x);sw+=x;} for(i=0;i<n;i++)w[i]/=sw; var d=dr(w); if(best===null||d>best){best=d;bw=w;} }
  bw=_refine(bw.slice(),dr);
  return {weights:bw, diversificationRatio:dr(bw)};
}
Q.riskParity=riskParity; Q.maxDiversification=maxDiversification;

/* ================= TREYNOR-BLACK + FUNDAMENTAL LAW ================= */
function treynorBlack(assets){
  var raw=assets.map(function(a){return a.alpha/a.resVar;}), s=raw.reduce(function(a,b){return a+b;},0);
  var w=raw.map(function(x){return x/s;}), ir2=0;
  for(var i=0;i<assets.length;i++) ir2+=assets[i].alpha*assets[i].alpha/assets[i].resVar;
  return {weights:w, infoRatio:Math.sqrt(ir2)};
}
function fundamentalLaw(ic,breadth,tc){ tc=tc==null?1:tc; return ic*Math.sqrt(breadth)*tc; }
Q.treynorBlack=treynorBlack; Q.fundamentalLaw=fundamentalLaw;

/* ================= DRAWDOWN ANALYTICS ================= */
function drawdownAnalytics(returns){
  var eq=1,peak=1,maxDD=0,uw=0,maxUW=0,i;
  for(i=0;i<returns.length;i++){ eq*=1+returns[i]; if(eq>=peak){peak=eq;uw=0;} else {uw++; var dd=eq/peak-1; if(dd<maxDD)maxDD=dd; if(uw>maxUW)maxUW=uw;} }
  return {maxDD:maxDD, longestUnderwater:maxUW, currentDD:eq/peak-1};
}
Q.drawdownAnalytics=drawdownAnalytics;


/* ================= SWAPTION (Black-76) + CDaR + STARR ================= */
function swaptionBlack76(forwardSwapRate,strike,vol,T,annuity,payer){
  var b=black76(forwardSwapRate,strike,T,0,vol);
  return (payer===false? b.put : b.call)*annuity;
}
function cdar(returns,conf){
  conf=conf||0.95; var eq=1,peak=1,depths=[],i;
  for(i=0;i<returns.length;i++){ eq*=1+returns[i]; if(eq>peak) peak=eq; depths.push(Math.max(0,1-eq/peak)); }
  depths.sort(function(a,b){return b-a;}); var m=Math.max(1,Math.ceil((1-conf)*depths.length)), sum=0;
  for(i=0;i<m;i++) sum+=depths[i];
  return {cdar:sum/m, maxDD:depths[0]};
}
function starr(returns,conf){ conf=conf||0.95; var cv=histCVaR(returns,conf); return cv!==0? mean(returns)/cv : Infinity; }
Q.swaptionBlack76=swaptionBlack76; Q.cdar=cdar; Q.starr=starr;


/* ================= MARTIN / PAIN RATIOS ================= */
function painIndex(returns){ var eq=1,peak=1,s=0,n=returns.length; for(var i=0;i<n;i++){ eq*=1+returns[i]; if(eq>peak) peak=eq; s+=Math.max(0,(1-eq/peak)*100); } return s/n; }
function martinRatio(returns,P){ P=P||252; var ui=ulcerIndex(returns); return ui? (mean(returns)*P*100)/ui : Infinity; }
Q.painIndex=painIndex; Q.martinRatio=martinRatio;


/* ================= BURKE RATIO + DOWNSIDE DEVIATION ================= */
function downsideDeviation(returns,mar,P){ mar=mar||0; P=P||252; var ss=0; for(var i=0;i<returns.length;i++){ var d=Math.min(returns[i]-mar,0); ss+=d*d; } return Math.sqrt(ss/returns.length)*Math.sqrt(P); }
function burkeRatio(returns,P){ P=P||252; var eq=1,peak=1,ss=0; for(var i=0;i<returns.length;i++){ eq*=1+returns[i]; if(eq>peak) peak=eq; var dd=eq/peak-1; ss+=dd*dd; } var denom=Math.sqrt(ss); return denom? (mean(returns)*P)/denom : Infinity; }
Q.downsideDeviation=downsideDeviation; Q.burkeRatio=burkeRatio;


/* ================= STERLING RATIO ================= */
function sterlingRatio(returns,P){ P=P||252; var mdd=Math.abs(maxDrawdown(returns)); return (mean(returns)*P)/(mdd+0.10); }
Q.sterlingRatio=sterlingRatio;


/* ================= RATES & FIXED-INCOME SUITE (v2.8) ================= */
/* Zero-curve bootstrap from annual par-coupon bonds (price=100). tenors in years (1,2,3..), pars as decimals. */
function bootstrapZero(tenors, pars){
  var n=tenors.length, dfs=[], zeros=[], i, k;
  for(i=0;i<n;i++){
    var c=pars[i]*100, sum=0;
    for(k=0;k<i;k++) sum+=dfs[k];
    var df=(100 - c*sum)/(100 + c);
    dfs.push(df);
    zeros.push(Math.pow(1/df, 1/tenors[i]) - 1);
  }
  return { tenors:tenors, dfs:dfs, zeros:zeros };
}
Q.bootstrapZero=bootstrapZero;
/* Continuous-in-annual-comp forward rate between two zero rates */
function forwardRate(z1,t1,z2,t2){ return Math.pow(Math.pow(1+z2,t2)/Math.pow(1+z1,t1), 1/(t2-t1)) - 1; }
Q.forwardRate=forwardRate;
/* Par swap rate & PV01 from discount factors and accrual fractions (default annual taus=1) */
function parSwapRate(dfs, taus){ var n=dfs.length, ann=0, i; for(i=0;i<n;i++) ann+= (taus?taus[i]:1)*dfs[i]; return { parRate:(1-dfs[n-1])/ann, annuity:ann, pv01:ann/10000 }; }
Q.parSwapRate=parSwapRate;
/* Z-spread: constant spread over the zero curve that reprices cashflows to a market price */
function zSpread(times, cfs, zeros, price){
  function pv(s){ var v=0,i; for(i=0;i<times.length;i++) v+=cfs[i]/Math.pow(1+zeros[i]+s, times[i]); return v; }
  var lo=-0.05, hi=0.5, mid, f;
  for(var it=0; it<200; it++){ mid=(lo+hi)/2; f=pv(mid)-price; if(Math.abs(f)<1e-8) break; if(f>0) lo=mid; else hi=mid; }
  return mid;
}
Q.zSpread=zSpread;
/* Nelson-Siegel-Svensson yield at maturity t */
function svensson(t,b0,b1,b2,b3,tau1,tau2){
  var a=t/tau1, b=t/tau2;
  var f1=(1-Math.exp(-a))/a;
  var f2=f1-Math.exp(-a);
  var f3=(1-Math.exp(-b))/b - Math.exp(-b);
  return b0 + b1*f1 + b2*f2 + b3*f3;
}
Q.svensson=svensson;
/* Inflation breakeven (Fisher-exact) */
function breakeven(nominal, real){ return (1+nominal)/(1+real) - 1; }
Q.breakeven=breakeven;


/* ================= MONTE CARLO & EXPECTED MOVE (v2.9) ================= */
function _gauss(){ var u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
/* Monte Carlo wealth projection (monthly GBM steps + periodic contributions) */
function mcWealth(o){
  var S0=o.start||0, mu=o.mu||0.07, sig=o.sigma||0.15, yrs=o.years||30, contrib=(o.contribAnnual||0)/12, n=o.paths||2000, m=Math.max(1,Math.round(yrs*12));
  var dt=1/12, drift=(mu-0.5*sig*sig)*dt, vol=sig*Math.sqrt(dt);
  var cols=[]; for(var t=0;t<=m;t++) cols.push(new Float64Array(n));
  for(var pi=0;pi<n;pi++){ var v=S0; cols[0][pi]=v; for(var t=1;t<=m;t++){ v=v*Math.exp(drift+vol*_gauss())+contrib; if(v<0)v=0; cols[t][pi]=v; } }
  function pct(arr,q){ var a=Array.prototype.slice.call(arr).sort(function(x,y){return x-y;}); return a[Math.min(a.length-1,Math.max(0,Math.round(q*(a.length-1))))]; }
  var times=[],p5=[],p25=[],p50=[],p75=[],p95=[];
  for(var t=0;t<=m;t++){ times.push(t/12); var c=cols[t]; p5.push(pct(c,.05));p25.push(pct(c,.25));p50.push(pct(c,.5));p75.push(pct(c,.75));p95.push(pct(c,.95)); }
  var term=cols[m], sum=0; for(var i=0;i<n;i++) sum+=term[i];
  var probGoal=null; if(o.goal){ var cnt=0; for(i=0;i<n;i++) if(term[i]>=o.goal) cnt++; probGoal=cnt/n; }
  var invested=S0 + contrib*12*yrs;
  return { times:times, p5:p5, p25:p25, p50:p50, p75:p75, p95:p95, median:pct(term,.5), mean:sum/n, p10:pct(term,.10), p90:pct(term,.90), probGoal:probGoal, invested:invested, paths:n };
}
Q.mcWealth=mcWealth;
/* Expected move ($) and lognormal probability-cone bounds for a horizon in days */
function expectedMove(S,sigma,days){ return S*sigma*Math.sqrt(days/365); }
Q.expectedMove=expectedMove;
function probCone(S,sigma,days,z){ z=z||1; var t=Math.sqrt(days/365); return { up:S*Math.exp(z*sigma*t), down:S*Math.exp(-z*sigma*t) }; }
Q.probCone=probCone;


/* ================= DRAWDOWN & ROLLING ANALYTICS (v3.0) ================= */
/* Drawdown series (decimal, <=0) from a returns array */
function drawdownSeries(returns){ var eq=1,peak=1,out=[],i; for(i=0;i<returns.length;i++){ eq*=(1+returns[i]); if(eq>peak)peak=eq; out.push(eq/peak-1); } return out; }
Q.drawdownSeries=drawdownSeries;
/* Ulcer Index: RMS of percentage drawdowns */
function ulcerIndex(returns){ var dd=drawdownSeries(returns),s=0,i; for(i=0;i<dd.length;i++){ var d=dd[i]*100; s+=d*d; } return dd.length?Math.sqrt(s/dd.length):0; }
Q.ulcerIndex=ulcerIndex;
/* Calmar ratio: annualized return / |max drawdown| */
function calmar(returns,P){ P=P||252; var m=0; for(var i=0;i<returns.length;i++)m+=returns[i]; var ann=(m/returns.length)*P; var mdd=Math.abs(maxDrawdown(returns))||1e-9; return ann/mdd; }
Q.calmar=calmar;
/* Rolling annualized Sharpe over a window (nulls until first full window) */
function rollingSharpe(returns,win,P){ P=P||252; win=win||63; var out=[],i,j; for(i=0;i<returns.length;i++){ if(i<win-1){ out.push(null); continue; } var m=0; for(j=i-win+1;j<=i;j++)m+=returns[j]; m/=win; var v=0; for(j=i-win+1;j<=i;j++){ var d=returns[j]-m; v+=d*d; } var sd=Math.sqrt(v/(win-1)); out.push(sd>0?(m/sd)*Math.sqrt(P):0); } return out; }
Q.rollingSharpe=rollingSharpe;
/* Up/down capture vs benchmark (aligned arrays) */
function captureRatios(asset,mkt){ var up=0,um=0,dn=0,dm=0,i,n=Math.min(asset.length,mkt.length); for(i=0;i<n;i++){ if(mkt[i]>0){up+=asset[i];um+=mkt[i];} else if(mkt[i]<0){dn+=asset[i];dm+=mkt[i];} } return { up:um?(up/um):null, down:dm?(dn/dm):null }; }
Q.captureRatios=captureRatios;


/* ================= HIGHER-ORDER GREEKS (v3.1) ================= */
/* vanna, charm (delta decay), vomma (volga) - all per year; charm/day = /365 */
function greeksX(S,K,T,r,q,sig){
  if(T<=0||sig<=0) return {vanna:0,charmCall:0,charmPut:0,vomma:0,vega:0};
  var b=bsm(S,K,T,r,q,sig), d1=b.d1, d2=b.d2, dfQ=Math.exp(-q*T), pdf=normPdf(d1), sqT=Math.sqrt(T);
  var vega=S*dfQ*pdf*sqT;
  var vanna=-dfQ*pdf*d2/sig;
  var vomma=vega*d1*d2/sig;
  var common=dfQ*pdf*(2*(r-q)*T - d2*sig*sqT)/(2*T*sig*sqT);
  var charmCall= q*dfQ*normCdf(d1) - common;
  var charmPut = -q*dfQ*normCdf(-d1) - common;
  return { vanna:vanna, charmCall:charmCall, charmPut:charmPut, vomma:vomma, vega:vega };
}
Q.greeksX=greeksX;


/* ================= RISK PARITY (v3.2) ================= */
/* Equal-Risk-Contribution weights via fixed-point iteration (long-only). cov = n x n covariance matrix. */
function riskParity(cov, budget){
  var n=cov.length; if(!n) return {weights:[],riskContrib:[]};
  var b=budget&&budget.length===n?budget.slice():[]; if(!b.length){ for(var i=0;i<n;i++) b.push(1/n); }
  var w=[]; for(var i=0;i<n;i++) w.push(1/n);
  function matvec(w){ var mv=[]; for(var i=0;i<n;i++){ var s=0; for(var j=0;j<n;j++) s+=cov[i][j]*w[j]; mv.push(s); } return mv; }
  for(var it=0; it<10000; it++){
    var mv=matvec(w), wn=[], sum=0, maxd=0;
    for(var i=0;i<n;i++){ var m=mv[i]>1e-12?mv[i]:1e-12; var wi=Math.sqrt(w[i]*b[i]/m); wn.push(wi); sum+=wi; }
    for(var i=0;i<n;i++){ wn[i]/=sum; maxd=Math.max(maxd,Math.abs(wn[i]-w[i])); }
    w=wn; if(maxd<1e-12) break;
  }
  var mv=matvec(w), port=0; for(var i=0;i<n;i++) port+=w[i]*mv[i];
  var rc=[]; for(var i=0;i<n;i++) rc.push(w[i]*mv[i]/(port>0?port:1)); // fractional risk contribution
  return { weights:w, riskContrib:rc, portVol:Math.sqrt(port) };
}
Q.riskParity=riskParity;
/* Sample covariance matrix from an array of equal-length return series (rows = assets) */
function covMatrix(series, annualize){
  var n=series.length; if(!n) return []; var T=series[0].length; var mu=[];
  for(var i=0;i<n;i++){ var s=0; for(var t=0;t<T;t++) s+=series[i][t]; mu.push(s/T); }
  var C=[]; var k=annualize?252:1;
  for(var i=0;i<n;i++){ C.push([]); for(var j=0;j<n;j++){ var c=0; for(var t=0;t<T;t++) c+=(series[i][t]-mu[i])*(series[j][t]-mu[j]); C[i].push((c/(T-1))*k); } }
  return C;
}
Q.covMatrix=covMatrix;


/* ================= CORRELATION MATRIX (v3.3) ================= */
function corrMatrix(series){ var n=series.length; if(!n) return []; var C=covMatrix(series,false); var out=[]; for(var i=0;i<n;i++){ out.push([]); for(var j=0;j<n;j++){ var d=Math.sqrt(C[i][i]*C[j][j]); out[i].push(d>0?C[i][j]/d:0); } } return out; }
Q.corrMatrix=corrMatrix;
function avgPairwiseCorr(series){ var m=corrMatrix(series), n=m.length, s=0, k=0; for(var i=0;i<n;i++) for(var j=i+1;j<n;j++){ s+=m[i][j]; k++; } return k?s/k:0; }
Q.avgPairwiseCorr=avgPairwiseCorr;


/* ================= REGRESSION / PAIRS (v3.4) ================= */
/* OLS of y on x: returns slope(beta), intercept(alpha), r-squared */
function ols(y,x){ var n=Math.min(y.length,x.length); if(n<2) return {beta:0,alpha:0,r2:0}; var mx=0,my=0,i; for(i=0;i<n;i++){mx+=x[i];my+=y[i];} mx/=n;my/=n; var sxx=0,sxy=0,syy=0; for(i=0;i<n;i++){var dx=x[i]-mx,dy=y[i]-my; sxx+=dx*dx; sxy+=dx*dy; syy+=dy*dy;} var beta=sxx>0?sxy/sxx:0; var alpha=my-beta*mx; var r2=(sxx*syy>0)?(sxy*sxy)/(sxx*syy):0; return {beta:beta, alpha:alpha, r2:r2}; }
Q.ols=ols;
/* Full z-score series + latest z of a series */
function zscore(series){ var n=series.length,m=0,i; for(i=0;i<n;i++)m+=series[i]; m/=n; var v=0; for(i=0;i<n;i++){var d=series[i]-m;v+=d*d;} var sd=Math.sqrt(v/(n>1?n-1:1)); var z=series.map(function(x){return sd>0?(x-m)/sd:0;}); return {z:z, mean:m, sd:sd, last:z[n-1]}; }
Q.zscore=zscore;
/* Mean-reversion half-life from AR(1): d(s)=a+b*s(t-1); half-life=-ln2/ln(1+b) */
function halfLife(s){ var y=[],x=[],i; for(i=1;i<s.length;i++){y.push(s[i]-s[i-1]);x.push(s[i-1]);} var r=ols(y,x); var b=r.beta; if(b>=0) return Infinity; return -Math.log(2)/Math.log(1+b); }
Q.halfLife=halfLife;


/* ================= CVaR TAIL-RISK OPTIMIZER (v3.5) ================= */
/* Euclidean projection onto the probability simplex {w>=0, sum w=1} */
function projectSimplex(v){ var n=v.length, u=v.slice().sort(function(a,b){return b-a;}); var css=0, rho=0, theta=0; for(var j=0;j<n;j++){ css+=u[j]; var t=(css-1)/(j+1); if(u[j]-t>0){ rho=j+1; theta=t; } } var w=new Array(n); for(var i=0;i<n;i++){ w[i]=Math.max(v[i]-theta,0); } return w; }
Q.projectSimplex=projectSimplex;
/* Minimize CVaR (expected shortfall) at confidence beta over scenario matrix R (rows=scenarios, cols=asset returns). Long-only, fully invested. Projected subgradient. */
function minCVaR(R, beta, opts){
  beta=beta||0.95; opts=opts||{}; var S=R.length, n=R[0].length, i, s, k;
  var w=new Array(n); for(i=0;i<n;i++) w[i]=1/n;
  function tailInfo(w){ var losses=new Array(S); for(s=0;s<S;s++){ var d=0; for(i=0;i<n;i++) d+=R[s][i]*w[i]; losses[s]=-d; } var sorted=losses.slice().sort(function(a,b){return a-b;}); var idx=Math.min(S-1,Math.floor(beta*S)); var VaR=sorted[idx]; var tail=[]; for(s=0;s<S;s++) if(losses[s]>=VaR) tail.push(s); return {losses:losses, VaR:VaR, tail:tail}; }
  var lr=opts.lr||0.6, iters=opts.iters||2000;
  for(var it=0; it<iters; it++){
    var ti=tailInfo(w), g=new Array(n); for(i=0;i<n;i++) g[i]=0;
    for(k=0;k<ti.tail.length;k++){ s=ti.tail[k]; for(i=0;i<n;i++) g[i]+= -R[s][i]; }
    for(i=0;i<n;i++) g[i]/=ti.tail.length;
    var step=lr/Math.sqrt(it+1), wn=new Array(n);
    for(i=0;i<n;i++) wn[i]=w[i]-step*g[i];
    w=projectSimplex(wn);
  }
  var f=tailInfo(w), cvar=0; for(k=0;k<f.tail.length;k++) cvar+=f.losses[f.tail[k]]; cvar/= (f.tail.length||1);
  return { weights:w, cvar:cvar, VaR:f.VaR };
}
Q.minCVaR=minCVaR;
/* CVaR of a fixed weight vector over scenarios (loss units, positive=loss) */
function portfolioCVaR(R,w,beta){ beta=beta||0.95; var S=R.length,n=w.length,losses=new Array(S),s,i; for(s=0;s<S;s++){var d=0;for(i=0;i<n;i++)d+=R[s][i]*w[i];losses[s]=-d;} var sorted=losses.slice().sort(function(a,b){return a-b;}); var idx=Math.min(S-1,Math.floor(beta*S)); var VaR=sorted[idx],c=0,k=0; for(s=0;s<S;s++) if(losses[s]>=VaR){c+=losses[s];k++;} return {cvar:k?c/k:VaR, VaR:VaR}; }
Q.portfolioCVaR=portfolioCVaR;


/* ================= LINEAR ALGEBRA + BLACK-LITTERMAN (v3.6) ================= */
function matT(A){ var r=A.length,c=A[0].length,T=[],i,j; for(j=0;j<c;j++){T.push([]);for(i=0;i<r;i++)T[j].push(A[i][j]);} return T; }
function matMul(A,B){ var r=A.length,k=B.length,c=B[0].length,C=[],i,j,x; for(i=0;i<r;i++){C.push([]);for(j=0;j<c;j++){var s=0;for(x=0;x<k;x++)s+=A[i][x]*B[x][j];C[i].push(s);}} return C; }
function matVec(A,v){ var r=A.length,c=v.length,o=[],i,j; for(i=0;i<r;i++){var s=0;for(j=0;j<c;j++)s+=A[i][j]*v[j];o.push(s);} return o; }
function matAdd(A,B){ return A.map(function(row,i){return row.map(function(x,j){return x+B[i][j];});}); }
function matScale(A,k){ return A.map(function(row){return row.map(function(x){return x*k;});}); }
function matInv(A){ var n=A.length,i,j,k; var M=A.map(function(row,i){return row.concat(row.map(function(_,j){return i===j?1:0;}));});
  for(i=0;i<n;i++){ var piv=i; for(k=i+1;k<n;k++){ if(Math.abs(M[k][i])>Math.abs(M[piv][i])) piv=k; } var tmp=M[i];M[i]=M[piv];M[piv]=tmp;
    var d=M[i][i]; if(Math.abs(d)<1e-12) d=1e-12; for(j=0;j<2*n;j++) M[i][j]/=d;
    for(k=0;k<n;k++){ if(k!==i){ var f=M[k][i]; for(j=0;j<2*n;j++) M[k][j]-=f*M[i][j]; } } }
  return M.map(function(row){return row.slice(n);}); }
Q.matT=matT; Q.matMul=matMul; Q.matVec=matVec; Q.matInv=matInv;
/* Black-Litterman. Sigma=cov, wMkt=market weights, delta=risk aversion, tau, P/Q/omega optional views. */
function blackLitterman(Sigma, wMkt, delta, tau, P, Q_, omega){
  delta=delta||2.5; tau=tau||0.05; var n=Sigma.length, i;
  var Pi=matVec(Sigma,wMkt).map(function(x){return x*delta;}); // implied equilibrium returns
  var post=Pi.slice();
  if(P && P.length){
    var tauSigInv=matInv(matScale(Sigma,tau));
    var Pt=matT(P), omInv=matInv(omega);
    var mid=matAdd(tauSigInv, matMul(matMul(Pt,omInv),P));
    var M=matInv(mid);
    var rhs=matVec(tauSigInv,Pi).map(function(x,k){return x+matVec(matMul(Pt,omInv),Q_)[k];});
    post=matVec(M,rhs);
  }
  var SigInv=matInv(Sigma);
  var wRaw=matVec(SigInv,post).map(function(x){return x/delta;});
  var sum=wRaw.reduce(function(a,b){return a+b;},0)||1;
  var wNorm=wRaw.map(function(x){return x/sum;});
  return { equilibrium:Pi, posterior:post, weights:wNorm, weightsRaw:wRaw };
}
Q.blackLitterman=blackLitterman;

Q.version='3.6';
global.QENG=Q;
if(typeof module!=='undefined'&&module.exports) module.exports=Q;
})(typeof window!=='undefined'?window:globalThis);
