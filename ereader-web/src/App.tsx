import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LibraryDashboard } from './components/LibraryDashboard';
import { PDFReader } from './components/PDFReader';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LibraryDashboard />} />
        <Route path="/reader/:id" element={<PDFReader />} />
      </Routes>
    </Router>
  );
}

export default App;
