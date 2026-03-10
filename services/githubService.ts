export const createGithubIssue = async (title: string, body: string, labels: string[]): Promise<string> => {
  try {
    const response = await fetch('/api/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create issue');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Error in createGithubIssue:', error);
    throw error;
  }
};

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
}

export const getPendingUpdates = async (): Promise<PullRequest[]> => {
  try {
    const response = await fetch('/api/github-prs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch PRs');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in getPendingUpdates:', error);
    throw error;
  }
};

export const mergeUpdate = async (pullNumber: number): Promise<boolean> => {
  try {
    const response = await fetch('/api/github-prs', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pullNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to merge PR');
    }

    return true;
  } catch (error: any) {
    console.error('Error in mergeUpdate:', error);
    throw error;
  }
};
