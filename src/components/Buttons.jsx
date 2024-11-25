import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { useGithub } from '../hooks/useGithub';
import { Octokit } from '@octokit/rest';

const REPO_NAME = 'art';
const BATCH_SIZE = 10;

const Buttons = ({ grid, cellDates, selectedYear }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout, accessToken, userData, error, isLoading: authLoading, clearError } = useGithub();

  useEffect(() => {
    if (error) {
      console.error('Authentication error:', error);
    }
  }, [error]);

  const createRepoIfNotExists = async (octokit) => {
    try {
      // Try to get the repository
      await octokit.rest.repos.get({
        owner: userData.login,
        repo: REPO_NAME,
      });
      console.log('Repository already exists');
    } catch (error) {
      if (error.status === 404) {
        console.log('Creating new repository...');
        try {
          // Create new repository
          await octokit.rest.repos.createForAuthenticatedUser({
            name: REPO_NAME,
            private: true,
            auto_init: true,
            description: 'GitHub Contributions Art - Generated Patterns'
          });
  
          // Wait for repository initialization
          console.log('Waiting for repository initialization...');
          await new Promise(resolve => setTimeout(resolve, 3000));
  
          // Verify repository was created
          await octokit.rest.repos.get({
            owner: userData.login,
            repo: REPO_NAME,
          });
          console.log('Repository created successfully');
        } catch (createError) {
          console.error('Error creating repository:', createError);
          throw new Error('Failed to create repository. Please try again.');
        }
      } else {
        console.error('Error checking repository:', error);
        throw error;
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
    let octokit;
  
    try {
      octokit = new Octokit({ auth: accessToken });
  
      // Verify user data is available
      if (!userData || !userData.login) {
        throw new Error('User data not available. Please try signing in again.');
      }
  
      console.log('Creating/verifying repository...');
      await createRepoIfNotExists(octokit);
  
      console.log('Getting repository reference...');
      const { data: ref } = await octokit.rest.git.getRef({
        owner: userData.login,
        repo: REPO_NAME,
        ref: 'heads/main'
      });
      let lastCommitSha = ref.object.sha;
  
      // Prepare commits
      const commits = [];
      for (let col = 0; col < grid[0].length; col++) {
        for (let row = 0; row < grid.length; row++) {
          const level = grid[row][col];
          const date = cellDates[row][col];
  
          if (level <= 0 || date.getFullYear() !== selectedYear) continue;
  
          for (let i = 0; i < level; i++) {
            commits.push({
              date,
              level,
              index: i
            });
          }
        }
      }
  
      if (commits.length === 0) {
        throw new Error('No contributions to commit. Please draw a pattern first.');
      }
  
      console.log(`Processing ${commits.length} commits in batches of ${BATCH_SIZE}...`);
      
      for (let i = 0; i < commits.length; i += BATCH_SIZE) {
        const batch = commits.slice(i, i + BATCH_SIZE);
        lastCommitSha = await processCommitBatch(batch, octokit, lastCommitSha);
  
        await octokit.rest.git.updateRef({
          owner: userData.login,
          repo: REPO_NAME,
          ref: 'heads/main',
          sha: lastCommitSha
        });
  
        console.log(`Processed ${Math.min(i + BATCH_SIZE, commits.length)}/${commits.length} commits`);
      }
  
      console.log('All commits processed successfully');
      window.open(`https://github.com/${userData.login}/${REPO_NAME}`);
    } catch (error) {
      console.error('Error creating pattern:', error);
      // You might want to add a toast or alert here to show the error to the user
      alert(`Error: ${error.message || 'Failed to create pattern. Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0d1117] flex flex-col items-center gap-4 pb-8">
      {error && (
        <div className="text-red-500 bg-red-100 px-4 py-2 rounded-md flex items-center gap-2">
          <span>{error}</span>
          <button 
            onClick={clearError}
            className="text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
      
      {!accessToken ? (
        <button 
          onClick={login}
          disabled={authLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-colors disabled:opacity-50"
        >
          <Github size={18} />
          {authLoading ? 'Signing in...' : 'Sign in with GitHub'}
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