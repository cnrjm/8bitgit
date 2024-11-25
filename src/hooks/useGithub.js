import { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

export const useGithub = () => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('github_token'));
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchUserData();
    }
  }, [accessToken]);

  const exchangeCodeForToken = async (code) => {
    try {
      const response = await fetch('http://localhost:3000/api/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      
      if (data.access_token) {
        localStorage.setItem('github_token', data.access_token);
        setAccessToken(data.access_token);
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  };

  const login = () => {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: window.location.href,
      scope: 'repo user'
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  const logout = () => {
    localStorage.removeItem('github_token');
    setAccessToken(null);
    setUserData(null);
  };

  const fetchUserData = async () => {
    try {
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return { login, logout, accessToken, userData };
};