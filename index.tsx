import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';

const envUrl = import.meta.env.VITE_CONVEX_URL || "https://wandering-swordfish-489.eu-west-1.convex.cloud";
const convexUrl = envUrl.replace(/\/$/, "");
const convex = new ConvexReactClient(convexUrl);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>
  );
}