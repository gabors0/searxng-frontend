// Runs before first paint so a saved theme doesn't flash. It's a file because the CSP blocks inline scripts.
try {
  const theme = localStorage.getItem('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // Storage can be blocked, which leaves the page following the system.
}
