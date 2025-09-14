async function globalTeardown() {
  console.log('Starting global test teardown...');

  try {
    // Clean up test data
    // Close database connections
    // Remove temporary files
    // Reset any global state

    console.log('Global teardown completed successfully');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;