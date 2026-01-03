// Simple test script to check favorite functionality
const testFavorite = async () => {
  try {
    // Test the API endpoint directly
    const response = await fetch('http://localhost:3000/api/stock-analyses/1/favorite', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    console.log('Response body:', text);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testFavorite();
