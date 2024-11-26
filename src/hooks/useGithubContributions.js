import { useState, useEffect } from 'react';

export const useGithubContributions = (username, year) => {
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContributions = async () => {
      if (!username) return;
      
      setLoading(true);
      try {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${username}?y=${year}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch contributions');
        }

        const data = await response.json();
        const contributions = data.contributions.reduce((acc, curr) => {
          acc[curr.date] = curr.count;
          return acc;
        }, {});

        setContributions(contributions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [username, year]);

  return { contributions, loading, error };
};