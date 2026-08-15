// ═══════════════════════════════════════════════════════════
// AVALAN3 — FIRESTORE HELPERS (db.js)
// All Firestore read/write operations.
// ═══════════════════════════════════════════════════════════

async function getUserProfile(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function updateUserProfile(uid, data) {
  await db.collection('users').doc(uid).set(data, { merge: true });
}

async function getJourneyProgress(uid) {
  const snap = await db.collection('users').doc(uid).collection('journey').get();
  const progress = {};
  snap.forEach(doc => { progress[doc.id] = doc.data(); });
  return progress;
}

async function setTaskComplete(uid, stageId, taskId, value) {
  await db.collection('users').doc(uid).collection('journey').doc(stageId).set({
    stageId,
    [`tasks.${taskId}`]: value
  }, { merge: true });
}

async function getChatHistory(uid) {
  const snap = await db.collection('users').doc(uid).collection('chats')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(d => d.data()).reverse();
}

async function saveChatMessage(uid, message) {
  await db.collection('users').doc(uid).collection('chats').add({
    ...message,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getSavedResearch(uid) {
  const snap = await db.collection('users').doc(uid).collection('research')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveResearch(uid, report) {
  await db.collection('users').doc(uid).collection('research').add({
    ...report,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getTrackerEntries(uid) {
  const snap = await db.collection('users').doc(uid).collection('tracker')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTrackerEntry(uid, entry) {
  await db.collection('users').doc(uid).collection('tracker').add({
    ...entry,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateTrackerEntry(uid, entryId, data) {
  await db.collection('users').doc(uid).collection('tracker').doc(entryId).update(data);
}

async function deleteTrackerEntry(uid, entryId) {
  await db.collection('users').doc(uid).collection('tracker').doc(entryId).delete();
}

async function deleteResearch(uid, reportId) {
  await db.collection('users').doc(uid).collection('research').doc(reportId).delete();
}

async function deleteChatHistory(uid) {
  const snap = await db.collection('users').doc(uid).collection('chats').get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
