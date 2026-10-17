// Apply the saved theme before React and styles load to avoid a theme flash.
(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("myplan:theme") === "light") theme = "light";
  } catch {
    // Keep the default when storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", theme === "light" ? "#f7f7f7" : "#0b0b0b",
  );
})();
