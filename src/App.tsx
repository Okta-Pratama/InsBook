import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './components/AuthPage';
import { LibraryDashboard } from './components/LibraryDashboard';
import { PDFReader } from './components/PDFReader';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <LibraryDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reader/:id" 
            element={
              <ProtectedRoute>
                <PDFReader />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
