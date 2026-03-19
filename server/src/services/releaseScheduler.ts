/**
 * Release Scheduler — setTimeout-based, zero-polling product activation/deactivation.
 * Generic: works with any product_type in shop_release_windows.
 *
 * Product type -> table mapping:
 *   'booster' | 'starter' -> card_sets (name = product_id, active column)
 *   'display' -> shop_displays (id = product_id::int, active column)
 *   Future types: add to PRODUCT_TABLE_MAP
 */

import { pool } from '../config/db.js';
import { bumpDataVersion } from './versionService.js';

/** Maps product_type to its backing DB table, ID column, and ID type. */
const PRODUCT_TABLE_MAP: Record<string, { table: string; idColumn: string; idType: 'text' | 'int' }> = {
  booster: { table: 'card_sets', idColumn: 'name', idType: 'text' },
  starter: { table: 'card_sets', idColumn: 'name', idType: 'text' },
  display: { table: 'shop_displays', idColumn: 'id', idType: 'int' },
};

/** Maximum timeout duration — re-check after 24 hours even if next event is further out. */
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;

let schedulerTimeout: ReturnType<typeof setTimeout> | null = null;

// -------------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------------

/**
 * Initialise the scheduler. Call once at server startup.
 * Processes any overdue events, then schedules the next one.
 */
export async function initScheduler(): Promise<void> {
  console.log('[RELEASE-SCHEDULER] Initialising...');
  try {
    await processOverdueEvents();
    await scheduleNext();
  } catch (err) {
    console.error('[RELEASE-SCHEDULER] Init failed:', err);
  }
}

/**
 * Reschedule after an admin mutation (create/update/delete release window).
 * Clears the current timeout, processes overdue events, and finds the next one.
 */
export async function reschedule(): Promise<void> {
  if (schedulerTimeout !== null) {
    clearTimeout(schedulerTimeout);
    schedulerTimeout = null;
  }
  try {
    await processOverdueEvents();
    await scheduleNext();
  } catch (err) {
    console.error('[RELEASE-SCHEDULER] Reschedule failed:', err);
  }
}

// -------------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------------

/**
 * Process all overdue activation and deactivation events.
 * Activations: start_date <= today AND (end_date IS NULL OR end_date >= today) but product is inactive.
 * Deactivations: end_date < today but product is still active.
 */
async function processOverdueEvents(): Promise<void> {
  let changed = false;

  // --- Overdue activations ---
  for (const [productType, mapping] of Object.entries(PRODUCT_TABLE_MAP)) {
    const idCast = mapping.idType === 'int' ? `rw.product_id::int` : `rw.product_id`;
    const result = await pool.query(`
      UPDATE ${mapping.table} t SET active = TRUE
      FROM shop_release_windows rw
      WHERE rw.product_type = $1
        AND ${idCast} = t.${mapping.idColumn}
        AND rw.start_date <= CURRENT_DATE
        AND (rw.end_date IS NULL OR rw.end_date >= CURRENT_DATE)
        AND t.active = FALSE
    `, [productType]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`[RELEASE-SCHEDULER] Activated ${result.rowCount} ${productType}(s)`);
      changed = true;
    }
  }

  // --- Set ig_release_date on first-ever activation ---
  // For booster/starter: update shop_set_config
  await pool.query(`
    UPDATE shop_set_config sc
    SET ig_release_date = rw.start_date
    FROM shop_release_windows rw
    WHERE rw.product_type IN ('booster', 'starter')
      AND rw.product_id = sc.set_name
      AND rw.start_date <= CURRENT_DATE
      AND sc.ig_release_date IS NULL
  `);

  // For display: update shop_displays
  await pool.query(`
    UPDATE shop_displays d
    SET ig_release_date = rw.start_date
    FROM shop_release_windows rw
    WHERE rw.product_type = 'display'
      AND rw.product_id::int = d.id
      AND rw.start_date <= CURRENT_DATE
      AND d.ig_release_date IS NULL
  `);

  // --- Overdue deactivations ---
  for (const [productType, mapping] of Object.entries(PRODUCT_TABLE_MAP)) {
    const idCast = mapping.idType === 'int' ? `rw.product_id::int` : `rw.product_id`;
    const result = await pool.query(`
      UPDATE ${mapping.table} t SET active = FALSE
      FROM shop_release_windows rw
      WHERE rw.product_type = $1
        AND ${idCast} = t.${mapping.idColumn}
        AND rw.end_date IS NOT NULL
        AND rw.end_date < CURRENT_DATE
        AND t.active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM shop_release_windows rw2
          WHERE rw2.product_type = rw.product_type
            AND rw2.product_id = rw.product_id
            AND rw2.start_date <= CURRENT_DATE
            AND (rw2.end_date IS NULL OR rw2.end_date >= CURRENT_DATE)
        )
    `, [productType]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`[RELEASE-SCHEDULER] Deactivated ${result.rowCount} ${productType}(s)`);
      changed = true;
    }
  }

  if (changed) {
    await bumpDataVersion();
  }
}

/**
 * Find the next future event (activation or deactivation) and set a timeout.
 * Clamps to MAX_TIMEOUT_MS (24h) — if the event is further out, we re-check daily.
 */
async function scheduleNext(): Promise<void> {
  const result = await pool.query(`
    SELECT LEAST(
      (SELECT MIN(start_date) FROM shop_release_windows WHERE start_date > CURRENT_DATE),
      (SELECT MIN(end_date) FROM shop_release_windows WHERE end_date IS NOT NULL AND end_date > CURRENT_DATE)
    ) AS next_event_date
  `);

  const nextDate: string | null = result.rows[0]?.next_event_date ?? null;

  if (!nextDate) {
    console.log('[RELEASE-SCHEDULER] No future events — idle.');
    return;
  }

  // Calculate ms until midnight of the event date (events trigger at date boundary)
  const eventTime = new Date(nextDate).getTime();
  const now = Date.now();
  let delayMs = eventTime - now;

  if (delayMs <= 0) {
    // Event is today or in the past — process immediately
    delayMs = 1000; // small delay to avoid tight loop
  } else if (delayMs > MAX_TIMEOUT_MS) {
    delayMs = MAX_TIMEOUT_MS;
  }

  console.log(
    `[RELEASE-SCHEDULER] Next event: ${nextDate} — scheduling check in ${Math.round(delayMs / 1000)}s`,
  );

  schedulerTimeout = setTimeout(async () => {
    schedulerTimeout = null;
    try {
      await processOverdueEvents();
      await scheduleNext();
    } catch (err) {
      console.error('[RELEASE-SCHEDULER] Event processing failed:', err);
      // Retry after 60 seconds on failure
      schedulerTimeout = setTimeout(async () => {
        schedulerTimeout = null;
        try {
          await processOverdueEvents();
          await scheduleNext();
        } catch (retryErr) {
          console.error('[RELEASE-SCHEDULER] Retry also failed:', retryErr);
        }
      }, 60_000);
    }
  }, delayMs);
}
