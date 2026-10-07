import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Search,
  Loader2,
  AlertCircle,
  CalendarDays,
  GraduationCap,
  User,
  Hash,
  Building2
} from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { certificateService } from '../services/api';

// Public certificate verification.
//
// This is the page the QR code printed on every certificate points at
// ({FRONTEND_URL}/verify/{certificate_number}). It is intentionally public and
// unauthenticated: anyone holding a certificate number or verification code can
// confirm it is genuine. The API only ever returns public fields, so no private
// trainee data is exposed by this route.
const VerifyCertificate = () => {
  const { code } = useParams();

  const [reference, setReference] = useState(code || '');
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (value) => {
    const ref = String(value || '').trim();
    if (!ref) return;
    setLoading(true);
    setError('');
    setNotFound(false);
    setResult(null);
    try {
      const res = await certificateService.verify(ref);
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Could not reach the verification service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify automatically when the page is opened from a scanned QR code.
  useEffect(() => {
    if (code) lookup(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const cert = result?.certificate;
  const verified = !!result?.verified;

  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-mint-secondary to-mint-primary py-12 px-4">
        <div className="max-w-2xl mx-auto text-center text-white">
          <div className="w-16 h-16 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-mint-gold" />
          </div>
          <h1 className="text-3xl font-bold">Certificate Verification</h1>
          <p className="text-white/80 mt-2">
            Ministry of Innovation and Technology &mdash; MinT Training Management System
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-16">
        {/* Manual lookup */}
        <div className="bg-white rounded-xl shadow-card border border-mint-border p-6">
          <label htmlFor="cert-ref" className="block text-sm font-semibold text-mint-primary mb-1.5">
            Certificate Number or Verification Code
          </label>
          <p className="text-xs text-mint-gray mb-3">
            Scanning the QR code on a certificate opens this page automatically. You can also
            type the reference printed on the certificate.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(reference);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="cert-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. MINT-2026-000001"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !reference.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </form>
        </div>

        {/* Result */}
        {loading && (
          <div className="mt-6 bg-white rounded-xl shadow-card border border-mint-border p-10 text-center">
            <Loader2 className="w-10 h-10 text-mint-primary animate-spin mx-auto mb-3" />
            <p className="text-mint-gray">Checking the certificate&hellip;</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {notFound && !loading && (
          <div className="mt-6 bg-white rounded-xl shadow-card border border-mint-border p-8 text-center">
            <ShieldAlert className="w-14 h-14 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800">Certificate Not Found</h2>
            <p className="text-mint-gray mt-2 text-sm">
              No certificate matches that number or code. Please check the value and try again.
            </p>
          </div>
        )}

        {result && !loading && (
          <div
            className={`mt-6 bg-white rounded-xl shadow-card overflow-hidden border ${
              verified ? 'border-mint-accent' : 'border-red-300'
            }`}
          >
            {/* Verdict banner */}
            <div className={`p-6 text-center text-white ${verified ? 'bg-mint-accent' : 'bg-red-600'}`}>
              {verified ? (
                <ShieldCheck className="w-14 h-14 mx-auto mb-2" />
              ) : (
                <ShieldAlert className="w-14 h-14 mx-auto mb-2" />
              )}
              <h2 className="text-2xl font-bold">{verified ? 'VALID CERTIFICATE' : 'INVALID CERTIFICATE'}</h2>
              <p className="text-white/90 text-sm mt-1">{result.message}</p>
            </div>

            {cert && (
              <div className="p-6">
                <div className="text-center pb-5 mb-5 border-b border-mint-border">
                  <p className="text-xs uppercase tracking-wide text-mint-gray">Awarded to</p>
                  <p className="text-2xl font-bold text-mint-primary mt-1">{cert.trainee_name || '—'}</p>
                  <p className="text-mint-gray mt-1">{cert.training_title || '—'}</p>
                </div>

                <dl className="space-y-3 text-sm">
                  <Detail icon={Hash} label="Certificate Number" value={cert.certificate_number} />
                  <Detail icon={ShieldCheck} label="Verification Code" value={cert.verification_code} />
                  <Detail icon={CalendarDays} label="Date of Issue" value={formatDate(cert.issue_date)} />
                  <Detail
                    icon={GraduationCap}
                    label="Training Period"
                    value={`${formatDate(cert.start_date)} – ${formatDate(cert.end_date)}`}
                  />
                  <Detail icon={User} label="Trainer" value={cert.trainer_name || '—'} />
                  <Detail icon={Building2} label="Department" value={cert.department_name || '—'} />
                  {cert.training_type && <Detail icon={Award} label="Training Type" value={cert.training_type} />}
                </dl>

                {!verified && cert.revoked_at && (
                  <div className="mt-5 bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                    <p className="font-semibold text-red-700">This certificate was revoked</p>
                    <p className="text-mint-gray mt-1">Revoked on {formatDate(cert.revoked_at)}</p>
                    {cert.revoked_reason && <p className="text-mint-gray mt-1">Reason: {cert.revoked_reason}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-mint-gray mt-8">
          Verification is performed directly against the MinT database. Only the fields shown above
          are published; no personal contact details are disclosed.
        </p>
        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-mint-primary hover:underline">
            Back to MinT home
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
};

const Detail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-mint-primary mt-0.5 shrink-0" />
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-mint-gray">{label}</dt>
      <dd className="text-gray-800 font-medium break-words">{value || '—'}</dd>
    </div>
  </div>
);

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default VerifyCertificate;
