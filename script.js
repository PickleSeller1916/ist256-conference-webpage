// Conference Website Script

document.addEventListener("DOMContentLoaded", function () {

  // Highlight active nav link based on current page
  const navLinks = document.querySelectorAll(".navbar a");
  navLinks.forEach(link => {
    if (link.href === window.location.href) {
      link.style.backgroundColor = "#333";
      link.style.color = "#fff";
    }
  });

  // Smooth scroll for any anchor links on the page
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Fade-in animation for .home_text on load
  const homeText = document.querySelector(".home_text");
  if (homeText) {
    homeText.style.opacity = "0";
    homeText.style.transition = "opacity 1.2s ease-in";
    setTimeout(() => {
      homeText.style.opacity = "1";
    }, 100);
  }

  // Sticky header shadow on scroll
  const header = document.querySelector("header.icon");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 10) {
        header.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        header.style.transition = "box-shadow 0.3s";
      } else {
        header.style.boxShadow = "none";
      }
    });
  }

  // Dynamic footer year (if an element with id="year" exists)
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

});
