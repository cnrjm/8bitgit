import { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/rest';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

export const useGithub = () => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('github_token'));
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = () => setError(null);

  const exchangeCodeForToken = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to exchange code for token');
      }

      const data = await response.json();
      
      if (data.access_token) {
        localStorage.setItem('github_token', data.access_token);
        setAccessToken(data.access_token);
        return data.access_token;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      setError(error.message);
      localStorage.removeItem('github_token');
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(() => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: window.location.origin,
      scope: 'repo user',
      state: state
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('oauth_state');
    setAccessToken(null);
    setUserData(null);
    setError(null);
  }, []);

  const fetchUserData = useCallback(async (token) => {
    if (!token) return;

    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.users.getAuthenticated();
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data');
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('oauth_state');

    if (code) {
      if (state !== savedState) {
        setError('Invalid state parameter');
        return;
      }

      exchangeCodeForToken(code)
        .then(token => {
          if (token) {
            fetchUserData(token);
          }
        });

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('oauth_state');
    } else if (accessToken) {
      fetchUserData(accessToken);
    }
  }, [fetchUserData]);

  return {
    login,
    logout,
    accessToken,
    userData,
    error,
    isLoading,
    clearError
  };
};