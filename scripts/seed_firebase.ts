import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { getDynamicStandards, getStandardAlerts, TESTING_LABS } from '../src/lib/data/bisDatabase';

const firebaseConfig = {
  apiKey: "AIzaSyDUl4wbJ3zShF8t9qahdKiInh7ATgp9YQQ",
  authDomain: "project-2447457501485114884.firebaseapp.com",
  databaseURL: "https://project-2447457501485114884-default-rtdb.firebaseio.com",
  projectId: "project-2447457501485114884",
  storageBucket: "project-2447457501485114884.firebasestorage.app",
  messagingSenderId: "891252027777",
  appId: "1:891252027777:web:e8c398a77451ecb6d33880",
  measurementId: "G-HMP81F21WC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

async function seedDatabase() {
  console.log(`\n🚀 Seeding Firebase Backend (Project: ${firebaseConfig.projectId})...\n`);

  // 1. Seed all official BIS Standards into Firestore and RTDB
  const standards = getDynamicStandards();
  console.log(`📌 Seeding ${standards.length} BIS Standards...`);
  for (const std of standards) {
    // Firestore
    await setDoc(doc(db, 'bis_standards', std.id), {
      ...std,
      syncedAt: new Date().toISOString()
    }, { merge: true });

    // RTDB
    await set(ref(rtdb, `standards/${std.id}`), {
      ...std,
      syncedAt: new Date().toISOString()
    });
    console.log(`  ✓ Synced: ${std.isNumber} - ${std.title.slice(0, 40)}...`);
  }

  // 2. Seed QCO Alerts
  const alerts = getStandardAlerts();
  console.log(`\n📌 Seeding ${alerts.length} QCO Alerts...`);
  for (const alert of alerts) {
    await setDoc(doc(db, 'qco_alerts', alert.id), {
      ...alert,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`  ✓ Synced Alert: ${alert.title.slice(0, 45)}...`);
  }

  // 3. Seed Testing Labs Directory
  console.log(`\n📌 Seeding ${TESTING_LABS.length} NABL/BIS Testing Labs...`);
  for (const lab of TESTING_LABS) {
    await setDoc(doc(db, 'testing_labs', lab.id), {
      ...lab,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  }
  console.log(`  ✓ Synced ${TESTING_LABS.length} labs.`);

  // 4. Seed Initial System Feedback Logs
  const sampleLogs = [
    {
      id: 'log-1',
      query: 'What are the high voltage test requirements for electric irons under IS 302-2-3?',
      isHelpful: true,
      feedbackText: 'Very accurate clause reference (Clause 13.2, 1500V).',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'log-2',
      query: 'Is ISI certification mandatory for two-wheeler helmets under IS 4151?',
      isHelpful: true,
      feedbackText: 'Confirmed QCO order date and penalties.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'log-3',
      query: 'List NABL accredited laboratories for footwear impact test in Chennai',
      isHelpful: true,
      feedbackText: 'Returned FDDI and Central Footwear Training Institute.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  console.log(`\n📌 Seeding initial feedback logs...`);
  for (const log of sampleLogs) {
    await setDoc(doc(db, 'feedback_logs', log.id), log, { merge: true });
    await set(ref(rtdb, `feedback/${log.id}`), log);
  }
  console.log(`  ✓ Synced ${sampleLogs.length} feedback logs.`);

  console.log(`\n🎉 Firebase Backend Setup and Data Population Completed Successfully!\n`);
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ Error seeding Firebase:", err);
  process.exit(1);
});
