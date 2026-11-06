"""Optional touch/resize/refresh regression run. Requires Python Playwright with Chromium."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright
import os
@contextmanager
def preview_server():
 root=Path(__file__).resolve().parents[2]
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
 worker=Thread(target=server.serve_forever,daemon=True)
 worker.start()
 try:
  yield f'http://127.0.0.1:{server.server_port}/poker/'
 finally:
  server.shutdown();server.server_close();worker.join()

with preview_server() as url, sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),args=['--disable-dev-shm-usage'])
 # Recreate low-blind racks from setup and check each painted disc and count,
 # including the rotated seat, against its own touch target.
 for buy_in in (200,400,2000):
  rack=b.new_context(has_touch=True,is_mobile=True,viewport={'width':390,'height':760})
  page=rack.new_page();page.goto(url)
  page.locator('.settings summary').click()
  for key,val in [('stack',buy_in),('small',1),('big',2)]:
   page.locator(f'[name="{key}"]').fill(str(val))
  page.locator('#start').click();page.locator('#table').wait_for()
  assert page.locator('#pot-near').inner_text()=='3'
  for width,height in [(390,760),(320,480)]:
   page.set_viewport_size({'width':width,'height':height})
   for seat in page.locator('.player').all():
    buttons=seat.locator('.chip-button')
    assert buttons.count()==4
    value=0
    for btn in buttons.all():
     box=btn.bounding_box()
     for part in btn.locator('ellipse,text,small').all():
      r=part.bounding_box()
      assert r['x']>=box['x']-1 and r['y']>=box['y']-1
      assert r['x']+r['width']<=box['x']+box['width']+1
      assert r['y']+r['height']<=box['y']+box['height']+1
     count=int(btn.locator('small').inner_text().replace('×','').replace(',',''))
     value+=count*int(btn.get_attribute('data-value'))
    balance=int(seat.locator('.balance strong').inner_text().replace(',',''))
    assert value==balance and balance in (buy_in-1,buy_in-2)
  rack.close()
 ctx=b.new_context(viewport={'width':390,'height':760},has_touch=True,is_mobile=True,device_scale_factor=2)
 t=ctx.new_page(); errors=[]
 t.on('pageerror',lambda err:errors.append(str(err)))
 t.goto(url);t.locator('#start').click();t.locator('#table').wait_for()
 # Seed a genuine saved flop from the old schema, with no chip inventory.
 t.evaluate("""async () => {
 const E=await import('./engine.mjs');let s=E.newMatch({names:['Lai','Alex'],button:1});
 s=E.act(s,1,'raise',60);s=E.act(s,0,'call');
 for(const p of s.players){delete p.wallet;delete p.wager}
 localStorage.setItem('lai-poker:save:v1',JSON.stringify({schema:1,state:s}));
 }""")
 t.reload();t.locator('#resume-saved').click();t.locator('#board .face').first.wait_for()
 assert t.locator('#board .face').count()==3
 assert t.locator('#pot-near').inner_text()=='120'
 def chip(n):return t.locator(f'#player-0 [data-action=chip][data-value="{n}"]')
 for _ in range(2):chip(25).tap()
 assert '+50' in t.locator('#player-0 .pending').inner_text()
 assert t.locator('#pot-near').inner_text()=='120'
 t.locator('[data-action=undo]:enabled').tap()
 assert '+25' in t.locator('#player-0 .pending').inner_text()
 t.locator('[data-action=clear]:enabled').tap()
 assert t.locator('#player-0 .pending .bundle').count()==0
 def geometry(w,h):
  t.set_viewport_size({'width':w,'height':h})
  for i in [0,1]:
   seat=t.locator(f'#player-{i}').bounding_box()
   for sel in ['.private-card','.chip-button','.controls','.balance','.pending-row']:
    for el in t.locator(f'#player-{i} '+sel).all():
     box=el.bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=w+.5 and box['y']>=seat['y']-.5 and box['y']+box['height']<=seat['y']+seat['height']+.5,(w,h,i,sel,box,seat)
   cards=t.locator(f'#player-{i} .hole-cards').bounding_box()
   tray=t.locator(f'#player-{i} .chip-tray').bounding_box()
   assert (cards['x']<tray['x'])==(i==0)
  assert t.evaluate('document.documentElement.scrollHeight')<=h,(w,h)
 for size in [(390,760),(375,667),(320,568),(320,480)]:geometry(*size)
 geometry(390,760)
 # Real touch holds on both overlapping cards in both player orientations.
 cd=ctx.new_cdp_session(t)
 def touches(kind,points):cd.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 for i in [0,1]:
  for n in [0,1]:
   el=t.locator(f'[data-peek="{i}"][data-index="{n}"]');box=el.bounding_box()
   pt={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}
   touches('touchStart',[pt])
   assert t.locator(f'#player-{i} .private-card .face').count()==2
   assert t.locator('[data-action]:enabled').count()==0
   if n==1:
    other=t.locator(f'[data-peek="{1-i}"][data-index="0"]').bounding_box()
    touches('touchStart',[pt,{'x':other['x']+10,'y':other['y']+10,'id':2}])
    assert t.locator('.private-card .face').count()==2
   touches('touchCancel' if n==1 else 'touchEnd',[])
   assert t.locator('.private-card .back').count()==4
 el=t.locator('[data-peek="0"]').first;el.focus();t.keyboard.down('Space')
 assert t.locator('.private-card .face').count()==2
 t.keyboard.up('Space');assert t.locator('.private-card .back').count()==4
 for _ in range(2):chip(25).tap()
 t.locator('[data-action=commit]:enabled').tap();assert t.locator('#pot-near').inner_text()=='170'
 def saved():return t.evaluate("JSON.parse(localStorage.getItem('lai-poker:save:v1'))")
 assert saved()['schema']==2
 st=saved()['state'];t.reload();t.locator('#resume-saved').click()
 assert saved()['state']==st and t.locator('.private-card .back').count()==4
 t.evaluate('navigator.serviceWorker.ready.then(r=>r.active.state)')
 t.reload();t.locator('#resume-saved').click()
 # Interruption during capture must conceal both cards.
 box=t.locator('[data-peek="0"]').first.bounding_box()
 pt={'x':box['x']+12,'y':box['y']+12,'id':1}
 touches('touchStart',[pt]);assert t.locator('.private-card .face').count()==2
 t.evaluate("window.dispatchEvent(new Event('blur'))");touches('touchEnd',[])
 assert t.locator('.private-card .back').count()==4
 t.locator('#resume-play').click()
 t.evaluate("document.addEventListener('pointerdown',e=>window.testCapture=[e.target.closest('[data-peek]'),e.pointerId],{once:true})")
 touches('touchStart',[pt]);assert t.locator('.private-card .face').count()==2
 touches('touchMove',[{**pt,'x':pt['x']+15}])
 t.evaluate("() => {const [el,id]=window.testCapture;if(!el.hasPointerCapture(id))throw Error('missing capture '+id);el.releasePointerCapture(id)}")
 touches('touchMove',[{**pt,'x':pt['x']+25}]);assert t.locator('.private-card .back').count()==4
 touches('touchEnd',[])
 ctx.set_offline(True);t.reload();t.locator('#resume-saved').click()
 assert t.locator('#pot-near').inner_text()=='170';assert t.locator('.private-card .back').count()==4
 ctx.set_offline(False)
 t.evaluate("""async () => {
 const E=await import('./engine.mjs');let s=E.newMatch({names:['Lai','Alex'],button:1});
 s=E.act(s,1,'raise',60);s=E.act(s,0,'call');
 localStorage.setItem('lai-poker:save:v1',JSON.stringify({schema:2,state:s}));
 }""")
 t.reload();t.locator('#resume-saved').click()
 for _ in range(2):chip(25).tap()
 if os.environ.get('PREVIEW'):
  t.screenshot(path=os.environ['PREVIEW'])
 assert not errors,errors
 print('PASS – live UI, migration, both orientations, four portrait viewport sizes, touch cancellation, two fingers, keyboard, chip staging, commit, refresh, offline reopening.')
