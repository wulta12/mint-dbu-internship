// End-to-end test of the live-meeting feature.
//
//   node test-training-meetings.js
//
// The point of this suite is the ACCESS RULES, so it builds its own
// throwaway fixtures (admin, owning trainer, foreign trainer, and one
// trainee per enrollment state) and then asserts who may see a meeting
// and who may not. It also asserts the two things that must NOT change:
// learning progress / certificates ignore meetings entirely, and joining
// needs no progress threshold.
//
// Every fixture is deleted on the way out. No real account, enrollment,
// certificate or progress row is written to.
require('dotenv').config();
const { pool, query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const app = require('./src/server');
const PORT = 5098;
const BASE = `http://localhost:${PORT}`;

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n          expected: ${expected}\n          actual:   ${actual}`}`);
  ok ? pass++ : fail++;
};

const call = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
};

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

(async () => {
  let server;
  const ids = { users: [], trainings: [], meetings: [] };
  const T = {};

  try {
    const hash = await bcrypt.hash('MeetingFixturePass123', 10);
    const mkUser = async (name, role) => {
      const r = await query(
        `INSERT INTO users (full_name, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [name, `meeting-test-${name.toLowerCase().replace(/\W+/g, '')}-${Date.now()}@example.test`, hash, role]
      );
      ids.users.push(r.rows[0].id);
      return r.rows[0].id;
    };

    console.log('=== 0. Fixtures ===');
    T.admin = await mkUser('MT Admin', 'admin');
    T.ownerTrainer = await mkUser('MT Owner', 'trainer');
    T.otherTrainer = await mkUser('MT Foreign', 'trainer');
    T.approved = await mkUser('MT Approved', 'trainee');
    T.pending = await mkUser('MT Pending', 'trainee');
    T.rejected = await mkUser('MT Rejected', 'trainee');
    T.cancelled = await mkUser('MT Cancelled', 'trainee');
    T.stranger = await mkUser('MT Stranger', 'trainee');
    T.progress0 = await mkUser('MT Progress0', 'trainee');

    const subject = await query(`SELECT id FROM subjects ORDER BY id LIMIT 1`);
    const mkTraining = async (title, trainerId) => {
      const r = await query(
        `INSERT INTO trainings (subject_id, training_title, training_description, training_type,
                                start_date, end_date, capacity, status, trainer_id, is_all_departments)
         VALUES ($1, $2, 'fixture', 'Online', NOW(), NOW() + INTERVAL '30 days', 50, 'open', $3, true)
         RETURNING id`,
        [subject.rows[0].id, title, trainerId]
      );
      ids.trainings.push(r.rows[0].id);
      return r.rows[0].id;
    };

    T.owned = await mkTraining('MT Owned Training', T.ownerTrainer);
    T.foreign = await mkTraining('MT Foreign Training', T.otherTrainer);

    // One trainee per enrollment state against T.owned.
    const enroll = async (trainingId, traineeId, status) => {
      await query(
        `INSERT INTO training_requests (training_id, trainee_id, status) VALUES ($1, $2, $3)`,
        [trainingId, traineeId, status]
      );
    };
    await enroll(T.owned, T.approved, 'approved');
    await enroll(T.owned, T.progress0, 'approved');
    await enroll(T.owned, T.pending, 'pending');
    await enroll(T.owned, T.rejected, 'rejected');
    await enroll(T.owned, T.cancelled, 'cancelled');
    // Approved for the OTHER training only - proves enrollment is per training.
    await enroll(T.foreign, T.stranger, 'approved');

    const token = async (userId) => {
      const jwt = require('jsonwebtoken');
      return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    };

    const tokens = {
      admin: await token(T.admin),
      owner: await token(T.ownerTrainer),
      other: await token(T.otherTrainer),
      approved: await token(T.approved),
      pending: await token(T.pending),
      rejected: await token(T.rejected),
      cancelled: await token(T.cancelled),
      stranger: await token(T.stranger),
      progress0: await token(T.progress0)
    };

    server = app.listen(PORT);
    await new Promise((r) => server.once('listening', r));
    console.log('  fixture training (owned by MT Owner):', T.owned);
    console.log('  fixture training (owned by MT Foreign):', T.foreign, '\n');

    // -------------------------------------------------------------------
    console.log('=== 1. Admin and the owning trainer can create meetings ===');
    const adminCreate = await call('POST', `/api/meeting/training/${T.owned}`, {
      title: 'AI Fundamentals - Live Session 1',
      platform: 'zoom',
      meeting_link: 'https://zoom.us/j/1111111111?pwd=abcdefghijklmnop',
      meeting_date: iso(5),
      start_time: '10:00',
      end_time: '12:00'
    }, tokens.admin);
    check('admin create -> 201', adminCreate.status, 201);
    const m1 = adminCreate.data?.data?.meeting;
    check('meeting belongs to the training', m1?.training_id, T.owned);
    check('platform stored as zoom', m1?.platform, 'zoom');
    ids.meetings.push(m1.id);

    const trainerCreate = await call('POST', `/api/meeting/training/${T.owned}`, {
      title: 'AI Fundamentals - Live Session 2',
      platform: 'zoom',
      meeting_link: 'https://zoom.us/j/2222222222?pwd=qrstuvwxyz123456',
      meeting_date: iso(6),
      start_time: '10:00',
      end_time: '11:00'
    }, tokens.owner);
    check('owning trainer create -> 201', trainerCreate.status, 201);
    ids.meetings.push(trainerCreate.data?.data?.meeting?.id);

    const third = await call('POST', `/api/meeting/training/${T.owned}`, {
      title: 'AI Fundamentals - Live Session 3',
      platform: 'zoom',
      meeting_link: 'https://zoom.us/j/3333333333',
      meeting_date: iso(7),
      start_time: '14:00',
      end_time: '16:00'
    }, tokens.admin);
    check('a training can hold many meetings -> 3 total', third.status, 201);
    ids.meetings.push(third.data?.data?.meeting?.id);

    const manageList = await call('GET', `/api/meeting/training/${T.owned}/manage`, null, tokens.owner);
    check('management list returns all 3', manageList.data?.data?.meetings?.length, 3);

    // -------------------------------------------------------------------
    console.log('\n=== 2. A trainer cannot touch trainings assigned to someone else ===');
    check('foreign trainer create on owned training -> 403',
      (await call('POST', `/api/meeting/training/${T.owned}`, {
        title: 'Should Fail', platform: 'zoom', meeting_link: 'https://zoom.us/j/999',
        meeting_date: iso(3), start_time: '09:00', end_time: '10:00'
      }, tokens.other)).status, 403);

    check('foreign trainer list on owned training -> 403',
      (await call('GET', `/api/meeting/training/${T.owned}/manage`, null, tokens.other)).status, 403);

    check('foreign trainer edit on owned meeting -> 403',
      (await call('PUT', `/api/meeting/${m1.id}`, { title: 'Hijacked Title' }, tokens.other)).status, 403);

    check('foreign trainer delete on owned meeting -> 403',
      (await call('DELETE', `/api/meeting/${m1.id}`, null, tokens.other)).status, 403);

    check('owning trainer edit -> 200',
      (await call('PUT', `/api/meeting/${m1.id}`, { title: 'AI Fundamentals - Live Session 1 (revised)' }, tokens.owner)).status, 200);

    check('admin can create on ANY training (not just their own)',
      (await call('POST', `/api/meeting/training/${T.foreign}`, {
        title: 'Admin Made This', platform: 'zoom', meeting_link: 'https://zoom.us/j/4444',
        meeting_date: iso(2), start_time: '08:00', end_time: '09:00'
      }, tokens.admin)).status, 201);

    // -------------------------------------------------------------------
    console.log('\n=== 3. Trainee access is gated on APPROVED enrollment only ===');
    const asApproved = await call('GET', `/api/meeting/training/${T.owned}`, null, tokens.approved);
    check('approved trainee -> 200', asApproved.status, 200);
    check('approved trainee sees upcoming meetings', asApproved.data?.data?.meetings?.length, 3);
    check('approved trainee receives the join link',
      typeof asApproved.data?.data?.meetings?.[0]?.meeting_link, 'string');

    for (const [label, tk] of [['pending', tokens.pending], ['rejected', tokens.rejected],
                                ['cancelled', tokens.cancelled]]) {
      const r = await call('GET', `/api/meeting/training/${T.owned}`, null, tk);
      check(`${label} trainee -> 403`, r.status, 403);
      check(`${label} trainee receives no meeting data`, r.data?.data, undefined);
    }

    const stranger = await call('GET', `/api/meeting/training/${T.owned}`, null, tokens.stranger);
    check('approved for a DIFFERENT training -> 403', stranger.status, 403);

    check('trainee blocked from the management endpoint',
      (await call('GET', `/api/meeting/training/${T.owned}/manage`, null, tokens.approved)).status, 403);
    check('trainee cannot create a meeting',
      (await call('POST', `/api/meeting/training/${T.owned}`, {
        title: 'Nope', platform: 'zoom', meeting_link: 'https://zoom.us/j/1', meeting_date: iso(1),
        start_time: '01:00', end_time: '02:00'
      }, tokens.approved)).status, 403);
    check('trainee cannot record attendance',
      (await call('PUT', `/api/meeting/${m1.id}/attendance`, {
        records: [{ trainee_id: T.approved, status: 'present' }]
      }, tokens.approved)).status, 403);

    // -------------------------------------------------------------------
    console.log('\n=== 4. NO learning-progress requirement to join ===');
    // T.progress0 is approved with no progress rows at all.
    const prog = await query('SELECT * FROM trainee_progress WHERE trainee_id = $1', [T.progress0]);
    check('fixture really has zero progress rows', prog.rowCount, 0);

    const atZero = await call('GET', `/api/meeting/training/${T.owned}`, null, tokens.progress0);
    check('0% progress approved trainee -> 200', atZero.status, 200);
    check('0% progress trainee gets the same meeting list',
      atZero.data?.data?.meetings?.length, asApproved.data?.data?.meetings?.length);

    const singleAtZero = await call('GET', `/api/meeting/${m1.id}`, null, tokens.progress0);
    check('0% progress trainee can open a single meeting', singleAtZero.status, 200);
    check('0% progress trainee gets the link', typeof singleAtZero.data?.data?.meeting?.meeting_link, 'string');

    // Give them a certificate-eligible-looking state and confirm the meeting
    // list is byte-identical: progress must not gate meetings.
    const beforeSig = JSON.stringify(atZero.data?.data?.meetings);
    await query(
      `INSERT INTO trainee_progress (trainee_id, training_id, lesson_id, progress_percentage, is_completed)
       SELECT $1, $2, l.id, 100, true FROM lessons l WHERE l.training_id = $2 LIMIT 1`,
      [T.progress0, T.owned]
    ).catch(() => { /* fixture optional */ });
    const afterSig = JSON.stringify((await call('GET', `/api/meeting/training/${T.owned}`, null, tokens.progress0))?.data?.data?.meetings);
    check('meeting list identical at 0% and at 100%', beforeSig === afterSig, true);

    check('anonymous -> 401', (await call('GET', `/api/meeting/training/${T.owned}`)).status, 401);

    // -------------------------------------------------------------------
    console.log('\n=== 5. Meetings are private: no public route leaks a link ===');
    // The real leak vectors are the stored Zoom URL and the meeting_link
    // key. Note the pre-existing trainings.location_or_meeting_link column
    // contains the substring "meeting_link", so match the quoted JSON key.
    for (const [label, path] of [
      ['public training detail', `/api/trainings/${T.owned}`],
      ['available trainings', '/api/trainings/available']
    ]) {
      const r = await call('GET', path);
      const body = JSON.stringify(r.data);
      check(`${label} carries no meeting_link key`, body.includes('"meeting_link"'), false);
      check(`${label} carries no zoom url`, body.includes('zoom.us'), false);
      check(`${label} carries no meeting titles`, body.includes('Live Session'), false);
    }

    // /trainings/:id uses optionalAuth, so a logged-in non-participant is
    // the most realistic leak path. Confirm it exposes nothing. (This
    // fixture user has no department, so the pre-existing department rule
    // may refuse the page outright - either way nothing leaks.)
    const asPending = await call('GET', `/api/trainings/${T.owned}`, null, tokens.pending);
    check('...pending trainee gets no zoom url', JSON.stringify(asPending.data).includes('zoom.us'), false);
    check('...and no meeting_link key', JSON.stringify(asPending.data).includes('"meeting_link"'), false);
    check('...and no meeting titles', JSON.stringify(asPending.data).includes('Live Session'), false);

    // -------------------------------------------------------------------
    console.log('\n=== 6. Attendance is recorded against the meeting ===');
    const roster = await call('GET', `/api/meeting/${m1.id}/attendance`, null, tokens.owner);
    check('roster -> 200', roster.status, 200);
    const rosterIds = (roster.data?.data?.roster || []).map((r) => Number(r.trainee_id)).sort((a, b) => a - b);
    const expectedIds = [T.approved, T.progress0].sort((a, b) => a - b);
    check('roster = approved participants only', JSON.stringify(rosterIds), JSON.stringify(expectedIds));

    const save = await call('PUT', `/api/meeting/${m1.id}/attendance`, {
      records: [
        { trainee_id: T.approved, status: 'present' },
        { trainee_id: T.progress0, status: 'late' }
      ]
    }, tokens.owner);
    check('save attendance -> 200', save.status, 200);
    check('2 records saved', save.data?.data?.saved, 2);

    const savedRows = await query('SELECT * FROM meeting_attendance WHERE meeting_id = $1 ORDER BY trainee_id', [m1.id]);
    check('persisted 2 rows', savedRows.rowCount, 2);
    check('statuses stored correctly',
      savedRows.rows.map((r) => r.status).sort().join(','), 'late,present');
    check('marked_by recorded', savedRows.rows.every((r) => Number(r.marked_by) === Number(T.ownerTrainer)), true);

    // A pending trainee must be refused even when submitted directly.
    const cheat = await call('PUT', `/api/meeting/${m1.id}/attendance`, {
      records: [
        { trainee_id: T.approved, status: 'present' },
        { trainee_id: T.pending, status: 'present' },
        { trainee_id: T.rejected, status: 'present' }
      ]
    }, tokens.owner);
    check('non-participant rows are ignored, not stored', cheat.data?.data?.saved, 1);
    check('response reports what it ignored', cheat.data?.data?.ignored, 2);
    const cheatRows = await query('SELECT trainee_id FROM meeting_attendance WHERE meeting_id = $1', [m1.id]);
    check('pending/rejected never reached the DB',
      cheatRows.rows.some((r) => [T.pending, T.rejected].includes(Number(r.trainee_id))), false);

    // Re-submitting corrects rather than duplicating.
    await call('PUT', `/api/meeting/${m1.id}/attendance`, {
      records: [{ trainee_id: T.approved, status: 'absent' }]
    }, tokens.owner);
    check('resubmit updates in place (no duplicate)',
      (await query('SELECT * FROM meeting_attendance WHERE meeting_id = $1 AND trainee_id = $2', [m1.id, T.approved])).rowCount, 1);

    check('foreign trainer cannot read attendance',
      (await call('GET', `/api/meeting/${m1.id}/attendance`, null, tokens.other)).status, 403);
    check('foreign trainer cannot write attendance',
      (await call('PUT', `/api/meeting/${m1.id}/attendance`, {
        records: [{ trainee_id: T.approved, status: 'present' }]
      }, tokens.other)).status, 403);

    // -------------------------------------------------------------------
    console.log('\n=== 7. Attendance does NOT drive progress, assessment or certificate ===');
    const afterAttendance = await query(
      `SELECT * FROM trainee_progress WHERE trainee_id = $1`, [T.approved]
    );
    check('approved trainee still has no progress rows', afterAttendance.rowCount, 0);

    const certs = await query('SELECT * FROM certificates WHERE trainee_id = $1', [T.approved]);
    check('attendance issued no certificate', certs.rowCount, 0);

    const legacy = await query('SELECT COUNT(*)::int AS n FROM attendance');
    check('legacy attendance table untouched', legacy.rows[0].n, 0);

    // Deleting a meeting must not touch enrollment or certificates.
    const del = await call('DELETE', `/api/meeting/${m1.id}`, null, tokens.owner);
    check('owning trainer delete -> 200', del.status, 200);
    const afterDelete = await query(
      `SELECT status FROM training_requests WHERE training_id = $1 AND trainee_id = $2`,
      [T.owned, T.approved]
    );
    check('enrollment survived the meeting deletion', afterDelete.rows[0]?.status, 'approved');
    check('meeting attendance cascaded away',
      (await query('SELECT * FROM meeting_attendance WHERE meeting_id = $1', [m1.id])).rowCount, 0);

    // -------------------------------------------------------------------
    console.log('\n=== 8. Input validation ===');
    const base = {
      title: 'Valid Title', meeting_link: 'https://zoom.us/j/5555',
      meeting_date: iso(4), start_time: '10:00', end_time: '12:00'
    };
    check('end before start -> 400',
      (await call('POST', `/api/meeting/training/${T.owned}`, { ...base, end_time: '09:00' }, tokens.admin)).status, 400);
    check('javascript: link -> 400',
      (await call('POST', `/api/meeting/training/${T.owned}`, { ...base, meeting_link: 'javascript:alert(1)' }, tokens.admin)).status, 400);
    check('non-zoom platform -> 400',
      (await call('POST', `/api/meeting/training/${T.owned}`, { ...base, platform: 'teams' }, tokens.admin)).status, 400);
    check('missing title -> 400',
      (await call('POST', `/api/meeting/training/${T.owned}`, { ...base, title: '' }, tokens.admin)).status, 400);
    check('24:99 time -> 400',
      (await call('POST', `/api/meeting/training/${T.owned}`, { ...base, start_time: '24:99' }, tokens.admin)).status, 400);
    check('unknown meeting -> 404',
      (await call('GET', '/api/meeting/99999999', null, tokens.admin)).status, 404);

    console.log(`\nPASS: ${pass}   FAIL: ${fail}`);
  } catch (error) {
    console.error('\nSuite crashed:', error);
    fail++;
  } finally {
    // Unconditional cleanup, in dependency order.
    if (ids.meetings.length) {
      await query('DELETE FROM training_meetings WHERE id = ANY($1::int[])', [ids.meetings]).catch(() => {});
    }
    await query('DELETE FROM training_requests WHERE training_id = ANY($1::int[])', [ids.trainings]).catch(() => {});
    await query('DELETE FROM trainings WHERE id = ANY($1::int[])', [ids.trainings]).catch(() => {});
    await query('DELETE FROM users WHERE id = ANY($1::int[])', [ids.users]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
    await pool.end().catch(() => {});
  }

  process.exit(fail > 0 ? 1 : 0);
})();