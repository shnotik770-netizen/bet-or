const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const fs=require('fs');const all={};
 for(const p of process.argv.slice(2)){ for(const dbg of ['','1']){
  const pg=await b.newPage({viewport:{width:1240,height:1754},deviceScaleFactor:dbg?1:2});
  await pg.goto(`file://${__dirname}/gen.html?p=${p}${dbg?'&debug=1':''}`);await pg.waitForFunction('window.READY');await pg.waitForTimeout(300);
  await pg.screenshot({path:`${__dirname}/${dbg?'dbg':'p'}${p}.png`});
  if(!dbg) Object.assign(all,await pg.evaluate('window.BOXES'));
  await pg.close();}}
 fs.writeFileSync(__dirname+'/boxes.json',JSON.stringify(all));await b.close();})();
