const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load sample permits
const permitsPath = path.join(__dirname, '../backend/real_permits.json');
const samplePermits = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));

console.log(`Testing with ${samplePermits.length} sample permits...\n`);

// Mock submitter information for testing
const mockSubmitterInfo = {
  name: "Test NGO Representative",
  address: "123 Test Street",
  city: "Mumbai",
  postalCode: "400001",
  phone: "+91-9876543210",
  email: "test@example.com",
  date: new Date().toISOString().split('T')[0]
};

// Base URL for the API - adjust this if running on a different port
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testPermitGeneration(permit, index) {
  console.log(`\n--- Testing permit ${index + 1}/${samplePermits.length}: ${permit.project_title} ---`);
  
  try {
    // Step 1: Generate objection letter
    console.log("Step 1: Generating objection letter...");
    const letterResponse = await axios.post(`${BASE_URL}/api/generate-letter`, {
      permitDetails: {
        ...permit,
        yourName: mockSubmitterInfo.name,
        yourAddress: mockSubmitterInfo.address,
        yourCity: mockSubmitterInfo.city,
        yourPostalCode: mockSubmitterInfo.postalCode,
        yourPhone: mockSubmitterInfo.phone,
        yourEmail: mockSubmitterInfo.email,
        currentDate: mockSubmitterInfo.date
      }
    });
    
    if (letterResponse.data && letterResponse.data.letter) {
      console.log("✓ Objection letter generated successfully");
      
      // Step 2: Submit the objection
      console.log("Step 2: Submitting objection...");
      const submitResponse = await axios.post(`${BASE_URL}/api/submit-objection`, {
        permitDetails: permit,
        objectionLetter: letterResponse.data.letter,
        submitterInfo: mockSubmitterInfo
      });
      
      if (submitResponse.data && submitResponse.data.id) {
        console.log(`✓ Objection submitted successfully with ID: ${submitResponse.data.id}`);
        
        // Step 3: Try to download the PDF
        console.log("Step 3: Downloading PDF...");
        try {
          const pdfResponse = await axios.get(`${BASE_URL}/api/submissions/${submitResponse.data.id}/pdf`, {
            responseType: 'arraybuffer' // Expect binary data for PDF
          });
          
          if (pdfResponse.headers['content-type'].includes('application/pdf')) {
            console.log("✓ PDF downloaded successfully");
            
            // Save the PDF to test folder
            const pdfPath = path.join(__dirname, `../test-output/objection-${submitResponse.data.id}.pdf`);
            fs.writeFileSync(pdfPath, pdfResponse.data);
            console.log(`✓ PDF saved to: ${pdfPath}`);
          } else {
            console.log("⚠ Failed to download PDF - incorrect content type");
          }
        } catch (pdfError) {
          console.log(`⚠ PDF download failed: ${pdfError.message}`);
        }
        
        return { success: true, id: submitResponse.data.id };
      } else {
        console.log("⚠ Failed to submit objection");
        return { success: false, error: "Failed to submit objection" };
      }
    } else {
      console.log("⚠ Failed to generate objection letter");
      return { success: false, error: "Failed to generate objection letter" };
    }
  } catch (error) {
    console.log(`✗ Error processing permit: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("Starting automated factory farm objection generator tests...\n");
  
  // Create test output directory if it doesn't exist
  const testOutputDir = path.join(__dirname, '../test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  const results = [];
  let successCount = 0;
  
  // Test with first 5 permits (or all if less than 5)
  const permitsToTest = samplePermits.slice(0, 5);
  
  for (let i = 0; i < permitsToTest.length; i++) {
    const result = await testPermitGeneration(permitsToTest[i], i);
    results.push({ permit: permitsToTest[i].project_title, ...result });
    
    if (result.success) {
      successCount++;
    }
    
    // Add a small delay between requests to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total permits tested: ${permitsToTest.length}`);
  console.log(`Successful completions: ${successCount}`);
  console.log(`Failures: ${permitsToTest.length - successCount}`);
  
  if (successCount === permitsToTest.length) {
    console.log("\n🎉 All tests passed! The system is working correctly.");
  } else {
    console.log("\n⚠ Some tests failed. Please check the logs above.");
  }
  
  // Detailed results
  console.log("\nDetailed Results:");
  results.forEach((result, index) => {
    const status = result.success ? "✓" : "✗";
    console.log(`${status} Permit ${index + 1}: ${result.permit} ${result.success ? `- ID: ${result.id}` : `- Error: ${result.error}`}`);
  });
  
  console.log("\nTest output files saved to ./test-output/");
  console.log("=".repeat(60));
}

// Run the tests
runTests().catch(console.error);