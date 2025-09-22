
document.addEventListener("DOMContentLoaded", () => {
  const form     = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  const sendBtn  = document.getElementById("sendBtn");
  const btnText  = sendBtn.querySelector(".btn-text");
  const spinner  = sendBtn.querySelector(".spinner");

  // ✅ Set your EmailJS IDs here
  const SERVICE_ID             = "service_cmzxm2m";
  const CONTACT_TEMPLATE_ID    = "template_y5ung5c";
  const AUTOREPLY_TEMPLATE_ID  = ""; // e.g. "template_autoreply" (leave empty to skip)

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear previous feedback color
    feedback.style.color = "";
    feedback.textContent = "";

    const name    = document.getElementById("name").value.trim();
    const email   = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    // Basic validation
    if (!name) {
      feedback.textContent = "⚠️ Oops, please enter your name.";
      feedback.style.color = "orange";
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      feedback.textContent = "⚠️ Oops, please enter a valid email.";
      feedback.style.color = "orange";
      return;
    }
    if (!message) {
      feedback.textContent = "⚠️ Please enter a message.";
      feedback.style.color = "orange";
      return;
    }

    // Disable button + show spinner
    sendBtn.disabled = true;
    sendBtn.setAttribute("aria-busy", "true");
    btnText.textContent = "Sending...";
    spinner.style.display = "inline-block";

    const params = {
      from_name:   name,
      from_email:  email,
      message:     message,
    };

    try {
      // Send main message to club inbox
      await emailjs.send(SERVICE_ID, CONTACT_TEMPLATE_ID, params);

      // Optional: Auto-reply to user (only runs if you set an ID)
      if (AUTOREPLY_TEMPLATE_ID) {
        await emailjs.send(SERVICE_ID, AUTOREPLY_TEMPLATE_ID, {
          to_name:  name,
          to_email: email
        });
      }

      feedback.textContent = "✅ Message sent! We'll get back to you soon.";
      feedback.style.color = "limegreen";
      form.reset();
    } catch (err) {
      console.error("EmailJS error:", err);
      feedback.textContent = "❌ Oops, something went wrong. Try again later.";
      feedback.style.color = "red";
    } finally {
      // ✅ Always reset button + spinner
      sendBtn.disabled = false;
      sendBtn.removeAttribute("aria-busy");
      btnText.textContent = "Send Message";
      spinner.style.display = "none";
    }
  });

  // FAQ accordion (unchanged)
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      item.classList.toggle("active");
      btn.querySelector("span").textContent = item.classList.contains("active") ? "−" : "+";
    });
  });
});
