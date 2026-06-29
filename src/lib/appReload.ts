/** Full WebView refresh — used on Capacitor Android/iOS when the app needs a hard reload. */
export function reloadApp(): void {
  window.location.reload();
}
