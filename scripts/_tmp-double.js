const { io } = require('socket.io-client');
const data = require('../ascensiondata.json');
const BASE = 'http://localhost:7183';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const nomDe = (id) => (data.characters.find(x => x.id === id) || {}).name;
let jeton='', code='';
const post=(p,b)=>fetch(BASE+p,{method:'POST',headers:{'Content-Type':'application/json','X-Host-Token':jeton},
  body:JSON.stringify(b||{})}).then(r=>r.json().then(j=>{if(j.hostToken)jeton=j.hostToken;if(j.roomCode)code=j.roomCode;return j}));

(async()=>{
  let joues=0;
  for (let essai=1; essai<=10 && joues<3; essai++) {
    await post('/admin/toggle-game',{lobbyMode:'ascension'});
    await post('/admin/ascension/set-timer',{timer:45});
    const s=io(BASE,{transports:['websocket']});
    await new Promise(r=>s.on('connect',r));
    const etages=[]; s.on('ascension-floor-start',(d)=>etages.push({floor:d.floor,type:d.floorData&&d.floorData.type}));
    s.emit('register-authenticated',{playerId:'d1',username:'Dbl'});
    await wait(120); s.emit('join-lobby',{playerId:'d1',username:'Dbl',code}); await wait(400);
    await post('/admin/start-game',{});
    for(let i=0;i<40&&!etages.length;i++) await wait(200);

    const etat=await new Promise(r=>{s.emit('ascension-reconnect',{playerId:'d1'});s.once('ascension-state',r)});
    const f=etat&&etat.floorData;
    if (f && f.type==='guess') {
      joues++;
      for (const p of f.characters) {
        const nom=nomDe(p.id)||'';
        for (let k=3;k<=nom.length;k++) { s.emit('ascension-check-guess',{characterId:p.id,name:nom.slice(0,k)}); await wait(40); }
        s.emit('ascension-check-guess',{characterId:p.id,name:nom}); await wait(120);
      }
      await wait(2600);
      const suite=etages.map(e=>e.floor+1).join(' → ');
      const saut=etages.some((e,i)=>i>0&&e.floor-etages[i-1].floor>1);
      console.log('  guess joue en auto → etages '+suite+(saut?'   ⚠ SAUT DE PLUS D UN':'   ok'));
    }
    s.close(); await post('/admin/toggle-game',{}); await wait(150);
  }
  console.log('fini ('+joues+' etage(s) guess joue(s))');
})();
