// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { HelmetProvider } from 'react-helmet-async';
import './index.css'  // Make sure this import is here!

ReactDOM.createRoot(document.getElementById('root')).render(
<HelmetProvider>
    <App />
</HelmetProvider>
)