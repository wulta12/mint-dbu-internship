import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, FileText, ArrowLeft, Download } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { certificateService, triggerDownload } from '../../services/api';

const Certificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await certificateService.getMyCertificates();
        setCertificates(res.certificates || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  const handleDownload = async (cert) => {
    try {
      const blob = await certificateService.download(cert.id);
      triggerDownload(blob, `certificate-${cert.certificate_number || cert.id}.html`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download certificate');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading certificates...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <button 
          onClick={() => navigate('/trainee')}
          className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-mint-primary">My Certificates</h1>
        <p className="text-mint-gray">View and download your certificates</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {!error && certificates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Award className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Certificates Yet</h3>
          <p className="text-mint-gray">Complete your trainings to earn certificates.</p>
          <button
            onClick={() => navigate('/trainee/trainings')}
            className="mt-4 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Browse Available Trainings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-xl shadow-card p-6 hover:shadow-card-hover transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-mint-gold/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-mint-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-mint-primary">{cert.training_title}</h3>
                  <p className="text-sm text-mint-gray">Issued: {new Date(cert.issue_date).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => handleDownload(cert)} className="mt-4 w-full flex items-center justify-center gap-2 bg-mint-primary text-white py-2 rounded-lg hover:bg-opacity-90 transition">
                <Download className="w-4 h-4" />
                Download Certificate
              </button>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Certificates;
