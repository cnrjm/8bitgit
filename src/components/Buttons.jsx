import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { useGithub } from '../hooks/useGithub';
import { Octokit } from '@octokit/rest';

const REPO_NAME = 'art';
const BATCH_SIZE = 10; // Number of commits to process in parallel

const Buttons = ({ grid, cellDates, selectedYear }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout, accessToken, userData } = useGithub();

  const createRepoIfNotExists = async (octokit) => {
    try {
      await octokit.rest.repos.get({
        owner: userData.login,
        repo: REPO_NAME,
      });
    } catch (error) {
      if (error.status === 404) {
        await octokit.rest.repos.createForAuthenticatedUser({
          name: REPO_NAME,
          private: true,
          auto_init: true,
        });
        // Wait for repo initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const processCommitBatch = async (commitBatch, octokit, lastCommitSha) => {
    let currentSha = lastCommitSha;

    for (const { date, level, index } of commitBatch) {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: userData.login,
        repo: REPO_NAME,
        content: `Contribution on ${date.toISOString()}`,
        encoding: 'utf-8'
      });

      const { data: tree } = await octokit.rest.git.createTree({
        owner: userData.login,
        repo: REPO_NAME,
        base_tree: currentSha,
        tree: [{
          path: `contributions/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}-${index}.txt`,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        }]
      });

      const { data: commit } = await octokit.rest.git.createCommit({
        owner: userData.login,
        repo: REPO_NAME,
        message: `Contribution for ${date.toDateString()}`,
        tree: tree.sha,
        parents: [currentSha],
        author: {
          name: userData.name || userData.login,
          email: userData.email || `${userData.login}@users.noreply.github.com`,
          date: date.toISOString()
        }
      });

      currentSha = commit.sha;
    }

    return currentSha;
  };

  const handlePushCommits = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const octokit = new Octokit({ auth: accessToken });

      // Create or get existing repo
      await createRepoIfNotExists(octokit);

      // Get current commit SHA
      const { data: ref } = await octokit.rest.git.getRef({
        owner: userData.login,
        repo: REPO_NAME,
        ref: 'heads/main'
      });
      let lastCommitSha = ref.object.sha;

      // Prepare all commits
      const commits = [];
      for (let col = 0; col < grid[0].length; col++) {
        for (let row = 0; row < grid.length; row++) {
          const level = grid[row][col];
          const date = cellDates[row][col];

          if (level <= 0 || date.getFullYear() !== selectedYear) continue;

          // Add commit data for each contribution level
          for (let i = 0; i < level; i++) {
            commits.push({
              date,
              level,
              index: i
            });
          }
        }
      }

      // Process commits in batches
      for (let i = 0; i < commits.length; i += BATCH_SIZE) {
        const batch = commits.slice(i, i + BATCH_SIZE);
        lastCommitSha = await processCommitBatch(batch, octokit, lastCommitSha);

        // Update reference after each batch
        await octokit.rest.git.updateRef({
          owner: userData.login,
          repo: REPO_NAME,
          ref: 'heads/main',
          sha: lastCommitSha
        });
      }

      window.open(`https://github.com/${userData.login}/${REPO_NAME}`);
    } catch (error) {
      console.error('Error creating pattern:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0d1117] flex justify-center gap-4 pb-8">
      {!accessToken ? (
        <button 
          onClick={login}
          className="flex items-center gap-2 px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-colors"
        >
          <Github size={18} />
          Sign in with GitHub
        </button>
      ) : (
        <div className="flex gap-4">
          <button 
            onClick={handlePushCommits}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github size={18} />
            {isLoading ? 'Creating Pattern...' : 'Create Pattern'}
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-[#dc3545] text-white rounded-md hover:bg-[#c82333] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Buttons;