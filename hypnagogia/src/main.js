// Entry point: checks the content, loads the sprite sheets and starts the game.
import '@fontsource/tiny5/cyrillic-400.css';
import '@fontsource/tiny5/latin-400.css';
import '../styles.css';

import { loadAssets } from './app/Assets.js';
import { Game } from './app/Game.js';
import { validateContent } from './data/validate.js';
import { ACTIVE_USES, PASSIVE_BEHAVIOURS } from './gameplay/items/behaviourIds.js';

const frame = document.getElementById('frame');
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

/** Shows a start-up problem on the page; details also go to the console. */
function fail(error) {
  console.error(error);
  const box = document.createElement('pre');
  box.className = 'fatal';
  box.textContent = `Игра не запустилась.\n\n${error?.message ?? error}`;
  ui.replaceChildren(box);
}

async function boot() {
  const problems = validateContent({ passive: PASSIVE_BEHAVIOURS, active: ACTIVE_USES });
  if (problems.length) throw new Error(`Ошибки в данных игры:\n- ${problems.join('\n- ')}`);
  await loadAssets();
  await document.fonts?.ready;
  const game = new Game(canvas, frame, ui);
  // For debugging in the browser console, e.g. `hypnagogia.run.seed`.
  if (new URLSearchParams(location.search).has('debug')) window.hypnagogia = game;
  game.start();
}

boot().catch(fail);
