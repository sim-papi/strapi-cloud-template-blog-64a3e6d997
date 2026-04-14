import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ErrorList from './pages/ErrorList';
import ErrorDetail from './pages/ErrorDetail';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="machine/:machineId" element={<ErrorList />} />
          <Route path="error/:errorCode" element={<ErrorDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
