/**
 * The hourly data job: `node job/run.ts --out <folder>`.
 *
 * Writes `picks.json` and `history/<id>.json` into the folder; the hourly
 * workflow publishes that folder as the `data` branch. Nothing is written
 * unless the whole run succeeded, and a failed run exits with an error.
 *
 *   --out <folder>      where to write (required)
 *   --samples <folder>  read the saved API responses instead of the live Wiki
 *   --now <ISO time>    pretend it is this time (with --samples: defaults to
 *                       when the samples were captured)
 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildResults, LIVE_LIMITS } from './build.ts';
import { liveSource, SAMPLE_LIMITS, sampleSource, writeResults } from './io.ts';

const { values } = parseArgs({
  options: { out: { type: 'string' }, samples: { type: 'string' }, now: { type: 'string' } },
});
if (!values.out) throw new Error('Say where to write: --out <folder>');

let source = liveSource;
let limits = LIVE_LIMITS;
let now = new Date();
if (values.samples) {
  const samples = await sampleSource(resolve(values.samples));
  source = samples.source;
  limits = SAMPLE_LIMITS;
  now = samples.capturedAt;
}
if (values.now) now = new Date(values.now);
if (Number.isNaN(now.getTime())) throw new Error(`Not a time: --now ${values.now}`);

const results = await buildResults(source, now, undefined, limits);
await writeResults(resolve(values.out), results);
console.log(`${results.picks.generatedAt}: ${results.summary}`);
console.log(
  `Top picks: ${results.picks.items
    .slice(0, 10)
    .map((item) => item.name)
    .join(', ')}`,
);
