import { useCallback, useEffect, useState } from 'react';
import { getIssues } from '../api/issues.api';
import { getErrorMessage } from '../api/utils';

export const useIssuesData = ({ params = {}, enabled = true, select } = {}) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const fetchIssues = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getIssues(params);
      const list = Array.isArray(data) ? data : [];
      setIssues(typeof select === 'function' ? select(list) : list);
    } catch (err) {
      setIssues([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, params, select]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await fetchIssues();
    };

    run();
    return () => {
      mounted = false;
    };
  }, [fetchIssues]);

  return {
    issues,
    setIssues,
    loading,
    error,
    refetch: fetchIssues,
  };
};
