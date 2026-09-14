// Read-only GitHub proof: a successful staging deployment for this exact source revision.
if (process.env.RELEASE_REVIEWED !== 'true') throw new Error('Staging-Test und Backup müssen bestätigt sein.');
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Ungültiger Release-Kontext.');
const api = async path => {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GitHub-Freigabeprüfung fehlgeschlagen (${response.status}).`);
  return response.json();
};
const deployments = await api(`deployments?sha=${sha}&environment=staging&per_page=100`);
let verified = false;
for (const deployment of deployments) {
  if (deployment.creator?.login !== 'github-actions[bot]') continue;
  const statuses = await api(`deployments/${deployment.id}/statuses?per_page=100`);
  if (statuses[0]?.state === 'success') { verified = true; break; }
}
if (!verified) throw new Error('Dieser Commit benötigt zuerst einen erfolgreichen Staging-Release.');
console.log('Erfolgreicher Staging-Release für genau diesen Commit bestätigt.');
