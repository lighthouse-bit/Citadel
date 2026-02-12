import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Package, Palette, LogOut, User, Loader } from 'lucide-react';
import { ordersAPI, commissionsAPI } from '../services/api';

const Account = () => {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setDataLoading(true);
      try {
        // Fetch USER SPECIFIC data
        const ordersRes = await ordersAPI.getAll({ customerEmail: user.email });
        setOrders(ordersRes.data?.orders || []);

        const commissionsRes = await commissionsAPI.getAll({ scope: 'user' });
        setCommissions(commissionsRes.data?.commissions || []);
      } catch (error) {
        console.error("Error fetching user data", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading) return <div className="min-h-screen bg-stone-50"></div>;

  return (
    <div className="pt-24 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center mb-6">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                <User size={40} />
              </div>
              <h2 className="text-xl font-serif text-stone-900">{user?.name}</h2>
              <p className="text-sm text-stone-500 truncate">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Package size={18} /> Orders
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'commissions' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Palette size={18} /> Commissions
              </button>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-red-600 hover:bg-red-50 transition-colors border border-stone-200"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-3xl font-serif text-stone-900 mb-6">
              {activeTab === 'orders' ? 'Order History' : 'Commission Requests'}
            </h1>

            {dataLoading ? (
              <div className="flex justify-center py-12"><Loader className="animate-spin text-amber-600" /></div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'orders' ? (
                  orders.length > 0 ? (
                    orders.map(order => (
                      <div key={order.id} className="bg-white p-6 rounded-xl border border-stone-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium text-stone-900">#{order.orderNumber}</span>
                          <span className={`px-3 py-1 text-xs rounded-full uppercase tracking-wider ${
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="border-t border-stone-100 pt-4">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm mb-2 text-stone-600">
                              <span>{item.artwork?.title || "Artwork"}</span>
                              <span>${Number(item.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-sm text-stone-500 pt-4 mt-2 border-t border-stone-100">
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="text-stone-900 font-medium text-lg">${Number(order.total).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
                      <p className="text-stone-500">No orders found.</p>
                    </div>
                  )
                ) : (
                  commissions.length > 0 ? (
                    commissions.map(comm => (
                      <div key={comm.id} className="bg-white p-6 rounded-xl border border-stone-200">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <span className="font-medium text-stone-900 block">{comm.style}</span>
                            <span className="text-xs text-stone-400">ID: {comm.commissionNumber}</span>
                          </div>
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full uppercase tracking-wider">
                            {comm.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-stone-600 text-sm mb-4">{comm.description}</p>
                        <div className="flex justify-between text-xs text-stone-500 pt-4 border-t border-stone-100">
                          <span>Created: {new Date(comm.createdAt).toLocaleDateString()}</span>
                          <span>Est. Price: ${Number(comm.estimatedPrice).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
                      <p className="text-stone-500">No commissions found.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;