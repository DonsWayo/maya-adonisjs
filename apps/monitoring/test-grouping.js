// Test AI grouping suggestions
async function testGroupingSuggestions() {
  try {
    // First, get the auth token (you need to be logged in)
    console.log('Note: You need to be authenticated to test this endpoint.');
    console.log('Using a test project ID...');
    
    const projectId = '7813765b-9930-49dc-924f-38c2e9d28f64';
    
    // Test with time range to get recent errors
    const response = await fetch(
      `http://localhost:3334/api/projects/${projectId}/ai-grouping/suggest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // You'll need to add your auth token here
          // 'Authorization': 'Bearer YOUR_TOKEN'
        },
        body: JSON.stringify({
          timeRange: '24h'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Grouping Suggestions:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGroupingSuggestions();