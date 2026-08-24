import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, ArrowLeft, Search, FileText, CheckCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, certificateService, triggerDownload } from '../../services/api';
import { toast } from '../../components/Toast';

const TrainerCertificates = () => {
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const trainingsRes = await trainingService.getMyTrainings();
      setTrainings(trainingsRes.data?.trainings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (trainingId) => {
    if (!trainingId) {
      setParticipants([]);
      setIssuedCertificates([]);
      return;
    }
    try {
      setLoading(true);
      const [participantsRes, certsRes] = await Promise.all([
        participantService.getByTraining(trainingId),
        certificateService.getByTraining(trainingId)
      ]);
      const eligible = (participantsRes.participants || []).filter(p => 
        p.participation_status === 'approved' || p.participation_status === 'completed'
      );
      setParticipants(eligible);
      setIssuedCertificates(certsRes.certificates || []);
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
      setIssuedCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingSelect = async (e) => {
    const id = e.target.value;
    setSelectedTrainingId(id);
    await loadParticipants(id);
  };

  const isIssued = (participantId) => issuedCertificates.some(c => c.trainee_id === participantId);

  const handleGenerateCertificate = async (participant) => {
    try {
      await certificateService.issue(selectedTrainingId, participant.id);
      toast.success('Certificate generated successfully for ' + participant.full_name + '!');
      const certsRes = await certificateService.getByTraining(selectedTrainingId);
      setIssuedCertificates(certsRes.certificates || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    }
  };

  const handleDownloadCertificate = async (participant) => {
    const cert = issuedCertificates.find((c) => Number(c.trainee_id) === Number(participant.id));
    if (!cert) {
      toast.warning('Certificate not found for this participant');
      return;
    }
    try {
      const blob = await certificateService.download(cert.id);
      triggerDownload(blob, `certificate-${cert.certificate_number || cert.id}.html`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download certificate');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading certificates data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <Link to="/trainer" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
          <p className="text-gray-500">Generate and manage certificates for your trainees</p>
        </div>

        {/* Training Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Training</label>
          <select
            value={selectedTrainingId}
            onChange={handleTrainingSelect}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
          >
            <option value="">-- Select a training --</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.training_title} ({t.training_type})
              </option>
            ))}
          </select>
        </div>

        {!selectedTrainingId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Select a Training</h3>
            <p className="text-gray-400 text-sm mt-1">Choose a training from the dropdown above to manage certificates.</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Eligible Participants</h3>
            <p className="text-gray-400 text-sm mt-1">No participants have completed or been confirmed for this training yet.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/2 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Trainee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant, index) => (
                      <tr key={participant.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">{participant.full_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{participant.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {participant.participation_status || 'Confirmed'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {isIssued(participant.id) ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Issued
                              </span>
                            ) : (
                              <button
                                onClick={() => handleGenerateCertificate(participant)}
                                className="px-3 py-1 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-xs"
                              >
                                Generate
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadCertificate(participant)}
                              disabled={!isIssued(participant.id)}
                              className="px-3 py-1 border border-mint-primary text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-mint-primary"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Total: {participants.length} eligible participants
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainerCertificates;
