import React, { useState } from 'react';
import { X, Check, Copy, Globe, Terminal, Sparkles, FileCode2, ArrowLeft } from 'lucide-react';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [githubUser, setGithubUser] = useState('your-username');
  const [repoName, setRepoName] = useState('shelf-pulse');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const cleanUser = githubUser.trim() || 'your-username';
  const cleanRepo = repoName.trim() || 'shelf-pulse';

  const gitCommands = [
    'git init',
    'git add .',
    'git commit -m "Deploy Daily Inventory PWA"',
    'git branch -M main',
    `git remote add origin https://github.com/${cleanUser}/${cleanRepo}.git`,
    'git push -u origin main',
  ].join('\n');

  const livePagesUrl = `https://${cleanUser}.github.io/${cleanRepo}/`;

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(gitCommands);
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = gitCommands;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-deploy-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[calc(100dvh-20px)] sm:max-h-[90dvh] rounded-[28px] glass-modal flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-200/70 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to inventory"
              className="min-h-[38px] px-2.5 py-1 rounded-2xl glass-pill text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2
                id="github-deploy-title"
                className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate"
              >
                <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">GitHub Push &amp; Pages Setup</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GitHub deployment guide"
            className="min-w-[40px] min-h-[40px] rounded-2xl glass-pill flex items-center justify-center text-slate-700 dark:text-slate-200 touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 text-sm flex-1">
          <div className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 space-y-1.5">
            <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Ready for GitHub &amp; GitHub Pages</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-200/90 leading-relaxed break-words">
              This project includes <code className="font-mono font-bold">.github/workflows/deploy.yml</code>, dynamic <code className="font-mono font-bold">VITE_BASE_PATH</code> subpath routing, and relative PWA manifest icons so it works automatically at <code className="font-mono break-all">{livePagesUrl}</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="gh-username-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Your GitHub Username
              </label>
              <input
                id="gh-username-input"
                type="text"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                placeholder="your-username"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-2xl glass-input font-mono text-xs text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="gh-repo-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Repository Name
              </label>
              <input
                id="gh-repo-input"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="shelf-pulse"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-2xl glass-input font-mono text-xs text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>1. Push Code to GitHub</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCommands}
                className="min-h-[32px] px-2.5 py-1 rounded-xl futuristic-cta text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none shrink-0"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Commands</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-950/90 text-emerald-300 font-mono text-xs overflow-x-auto border border-white/10 leading-relaxed select-all">
              {gitCommands}
            </pre>
          </div>

          <div className="p-4 rounded-2xl glass-pill space-y-2">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>2. Enable GitHub Pages (Interactive Web View)</span>
            </div>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>
                Open your GitHub repository and click <strong>Settings</strong> &rarr; <strong>Pages</strong>.
              </li>
              <li>
                Under <strong>Build and deployment</strong> &rarr; <strong>Source</strong>, select <strong>GitHub Actions</strong>.
              </li>
              <li>
                GitHub Actions will automatically build and publish your live interactive website at:
              </li>
            </ol>
            <div className="mt-2 p-2.5 rounded-xl glass-input font-mono text-xs text-emerald-600 dark:text-emerald-400 break-all select-all">
              {livePagesUrl}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-2xl futuristic-cta font-bold text-sm transition touch-manipulation select-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
