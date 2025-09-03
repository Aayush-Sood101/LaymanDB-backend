const promptEnhancerService = require('./src/services/promptEnhancer.service');
const nlpService = require('./src/services/nlp.service');

async function testPromptServices() {
  console.log('Testing prompt services...');
  
  const testPrompt = 'Create a hospital schema';
  console.log('\nOriginal prompt:', testPrompt);
  
  // Test enhancement (subtle improvements)
  try {
    console.log('\n--- TESTING ENHANCEMENT (used by AI Fix button) ---');
    const enhancedPrompt = await promptEnhancerService.enhancePrompt(testPrompt);
    console.log('Enhanced prompt:', enhancedPrompt);
    console.log('Enhancement successful!');
  } catch (error) {
    console.error('Enhancement failed:', error);
  }
  
  // Test optimization (significant changes)
  try {
    console.log('\n--- TESTING OPTIMIZATION (used by Generate Schema) ---');
    const optimizedPrompt = await nlpService.optimizePrompt(testPrompt);
    console.log('Optimized prompt:', optimizedPrompt);
    console.log('Optimization successful!');
  } catch (error) {
    console.error('Optimization failed:', error);
  }
}

testPromptServices();
