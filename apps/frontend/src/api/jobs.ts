import { apiClient } from './client';
import {
  Job,
  JobCounts,
  JobStatus,
  JobStatusHistory,
  CreateJobInput,
  UpdateJobStatusInput,
} from '../types/job';

export async function getJobs(status?: JobStatus): Promise<Job[]> {
  const params = status ? { status } : undefined;
  const response = await apiClient.get<Job[]>('/jobs', { params });
  return response.data;
}

export async function getJobCounts(): Promise<JobCounts> {
  const response = await apiClient.get<JobCounts>('/jobs/counts');
  return response.data;
}

export async function getJobById(id: string): Promise<Job> {
  const response = await apiClient.get<Job>(`/jobs/${id}`);
  return response.data;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const response = await apiClient.post<Job>('/jobs', input);
  return response.data;
}

export async function updateJobStatus(
  id: string,
  input: UpdateJobStatusInput,
): Promise<Job> {
  const response = await apiClient.patch<Job>(`/jobs/${id}/status`, input);
  return response.data;
}

export async function deleteJob(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/jobs/${id}`,
  );
  return response.data;
}

export async function getJobHistory(id: string): Promise<JobStatusHistory[]> {
  const response = await apiClient.get<JobStatusHistory[]>(`/jobs/${id}/history`);
  return response.data;
}
