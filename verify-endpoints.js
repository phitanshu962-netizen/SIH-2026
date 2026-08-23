async function verify() {
  console.log('--- Verifying BIS Compliance Chat Route ---');
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'What are the requirements of TMT steel bars under IS 1786?',
        persona: 'manufacturer'
      })
    });

    console.log('Response Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Model Used:', data.modelName);
      console.log('Engine Used:', data.engineUsed);
      console.log('Confidence Score:', data.confidenceScore);
      console.log('--- Summary Response ---');
      console.log(data.summaryExplanation);
    } else {
      const err = await response.text();
      console.error('Request failed:', err);
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

verify();
