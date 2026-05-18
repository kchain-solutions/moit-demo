import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let _config = null;

/**
 * Load corridor configuration from JSON file.
 * Priority: CONFIG_FILE env var > default configs/vietnam-us.json
 * Returns the parsed config object, or null if no file found.
 */
export function loadConfig() {
  const configPath = process.env.CONFIG_FILE
    ? path.resolve(process.env.CONFIG_FILE)
    : path.join(__dirname, '../configs/vietnam-us.json');

  if (existsSync(configPath)) {
    try {
      _config = JSON.parse(readFileSync(configPath, 'utf-8'));
      console.log(`[Config] Loaded corridor: ${_config.corridor?.id} (${_config.corridor?.name})`);
    } catch (e) {
      console.error(`[Config] Failed to parse ${configPath}:`, e.message);
      _config = null;
    }
  } else {
    console.log(`[Config] No config file at ${configPath}, using built-in defaults`);
    _config = null;
  }

  return _config;
}

/**
 * Get the currently loaded config (or null if none loaded).
 */
export function getConfig() {
  return _config;
}
