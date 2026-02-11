// client/src/pages/AdminDashboard.jsx
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="pt-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif text-white mb-8">Admin Dashboard</h1>
        {/* Add admin functionality here */}
      </div>
    </div>
  );
};

export default AdminDashboard;