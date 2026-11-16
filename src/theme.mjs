/** Accessible light / dark theme, persisted per browser. Wallet data unaffected. */
export const THEME_KEY='bah:theme';
export function chooseTheme(stored,prefersDark=false){return ['light','dark'].includes(stored)?stored:(prefersDark?'dark':'light')}
function stored(){try{return localStorage.getItem(THEME_KEY)}catch{return null}}
export function setTheme(theme,persist=true){
 const selected=chooseTheme(theme);document.documentElement.dataset.theme=selected;
 document.documentElement.style.colorScheme=selected;
 if(persist)try{localStorage.setItem(THEME_KEY,selected)}catch{}
 const btn=document.getElementById('themeToggle');if(!btn)return;
 const dark=selected==='light';btn.setAttribute('aria-label',dark?'Switch to dark theme':'Switch to light theme');
 btn.setAttribute('title',btn.getAttribute('aria-label'));btn.setAttribute('aria-pressed',String(selected==='dark'));
 btn.textContent=dark?'☾ Dark':'☀ Light';
}
if(typeof document!=='undefined'){
 const init=()=>{
  const button=document.getElementById('themeToggle');if(!button)return;
  const prefersDark=window.matchMedia?.('(prefers-color-scheme: dark)').matches??false;
  setTheme(chooseTheme(stored(),prefersDark),false);
  button.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
