// client/src/pages/admin/CommissionDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, Loader } from 'lucide-react';

const CommissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [commission, setCommission] = useState(null);

  useEffect(() => {
    const fetchCommission = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCommission({
        id: id,
        commissionNumber: id,
        client: {
          name: 'Victoria Adams',
          email: 'victoria@email.com',
          phone: '+1 (555) 123-4567',
        },
        style: 'Realistic Portrait',
        size: '24x36 inches',
        description: 'A family portrait featuring 4 members in a classic setting.',
        estimatedPrice: 2500,
        status: 'in_progress',
        deadline: '2024-02-15',
        createdAt: '2024-01-05T10:30:00Z',
      });
      
      setIsLoading(false);
    };

    fetchCommission();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="text-center py-24">
        <p className="text-stone-500">Commission not found</p>
        <Link to="/admin/commissions" className="text-amber-600 mt-4 inline-block">
          Back to Commissions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/admin/commissions')}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-2"
        >
          <ArrowLeft size={18} />
          Back to Commissions
        </button>
        <h1 className="text-2xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Commission {commission.commissionNumber}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Description</h2>
            <p className="text-stone-600">{commission.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Client</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={20} className="text-amber-600" />
                <p className="font-medium text-stone-900">{commission.client.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-stone-400" />
                <a href={`mailto:${commission.client.email}`} className="text-amber-600 text-sm">
                  {commission.client.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-stone-400" />
                <span className="text-stone-600 text-sm">{commission.client.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-stone-600">Style</span>
                <span className="text-stone-900">{commission.style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Size</span>
                <span className="text-stone-900">{commission.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Price</span>
                <span className="text-stone-900">${commission.estimatedPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-amber-500" />
                <div>
                  <p className="text-stone-500 text-sm">Deadline</p>
                  <p className="text-amber-700 font-medium">{commission.deadline}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionDetail;