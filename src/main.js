import '@fontsource/orbitron/latin-500.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-400.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import './styles.css';
import { Game } from './game.js';

const game = new Game(document.getElementById('game'), document.getElementById('ui'));
const params = new URLSearchParams(location.search);

// Development aids: ?debug exposes the game object, ?level=2 jumps straight to a chapter.
if (params.has('debug')) window.__game = game;

game.boot().then(() => {
  const level = parseInt(params.get('level'), 10);
  if (level >= 1 && !game.failed) game.startChapter(level - 1);
});
