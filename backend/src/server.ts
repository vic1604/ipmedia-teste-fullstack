import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { defaultDatabasePaths, openReadOnlyDatabase, prepareWorkingCopy } from './database.js';

export async function startServer(): Promise<void> {
  const paths = defaultDatabasePaths();
  prepareWorkingCopy(paths.sourcePath, paths.workingPath);
  const database = openReadOnlyDatabase(paths.workingPath);
  const app = createApp(database);

  try {
    const port = Number(process.env.PORT ?? 3000);
    await app.listen({ host: '0.0.0.0', port });
  } catch (error) {
    await app.close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}