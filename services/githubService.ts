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
