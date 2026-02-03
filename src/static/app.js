document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: obtiene iniciales a partir del email
  function initialsFromEmail(email) {
    const name = String(email).split('@')[0].replace(/[._\-]/g, ' ').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return (email[0] || '?').toUpperCase();
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // --- Nueva sección: participantes ---
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        // Avatar stack (hasta 4 visibles)
        const avatarStack = document.createElement("div");
        avatarStack.className = "avatar-stack";
        const maxVisible = 4;
        details.participants.slice(0, maxVisible).forEach(email => {
          const av = document.createElement("div");
          av.className = "avatar";
          av.title = email;
          av.textContent = initialsFromEmail(email);
          avatarStack.appendChild(av);
        });
        if (details.participants.length > maxVisible) {
          const more = document.createElement("div");
          more.className = "more-badge";
          more.textContent = `+${details.participants.length - maxVisible}`;
          avatarStack.appendChild(more);
        }
        if (details.participants.length === 0) {
          const none = document.createElement("div");
          none.className = "participant-count";
          none.textContent = "No participants yet";
          avatarStack.appendChild(none);
        }

        // Right side: count + toggle
        const rightArea = document.createElement("div");
        rightArea.style.display = "flex";
        rightArea.style.alignItems = "center";
        const count = document.createElement("div");
        count.className = "participant-count";
        count.textContent = `${details.participants.length} participante(s)`;
        const toggle = document.createElement("button");
        toggle.type = "button"; // evita comportamiento por defecto
        toggle.className = "toggle-btn";
        // Usar solo un icono (accesible con aria-label), no texto visible
        toggle.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        `;
        toggle.setAttribute("aria-label", "Mostrar participantes");
        rightArea.appendChild(count);
        rightArea.appendChild(toggle);

        participantsDiv.appendChild(avatarStack);
        participantsDiv.appendChild(rightArea);
        activityCard.appendChild(participantsDiv);

        // Full list (hidden by default)
        const list = document.createElement("div");
        list.className = "participants-list hidden";
        // id único y atributos ARIA para accesibilidad
        const listId = `participants-${Math.random().toString(36).slice(2,9)}`;
        list.id = listId;
        toggle.setAttribute("aria-controls", listId);
        toggle.setAttribute("aria-expanded", "false");
        if (details.participants.length === 0) {
          const note = document.createElement("div");
          note.textContent = "No hay participantes aún.";
          list.appendChild(note);
        } else {
          details.participants.forEach(email => {
            const item = document.createElement("div");
            item.className = "participant-item";
            item.title = email;
            const mini = document.createElement("div");
            mini.className = "mini-avatar";
            mini.textContent = initialsFromEmail(email);
            const label = document.createElement("div");
            label.textContent = email;

            // Remove button (X)
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-btn";
            removeBtn.setAttribute("aria-label", `Remove ${email} from ${name}`);
            removeBtn.textContent = "✕";
            removeBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!confirm(`Remove ${email} from ${name}?`)) return;
              try {
                const res = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (res.ok) {
                  messageDiv.textContent = data.message || "Participant removed";
                  messageDiv.className = "message info";
                  messageDiv.classList.remove("hidden");
                  // Refresh activities to reflect change
                  fetchActivities();
                } else {
                  messageDiv.textContent = data.detail || "Failed to remove participant";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                }
                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              } catch (err) {
                console.error("Error removing participant:", err);
                messageDiv.textContent = "Failed to remove participant";
                messageDiv.className = "message error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              }
            });

            item.appendChild(mini);
            item.appendChild(label);
            item.appendChild(removeBtn);
            list.appendChild(item);
          });
        }
        activityCard.appendChild(list);

        // Toggle behavior: alternar lista, actualizar aria y clase visual (sin texto)
        // Start hidden (explicit) to avoid relying only on CSS classes
        list.style.display = 'none';
        const toggleFunc = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          const isHidden = list.classList.contains("hidden");
          if (isHidden) {
            list.classList.remove("hidden");
            list.style.display = 'flex';
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Ocultar participantes");
            toggle.classList.add("expanded");
          } else {
            list.classList.add("hidden");
            list.style.display = 'none';
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Mostrar participantes");
            toggle.classList.remove("expanded");
          }
        };
        toggle.addEventListener("click", (e) => toggleFunc(e));
        avatarStack.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFunc();
        });
        // Optional: clicking outside the activity card will close the list
        document.addEventListener("click", (e) => {
          if (!activityCard.contains(e.target) && !list.classList.contains("hidden")) {
            list.classList.add("hidden");
            list.style.display = 'none';
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Mostrar participantes");
            toggle.classList.remove("expanded");
          }
        });

        // --- Fin sección participantes ---

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Recargar actividades para reflejar nuevo participante
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
