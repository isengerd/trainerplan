const target = process.env.RELEASE_TARGET;
if (!['staging', 'production'].includes(target)) throw new Error('Ungültiges Release-Ziel.');
const origin = target === 'staging' ? 'https://staging.nextsession.de' : 'https://nextsession.de';
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const response = await fetch(`${origin}/api/health`, { headers, redirect: 'error', signal: AbortSignal.timeout(20000), cache: 'no-store' });
const result = await response.json();
if (!response.ok || result.database !== 'connected' || result.environment !== target || result.revision !== process.env.RELEASE_SHA) throw new Error('Live-Prüfung fehlgeschlagen: Datenbank, Umgebung oder veröffentlichter Commit stimmt nicht. Deployment prüfen; kein automatischer Datenbank-Rollback.');
console.log('Live-Prüfung: erwarteter Commit, richtige Umgebung und erreichbare Datenbank.');
