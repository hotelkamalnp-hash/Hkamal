import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exportFullDatabaseSnapshot, getDbPath } from '../server/db.ts';

function main() {
  const outArg = process.argv[2];
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(backupsDir, `kamal-pms-backup-${stamp}.json`);

  const snapshot = exportFullDatabaseSnapshot();
  const payload = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(outFile, payload, { mode: 0o600 });
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');

  const totalItems = Object.values(snapshot.collections).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceDb: getDbPath(),
        backupFile: outFile,
        collectionsCount: Object.keys(snapshot.collections).length,
        totalRecords: totalItems,
        sha256,
        exportedAt: snapshot.exportedAt,
      },
      null,
      2
    )
  );
}

main();
