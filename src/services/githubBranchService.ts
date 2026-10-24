export interface GitCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  date: string;
  url: string;
}

export interface BranchSyncInfo {
  lastSyncDate: string;
  lastSyncCommitSha: string;
  lastSyncCommitMessage: string;
  aheadBy: number;
  behindBy: number;
  compareUrl: string;
}

export const REPO_OWNER = 'anaskourdi4-svg';
export const REPO_NAME = 'Deutschmeister';

export const INITIAL_DEV_COMMITS: GitCommitInfo[] = [
  {
    sha: '0c2bf76400ed354a0c73eaa844e44354d66d9e45',
    shortSha: '0c2bf76',
    message: 'feat: implement environment branch detection',
    authorName: 'anaskourdi4-svg',
    date: '2026-10-24T12:23:29Z',
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/0c2bf76400ed354a0c73eaa844e44354d66d9e45`,
  },
  {
    sha: '29f3d5ea71e7bd666874ebf7939103c814b78ae9',
    shortSha: '29f3d5e',
    message: 'feat: update metadata and dev server configuration',
    authorName: 'anaskourdi4-svg',
    date: '2026-10-24T11:50:30Z',
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/29f3d5ea71e7bd666874ebf7939103c814b78ae9`,
  },
  {
    sha: 'f9b8c0a373b5a93df75e533036e4f3a763806ff9',
    shortSha: 'f9b8c0a',
    message: "Update deployment branches to include 'dev'",
    authorName: 'anaskourdi4-svg',
    date: '2026-10-24T11:36:40Z',
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/f9b8c0a373b5a93df75e533036e4f3a763806ff9`,
  },
];

export const INITIAL_SYNC_INFO: BranchSyncInfo = {
  lastSyncDate: '2026-09-26T18:32:35Z',
  lastSyncCommitSha: 'e6200d7',
  lastSyncCommitMessage: 'feat: improve sync feedback and persistence',
  aheadBy: 4,
  behindBy: 0,
  compareUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/main...dev`,
};

export async function fetchLatestDevCommits(): Promise<GitCommitInfo[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=dev&per_page=3`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      console.warn('GitHub API returned status', res.status);
      return INITIAL_DEV_COMMITS;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, 3).map((item: any) => ({
        sha: item.sha,
        shortSha: item.sha.substring(0, 7),
        message: item.commit?.message?.split('\n')[0] || 'تعديل برمجي',
        authorName: item.commit?.author?.name || item.author?.login || 'المطور',
        date: item.commit?.author?.date || item.commit?.committer?.date || new Date().toISOString(),
        url: item.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${item.sha}`,
      }));
    }
  } catch (err) {
    console.warn('Error fetching dev commits from GitHub:', err);
  }
  return INITIAL_DEV_COMMITS;
}

export async function fetchBranchSyncInfo(): Promise<BranchSyncInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/main...dev`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      console.warn('GitHub API compare returned status', res.status);
      return INITIAL_SYNC_INFO;
    }
    const data = await res.json();
    const baseCommit = data.merge_base_commit || data.base_commit;
    return {
      lastSyncDate: baseCommit?.commit?.author?.date || baseCommit?.commit?.committer?.date || INITIAL_SYNC_INFO.lastSyncDate,
      lastSyncCommitSha: (baseCommit?.sha || INITIAL_SYNC_INFO.lastSyncCommitSha).substring(0, 7),
      lastSyncCommitMessage: baseCommit?.commit?.message?.split('\n')[0] || INITIAL_SYNC_INFO.lastSyncCommitMessage,
      aheadBy: typeof data.ahead_by === 'number' ? data.ahead_by : INITIAL_SYNC_INFO.aheadBy,
      behindBy: typeof data.behind_by === 'number' ? data.behind_by : INITIAL_SYNC_INFO.behindBy,
      compareUrl: data.html_url || INITIAL_SYNC_INFO.compareUrl,
    };
  } catch (err) {
    console.warn('Error fetching branch comparison from GitHub:', err);
  }
  return INITIAL_SYNC_INFO;
}

export function formatArabicDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    // Use Intl for Arabic formatting with fallback
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return '';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'منذ لحظات';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
    return `منذ ${Math.floor(diffDays / 365)} سنة`;
  } catch {
    return '';
  }
}
