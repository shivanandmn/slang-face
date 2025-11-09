import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { runIntegrationTests, runSmokeTest, getTestResults, clearTestResults } from '../tests/integrationTests';
import { useRoomContext } from '../contexts/RoomContext';
import { logger } from '../utils/logger';

export const TestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(getTestResults());
  const [smokeTestPassed, setSmokeTestPassed] = useState<boolean | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  
  const roomState = useRoomContext();
  
  const runSmokeTests = async () => {
    try {
      setIsRunning(true);
      logger.info('[test-ui]', 'Running smoke tests');
      
      const passed = await runSmokeTest();
      setSmokeTestPassed(passed);
      setLastRunTime(new Date());
      
    } catch (error) {
      logger.error('[test-ui]', 'Smoke test error:', error);
      setSmokeTestPassed(false);
    } finally {
      setIsRunning(false);
    }
  };
  
  const runFullTests = async () => {
    try {
      setIsRunning(true);
      clearTestResults();
      setTestResults({ suites: [], summary: { suites: 0, totalTests: 0, totalPassed: 0, totalFailed: 0, totalDuration: 0, passRate: 0 } });
      
      logger.info('[test-ui]', 'Running full integration tests');
      
      await runIntegrationTests();
      const results = getTestResults();
      setTestResults(results);
      setLastRunTime(new Date());
      
    } catch (error) {
      logger.error('[test-ui]', 'Integration test error:', error);
      const results = getTestResults();
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };
  
  const clearResults = () => {
    clearTestResults();
    setTestResults({ suites: [], summary: { suites: 0, totalTests: 0, totalPassed: 0, totalFailed: 0, totalDuration: 0, passRate: 0 } });
    setSmokeTestPassed(null);
    setLastRunTime(null);
  };
  
  // Auto-refresh results every few seconds when tests are running
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        const results = getTestResults();
        setTestResults(results);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isRunning]);
  
  const { summary } = testResults;
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phase 6 Integration Tests</h1>
            <p className="text-gray-600">State management, event handling, and integration testing</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={runSmokeTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>Smoke Test</span>
            </button>
            <button
              onClick={runFullTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>Full Tests</span>
            </button>
            <button
              onClick={clearResults}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
        
        {lastRunTime && (
          <p className="text-sm text-gray-500">
            Last run: {lastRunTime.toLocaleTimeString()}
          </p>
        )}
      </div>
      
      {/* Room State Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Room State</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Connection</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Connected:</span>
                <span className={roomState.isConnected ? 'text-green-600' : 'text-red-600'}>
                  {roomState.isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Connecting:</span>
                <span className={roomState.isConnecting ? 'text-yellow-600' : 'text-gray-600'}>
                  {roomState.isConnecting ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Joined:</span>
                <span className={roomState.isJoined ? 'text-green-600' : 'text-red-600'}>
                  {roomState.isJoined ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Audio</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Enabled:</span>
                <span className={roomState.isAudioEnabled ? 'text-green-600' : 'text-red-600'}>
                  {roomState.isAudioEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Speaking:</span>
                <span className={roomState.isSpeaking ? 'text-green-600' : 'text-gray-600'}>
                  {roomState.isSpeaking ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Level:</span>
                <span>{Math.round(roomState.audioLevel * 100)}%</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Chat & Participants</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Messages:</span>
                <span>{roomState.messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Unread:</span>
                <span className={roomState.unreadCount > 0 ? 'text-red-600' : 'text-gray-600'}>
                  {roomState.unreadCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Participants:</span>
                <span>{roomState.participants.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        {roomState.lastError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{roomState.lastError}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Smoke Test Results */}
      {smokeTestPassed !== null && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Smoke Test Results</h2>
          <div className="flex items-center space-x-2">
            {smokeTestPassed ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">All basic functionality working</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-medium">Basic functionality issues detected</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Test Summary */}
      {summary.totalTests > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.totalPassed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.totalFailed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(summary.passRate)}%</div>
              <div className="text-sm text-gray-600">Pass Rate</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${summary.passRate}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Test Suites */}
      {testResults.suites.map((suite, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{suite.name}</h3>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600">{suite.passed} passed</span>
              <span className="text-red-600">{suite.failed} failed</span>
              <span className="text-gray-500">{suite.duration}ms</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {suite.tests.map((test, testIndex) => (
              <div key={testIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {test.passed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{test.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{test.duration}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Running Indicator */}
      {isRunning && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Running tests...</span>
        </div>
      )}
    </div>
  );
};
