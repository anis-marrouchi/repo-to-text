# RepoToText

RepoToText is a command-line tool that analyzes GitHub or GitLab repositories and extracts the contents of files into a single text file. It can be useful for understanding the structure, purpose, and functionality of a codebase, and it's inspired by [RepoToTextForLLMs](https://github.com/Doriandarko/RepoToTextForLLMs) by Doriandarko.

## Installation

To install RepoToText locally, follow these steps:

1. Clone this repository or download the latest release.
2. Install Node.js if you haven't already.
3. Install dependencies by running `npm install` in the repository directory.

To install RepoToText globally using npm, run the following command:

```bash
npm install -g repototext
```

After installation, you can use RepoToText as a global command in your terminal.

## Usage

To use RepoToText, run the following command:

```bash
repo-to-text <repoUrl> [specificPath] [options]
```

Replace `<repoUrl>` with the URL of the GitHub or GitLab repository you want to analyze. You can also specify an optional `specificPath` within the repository to analyze only a specific folder.

### Options:

- `-p, --platform <platform>`: Specify the platform (github or gitlab). Default is github.
- `-i, --instructions`: Include instructions in the output file.
- `-b, --base-url <base-url>`: Specify the GitLab base URL. Default is https://gitlab.com.
- `-s, --skip-folders <folders...>`: Folders to skip during traversal.
- `-f, --skip-files <files...>`: Files to skip during traversal.

### Example:

To analyze a GitHub repository without including instructions and skip some folders/files:

```bash
repo-to-text https://github.com/owner/repo specificPath -i -s folder1,folder2 -f file1,file2
```

## Credits

RepoToText was inspired by [RepoToTextForLLMs](https://github.com/Doriandarko/RepoToTextForLLMs) by Doriandarko.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.