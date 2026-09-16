import { useState, useEffect, useCallback, useRef } from 'react';
import { getJobs, getJobCounts, getJobHistory } from '../api/jobs';
import { Job, JobCounts, JobStatus, JobStatusHistory } from '../types/job';
import { getApiErrorMessage } from '../api/client';
import { JOB_POLL_INTERVAL } from '../constants/config';

export function useJobs(activeFilter?: JobStatus) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Store activeFilter in a ref so polling doesn't recreate the timer on filter change.
  const filterRef = useRef(activeFilter);
  filterRef.current = activeFilter;

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsFetching(true);
      }

      const [jobsData, countsData] = await Promise.all([
        getJobs(filterRef.current),
        getJobCounts(),
      ]);

      setJobs(jobsData);
      setCounts(countsData);
      setLastUpdated(new Date());
    } catch (err) {
      const message = getApiErrorMessage(err);
      // Don't blank out an existing table on background polling network blips.
      if (isInitial) {
        setError(message);
      } else {
        console.error('Background refresh failed:', message);
      }
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [activeFilter, loadData]);

  // Pause polling when tab is hidden to save requests and battery
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadData(false);
        }
      }, JOB_POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  const refreshJobs = useCallback(async () => {
    await loadData(false);
  }, [loadData]);

  return {
    jobs,
    counts,
    isLoading,
    isFetching,
    error,
    lastUpdated,
    refreshJobs,
  };
}

export function useJobHistory(jobId: string | null) {
  const [history, setHistory] = useState<JobStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setHistory([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getJobHistory(jobId)
      .then((data) => {
        if (isMounted) setHistory(data);
      })
      .catch((err) => {
        if (isMounted) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  return {
    history,
    isLoading,
    error,
  };
}
