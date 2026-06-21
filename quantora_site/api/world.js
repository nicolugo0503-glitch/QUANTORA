module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  const KEY = process.env.TWELVEDATA_KEY;
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const META = {
    UUP:{name:'US Dollar',cls:'FX'}, FXE:{name:'Euro',cls:'FX'}, FXY:{name:'Japanese Yen',cls:'FX'}, FXB:{name:'British Pound',cls:'FX'},
    GLD:{name:'Gold',cls:'Commodity'}, SLV:{name:'Silver',cls:'Commodity'}, USO:{name:'Crude Oil',cls:'Commodity'}, TLT:{name:'20Y Treasuries',cls:'Bonds'}
  };
  const syms = Object.keys(META);
  try {
    const u = 'https://api.twelvedata.com/time_series?symbol=' + syms.join(',') + '&interval=1day&outputsize=30&apikey=' + KEY;
    const j = await (await fetch(u)).json();
    const assets = [];
    syms.forEach(function(s){
      const node = j[s] || (j.meta && j.meta.symbol === s ? j : null);
      if (!node || node.status !== 'ok' || !node.values || !node.values.length) return;
      const closes = node.values.map(function(v){ return +v.close; }).reverse();
      const price = closes[closes.length-1], prev = closes.length>1 ? closes[closes.length-2] : price;
      assets.push({ symbol:s, name:META[s].name, cls:META[s].cls, price:price, changePct:+(((price/prev)-1)*100).toFixed(2), points:closes });
    });
    if (!assets.length) { res.status(200).json({ error:'feed' }); return; }
    res.status(200).json({ assets:assets });
  } catch (e) { res.status(200).json({ error:'feed' }); }
};
