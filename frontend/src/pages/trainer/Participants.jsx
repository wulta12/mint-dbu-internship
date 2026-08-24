import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService, trainingService } from '../../services/api';

const TrainerParticipants = () => {
  const { trainingId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [trainingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trainingRes, participantsRes] = await Promise.all([
        trainingService.getById(trainingId),
        participantService.getByTraining(trainingId)
      ]);
      setTraining(trainingRes.data?.training || trainingRes.training || null);
      setParticipants(participantsRes.participants || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading participants...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/trainer/trainings" className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to My Trainings
          </Link>
          <h1 className="text-2xl font-bold text-mint-primary">Participants</h1>
          <p className="text-mint-gray">Training: {training?.training_title || 'Not found'}</p>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <Users className="w-12 h-12 text-mint-gray mx-auto mb-3" />
            <p className="text-mint-gray">No participants registered for this training yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-mint-light border-b border-mint-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                      <td className="py-3 px-4 text-mint-primary font-medium">{participant.full_name}</td>
                      <td className="py-3 px-4 text-mint-gray">{participant.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          participant.participation_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          participant.participation_status === 'approved' ? 'bg-green-100 text-green-700' :
                          participant.participation_status === 'attended' ? 'bg-blue-100 text-blue-700' :
                          participant.participation_status === 'completed' ? 'bg-purple-100 text-purple-700' :
                          participant.participation_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {participant.participation_status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-mint-gray">
                        {participant.registered_at ? new Date(participant.registered_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainerParticipants;
