# Contributing to Awesome Free Dev Tools

Thank you for your interest in contributing to Awesome Free Dev Tools! We welcome contributions from the community.

## 📌 Contribution Guidelines

Before submitting a Pull Request, please ensure the tool meets the following criteria:

- **Free & Usable:** Must have a genuinely free tier or be open-source (no temporary free trials).
- **Established & Active:** Must have proven community adoption (e.g., >100 GitHub stars, active users, or active maintenance). We currently do not accept brand-new personal side-projects.
- **Self-Promotion:** If you are submitting your own tool, please declare it in the PR description and ensure it meets the traction requirement above.
- **Proper Formatting:** Place the tool in the correct category and maintain alphabetical order.

## How to Contribute

### Adding a New Tool

1. Fork the repository
2. Add the tool to `data/tools.json` following the existing format:
   ```json
   {
       "name": "Tool Name",
       "url": "https://example.com",
       "category": "Category Name",
       "purpose": "Brief description of the tool",
       "pricing": "Free Tier / Open Source / Free"
   }
   ```
3. Run the build script to update README.md and docs/index.html:
   ```bash
   node scripts/build-readme.js
   ```
4. Commit your changes with a descriptive message
5. Push to your fork and submit a Pull Request

### Reporting Issues

If you find an issue with an existing tool (broken link, incorrect category, etc.), please:

1. Check if the issue has already been reported
2. Open a new issue with:
   - A clear title
   - Description of the problem
   - Suggested fix (if applicable)

### Suggesting Improvements

Have ideas for improving the project? We'd love to hear them! Please:

1. Open an issue describing your suggestion
2. Include details about why the change would be beneficial
3. Provide examples or mockups if applicable

## Development Setup

1. Clone the repository
2. Install dependencies (if any)
3. Run the build script to regenerate documentation

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing to Awesome Free Dev Tools, you agree that your contributions will be licensed under the MIT License.
