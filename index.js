#!/usr/bin/env node

const fs = require("fs");
require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const { program } = require("commander");
const fetch = require("node-fetch");

program
  .version("1.0.0")
  .option(
    "-p, --platform <platform>",
    "Specify the platform (github or gitlab)",
    "github"
  )
  .option(
    "-i, --instructions",
    "Include instructions in the output file",
    false
  )
  .option(
    "-b, --base-url <base-url>",
    "Specify the GitLab base URL",
    "https://gitlab.com"
  )
  .option(
    "-s, --skip-folders <folders...>",
    "Folders to skip during traversal",
    parseList
  )
  .option(
    "-f, --skip-files <files...>",
    "Files to skip during traversal",
    parseList
  )
  // .option('-e, --extensions <extensions...>', 'File extensions to include during traversal')
  .arguments("<repoUrl> [specificPath]")
  .action((repoUrl, specificPath, options) => {
    main(
      repoUrl,
      specificPath,
      options.platform,
      options.instructions,
      options.baseUrl,
      options.skipFolders,
      options.skipFiles
    );
  });

program.parse(process.argv);

function parseList(value) {
  return value.split(",").map((item) => item.trim());
}

const allowedExtensions = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".md",
  ".mdx",
  ".html",
  ".csv",
  ".ini",
  ".cfg",
  ".conf",
  ".log",
  ".sh",
  ".bat",
  ".sql",
  ".php",
  ".java",
  ".rb",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".swift",
  ".pl",
  ".cgi",
  ".asm",
  ".m",
  ".mm",
  ".r",
  ".go",
  ".lua",
  ".perl",
  ".coffee",
  ".dart",
  ".groovy",
  ".kt",
  ".gradle",
  ".scala",
  ".ejs",
  ".jsp",
  ".pug",
  ".erb",
  ".hbs",
  ".twig",
  ".jsx",
  ".tsx",
  ".vue",
  ".clj",
  ".cljs",
  ".cljc",
  ".f",
  ".f90",
  ".f95",
  ".f03",
  ".f08",
  // Add more extensions as needed
];

const instructions = `
Prompt: Analyze the repository to understand its structure, purpose, and functionality. Follow these steps to study the codebase:

1. Read the README file to gain an overview of the project, its goals, and any setup instructions.

2. Examine the repository structure to understand how the files and directories are organized.

3. Identify the main entry point of the application (e.g., main.py, app.py, index.js) and start analyzing the code flow from there.

4. Study the dependencies and libraries used in the project to understand the external tools and frameworks being utilized.

5. Analyze the core functionality of the project by examining the key modules, classes, and functions.

6. Look for any configuration files (e.g., config.py, .env) to understand how the project is configured and what settings are available.

7. Investigate any tests or test directories to see how the project ensures code quality and handles different scenarios.

8. Review any documentation or inline comments to gather insights into the codebase and its intended behavior.

9. Identify any potential areas for improvement, optimization, or further exploration based on your analysis.

10. Provide a summary of your findings, including the project's purpose, key features, and any notable observations or recommendations.

Use the files and contents provided below to complete this analysis:
`;

function parseRepoUrl(repoUrl) {
  const githubRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
  const gitlabRegex = /^https?:\/\/(?:gitlab\.|)([^/]+)\/([^/]+)\/([^/]+)\/?$/;

  let match;
  if ((match = repoUrl.match(githubRegex))) {
    return [match[1], match[2]];
  } else if ((match = repoUrl.match(gitlabRegex))) {
    return [match[2], match[3]];
  } else {
    throw new Error("Invalid repository URL.");
  }
}

async function main(
  repoUrl,
  specificPath,
  platform,
  includeInstructions,
  baseUrl,
  skipFolders,
  skipFiles
) {
  const [owner, repo] = parseRepoUrl(repoUrl);
  let contentToSave = "";

  if (includeInstructions) {
    contentToSave += instructions;
  }

  // Fetch README, traverse repository, and fetch file contents
  const fileContents = await getFileContentsIteratively(
    platform,
    owner,
    repo,
    specificPath,
    baseUrl,
    skipFolders,
    skipFiles
  );
  contentToSave += fileContents;

  const outputFilename = `${repo}_contents.txt`;
  fs.writeFileSync(outputFilename, contentToSave, "utf8");

  console.log(`Repository contents saved to '${outputFilename}'.`);
}

async function getFileContentsIteratively(
  platform,
  owner,
  repo,
  path = "",
  gitlabBaseUrl = "https://gitlab.com",
  skipFolders = [],
  skipFiles = [],
  collectedContents = ""
) {
  let dirsToVisit = [{ path: path, fullPath: path }];
  let dirsVisited = new Set();
  const accessToken = process.env.GITLAB_TOKEN;
  while (dirsToVisit.length > 0) {
    const { path: currentPath, fullPath } = dirsToVisit.pop();
    dirsVisited.add(fullPath);
    let data;
    if (platform === "github") {
      const { data: githubData } = await octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
      });
      data = githubData;
    } else if (platform === "gitlab") {
      
      // Use Node.js 'fetch' to make HTTP requests to GitLab API  
      const gitlabResponse = await fetch(
        `${gitlabBaseUrl}/api/v4/projects/${encodeURIComponent(
          owner
        )}%2F${encodeURIComponent(
          repo
        )}/repository/tree?path=${encodeURIComponent(fullPath)}`,
        {
          headers: {
            "Private-Token": accessToken,
          },
        }
      );
      if (!gitlabResponse.ok) {
        throw new Error(
          `Failed to fetch content from GitLab: ${gitlabResponse.statusText}`
        );
      }
      data = await gitlabResponse.json();
    } else {
      throw new Error("Invalid platform specified.");
    }

    if (Array.isArray(data)) {
      for (const content of data) {
        if (content.type === "dir") {
          if (
            !dirsVisited.has(content.path) &&
            !skipFolders.includes(content.name)
          ) {
            dirsToVisit.push({ path: content.name, fullPath: content.path });
          }
        } else if (
          isAllowedFile(content.name) &&
          !skipFiles.includes(content.name)
        ) {
          let fileContent;
          if (platform === "github") {
            const githubFileContent = await octokit.repos.getContent({
              owner,
              repo,
              path: content.path,
            });
            fileContent = githubFileContent.data.content;
          } else if (platform === "gitlab") {
            // Use Node.js 'fetch' to make HTTP requests for file content from GitLab API
            const gitlabFileResponse = await fetch(
              `${gitlabBaseUrl}/api/v4/projects/${encodeURIComponent(
                owner
              )}%2F${encodeURIComponent(
                repo
              )}/repository/files/${encodeURIComponent(content.path)}/raw`, {
                headers: {
                  "Private-Token": accessToken,
                },
              }
            );
            if (!gitlabFileResponse.ok) {
              console.warn(
                `Failed to fetch content of file '${content.path}' from GitLab: ${gitlabFileResponse.statusText}`
              );
              continue;
            }
            fileContent = await gitlabFileResponse.text();
          }
          const decodedContent = Buffer.from(fileContent, "base64").toString(
            "utf8"
          );
          collectedContents += `File: ${content.path}\n${decodedContent}\n\n`;
        }
      }
    }
  }

  return collectedContents;
}

function isAllowedFile(fileName) {
  return allowedExtensions.some((extension) => fileName.endsWith(extension));
}
