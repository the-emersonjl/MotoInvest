import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Register Service Worker for offline capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

ReactDOM.render(<App />, document.getElementById('root'));