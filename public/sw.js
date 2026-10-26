// Service worker: shows the daily wird reminder (web push) and opens the app
// when it is tapped. Registered from Settings when reminders are turned on.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Faqih", {
      body: data.body || "",
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      // One reminder at a time: a newer one replaces the old.
      tag: "daily-wird",
      data: { url: data.url || "/learn" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/learn",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        // Reuse an open Faqih tab if there is one.
        const open = windows.find((w) =>
          w.url.startsWith(self.location.origin)
        );
        if (open) return open.navigate(url).then((w) => (w || open).focus());
        return self.clients.openWindow(url);
      })
  );
});
