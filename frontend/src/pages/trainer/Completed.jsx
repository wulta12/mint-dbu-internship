import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService } from '../../services/api';

// Formats an ISO/timestamp value as a short local date, or a dash when absent.
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

// When did this trainee finish? A valid certificate is the strongest signal,
// otherwise the moment they passed the assessment. Falls back to a dash.
const completionDate = (p) => p.certificate_issued_at || p.assessment_passed_at || null;

const assessmentLabel = (p) => {
  if (!p.assessment_exists) return { label: 'No assessment', color: 'bg-gray-100 text-gray-600' };
  if (p.assessment_passed) {
    const score = p.assessment_best_score;
    return {
      label: score === null || score === undefined ? 'Passed' : `Passed (${score}%)`,
      color: 'bg-green-100 text-green-700'
    };
  }
  return { label: 'Not passed', color: 'bg-yellow-100 text-yellow-700' };
};

const certificateLabel = (p) =>
  p.has_certificate
    ? { label: 'Issued', color: 'bg-purple-100 text-purple-700' }
    : { label: 'Not issued', color: 'bg-gray-100 text-gray-600' };

// Required-lesson percentage when the course has content. A course with no
// required lessons can only be completed via a certificate/status, so it is
// shown as 100% rather than the meaningless 0-of-0.
const completionPercent = (p) =>
  p.required_lessons > 0 ? p.progress_percent : p.is_completed ? 100 : 0;

const TrainerCompleted = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await participantService.getCompletedByTrainer();
      setParticipants(res.participants || []);
    } catch (error) {
      console.error('Error fetching completed trainees:', error);
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
            <p className="text-mint-gray">Loading completed trainees...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/trainer/dashboard" className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-mint-primary">Completed Trainings</h1>
          <p className="text-mint-gray">
            Trainees who finished all required content for your trainings
          </p>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <CheckCircle className="w-12 h-12 text-mint-gray mx-auto mb-3" />
            <p className="text-mint-gray">No trainees have completed a training yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-mint-light border-b border-mint-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Trainee Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Course</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-mint-gray">Completion</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Completed</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Assessment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => {
                    const assessment = assessmentLabel(participant);
                    const certificate = certificateLabel(participant);
                    return (
                      <tr key={participant.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                        <td className="py-3 px-4 text-mint-primary font-medium">{participant.full_name}</td>
                        <td className="py-3 px-4 text-mint-gray">{participant.email}</td>
                        <td className="py-3 px-4 text-mint-gray">
                          {participant.training_title}
                          {participant.training_type ? (
                            <span className="block text-xs text-gray-400">{participant.training_type}</span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-right text-mint-primary font-semibold">
                          {completionPercent(participant)}%
                        </td>
                        <td className="py-3 px-4 text-sm text-mint-gray">
                          {formatDate(completionDate(participant))}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${assessment.color}`}>
                            {assessment.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${certificate.color}`}>
                            {certificate.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainerCompleted;