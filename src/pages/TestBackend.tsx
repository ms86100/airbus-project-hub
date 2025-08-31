import React, { useState } from 'react';
import { apiClientBackend } from '../services/api_backend';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const TestBackend = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/health');
      const data = await response.json();
      setTestResult({ type: 'health', success: response.ok, data });
    } catch (error) {
      setTestResult({ type: 'health', success: false, error: error.message });
    }
    setLoading(false);
  };

  const testProjects = async () => {
    setLoading(true);
    try {
      const result = await apiClientBackend.getProjects();
      setTestResult({ type: 'projects', ...result });
    } catch (error) {
      setTestResult({ type: 'projects', success: false, error: error.message });
    }
    setLoading(false);
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const result = await apiClientBackend.getCurrentUser();
      setTestResult({ type: 'auth', ...result });
    } catch (error) {
      setTestResult({ type: 'auth', success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Local Backend Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testHealthCheck} disabled={loading}>
              Test Health Check
            </Button>
            <Button onClick={testProjects} disabled={loading}>
              Test Projects API
            </Button>
            <Button onClick={testAuth} disabled={loading}>
              Test Auth API
            </Button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">
                {testResult.type} Test Result:
              </h3>
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Local Setup Status:</h3>
            <ul className="text-sm space-y-1">
              <li>✅ Backend running on: http://localhost:4000</li>
              <li>✅ Frontend running on: http://localhost:5173</li>
              <li>🔧 Using api_backend.ts for local testing</li>
              <li>🏢 Original api.ts unchanged for production</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestBackend;