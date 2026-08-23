import { getGithubClient } from '../../config/github.js';

const SHORT_SHA_LENGTH = 7;

const correlateCommit = async ({ owner, repo, fileName }) => {
  if (!fileName) {
    return null;
  }

  const client = getGithubClient();
  const { data } = await client.rest.repos.listCommits({
    owner,
    repo,
    path: fileName,
    per_page: 1,
  });

  const [commit] = data;
  if (!commit) {
    return null;
  }

  return {
    sha: commit.sha.slice(0, SHORT_SHA_LENGTH),
    message: commit.commit.message.split('\n')[0],
    author: commit.author?.login || commit.commit.author?.name || 'unknown',
    url: commit.html_url,
    date: commit.commit.author?.date || null,
  };
};

export { correlateCommit };
