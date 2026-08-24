import React, { useState, useEffect } from 'react';
import { Award, Download, Search, FileText, PlusCircle, CheckCircle, Building2 } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, certificateService, triggerDownload } from '../../services/api';
import { toast } from '../../components/Toast';

const Certificates = () => {
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [eligible, setEligible] = useState([]);
  const [issuedMap, setIssuedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [issuingId, setIssuingId] = useState(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await trainingService.getAll();
      setTrainings(res.data?.trainings || []);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async (trainingId) => {
    try {
      setLoading(true);
      const [participantsRes, certRes] = await Promise.all([
        participantService.getByTraining(trainingId),
        certificateService.getByTraining(trainingId)
      ]);

      const approved = (participantsRes.participants || []).filter(
        (p) => p.participation_status === 'approved' || p.participation_status === 'completed'
      );
      setEligible(approved);

      const map = {};
      (certRes.data?.certificates || []).forEach((c) => {
        map[String(c.trainee_id)] = c;
      });
      setIssuedMap(map);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingSelect = async (e) => {
    const id = e.target.value;
    setSelectedTrainingId(id);
    setSearchTerm('');
    if (id) {
      await loadTrainingData(id);
    } else {
      setEligible([]);
      setIssuedMap({});
    }
  };

  const handleIssue = async (trainee) => {
    if (issuingId) return;
    setIssuingId(trainee.trainee_id || trainee.id);
    try {
      await certificateService.issue(selectedTrainingId, trainee.trainee_id || trainee.id);
      toast.success('Certificate issued successfully');
      await loadTrainingData(selectedTrainingId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue certificate');
    } finally {
      setIssuingId(null);
    }
  };

  const handleDownload = async (certificate) => {
    try {
      const blob = await certificateService.download(certificate.id);
      triggerDownload(blob, `certificate-${certificate.certificate_number || certificate.id}.html`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download certificate');
    }
  };

  const filtered = eligible.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (p.full_name || '').toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term);
  });

  if (loading && trainings.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mint-primary">Certificate Management</h1>
        <p className="text-mint-gray">Generate and manage certificates for trainees.</p>
      </div>

      {/* Training selector */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-6">
        <label className="block text-sm font-semibold text-mint-primary mb-2">Select Training</label>
        <select
          value={selectedTrainingId}
          onChange={handleTrainingSelect}
          className="w-full md:w-1/2 px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
        >
          <option value="">-- Select a training --</option>
          {trainings.map((t) => (
            <option key={t.id} value={t.id}>{t.training_title} ({t.training_type})</option>
          ))}
        </select>
      </div>

      {!selectedTrainingId ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Award className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">Select a Training</h3>
          <p className="text-mint-gray text-sm mt-1">Choose a training program to manage its certificates.</p>
        </div>
      ) : eligible.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <FileText className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Eligible Trainees</h3>
          <p className="text-mint-gray text-sm mt-1">No approved or completed trainees for this training yet.</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trainees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/2 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
            />
          </div>

          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-mint-light border-b border-mint-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Trainee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Certificate</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((participant, index) => {
                    const cert = issuedMap[String(participant.trainee_id || participant.id)];
                    return (
                      <tr key={participant.trainee_id || participant.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                        <td className="py-3 px-4 text-sm text-mint-gray">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-mint-primary">{participant.full_name}</td>
                        <td className="py-3 px-4 text-sm text-mint-gray">{participant.email}</td>
                        <td className="py-3 px-4">
                          {cert ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {cert.certificate_number}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Not issued</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {!cert ? (
                              <button
                                onClick={() => handleIssue(participant)}
                                disabled={issuingId === (participant.trainee_id || participant.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-xs disabled:opacity-50"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                {issuingId === (participant.trainee_id || participant.id) ? 'Issuing...' : 'Issue'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownload(cert)}
                                className="flex items-center gap-1 px-3 py-1.5 border border-mint-primary text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-mint-gray">
            <Building2 className="w-4 h-4" />
            {Object.keys(issuedMap).length} of {eligible.length} eligible trainees have been issued a certificate.
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Certificates;
