export default async function handler(req, res) {
  const token = process.env.GITHUB_DEV_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'GitHub credentials are not configured on the server' });
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching PRs:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  } 
  
  if (req.method === 'PUT') {
    const { pullNumber } = req.body;
    if (!pullNumber) {
      return res.status(400).json({ error: 'pullNumber is required' });
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          merge_method: 'squash'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error merging PR:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
