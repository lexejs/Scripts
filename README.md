# Azure DevOps PR Tracker

A web-based tool to track and verify pull requests in Azure DevOps repositories based on tags and branch verification.

## Features

- **Tag-based PR Tracking**: Find all pull requests associated with work items tagged with a specific tag
- **Branch Verification**: Check if PRs have been merged into a specific branch
- **Cherry-pick Detection**: Automatically detect when PRs have been cherry-picked to other branches
- **Work Item Integration**: Links PRs to their associated work items
- **Repository Filtering**: Filter results by repository name
- **Short Output Option**: Toggle between detailed and concise output formats
- **Copy to Clipboard**: Easily copy results to clipboard for sharing

## How to Use

1. **Setup**:
   - Open `index.html` in any modern web browser
   - Enter your Azure DevOps organization, project, and personal access token (PAT)
   - Your settings will be saved in your browser's local storage

2. **Search Configuration**:
   - Enter the tag to search for (e.g., "AddToUat")
   - Optionally specify a repository filter to narrow results
   - Optionally specify a branch to verify PRs against (e.g., "main", "develop")
   - Choose between short or detailed output format

3. **Results**:
   - Results are grouped by repository and target branch
   - PRs are sorted by completion date (newest first)
   - Verification status is indicated with icons:
     - ✅ - Verified by direct commit ID match
     - ✅🍒 - Verified by commit message match (cherry-pick)
     - ✅📝 - Verified by PR ID reference in commit message
     - ❌ - Not verified in branch

## Technical Details

- **API Usage**: Uses Azure DevOps REST API v7.0
- **Performance Optimizations**:
  - Caches commit information to reduce API calls
  - Processes PRs in parallel for faster verification
  - Limits commit history to 300 most recent commits
  - Batches commit comparisons to avoid overwhelming the API

## Requirements

- Modern web browser with JavaScript enabled
- Azure DevOps account with appropriate permissions
- Personal Access Token (PAT) with read access to repositories and work items

## Security Notes

- Your PAT is stored in your browser's local storage only
- No data is sent to any server other than Azure DevOps
- Consider using a PAT with minimal required permissions

## Limitations

- Branch verification is limited to the 300 most recent commits
- Cherry-pick detection relies on commit message matching
- Work item links must be properly configured in Azure DevOps

## License

This project is open source and available under the MIT License. 