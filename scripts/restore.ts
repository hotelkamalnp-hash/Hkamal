import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { restoreDatabaseSnapshot } from '../server/db.ts';

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npx tsx scripts/restore.ts <path-to-backup.json>');
    process.exit(1);
  }
  const absPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(absPath)) {
    console.error(`Backup file not found: ${absPath}`);
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  if (!parsed?.collections || !parsed?.kvSettings) {
    console.error('Invalid backup snapshot format.');
    process.exit(1);
  }

  const res = restoreDatabaseSnapshot(parsed);
  console.log(
    JSON.stringify(
      {
        ok: true,
        restoredFrom: absPath,
        restoredRecords: res.restoredRecords,
      },
      null,
      2
    )
  );
}

main();
