import { Octokit } from 'octokit';
import config from './index.js';

let octokit;

function getGithubClient() {
  if (!octokit) {
    octokit = new Octokit({ auth: config.github.token });
  }
  return octokit;
}

export { getGithubClient };
