/// <reference types="node" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { spawn, type ChildProcess } from 'node:child_process';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

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
  // Tests need neither the proxy nor a Go toolchain.
  plugins: [tailwindcss(), svelte(), !process.env.VITEST && imgproxy()],
  // Picks Svelte's browser build, so components can be mounted in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
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
