
  async function loadRules() {
    const res = await fetch("data/rulebook.json");
    const data = await res.json();
    const grid = document.getElementById("rulesGrid");

    data.rules.forEach(cat => {
      const card = document.createElement("div");
      card.className = "rule-card";
      card.style.borderTop = `4px solid ${cat.color}`;

      card.innerHTML = `
        <div class="rule-header">
          <span>${cat.icon} ${cat.category}</span>
          <span class="toggle">+</span>
        </div>
        <div class="rule-items">
          <ol>
            ${cat.items.map(item => `<li>${item}</li>`).join("")}
          </ol>
        </div>
      `;

      card.querySelector(".rule-header").addEventListener("click", () => {
        card.classList.toggle("active");
        card.querySelector(".toggle").textContent =
          card.classList.contains("active") ? "−" : "+";
      });

      grid.appendChild(card);
    });
  }
  document.addEventListener("DOMContentLoaded", loadRules);
