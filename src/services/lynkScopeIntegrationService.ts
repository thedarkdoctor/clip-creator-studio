// src/services/lynkScopeIntegrationService.ts
/**
 * Lynkscope Integration Service
 * Handles communication and data flow from Lynkscope to Cliplyst
 */

interface ContentJobRequest {
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms?: string[];
  top_opportunities?: string[];
  auto_schedule?: boolean;
  posting_frequency?: string;
}

/**
 * Send a content generation request from Lynkscope to Cliplyst
 */
export async function sendContentJobToCliplyst(job: ContentJobRequest) {
  const apiKey = process.env.LYNKSCOPE_INTERNAL_KEY;
  const cliplystUrl = process.env.CLIPLYST_API_URL || 'https://cliplyst.vercel.app';

  const response = await fetch(`${cliplystUrl}/api/jobs/create-content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    throw new Error(`Cliplyst API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll for job status
 */
export async function getJobStatus(jobId: string) {
  const apiKey = process.env.LYNKSCOPE_INTERNAL_KEY;
  const cliplystUrl = process.env.CLIPLYST_API_URL || 'https://cliplyst.vercel.app';

  const response = await fetch(`${cliplystUrl}/api/jobs/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get job status`);
  }

  return response.json();
}
