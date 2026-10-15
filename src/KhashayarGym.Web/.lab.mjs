import { chromium } from '@playwright/test'
const out='/tmp/claude-0/-home-claude/e804e18d-c1f0-5a62-99d4-39da643eb60a/scratchpad/lab'
import { mkdirSync } from 'node:fs'; mkdirSync(out,{recursive:true})
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
for (const c of process.argv.slice(2)) {
  const p=await b.newPage({viewport:{width:1440,height:900}})
  const errs=[]; p.on('pageerror',e=>errs.push(e.message))
  await p.goto(`http://localhost:5173/lab?c=${c}`,{waitUntil:'networkidle'}).catch(()=>{})
  await p.waitForTimeout(3500)
  await p.screenshot({path:`${out}/${c}.png`})
  console.log(c, errs.slice(0,2).join(' | '))
  await p.close()
}
await b.close()
