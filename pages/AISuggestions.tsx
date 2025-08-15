import React, { useState } from 'react';
import { getAIBusinessSuggestion } from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FaBrain, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const examplePrompts = [
  "Analyze my top 5 best and worst-selling items. Suggest menu changes.",
  "Create a marketing promotion for the upcoming weekend to boost sales.",
  "Suggest ways to reduce food costs without sacrificing quality.",
  "Give me a script for upselling drinks and desserts to customers."
];

const AISuggestions: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt || isLoading) return;
    setIsLoading(true);
    setResponse('');
    try {
      const result = await getAIBusinessSuggestion(prompt);
      setResponse(result);
    } catch (error) {
      setResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <FaBrain className="text-2xl text-primary-orange-500" />
            <h2 className="text-xl font-bold">Business Growth Insights</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Ask 'Jobi', your digital assistant, for data-driven advice to grow your business.
          </p>
          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., How can I improve customer loyalty?"
              className="w-full h-32 p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 bg-gray-50 dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500 dark:text-gray-200"
              disabled={isLoading}
            />
            <Button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full" icon={<FaPaperPlane/>}>
              {isLoading ? 'Thinking...' : 'Generate Insight'}
            </Button>
          </div>
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Example Prompts</h3>
            <div className="space-y-2">
                {examplePrompts.map((ex, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleExampleClick(ex)} 
                        className="w-full text-left text-sm p-2 rounded-md bg-gray-100 dark:bg-dark-mode-blue-800 hover:bg-gray-200 dark:hover:bg-dark-mode-blue-700 transition-colors"
                    >
                        {ex}
                    </button>
                ))}
            </div>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="min-h-[60vh]">
          <h2 className="text-xl font-bold mb-4">Jobi's Analysis</h2>
          {isLoading && (
            <div className="flex justify-center items-center h-full">
               <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-orange-500"></div>
            </div>
          )}
          {response && (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:text-primary-orange-600 dark:prose-headings:text-primary-orange-400 prose-strong:text-gray-800 dark:prose-strong:text-gray-200">
                <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          )}
          {!isLoading && !response && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10">
              <p>Your AI-powered report will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// Dummy ReactMarkdown component if the library is not available.
// In a real scenario, you'd install `react-markdown`.
const ReactMarkdownDummy: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="whitespace-pre-wrap">{children}</div>;
};

if (typeof ReactMarkdown === 'undefined') {
    (window as any).ReactMarkdown = ReactMarkdownDummy;
}

export default AISuggestions;