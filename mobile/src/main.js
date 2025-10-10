// Import styles
import './styles/main.css';

// Import body HTML
import bodyHTML from './body.html?raw';

// Import app logic
import './js/app.js';

// Load the body content into the app div
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = bodyHTML;
  }
});

// Hot Module Replacement (HMR) for Vite
if (import.meta.hot) {
  import.meta.hot.accept();
}
