// Resolves the "last updated" date for a project tracked through a progress.json
// hosted on raw.githubusercontent.com. The date of the latest commit in that
// repo wins, so it never has to be maintained by hand. If the GitHub API is
// unreachable or rate limited, it falls back to the newest log entry, then to
// the start date.
export async function lastUpdated(progressUrl, data) {
  const repo = progressUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\//)?.[1];
  if (repo) {
    try {
      const res = await fetch('https://api.github.com/repos/' + repo + '/commits?per_page=1');
      if (res.ok) {
        const commits = await res.json();
        const iso = commits[0]?.commit?.committer?.date;
        if (iso) return new Date(iso);
      }
    } catch {}
  }
  const log = Array.isArray(data.log) ? data.log : [];
  const fallback = log.length ? log[0].date : data.started;
  return fallback ? new Date(fallback + 'T00:00:00') : null;
}
