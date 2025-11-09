# Automated Factory Farm Objection Generator - Test Suite

This directory contains the test suite for verifying the functionality of the Automated Factory Farm Objection Generator.

## Running Tests

### Prerequisites
- Ensure the main application is running on `http://localhost:3000`
- Set up your environment variables (GEMINI_API_KEY, email credentials, etc.)

### Execute Tests

```bash
# Install test dependencies
npm install

# Run the test suite
npm run test
```

## Test Coverage

The test suite verifies the following functionality:

1. **Permit Processing**: Tests with real permit examples from `../backend/real_permits.json`
2. **Letter Generation**: Generates objection letters using AI with legal citations
3. **Submission Process**: Submits objection letters with proper validation
4. **PDF Generation**: Downloads and saves objection letters as PDF files
5. **End-to-End Flow**: Complete workflow from permit selection to PDF download

## Test Output

- Generated PDFs are saved to the `test-output/` directory
- Console output provides detailed status of each test
- Summary of successes and failures is provided at the end

## Sample Permits

The test suite uses 5 sample permits from the real permits dataset to validate the system functionality. Each permit represents a different type of factory farm operation to ensure broad coverage.