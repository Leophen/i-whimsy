/**
 * 在 React 水合前同步 html class，避免主题闪烁。
 * 逻辑与 next-themes 默认 storageKey / class 策略对齐；Provider 内仍保留其 script 作双保险。
 */
export function ThemeScript() {
  const code = `
(function () {
  try {
    var d = document.documentElement;
    var stored = localStorage.getItem('theme');
    var theme = stored === 'dark' || stored === 'light' ? stored : 'system';
    var resolved =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    d.classList.remove('light', 'dark');
    d.classList.add(resolved);
    d.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

  return (
    <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />
  );
}
