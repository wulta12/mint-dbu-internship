import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import MeetingsManager from '../../components/MeetingsManager';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Trainer view of live meetings.
 *
 * The picker is limited to trainings assigned to this trainer because
 * `trainingService.getMyTrainings()` only returns those, and the server
 * independently returns 403 for anything else.
 */
const TrainerMeetings = () => {
  const { trainingId } = useParams();
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/trainer" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            {t('Back to Dashboard')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('Live Meetings')}</h1>
          <p className="text-gray-500">{t('Schedule Zoom sessions and record attendance for your trainings')}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <MeetingsManager trainingId={trainingId} showTrainingSelect={!trainingId} />
        </div>
      </div>
    </AppLayout>
  );
};

export default TrainerMeetings;