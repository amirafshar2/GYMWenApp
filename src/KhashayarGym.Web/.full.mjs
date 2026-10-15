import { chromium } from '@playwright/test'
const out='/tmp/claude-0/-home-claude/e804e18d-c1f0-5a62-99d4-39da643eb60a/scratchpad/v2'
import { mkdirSync } from 'node:fs'; mkdirSync(out,{recursive:true})
const base=process.argv[2]??'http://localhost:5173'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
for (const vp of [{n:'d',w:1440,h:900},{n:'m',w:390,h:844}]) {
  const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},geolocation:{latitude:29.632,longitude:52.502},permissions:['geolocation']})
  const p=await ctx.newPage(); const errs=[]
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))})
  await p.goto(base+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(2500)
  await p.screenshot({path:`${out}/${vp.n}-hero.png`})
  for (const id of ['branches','disciplines','coaches','packages','consult']) {
    await p.evaluate(id=>document.getElementById(id)?.scrollIntoView(),id); await p.waitForTimeout(2200)
    await p.screenshot({path:`${out}/${vp.n}-${id}.png`})
  }
  await p.evaluate(()=>{document.querySelector('[data-slot=faq], h1')}); 
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await p.waitForTimeout(2500)
  await p.screenshot({path:`${out}/${vp.n}-footer.png`})
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight-2*innerHeight)); await p.waitForTimeout(1500)
  await p.screenshot({path:`${out}/${vp.n}-faq.png`})
  console.log(vp.n, [...new Set(errs)].slice(0,6).join('\n  '))
  await ctx.close()
}
await b.close()
