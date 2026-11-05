/// <reference types="node" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { spawn, type ChildProcess } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

// Runs the image proxy (imgproxy/main.go) alongside the dev server, so Save and Copy work in development.
function imgproxy(): Plugin {
  let child: ChildProcess | undefined;
  const stop = () => {
    child?.kill();
    child = undefined;
  };
  return {
    name: 'imgproxy',
    apply: 'serve',
    configureServer(server) {
      stop();
      // go run builds to a temporary binary; exec makes the signal reach the proxy itself.
      child = spawn('go', ['build', '-o', 'imgproxy.dev', '.'], { cwd: 'imgproxy', stdio: 'inherit' });
      child.on('error', (error: Error) => server.config.logger.warn(`imgproxy didn't start (${error.message}); Save and Copy will fall back.`));
      child.on('exit', (code: number | null) => {
        if (code !== 0 || !child) return;
        child = spawn('./imgproxy.dev', { cwd: 'imgproxy', stdio: 'inherit' });
      });
      server.httpServer?.on('close', stop);
      process.once('exit', stop);
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), svelte(), imgproxy()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8083',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ai': 'http://127.0.0.1:8084',
      '/img': 'http://127.0.0.1:8085',
    },
  },
});
