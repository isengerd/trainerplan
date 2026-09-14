import 'dotenv/config';
import { mobileEnvironment } from '../src/lib/mobile-environment.ts';
try {
  const config = mobileEnvironment();
  console.log(`Mobile Zielumgebung: ${config.target}; Projekt: ${config.iosPath} / ${config.androidPath}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
