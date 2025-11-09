import React, { useEffect } from 'react';
import { RoomProvider, useRoomConnection } from './contexts/RoomContext';
import { AccessibleJoinForm } from './components/AccessibleJoinForm';
import { RoomView } from './components/RoomView';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompatibilityWarning } from './components/CompatibilityWarning';
import { getAnimationClasses } from './utils/animations';
import { initializeAccessibility } from './utils/accessibility';

function AppContent() {
  const { isJoined } = useRoomConnection();

  return (
    <>
      {/* Compatibility Warning */}
      <CompatibilityWarning />
      
      {/* Main Content */}
      <main 
        id="main-content"
        className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${getAnimationClasses.fadeIn('normal')}`}
      >
        {isJoined ? (
          <RoomView />
        ) : (
          <AccessibleJoinForm />
        )}
      </main>
    </>
  );
}

function App() {
  // Initialize accessibility features
  useEffect(() => {
    initializeAccessibility();
  }, []);

  return (
    <ErrorBoundary maxRetries={3} resetOnPropsChange>
      <ToastProvider>
        <RoomProvider>
          <AppContent />
        </RoomProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App
